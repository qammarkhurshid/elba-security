import { z } from 'zod';

export const slackTeamSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  url: z.string().url(),
});
