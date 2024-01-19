import { eq } from 'drizzle-orm';
import { logger } from '@elba-security/logger';
import { teams } from '@/database/schema';
import { db } from '@/database/client';
import type { SlackEventHandler } from './types';

export const appRateLimitedHandler: SlackEventHandler<'app_rate_limited'> = async ({
  team_id: teamId,
  event: { minute_rate_limited: minuteRateLimited },
}) => {
  const team = await db.query.teams.findFirst({
    where: eq(teams.id, teamId),
    columns: {
      elbaOrganisationId: true,
      elbaRegion: true,
    },
  });

  logger.error('Slack app rate limited', { teamId, minuteRateLimited, team });

  return { message: 'App rate limited', teamId, minuteRateLimited, team };
};
