import { eq } from 'drizzle-orm';
import { db } from '@/database/client';
import { teams } from '@/database/schema';
import { slackMemberSchema } from '@/repositories/slack/members';
import { createElbaClient } from '@/repositories/elba/client';
import type { SlackEventHandler } from './types';

export const userChangeHandler: SlackEventHandler<'user_change'> = async ({
  team_id: teamId,
  event: { user },
}) => {
  const result = slackMemberSchema.safeParse(user);
  // TODO: is_stranger?
  // TODO: handle slack connect
  if (user.is_bot || user.team_id !== teamId || !result.success) {
    return { message: 'Ignored: invalid user', user };
  }

  const team = await db.query.teams.findFirst({
    where: eq(teams.id, teamId),
    columns: { elbaOrganisationId: true },
  });

  if (!team) {
    throw new Error('Team not found');
  }

  const elbaClient = createElbaClient(team.elbaOrganisationId);

  if (user.deleted) {
    await elbaClient.users.delete({ ids: [result.data.id] });
  } else {
    // TODO: format user function
    await elbaClient.users.update({
      users: [
        {
          id: result.data.id,
          email: result.data.profile.email,
          displayName: result.data.real_name,
          additionalEmails: [],
        },
      ],
    });
  }

  return { message: `User ${user.deleted ? 'deleted' : 'updated'}`, teamId, user };
};
