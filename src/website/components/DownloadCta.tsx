import * as React from 'react';
import styled from '@emotion/styled';
import {motion} from 'framer-motion';
import {request} from '@octokit/request';
import {Endpoints} from '@octokit/types';

import {AppleLogo, WindowsLogo, LinuxLogo} from 'src/shared/components/Icons';
import {format, parseISO} from 'date-fns';
import {GITHUB_REPO} from '../constants';

type Platform = NonNullable<ReturnType<typeof getPlatform>>;
type Release = Endpoints['GET /repos/:owner/:repo/releases/latest']['response'];

const useRelease = () => {
  const [release, setRelease] = React.useState<Release | null>(null);

  const getReleases = async () => {
    const release = await request('GET /repos/:owner/:repo/releases/latest', GITHUB_REPO);
    setRelease(release);
  };

  React.useEffect(() => void getReleases(), []);

  return release;
};

const getPlatform = () => {
  const platform = window.navigator.platform.toLowerCase();

  if (platform.startsWith('win')) {
    return 'win';
  }
  if (platform.startsWith('mac')) {
    return 'mac';
  }
  if (platform.startsWith('linux')) {
    return 'linux';
  }

  return null;
};

const PLATFORM: Record<Platform, {icon: React.ReactNode; label: string}> = {
  mac: {icon: <AppleLogo />, label: 'macOS'},
  win: {icon: <WindowsLogo />, label: 'windows'},
  linux: {icon: <LinuxLogo />, label: 'linux'},
};

const DownloadCta = (props: React.ComponentProps<typeof motion.div>) => {
  const platform = getPlatform() ?? 'mac';
  const release = useRelease();

  const handleDownload = (e: React.MouseEvent) => {
    e.preventDefault();

    if (release === null) {
      return;
    }

    // Find the asset for the paltform they're on
    const asset = release.data.assets.find(asset => asset.name.includes(platform));
    if (asset) {
      window.location.replace(asset.browser_download_url);
    }
  };

  const {icon, label} = PLATFORM[platform];

  return (
    <motion.div {...props}>
      <DownloadButton onClick={handleDownload}>
        {icon}
        download for {label}
      </DownloadButton>

      <VersionTag>
        version {release?.data.name.slice(1) ?? 'x.x.x'}
        <small>
          {release
            ? format(parseISO(release.data.published_at), 'MMMM do yyyy')
            : 'Fetching release...'}
        </small>
      </VersionTag>
    </motion.div>
  );
};

const DownloadButton = styled('button')`
  font-family: 'DM Mono';
  letter-spacing: -0.75px;
  font-size: 1rem;
  background: #f84b4b;
  color: #fff;
  padding: 0.5rem 0.75rem;
  display: grid;
  grid-auto-flow: column;
  grid-gap: 0.5rem;
  border: 0;
  align-items: center;
  border-radius: 2px;
  cursor: pointer;
  transition: background 200ms ease-in-out;

  &:hover {
    background: #e54949;
  }
`;

const VersionTag = styled('div')`
  font-size: 0.875rem;
  margin-top: 0.75rem;

  small {
    display: block;
    font-weight: 300;
    line-height: 2;
    color: #939393;
  }
`;

export default DownloadCta;
