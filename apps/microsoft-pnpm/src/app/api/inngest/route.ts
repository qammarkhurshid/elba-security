import { serve } from 'inngest/next';
import { inngest } from './client';
import { runThirdPartyAppsScan } from './third-party-apps/run-third-party-apps-scan';
import { scheduleThirdPartyAppsScans } from './third-party-apps/schedule-third-party-apps-scan';
import { runUsersScan } from './users/run-users-scan';
import { scheduleUsersScans } from './users/schedule-users-scan';

export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [scheduleUsersScans, scheduleThirdPartyAppsScans, runUsersScan, runThirdPartyAppsScan],
});
