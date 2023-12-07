import { eq } from 'drizzle-orm';
import { db } from '@/database/client';
import { teams } from '@/database/schema';
import { createElbaClient } from '@/repositories/elba/client';
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
    // TODO: remove me? use non retryable error?
    throw new Error('Team not found');
  }

  const messageEvent = event.event;
  const id = JSON.stringify([teamId, messageEvent.channel, messageEvent.deleted_ts]);
  const elbaClient = createElbaClient(team.elbaOrganisationId);

  await elbaClient.dataProtection.deleteObjects({ ids: [id] });

  return {
    message: 'Message deleted',
    teamId,
    channelId: messageEvent.channel,
    messageId: messageEvent.deleted_ts,
  };
};
