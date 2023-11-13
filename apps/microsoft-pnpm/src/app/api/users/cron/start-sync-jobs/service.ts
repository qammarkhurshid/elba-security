import { db } from '@/lib/db';
import { syncJobs } from '@/schemas/sync-job';
import { eq } from 'drizzle-orm';

export const startUsersSyncJobs = async (jobId: string) =>
  db.update(syncJobs).set({ status: 'started' }).where(eq(syncJobs.id, jobId));
