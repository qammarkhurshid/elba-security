import { and, eq } from 'drizzle-orm';
import { conversations } from '@/database/schema';
import { db } from '@/database/client';
import type { SlackEventHandler } from './types';

export const channelDeletedHandler: SlackEventHandler<'channel_deleted'> = async ({
  team_id: teamId,
  event: { channel: channelId },
}) => {
  await db
    .delete(conversations)
    .where(and(eq(conversations.teamId, teamId), eq(conversations.id, channelId)));

  // TODO: trigger full scan

  return { message: 'Channel deleted', teamId, channelId };
};
