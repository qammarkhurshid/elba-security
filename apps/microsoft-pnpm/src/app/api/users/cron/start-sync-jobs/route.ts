import { db } from '@/lib/db';
import { syncJobs } from '@/schemas/sync-job';
import { eq, asc, sql } from 'drizzle-orm';
import { startUsersSyncJobs } from './service';

export const runtime = 'edge';

export async function GET(): Promise<Response> {
  try {
    const [jobToStart] = await db
      .select()
      .from(syncJobs)
      .where(eq(syncJobs.type, 'users'))
      .orderBy(asc(syncJobs.createdAt))
      .limit(1);
    if (!jobToStart) {
      return new Response('No organization to sync');
    }
    const result = await startUsersSyncJobs(jobToStart.id);
    return new Response(JSON.stringify(result));
  } catch (e) {
    return new Response(e, { status: 500 });
  }
}
