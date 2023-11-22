import { Inngest } from 'inngest';

export type FunctionHandler = Parameters<typeof inngest.createFunction>[2];

// Create a client to send and receive events
export const inngest = new Inngest({ id: 'dropbox' });
