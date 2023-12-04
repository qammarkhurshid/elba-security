import { eq, sql } from 'drizzle-orm';
import { Installation, db } from '@/database';

export const getInstallation = async (installationId: number) => {
  const [installation] = await db
    .select()
    .from(Installation)
    .where(eq(Installation.id, installationId));

  if (!installation) {
    throw new Error(`Installation with id=${installationId} not found`);
  }

  return installation;
};

export const suspendInstallation = (installationId: number, suspendedAt?: Date) =>
  db
    .update(Installation)
    .set({ suspendedAt: suspendedAt || sql`now()` })
    .where(eq(Installation.id, installationId));

export const unsuspendInstallation = (installationId: number) =>
  db.update(Installation).set({ suspendedAt: null }).where(eq(Installation.id, installationId));

export const deleteInstallation = (installationId: number) =>
  db.delete(Installation).where(eq(Installation.id, installationId));
