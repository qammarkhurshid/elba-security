import { inngest } from '@/app/api/inngest/client';
import { refreshDropboxAccessTokens } from './service';

export const runTokenRefresh = inngest.createFunction(
  { id: 'run-refresh-tokens' },
  { event: 'tokens/run-refresh-tokens' },
  async ({ event, step }) => {
    console.log('tokens/run-refresh-tokens');
    return await refreshDropboxAccessTokens(event.data);
  }
);
