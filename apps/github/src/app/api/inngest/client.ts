import { EventSchemas, Inngest } from 'inngest';
import { z } from 'zod';

export type FunctionHandler = Parameters<typeof inngest.createFunction>[2];

export const inngest = new Inngest({
  id: 'github',
  schemas: new EventSchemas().fromZod({
    'users/scan-page': {
      data: z.object({
        installationId: z.number(),
        organisationId: z.string().uuid(),
        accountLogin: z.string(),
        syncStartedAt: z.string(),
        cursor: z.string().nullable(),
        isFirstScan: z.boolean(),
      }),
    },
    'users/scan': {
      data: z.object({
        installationId: z.number().int().min(0),
        isFirstScan: z.boolean().default(false),
      }),
    },
    'third-party-apps/scan-page': {
      data: z.object({
        installationId: z.number(),
        organisationId: z.string().uuid(),
        accountLogin: z.string(),
        syncStartedAt: z.string(),
        adminsIds: z.array(z.string()),
        cursor: z.string().nullable(),
        isFirstScan: z.boolean(),
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
