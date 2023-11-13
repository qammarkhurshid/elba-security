import { db } from '@/lib/db';
import { organizations } from '@/schemas/organization';
import { syncJobs } from '@/schemas/syncJob';
import { eq, asc, sql } from 'drizzle-orm';
import { scanThirdPartyAppsByTenantId } from './service';

export const runtime = 'edge';

export async function GET() {
  try {
    const [orgToSync] = await db.select().from(syncJobs).orderBy(asc(syncJobs.createdAt)).limit(1);
    if (!orgToSync) {
      return new Response('No organization to sync', { status: 200 });
    }
    const result = await scanThirdPartyAppsByTenantId(
      orgToSync.tenantId,
      orgToSync.paginationToken
    );
    await db.delete(syncJobs).where(eq(syncJobs.id, orgToSync.id));
    if (!result.pageLink) {
      await db
        .update(organizations)
        .set({ lastTpaScan: sql`now()` })
        .where(eq(organizations.id, orgToSync.id));
    } else {
      await db.insert(syncJobs).values({
        tenantId: orgToSync.tenantId,
        type: 'apps',
        paginationToken: result.pageLink,
      });
    }
    return new Response(JSON.stringify(result), { status: 200 });
  } catch (e) {
    return new Response(e, { status: 500 });
  }
}
