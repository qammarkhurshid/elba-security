import { and, eq } from 'drizzle-orm';
import { SlackAPIClient } from 'slack-web-api-client';
import { decrypt } from '@/common/crypto';
import { db } from '@/database/client';
import { teams } from '@/database/schema';
import { messageMetadataSchema } from '@/connectors/elba/data-protection/metadata';

export const deleteDataProtectionObject = async ({
  organisationId,
  metadata,
}: {
  organisationId: string;
  metadata: any; // eslint-disable-line -- metadata type is any
}) => {
  const messageMetadataResult = messageMetadataSchema.safeParse(metadata);
  if (!messageMetadataResult.success) {
    throw new Error('Invalid message metadata');
  }

  const { teamId, conversationId, messageId } = messageMetadataResult.data;
  const team = await db.query.teams.findFirst({
    where: and(eq(teams.id, teamId), eq(teams.elbaOrganisationId, organisationId)),
    columns: {
      token: true,
    },
  });
  if (!team) {
    throw new Error("Couldn't find team");
  }

  const token = await decrypt(team.token);

  const slackClient = new SlackAPIClient(token);

  await slackClient.chat.delete({
    channel: conversationId,
    ts: messageId,
    as_user: true,
  });
};
