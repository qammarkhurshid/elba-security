import { db } from '@/lib/db';
import { organizations } from '@/schemas/organization';
import { syncJobs } from '@/schemas/syncJob';
import { eq, asc } from 'drizzle-orm';
import { scanThirdPartyAppsByTenantId } from './service';

export const runtime = 'edge';

export async function GET() {
  try {
    const orgToSync = await db.select().from(syncJobs).orderBy(asc(syncJobs.createdAt)).limit(1);
    if (!orgToSync[0]) {
      return new Response('No organization to sync', { status: 200 });
    }
    const result = await scanThirdPartyAppsByTenantId(
      orgToSync[0].tenantId,
      orgToSync[0].paginationToken
    );
    await db.delete(syncJobs).where(eq(syncJobs.id, orgToSync[0].id));
    if (!result.pageLink) {
      await db
        .update(organizations)
        .set({ lastTpaScan: new Date() })
        .where(eq(organizations.id, orgToSync[0].id));
    } else {
      await db.insert(syncJobs).values({
        tenantId: orgToSync[0].tenantId,
        type: 'apps',
        paginationToken: result.pageLink,
      });
    }
    return new Response(JSON.stringify(result), { status: 200 });
  } catch (e) {
    return new Response(e, { status: 500 });
  }
}
