import { and, eq } from 'drizzle-orm';
import { conversations } from '@/database/schema';
import { db } from '@/database/client';
import type { SlackEventHandler } from './types';

export const channelRenameHandler: SlackEventHandler<'channel_rename'> = async ({
  team_id: teamId,
  event: {
    channel: { id: channelId, name: channelName },
  },
}) => {
  await db
    .update(conversations)
    .set({
      name: channelName,
      // TODO: update last synced at?
    })
    .where(and(eq(conversations.teamId, teamId), eq(conversations.id, channelId)));

  // TODO: trigger scan? just for the name of issues

  return { message: 'Channel renamed', teamId, channelId, channelName };
};
