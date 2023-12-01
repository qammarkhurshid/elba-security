import { eq } from 'drizzle-orm';
import { teams } from '@/database/schema';
import { db } from '@/database/client';
import type { SlackEventHandler } from './types';

export const channelRenameHandler: SlackEventHandler<'team_domain_changed'> = async (
  { team_id: teamId, event: { url } },
  { step }
) => {
  await db
    .update(teams)
    .set({
      url,
    })
    .where(eq(teams.id, teamId));

  await step.sendEvent('synchronize-conversations', {
    name: 'conversations/synchronize',
    data: {
      teamId,
      isFirstSync: false,
      syncStartedAt: Date.now(),
    },
  });
};
