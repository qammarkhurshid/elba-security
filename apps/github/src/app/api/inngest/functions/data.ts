import { and, eq, isNull, lt, sql } from 'drizzle-orm';
import type { PgInsertValue } from 'drizzle-orm/pg-core';
import { NonRetriableError } from 'inngest';
import { Installation, InstallationAdmin, Organisation, db } from '@/database';

export const getUnsuspendedInstallationIds = async () => {
  const installations = await db
    .select({
      id: Installation.id,
    })
    .from(Installation)
    .leftJoin(Organisation, eq(Organisation.id, Installation.organisationId))
    .where(and(eq(Organisation.isActivated, true), isNull(Installation.suspendedAt)));

  return installations.map(({ id }) => id);
};

export const getInstallations = () =>
  db
    .select({
      id: Installation.id,
      organisationId: Installation.organisationId,
    })
    .from(Installation);

export const getUnsuspendedInstallation = async (installationId: number) => {
  const [installation] = await db
    .select()
    .from(Installation)
    .where(and(eq(Installation.id, installationId), isNull(Installation.suspendedAt)));

  if (!installation) {
    throw new NonRetriableError(`Installation with id=${installationId} not found or suspended`);
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
