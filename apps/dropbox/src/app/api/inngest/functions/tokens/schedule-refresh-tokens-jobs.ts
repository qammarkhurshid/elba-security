import { inngest, type FunctionHandler } from '@/app/api/inngest/client';

export const handler: FunctionHandler = async () => {
  return inngest.send({
    name: 'tokens/run-refresh-tokens',
    data: {},
  });
};

export const scheduleTokenRefreshJob = inngest.createFunction(
  { id: 'schedule-token-refresh-jobs' },
  { cron: '* * * * *' },
  handler
);
