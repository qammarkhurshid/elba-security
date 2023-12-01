import type { NextRequest } from 'next/server';
import { handleSlackWebhookMessage } from './service';

// TODO
// export const runtime = 'edge';
// export const preferredRegion = 'fra1';
export const fetchCache = 'default-no-store';

export const POST = async (request: NextRequest) => {
  return handleSlackWebhookMessage(request);
};
