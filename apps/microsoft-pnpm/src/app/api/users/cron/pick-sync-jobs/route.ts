import { db } from '@/lib/db';
import { scanUsersByTenantId } from '@/repositories/microsoft/users';
import { organizations } from '@/schemas/organization';
import { syncJobs } from '@/schemas/sync-job';
import { eq, asc, sql } from 'drizzle-orm';

export const runtime = 'edge';

export async function GET(): Promise<Response> {
  try {
    const [job] = await db
      .select()
      .from(syncJobs)
      .where(eq(syncJobs.status, 'started'))
      .orderBy(asc(syncJobs.createdAt))
      .limit(1);
    if (!job) {
      return new Response('No organization to sync');
    }
    const result = await scanUsersByTenantId(job.tenantId, job.paginationToken);
    await db.delete(syncJobs).where(eq(syncJobs.id, job.id));
    if (!result.pageLink) {
      await db
        .update(organizations)
        .set({ lastUserScan: sql`now()` })
        .where(eq(organizations.id, job.id));
    } else {
      await db.insert(syncJobs).values({
        tenantId: job.tenantId,
        type: 'users',
        paginationToken: result.pageLink,
      });
    }
    return new Response(JSON.stringify(result));
  } catch (e) {
    return new Response(e, { status: 500 });
  }
}
