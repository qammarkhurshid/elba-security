import { db } from '@/lib/db';
import { organizations } from '@/schemas/organization';
import { inngest } from '../client';

export const scheduleThirdPartyAppsScans = inngest.createFunction(
  { id: 'schedule-third-party-apps-scans' },
  { cron: '0 0 * * *' },
  async () => {
    const orgs = await db.select({ tenantId: organizations.tenantId }).from(organizations);
    await Promise.all(
      orgs.map(({ tenantId }) =>
        inngest.send({
          name: 'third-party-apps/scan',
          data: { tenantId, isFirstScan: false },
        })
      )
    );
  }
);
