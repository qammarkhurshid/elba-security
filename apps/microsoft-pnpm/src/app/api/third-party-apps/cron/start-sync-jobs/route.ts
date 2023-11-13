import { db } from '@/lib/db';
import { syncJobs } from '@/schemas/sync-job';
import { eq, asc, sql } from 'drizzle-orm';
import { startThirdPartyAppsSyncJobs } from './service';

export const runtime = 'edge';

export async function GET(): Promise<Response> {
  try {
    const [jobToStart] = await db
      .select()
      .from(syncJobs)
      .where(eq(syncJobs.type, 'apps'))
      .orderBy(asc(syncJobs.createdAt))
      .limit(1);
    if (!jobToStart) {
      return new Response('No organization to sync');
    }
    const result = await startThirdPartyAppsSyncJobs(jobToStart.id);
    return new Response(JSON.stringify(result));
  } catch (e) {
    return new Response(e, { status: 500 });
  }
}
