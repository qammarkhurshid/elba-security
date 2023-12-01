import type { EnvelopedEvent, SlackEvent } from '@slack/bolt';
import type { GetInngestFunctionInput } from '@/inngest/client';
import { inngest } from '@/inngest/client';
import { slackEventHandler } from './event-handlers';

export const slackWebhookHandlerEventName = 'slack/webhook.handle';

export type SlackWebhookHandlerEventName = typeof slackWebhookHandlerEventName;

export type SlackEvents = {
  [slackWebhookHandlerEventName]: SlackWebhookHandler;
};

export type SlackWebhookHandler = {
  data: EnvelopedEvent<SlackEvent>;
};

export const slackWebhookHandler = inngest.createFunction(
  { id: 'handle-slack-webhook-message', retries: 5 },
  { event: slackWebhookHandlerEventName },
  slackEventHandler
);

export type SlackWebhookHandlerContext = GetInngestFunctionInput<SlackWebhookHandlerEventName>;

export const slackFunctions = [slackWebhookHandler];
