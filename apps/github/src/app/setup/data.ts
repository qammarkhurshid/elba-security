import type { PgInsertValue, PgUpdateSetSource } from 'drizzle-orm/pg-core';
import { eq } from 'drizzle-orm';
import { Installation, Organisation, db } from '@/database';

export const insertInstallation = async (
  values: PgInsertValue<typeof Installation> & PgUpdateSetSource<typeof Installation>
) => {
  await db.insert(Organisation).values({ id: values.organisationId }).onConflictDoNothing();
  // remove previous installation - one installation per org is supported right now
  await db.delete(Installation).where(eq(Installation.organisationId, values.organisationId));

  const [installation] = await db.insert(Installation).values(values).returning();

  if (!installation) {
    throw new Error('Could not insert installation');
  }

  return installation;
};
