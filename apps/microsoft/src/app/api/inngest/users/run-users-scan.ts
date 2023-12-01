/* eslint-disable @typescript-eslint/no-loop-func -- TODO: disable this rule */
/* eslint-disable no-await-in-loop -- TODO: disable this rule */
import { Elba } from 'elba-sdk';
import { getTokenByTenantId } from '@/common/microsoft';
import { scanUsersByTenantId } from '@/repositories/microsoft/users';
import { env } from '@/common/env';
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
    const elba = new Elba({
      apiKey: env.ELBA_API_KEY,
      organisationId: organization.elbaOrganizationId,
      sourceId: env.ELBA_SOURCE_ID,
      baseUrl: env.ELBA_API_BASE_URL,
    });
    let pageLink: string | undefined;

    do {
      pageLink =
        (await step
          .run(`scan`, async () => {
            const { formattedUsers, nextLink } = await scanUsersByTenantId({
              accessToken: token.accessToken,
              tenantId,
              pageLink,
            });

            if (formattedUsers.length > 0) {
              await elba.users.update({ users: formattedUsers });
            }

            return nextLink;
          })
          .catch(handleError)) ?? undefined;
    } while (pageLink);

    await step.run('finalize', () =>
      elba.users.delete({ syncedBefore: syncStartedAt.toISOString() })
    );

    if (isFirstScan) {
      await inngest.send({
        name: 'third-party-apps/scan',
        data: { tenantId, isFirstScan: true },
      });
    }
  }
);
