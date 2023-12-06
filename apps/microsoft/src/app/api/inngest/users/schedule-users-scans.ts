import { db } from '@/lib/db';
import { organizations } from '@/schemas/organization';
import { inngest } from '../client';

export const scheduleUsersScans = inngest.createFunction(
  { id: 'schedule-users-scans' },
  { cron: '0 0 * * *' },
  async () => {
    const orgs = await db
      .select({
        tenantId: organizations.tenantId,
      })
      .from(organizations);
    await Promise.all(
      orgs.map(({ tenantId }) =>
        inngest.send({
          name: 'users/start',
          data: { tenantId, isFirstScan: false },
        })
      )
    );
    return {
      status: 'scheduled',
    };
  }
);
