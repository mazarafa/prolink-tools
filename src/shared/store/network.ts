import {when, runInAction, action} from 'mobx';
import {applyDiff} from 'deep-diff';
import {debounce} from 'lodash';
import {
  ProlinkNetwork,
  DeviceID,
  ConnectedProlinkNetwork,
  MixstatusProcessor,
} from 'prolink-connect';

import store, {DeviceStore, HydrationInfo, PlayedTrack} from '.';
import {deviceReaction} from './utils';

/**
 * Connect the electron main process's prolink network instance to the
 * observable store data.
 */
export default function connectNetworkStore(network: ProlinkNetwork) {
  if (!network.isConnected()) {
    return;
  }

  // NOTE: Order is important. Connecting devices to the device store map MUST
  // happen last, otherwise devices may be added before we're prepared to react
  // to them.

  [
    connectStatus,
    connectTracks,
    connectLocaldbFetch,
    connectLocaldbHydrate,
    connectLocaldbHydrateDone,
    connectMixstatus,
    connectDevices,
  ].forEach(connector => connector(network));
}

/**
 * Connects the network device manager to the device store
 */
const connectDevices = (network: ConnectedProlinkNetwork) => {
  const deviceList = [...network.deviceManager.devices.values()];
  const deviceEntries = deviceList.map(d => [d.id, new DeviceStore(d)]);

  store.devices.replace(new Map(deviceEntries as [DeviceID, DeviceStore][]));

  // Create device stores for new devices
  network.deviceManager.on(
    'connected',
    action(device => store.devices.set(device.id, new DeviceStore(device)))
  );

  // Remove device stores
  network.deviceManager.on(
    'disconnected',
    action(device => store.devices.delete(device.id))
  );
};

/**
 * Connects the network status emitter to the associated device store
 */
const connectStatus = (network: ConnectedProlinkNetwork) =>
  network.statusEmitter.on(
    'status',
    action(async state => {
      const deviceStore = store.devices.get(state.deviceId);

      if (deviceStore === undefined) {
        // We don't know about this device yet
        return;
      }

      // We don't care about the packet ID
      state.packetNum = 0;

      if (deviceStore.state === undefined) {
        deviceStore.state = state;
        return;
      }

      // Only mutate the values that have changed using deep-diff
      applyDiff(deviceStore.state, state);
    })
  );

/**
 * Connects the current track ID to the network metadata loader service,
 * updating track metadata and artwork on change
 */
const connectTracks = (network: ConnectedProlinkNetwork) =>
  deviceReaction(
    store => store.state?.trackId,
    async (deviceStore: DeviceStore) => {
      const state = deviceStore.state;

      if (state === undefined) {
        return null;
      }

      // Clear the current track as it has changed.
      if (deviceStore.track !== undefined) {
        deviceStore.track = undefined;
      }

      const {trackId, trackSlot, trackType, trackDeviceId} = state;

      const track = await network.db.getMetadata({
        deviceId: trackDeviceId,
        trackId,
        trackType,
        trackSlot,
      });

      // Ensure that once we've actually recieved our track metadata, this is still
      // the track that's laoded on the player.
      if (trackId !== deviceStore.state?.trackId) {
        return;
      }

      if (track === null) {
        return;
      }

      const artwork = await network.db.getArtwork({
        deviceId: trackDeviceId,
        trackType,
        trackSlot,
        track,
      });

      runInAction(() => {
        deviceStore.track = track;
        deviceStore.artwork = artwork ?? undefined;
      });
    }
  );

/**
 * Connect the local database fetch progress states
 */
const connectLocaldbFetch = (network: ConnectedProlinkNetwork) =>
  network.localdb.on(
    'fetchProgress',
    action(status => {
      const deviceStore = store.devices.get(status.device.id);

      if (deviceStore === undefined) {
        return;
      }

      const progress = deviceStore.fetchProgress.get(status.slot);

      if (progress === undefined) {
        deviceStore.fetchProgress.set(status.slot, status.progress);
        return;
      }

      applyDiff(progress, status.progress);
    })
  );

const deboucnedApplyDiff = debounce(applyDiff, 10, {
  leading: true,
  trailing: true,
  maxWait: 10,
});

/**
 * Connect the local database hydration progress states
 */
const connectLocaldbHydrate = (network: ConnectedProlinkNetwork) =>
  network.localdb.on(
    'hydrationProgress',
    // Debounce because hydration generally happens very fast
    action(status => {
      const deviceStore = store.devices.get(status.device.id);

      if (deviceStore === undefined) {
        return;
      }

      let progress = deviceStore.hydrationProgress.get(status.slot);

      if (progress === undefined) {
        progress = new HydrationInfo();
        deviceStore.hydrationProgress.set(status.slot, progress);
      }

      const tableProgress = progress.perTable.get(status.progress.table);

      const {total, complete} = status.progress;
      const value = {total, complete};

      if (tableProgress === undefined) {
        progress.perTable.set(status.progress.table, value);
        return;
      }

      // Debounce actually updating the progress since it's very rapid, but
      // always update at 100%
      if (total === complete) {
        applyDiff(tableProgress, value);
      } else {
        deboucnedApplyDiff(tableProgress, value);
      }
    })
  );

/**
 * Connect the local database hydration progress states
 */
const connectLocaldbHydrateDone = (network: ConnectedProlinkNetwork) =>
  network.localdb.on(
    'hydrationDone',
    action(({device, slot}) => {
      const deviceStore = store.devices.get(device.id);

      if (deviceStore === undefined) {
        return;
      }

      const progress = deviceStore.hydrationProgress.get(slot);

      if (progress === undefined) {
        throw new Error('Recieved hydration completion before any progress');
      }

      progress.isDone = true;
    })
  );

const connectMixstatus = (network: ConnectedProlinkNetwork) => {
  const mixstatus = new MixstatusProcessor();
  network.statusEmitter.on('status', s => mixstatus.handleState(s));

  mixstatus.on(
    'nowPlaying',
    action(async state => {
      const playedAt = new Date();

      await when(() => store.devices.get(state.deviceId)?.track?.id === state.trackId);

      const device = store.devices.get(state.deviceId);
      const track = device?.track;

      // There was a problem loading the track, nothing we can do here. This
      // shouldn't happen since the when won't have ran
      if (track === undefined) {
        console.warn('Failed to mark now playing for track');
        return;
      }

      const played = new PlayedTrack(playedAt, track);
      played.artwork = device?.artwork;

      store.mixstatus.trackHistory.push(played);
    })
  );
};
