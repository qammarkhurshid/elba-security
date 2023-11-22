import { inngest, type FunctionHandler } from '@/app/api/inngest/client';

export const handler: FunctionHandler = async () => {
  return inngest.send({
    name: 'tokens/refresh-tokens',
    data: {},
  });
};

export const scheduleTokenRefreshJob = inngest.createFunction(
  { id: 'schedule-token-refresh-job' },
  { cron: '* * * * *' },
  handler
);
