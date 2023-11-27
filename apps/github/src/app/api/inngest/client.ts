import { EventSchemas, Inngest } from 'inngest';
import { z } from 'zod';

export type FunctionHandler = Parameters<typeof inngest.createFunction>[2];

export const inngest = new Inngest({
  id: 'github',
  schemas: new EventSchemas().fromZod({
    'users/scan': {
      data: z.object({
        installationId: z.number().int().min(0),
        isFirstScan: z.boolean().default(false),
      }),
    },
    'third-party-apps/scan': {
      data: z.object({
        installationId: z.number().int().min(0),
        isFirstScan: z.boolean().default(false),
      }),
    },
  }),
});
