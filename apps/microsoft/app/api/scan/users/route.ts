import { db } from '#src/lib/db';
import { scanUsersByTenantId } from '#src/microsoft/users';
import { organizations } from '#src/schemas/organization';
import { syncJobs } from '#src/schemas/sync-job';
import { eq, asc } from 'drizzle-orm';

export const runtime = 'edge';

export async function POST(_req: Request): Promise<Response> {
  try {
    const orgToSync = await db.select().from(syncJobs).orderBy(asc(syncJobs.createdAt)).limit(1);
    if (!orgToSync[0]) {
      return new Response('No organization to sync', { status: 200 });
    }
    const result = await scanUsersByTenantId(orgToSync[0].tenantId, orgToSync[0].paginationToken);
    await db.delete(syncJobs).where(eq(syncJobs.id, orgToSync[0].id));
    if (!result.pageLink) {
      await db
        .update(organizations)
        .set({ lastUserScan: new Date() })
        .where(eq(organizations.id, orgToSync[0].id));
    } else {
      await db.insert(syncJobs).values({
        tenantId: orgToSync[0].tenantId,
        type: 'users',
        paginationToken: result.pageLink,
      });
    }
    return new Response(JSON.stringify(result), { status: 200 });
  } catch (e) {
    return new Response(e, { status: 500 });
  }
}
