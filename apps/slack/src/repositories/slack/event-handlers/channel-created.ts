// import { SlackAPIClient } from 'slack-web-api-client';
import { conversations } from '@/database/schema';
import { db } from '@/database/client';
// import { env } from '@/common/env';
import type { SlackEventHandler } from './types';

export const channelCreatedHandler: SlackEventHandler<'channel_created'> = async (
  {
    team_id: teamId,
    event: {
      channel: { id: channelId, name: channelName },
    },
  },
  { step }
) => {
  // Unnecessary as you can't create a slack connect channel directly but need to convert it later
  // const slackWebClient = new SlackAPIClient(env.REMOVE_ME_SLACK_OAUTH_TOKEN);
  // const response = await slackWebClient.conversations.info({
  //   channel: event.channel.id,
  // });

  // if (!response.channel) {
  //   throw new Error('Failed to get channel information');
  // }

  await db
    .insert(conversations)
    .values({
      teamId,
      id: channelId,
      name: channelName,
      isSharedExternally: Boolean(false),
      lastSyncedAt: new Date(),
    })
    .onConflictDoNothing();

  await step.sendEvent('synchronize-conversation-messages', {
    name: 'conversations/synchronize',
    data: {
      teamId,
      isFirstSync: false,
      syncStartedAt: Date.now(),
    },
  });
};
