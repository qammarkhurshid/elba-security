import { SlackAPIClient } from 'slack-web-api-client';
import { eq } from 'drizzle-orm';
import type { User } from '@elba-security/sdk';
import { db } from '@/database/client';
import { inngest } from '@/inngest/client';
import { slackMemberSchema } from '@/repositories/slack/members';
import { teams as teamsTable } from '@/database/schema';
import { createElbaClient } from '@/repositories/elba/client';

export type UsersEvents = {
  'users/synchronize': SynchronizeUsers;
};

type SynchronizeUsers = {
  data: {
    teamId: string;
    syncStartedAt: number;
    isFirstSync: boolean;
    cursor?: string;
  };
};

export const synchronizeUsers = inngest.createFunction(
  {
    id: 'synchronize-users',
    priority: {
      run: 'event.data.isFirstSync ? 600 : 0',
    },
    retries: 5,
  },
  { event: 'users/synchronize' },
  async ({
    event: {
      data: { teamId, syncStartedAt, isFirstSync, cursor },
    },
    step,
  }) => {
    const { elbaOrganisationId, token } = await step.run('get-token', async () => {
      const result = await db.query.teams.findFirst({
        where: eq(teamsTable.id, teamId),
        columns: { token: true, elbaOrganisationId: true },
      });

      if (!result) {
        throw new Error('Failed to find team');
      }

      return result;
    });

    const { members, nextCursor } = await step.run('listing-users', async () => {
      const slackWebClient = new SlackAPIClient(token);
      const { members: responseMember, response_metadata: responseMetadata } =
        await slackWebClient.users.list({
          limit: 1,
          cursor: cursor || undefined,
        });
      if (!responseMember) {
        throw new Error('An error occurred while listing slack users');
      }

      return { members: responseMember, nextCursor: responseMetadata?.next_cursor };
    });

    const users: User[] = [];
    for (const member of members) {
      const result = slackMemberSchema.safeParse(member);
      if (member.team_id === teamId && !member.deleted && !member.is_bot && result.success) {
        users.push({
          id: result.data.id,
          email: result.data.profile.email,
          displayName: result.data.real_name,
          additionalEmails: [],
        });
      }
    }

    const elbaClient = createElbaClient(elbaOrganisationId);

    await elbaClient.users.update({ users });

    if (nextCursor) {
      await step.sendEvent('next-pagination-cursor', {
        name: 'users/synchronize',
        data: {
          teamId,
          syncStartedAt,
          isFirstSync,
          cursor: nextCursor,
        },
      });
    } else {
      await elbaClient.users.delete({
        syncedBefore: new Date(syncStartedAt).toISOString(),
      });
    }

    return { users, nextCursor };
  }
);

export const scheduleUsersSync = inngest.createFunction(
  { id: 'schedule-users-sync', retries: 5 },
  { cron: 'TZ=Europe/Paris 0 0 * * *' },
  async ({ step }) => {
    const teams = await db.query.teams.findMany({
      columns: {
        id: true,
      },
    });
    await step.sendEvent(
      'start-users-sync',
      teams.map(({ id: teamId }) => ({
        name: 'users/synchronize',
        data: {
          teamId,
          isFirstSync: false,
          syncStartedAt: Date.now(),
        },
      }))
    );

    return { teams };
  }
);

export const usersFunctions = [synchronizeUsers, scheduleUsersSync];
