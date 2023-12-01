import { and, eq } from 'drizzle-orm';
import { conversations } from '@/database/schema';
import { db } from '@/database/client';
import type { SlackEventHandler } from './types';

export const channelArchiveHandler: SlackEventHandler<'channel_archive'> = async ({
  team_id: teamId,
  event: { channel: channelId },
}) => {
  await db
    .delete(conversations)
    .where(and(eq(conversations.teamId, teamId), eq(conversations.id, channelId)));

  // TODO: trigger full scan
};
