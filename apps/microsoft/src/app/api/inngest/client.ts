import { EventSchemas, Inngest } from 'inngest';
import { z } from 'zod';

export const inngest = new Inngest({
  id: 'microsoft',
  schemas: new EventSchemas().fromZod({
    'users/scan': {
      data: z.object({
        tenantId: z.string(),
        isFirstScan: z.boolean().default(false),
      }),
    },
    'third-party-apps/scan': {
      data: z.object({
        tenantId: z.string(),
        isFirstScan: z.boolean().default(false),
      }),
    },
  }),
});
