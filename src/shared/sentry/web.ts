import * as Sentry from '@sentry/browser';
import '@sentry/apm';

import {dsn} from './dsn';
import {User} from '@sentry/browser';

Sentry.init({
  dsn,
  release: process.env.RELEASE,
  environment: process.env.RELEASE_CHANNEL,
  sampleRate: 1,
  tracesSampleRate: 1,
});

export const setSentryUser = (user: User) => Sentry.setUser(user);
