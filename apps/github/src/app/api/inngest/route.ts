import { serve } from 'inngest/next';
import { inngest } from './client';
import { scheduleUsersScans } from './functions/schedule-users-scans';
import { scheduleThirdPartyAppsScans } from './functions/schedule-third-party-apps-scans';
import { runUsersScan } from './functions/run-users-scan';
import { runThirdPartyAppsScan } from './functions/run-third-party-apps-scan';

export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [scheduleUsersScans, scheduleThirdPartyAppsScans, runUsersScan, runThirdPartyAppsScan],
});
