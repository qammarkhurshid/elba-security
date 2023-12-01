import type { GetEvents, GetFunctionInput } from 'inngest';
import { EventSchemas, Inngest } from 'inngest';
import type { InngestEvents } from './functions';
import { slackRateLimitMiddleware } from './middlewares/slack';

export const inngest = new Inngest({
  id: 'slack',
  schemas: new EventSchemas().fromRecord<InngestEvents>(),
  middleware: [slackRateLimitMiddleware],
});

type InngestClient = typeof inngest;

export type GetInngestFunctionInput<T extends keyof GetEvents<InngestClient>> = GetFunctionInput<
  InngestClient,
  T
>;
