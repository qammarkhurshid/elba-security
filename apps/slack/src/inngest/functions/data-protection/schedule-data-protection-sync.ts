import { db } from '@/database/client';
import { inngest } from '@/inngest/client';

export const scheduleDataProtectionSync = inngest.createFunction(
  { id: 'schedule-data-protection-sync', retries: 5 },
  { cron: 'TZ=Europe/Paris 0 0 * * 0' }, // every sunday at midnight
  async ({ step }) => {
    const teams = await step.run('get-teams', async () => {
      return db.query.teams.findMany({
        columns: {
          id: true,
        },
      });
    });

    if (teams.length) {
      await step.sendEvent(
        'start-data-protection-sync',
        teams.map(({ id: teamId }) => ({
          name: 'conversations/synchronize',
          data: {
            teamId,
            isFirstSync: false,
            syncStartedAt: new Date().toISOString(),
          },
        }))
      );
    }

    return { teams };
  }
);
