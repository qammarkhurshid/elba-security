import crypto from 'node:crypto';
import type { NextRequest } from 'next/server';
import type { WebhookEvent } from '@octokit/webhooks-types';
import { env } from '@/env';
import { handleGithubWebhookEvent } from './service';

const verifySignature = (req: Request, body: string) => {
  const signature = crypto
    .createHmac('sha256', env.GITHUB_WEBHOOK_SECRET)
    .update(body)
    .digest('hex');
  const untrustedSignature = req.headers.get('x-hub-signature-256');
  if (!untrustedSignature) return false;
  const trusted = Buffer.from(`sha256=${signature}`, 'ascii');
  const untrusted = Buffer.from(untrustedSignature, 'ascii');
  return crypto.timingSafeEqual(trusted, untrusted);
};

export const POST = async (req: NextRequest) => {
  const body = await req.text();

  if (!verifySignature(req, body)) {
    return new Response('unauthorized', { status: 401 });
  }
  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment -- conveniency
  const event: WebhookEvent = JSON.parse(body);
  await handleGithubWebhookEvent(event);
  return new Response(null, { status: 204 });
};
