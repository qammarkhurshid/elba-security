import { serve } from 'inngest/next';
import { inngest } from './client';
import { scheduleUsersScans } from './functions/users/schedule-users-scans';
import { scheduleAppsScans } from './functions/third-party-apps/schedule-apps-scans';
import { scanUsers } from './functions/users/scan-users';
import { scanUsersPage } from './functions/users/scan-users-page';
import { scanApps } from './functions/third-party-apps/scan-apps';
import { scanAppsPage } from './functions/third-party-apps/scan-apps-page';

export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [
    scanApps,
    scanAppsPage,
    scanUsers,
    scanUsersPage,
    scheduleAppsScans,
    scheduleUsersScans,
  ],
});
