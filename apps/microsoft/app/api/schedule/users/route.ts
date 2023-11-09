import { db } from '#src/lib/db';
import { organizations } from '#src/schemas/organization';
import { eq, lte } from 'drizzle-orm';
import { scheduleUserSyncJobs } from './service';

export const runtime = 'edge';

export async function POST(_req: Request): Promise<Response> {
  try {
    const orgsToSync = await db
      .select()
      .from(organizations)
      .where(lte(organizations.lastUserScan, new Date(Date.now() - 1000 * 60 * 60)));
    if (!orgsToSync[0]) {
      return new Response('No organization to sync', { status: 200 });
    }
    const result = await scheduleUserSyncJobs(orgsToSync);
    return new Response(JSON.stringify(result), { status: 200 });
  } catch (e) {
    return new Response(e.message, { status: 500 });
  }
}
