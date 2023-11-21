import { and, eq, lt, sql } from 'drizzle-orm';
import type { PgInsertValue } from 'drizzle-orm/pg-core';
import { NonRetriableError } from 'inngest';
import { Installation, InstallationAdmin, db } from '@/database';

export const getInstallationIds = async () => {
  const installations = await db
    .select({
      id: Installation.id,
    })
    .from(Installation);

  return installations.map(({ id }) => id);
};

export const getInstallation = async (installationId: number) => {
  const [installation] = await db
    .select()
    .from(Installation)
    .where(eq(Installation.id, installationId));

  if (!installation) {
    throw new NonRetriableError(`Installation with id=${installationId} not found`);
  }

  return installation;
};

export const getInstallationAdminsIds = async (installationId: number) => {
  const admins = await db
    .select({ adminId: InstallationAdmin.adminId })
    .from(InstallationAdmin)
    .where(eq(InstallationAdmin.installationId, installationId));

  return admins.map(({ adminId }) => adminId);
};

export const insertInstallationAdmins = (
  admins: PgInsertValue<typeof InstallationAdmin>[],
  lastSyncAt: Date
) =>
  db
    .insert(InstallationAdmin)
    .values(admins)
    .onConflictDoUpdate({
      target: [InstallationAdmin.adminId, InstallationAdmin.installationId],
      set: {
        lastSyncAt,
        updatedAt: sql`now()`,
      },
    });

export const deleteInstallationAdminsSyncedBefore = (installationId: number, lastSyncAt: Date) =>
  db
    .delete(InstallationAdmin)
    .where(
      and(
        eq(InstallationAdmin.installationId, installationId),
        lt(InstallationAdmin.lastSyncAt, lastSyncAt)
      )
    );
