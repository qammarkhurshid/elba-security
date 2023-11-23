import { inngest } from '@/app/api/inngest/client';
import { handler } from './service';

export const runTokenRefresh = inngest.createFunction(
  { id: 'run-refresh-tokens' },
  { event: 'tokens/run-refresh-tokens' },
  handler
);
