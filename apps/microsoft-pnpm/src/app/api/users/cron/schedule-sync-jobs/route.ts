import { db } from '@/lib/db';
import { organizations } from '@/schemas/organization';
import { lte, sql } from 'drizzle-orm';
import { scheduleUserSyncJobs } from './service';

export const runtime = 'edge';

export async function POST(): Promise<Response> {
  try {
    const orgsToSync = await db
      .select()
      .from(organizations)
      .where(lte(organizations.lastUserScan, sql`now() - INTERVAL '1 second' * 3600`));
    if (!orgsToSync[0]) {
      return new Response('No organization to sync', { status: 200 });
    }
    const result = await scheduleUserSyncJobs(orgsToSync);
    return new Response(JSON.stringify(result), { status: 200 });
  } catch (e) {
    return new Response(e.message, { status: 500 });
  }
}
