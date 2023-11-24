/* eslint-disable @typescript-eslint/no-loop-func -- TODO: disable this rule */
/* eslint-disable no-await-in-loop -- TODO: disable this rule */
import { getTokenByTenantId } from '@/common/microsoft';
import { ElbaRepository } from '@/repositories/elba/elba.repository';
import { scanUsersByTenantId } from '@/repositories/microsoft/users';
import { inngest } from '../client';
import { handleError } from '../functions/utils';
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

    const [organization, token] = await step.run('initialize', () =>
      Promise.all([getOrganizationByTenantId(tenantId), getTokenByTenantId(tenantId)])
    );
    const elba = new ElbaRepository(organization.elbaOrganizationId);
    let pageLink: string | null = null;

    do {
      pageLink = await step
        .run(`scan`, async () => {
          const { formattedUsers, nextLink } = await scanUsersByTenantId({
            accessToken: token.accessToken,
            tenantId,
            pageLink,
          });

          if (formattedUsers.length > 0) {
            await elba.users.updateUsers(formattedUsers);
          }

          return nextLink;
        })
        .catch(handleError);
    } while (pageLink);

    await step.run('finalize', () => elba.users.deleteUsers(syncStartedAt));

    if (isFirstScan) {
      await inngest.send({
        name: 'third-party-apps/scan',
        data: { tenantId, isFirstScan: true },
      });
    }
  }
);
