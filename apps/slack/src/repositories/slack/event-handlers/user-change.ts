import { eq } from 'drizzle-orm';
import type { SlackEventHandler } from '@/repositories/slack/event-handlers/types';
import { env } from '@/common/env';
import { db } from '@/database/client';
import { teams } from '@/database/schema';
import { slackMemberSchema } from '../members';

export const userChangeHandler: SlackEventHandler<'user_change'> = async ({
  team_id: teamId,
  event: { user },
}) => {
  const result = slackMemberSchema.safeParse(user);
  // TODO: is_stranger?
  if (user.is_bot || user.team_id !== teamId || !result.success) {
    return { message: 'Ignored: invalid user' };
  }

  const team = await db.query.teams.findFirst({
    where: eq(teams.id, teamId),
    columns: { elbaOrganisationId: true },
  });

  if (!team) {
    throw new Error('Team not found');
  }

  if (user.deleted) {
    // Call delete source user

    const deleteResponse = await fetch(`${env.ELBA_API_BASE_URL}/api/rest/users`, {
      method: 'DELETE',
      body: JSON.stringify({
        sourceId: env.ELBA_SOURCE_ID,
        organisationId: team.elbaOrganisationId,
        ids: [result.data.id],
      }),
    });
    const deleteResponseJson = await deleteResponse.json();
    console.log({ deleteResponseJson });
  } else {
    // Call update source user

    const updateResponse = await fetch(`${env.ELBA_API_BASE_URL}/api/rest/users`, {
      method: 'POST',
      body: JSON.stringify({
        sourceId: env.ELBA_SOURCE_ID,
        organisationId: team.elbaOrganisationId,
        users: [
          {
            id: result.data.id,
            email: result.data.profile.email,
            displayName: result.data.real_name,
            additionalEmails: [],
          },
        ],
      }),
    });
    const updateResponseJson = await updateResponse.json();
    console.log({ updateResponseJson });
  }
};
