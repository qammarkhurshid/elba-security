/* eslint-disable @typescript-eslint/no-loop-func -- TODO: disable this rule */
/* eslint-disable no-await-in-loop -- TODO: disable this rule */
import { RetryAfterError } from 'inngest';
import { ElbaRepository } from '@/repositories/elba/elba.repository';
import type { OrganizationMember } from '@/repositories/github/organization';
import { getPaginatedOrganizationMembers } from '@/repositories/github/organization';
import type { User } from '@/repositories/elba/resources/users/types';
import { inngest } from '../client';
import {
  deleteInstallationAdminsSyncedBefore,
  getInstallation,
  insertInstallationAdmins,
} from './data';
import { handleError } from './utils';
import { env } from '@/env';

const formatElbaUser = (member: OrganizationMember): User => ({
  id: String(member.id),
  email: member.email ?? undefined,
  displayName: member.name ?? member.login,
  additionalEmails: [],
});

export const handler: Parameters<typeof inngest.createFunction>[2] = async ({ event, step }) => {
  if (!event.ts) {
    throw new Error('No timestamp');
  }
  const syncStartedAt = new Date(event.ts);
  const { installationId, isFirstScan } = event.data;
  const installation = await step.run('initialize', () => getInstallation(installationId));
  const elba = new ElbaRepository(installation.elbaOrganizationId);
  let cursor: string | null = null;

  do {
    cursor = await step
      .run('paginate', async () => {
        // TODO: add log for invalidMembers
        const { nextCursor, validMembers } = await getPaginatedOrganizationMembers(
          installationId,
          installation.accountLogin,
          cursor
        );

        const installationAdmins = validMembers
          .filter((member) => member.role === 'ADMIN')
          .map((member) => ({
            installationId,
            adminId: member.id,
            lastSyncAt: syncStartedAt,
          }));

        if (installationAdmins.length > 0) {
          await insertInstallationAdmins(installationAdmins, syncStartedAt);
        }

        if (validMembers.length > 0) {
          await elba.users.updateUsers(validMembers.map(formatElbaUser));
        }

        return nextCursor;
      })
      .catch(handleError);
  } while (cursor);

  await step.run('finalize', async () => {
    await elba.users.deleteUsers(syncStartedAt);
    await deleteInstallationAdminsSyncedBefore(installationId, syncStartedAt);

    if (isFirstScan) {
      await inngest.send({
        name: 'third-party-apps/scan',
        data: { installationId, isFirstScan: true },
      });
    }
  });

  return {
    installationId,
  };
};

export const runUsersScan = inngest.createFunction(
  {
    id: 'run-users-scan',
    priority: {
      run: 'event.data.isFirstScan ? 600 : 0',
    },
    retries: env.USERS_SYNC_MAX_RETRY,
    idempotency: 'event.data.installationId',
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
    event: 'users/scan',
  },
  handler
);
