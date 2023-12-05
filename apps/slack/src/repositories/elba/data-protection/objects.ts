import type { DataProtectionObject } from '@elba-security/sdk';
import {
  type SlackMessage,
  getMessageUrl,
  convertTsToIsoString,
} from '@/repositories/slack/messages';

const formatDataProtectionObjectId = ({
  teamId,
  conversationId,
  messageId,
}: {
  teamId: string;
  conversationId: string;
  messageId: string;
}) => {
  return JSON.stringify([teamId, conversationId, messageId]);
};

export const formatDataProtectionObject = ({
  teamId,
  teamUrl,
  conversationId,
  conversationName,
  threadId,
  message,
}: {
  teamId: string;
  teamUrl: string;
  conversationId: string;
  conversationName: string;
  threadId?: string;
  message: SlackMessage;
}): DataProtectionObject => {
  const messageId = message.ts;
  const dataProtectionObjectId = formatDataProtectionObjectId({
    teamId,
    conversationId,
    messageId,
  });
  const url = getMessageUrl({ teamUrl, conversationId, messageId, threadId });
  const sentAt = convertTsToIsoString(messageId);
  let editedAt: string | undefined;
  if (message.edited?.ts) {
    editedAt = convertTsToIsoString(message.edited.ts);
  }

  return {
    id: dataProtectionObjectId,
    name: `Sent on ${sentAt} #${conversationName}`,
    metadata: {
      teamId,
      channelId: conversationId,
      messageId,
      type: threadId ? 'reply' : 'message',
    },
    updatedAt: editedAt,
    ownerId: message.user,
    permissions: [
      {
        type: 'anyone',
        id: 'anyone',
      },
    ],
    url,
  };
};
