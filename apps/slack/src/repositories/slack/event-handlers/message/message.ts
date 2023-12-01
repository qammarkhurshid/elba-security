import { env } from 'node:process';
import type { GenericMessageEvent } from '@slack/bolt';
import { and, eq } from 'drizzle-orm';
import { db } from '@/database/client';
import { conversations } from '@/database/schema';
import { formatDataProtectionObject } from '@/repositories/elba/data-protection/objects';
import { slackMessageSchema } from '../../messages';

export const genericMessageHandler = async (event: GenericMessageEvent) => {
  const result = slackMessageSchema.safeParse(event);
  // TODO: remove condition? Confirm working for slack connect: seems ok
  const teamId = event.team;
  if (!teamId || !result.success) {
    return { message: 'Ignored: invalid generic message input' };
  }

  const conversation = await db.query.conversations.findFirst({
    with: {
      team: {
        columns: {
          url: true,
          elbaOrganisationId: true,
        },
      },
    },
    where: and(eq(conversations.teamId, teamId), eq(conversations.id, event.channel)),
  });

  if (!conversation) {
    // We don't throw an error as the message might come from a slack connect channel where the other team hasn't installed the app
    return { message: 'Ignored: conversation not found' };
  }

  const {
    team: { url: teamUrl, elbaOrganisationId },
    name: conversationName,
  } = conversation;

  const object = formatDataProtectionObject({
    teamId,
    teamUrl,
    conversationId: conversation.id,
    conversationName,
    threadId: result.data.thread_ts,
    message: result.data,
  });

  const updateDPObjectResponse = await fetch(
    `${env.ELBA_API_BASE_URL}/api/rest/data-protection/objects`,
    {
      method: 'POST',
      body: JSON.stringify({
        sourceId: env.ELBA_SOURCE_ID,
        organisationId: elbaOrganisationId,
        objects: [object],
      }),
    }
  );
  const body = await updateDPObjectResponse.json();

  console.log({ body });

  return { elbaOrganisationId, object };
};
