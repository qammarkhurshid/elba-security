/* eslint-disable @typescript-eslint/no-loop-func -- TODO: disable this rule */
/* eslint-disable no-await-in-loop -- TODO: disable this rule */
import { ElbaRepository } from '@/repositories/elba/elba.repository';
import { scanUsersByTenantId } from '@/repositories/microsoft/users';
import { inngest } from '../client';
import { getOrganizationByTenantId } from './data';

export const runUsersScan = inngest.createFunction(
  {
    id: 'run-users-scan',
    priority: {
      run: 'event.data.isFirstScan ? 600 : 0',
    },
  },
  {
    event: 'users/scan',
    rateLimit: {
      key: 'event.data.tenantId',
      limit: 1,
      period: '24h',
    },
  },
  async ({ event, step }) => {
    const syncStartedAt = new Date();
    const { tenantId, isFirstScan } = event.data;

    const organization = await getOrganizationByTenantId(tenantId);
    const elba = new ElbaRepository(organization.elbaOrganizationId);
    let pageLink: string | null = null;

    do {
      try {
        pageLink = await step.run(`handle-page-${pageLink ?? 'first'}`, async () => {
          const { formattedUsers, nextLink } = await scanUsersByTenantId(tenantId, pageLink);

          if (formattedUsers.length > 0) {
            await elba.users.updateUsers(formattedUsers);
          }

          return nextLink;
        });
      } catch (error) {}
    } while (pageLink);

    await elba.users.deleteUsers(syncStartedAt);

    if (isFirstScan) {
      await inngest.send({
        name: 'third-party-apps/scan',
        data: { tenantId, isFirstScan: true },
      });
    }
  }
);
