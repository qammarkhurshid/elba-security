import { and, eq } from 'drizzle-orm';
import { conversations } from '@/database/schema';
import { db } from '@/database/client';
import type { SlackEventHandler } from './types';

export const channelIdChangedHandler: SlackEventHandler<'channel_id_changed'> = async ({
  team_id: teamId,
  event: { new_channel_id: newChannelId, old_channel_id: oldChannelId },
}) => {
  await db
    .update(conversations)
    .set({
      id: newChannelId,
      // TODO: update last synced at?
    })
    .where(and(eq(conversations.teamId, teamId), eq(conversations.id, oldChannelId)));

  // TODO: trigger scan
  return { message: 'Channel id changed', teamId, oldChannelId, newChannelId };
};
