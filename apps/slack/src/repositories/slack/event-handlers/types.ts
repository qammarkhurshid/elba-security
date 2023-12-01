import type { EnvelopedEvent, KnownEventFromType, SlackEvent } from '@slack/bolt';
import type { SlackWebhookHandlerEventName } from '@/inngest/functions';
import type { GetInngestFunctionInput } from '@/inngest/client';

export type SlackEventHandler<T extends SlackEvent['type']> = (
  event: EnvelopedEvent<KnownEventFromType<T>>,
  context: GetInngestFunctionInput<SlackWebhookHandlerEventName>
) => Promise<unknown>;

export type SlackEventHandlers = Partial<{
  [EventType in SlackEvent['type']]: SlackEventHandler<EventType>;
}>;
