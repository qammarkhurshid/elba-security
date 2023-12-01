import { eq } from 'drizzle-orm';
import { db } from '@/database/client';
import { teams } from '@/database/schema';
import { env } from '@/common/env';
import type { SlackMessageHandler } from './types';

export const messageDeletedHandler: SlackMessageHandler<'message_deleted'> = async (event) => {
  const teamId = event.team_id;
  const team = await db.query.teams.findFirst({
    where: eq(teams.id, teamId),
    columns: {
      elbaOrganisationId: true,
    },
  });

  if (!team) {
    // TODO: remove me?
    throw new Error('Team not found');
  }

  const id = JSON.stringify([teamId, event.channel, event.deleted_ts]);
  const deleteDPObjectResponse = await fetch(
    `${env.ELBA_API_BASE_URL}/api/rest/data-protection/objects`,
    {
      method: 'DELETE',
      body: JSON.stringify({
        sourceId: env.ELBA_SOURCE_ID,
        organisationId: team.elbaOrganisationId,
        ids: [id],
      }),
    }
  );
  const responseBody = await deleteDPObjectResponse.text();
  console.log({ responseBody });
};
