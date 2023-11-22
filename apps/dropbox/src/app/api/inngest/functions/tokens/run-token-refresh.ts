import { inngest } from '@/app/api/inngest/client';
import { refreshDropboxAccessTokens } from './refresh-dropbox-tokens';

export const runTokenRefresh = inngest.createFunction(
  { id: 'run-token-refresh' },
  { event: 'tokens/refresh-tokens' },
  async ({ event, step }) => {
    return await refreshDropboxAccessTokens(event.data);
  }
);
