import { db } from '@/lib/db';
import { scanUsersByTenantId } from '@/repositories/microsoft/users';
import { organizations } from '@/schemas/organization';
import { syncJobs } from '@/schemas/syncJob';
import { eq, asc, sql } from 'drizzle-orm';

export const runtime = 'edge';

export async function GET(): Promise<Response> {
  try {
    const [orgToSync] = await db.select().from(syncJobs).orderBy(asc(syncJobs.createdAt)).limit(1);
    if (!orgToSync) {
      return new Response('No organization to sync', { status: 200 });
    }
    const result = await scanUsersByTenantId(orgToSync.tenantId, orgToSync.paginationToken);
    await db.delete(syncJobs).where(eq(syncJobs.id, orgToSync.id));
    if (!result.pageLink) {
      await db
        .update(organizations)
        .set({ lastUserScan: sql`now()` })
        .where(eq(organizations.id, orgToSync.id));
    } else {
      await db.insert(syncJobs).values({
        tenantId: orgToSync.tenantId,
        type: 'users',
        paginationToken: result.pageLink,
      });
    }
    return new Response(JSON.stringify(result), { status: 200 });
  } catch (e) {
    return new Response(e, { status: 500 });
  }
}
