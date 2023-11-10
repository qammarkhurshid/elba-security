import { eq } from 'drizzle-orm';
import { db } from '@/lib/db';
import { organizations } from '@/schemas/organization';

export const convertMinutesToMs = (minutes: number) => minutes * 60 * 1000;

export const checkOrganization = async (tenantId: string) => {
  const result = await db.select().from(organizations).where(eq(organizations.tenantId, tenantId));
  if (!result) {
    throw new Error(`Organization ${tenantId} not found`);
  }
};

export const timeout = (ms: number) => new Promise((res) => setTimeout(res, ms));
