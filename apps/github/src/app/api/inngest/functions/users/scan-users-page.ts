import { Elba, type User } from '@elba-security/sdk';
import type { OrganizationMember } from '@/repositories/github/organization';
import { getPaginatedOrganizationMembers } from '@/repositories/github/organization';
import { env } from '@/env';
import { inngest } from '../../client';
import { deleteInstallationAdminsSyncedBefore, insertInstallationAdmins } from '../data';
import { handleError } from '../utils';

const formatElbaUser = (member: OrganizationMember): User => ({
  id: String(member.id),
  email: member.email ?? undefined,
  displayName: member.name ?? member.login,
  additionalEmails: [],
});

export const scanUsersPage = inngest.createFunction(
  {
    id: 'scan-users-page',
    priority: {
      run: 'event.data.isFirstScan ? 600 : 0',
    },
    retries: env.USERS_SYNC_MAX_RETRY,
    idempotency:
      env.VERCEL_ENV && env.VERCEL_ENV !== 'development' ? 'event.data.installationId' : undefined,
    concurrency: [
      {
        limit: env.MAX_CONCURRENT_USERS_SYNC,
      },
      {
        key: 'event.data.installationId',
        limit: 1,
      },
    ],
  },
  {
    event: 'users/scan-page',
  },
  async ({ event, step }) => {
    const { installationId, organisationId, accountLogin, cursor } = event.data;
    const syncStartedAt = new Date(event.data.syncStartedAt);

    const elba = new Elba({
      organisationId,
      sourceId: env.ELBA_SOURCE_ID,
      apiKey: env.ELBA_API_KEY,
      baseUrl: env.ELBA_API_BASE_URL,
    });

    const nextCursor = await step
      .run('paginate', async () => {
        const result = await getPaginatedOrganizationMembers(installationId, accountLogin, cursor);

        const installationAdmins = result.validMembers
          .filter((member) => member.role === 'ADMIN')
          .map((member) => ({
            installationId,
            adminId: member.id,
            lastSyncAt: syncStartedAt,
          }));

        if (installationAdmins.length > 0) {
          await insertInstallationAdmins(installationAdmins, syncStartedAt);
        }

        if (result.validMembers.length > 0) {
          await elba.users.update({ users: result.validMembers.map(formatElbaUser) });
        }

        return result.nextCursor;
      })
      .catch(handleError);

    if (nextCursor) {
      await step.sendEvent('scan-users-page', {
        name: 'users/scan-page',
        data: {
          ...event.data,
          cursor: nextCursor,
        },
      });
    } else {
      await step.run('finalize', async () => {
        await elba.users.delete({ syncedBefore: syncStartedAt.toISOString() });
        await deleteInstallationAdminsSyncedBefore(installationId, syncStartedAt);
      });
      return {
        status: 'completed',
      };
    }

    return {
      status: 'ongoing',
    };
  }
);
