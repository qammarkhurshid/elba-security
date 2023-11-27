import { uuid, integer, text, index, timestamp, unique, pgTable } from 'drizzle-orm/pg-core';
import { type InferSelectModel } from 'drizzle-orm';

export const Installation = pgTable(
  'installation',
  {
    id: integer('id').primaryKey(),
    // TODO: support multiple github organization to elba organisation
    elbaOrganizationId: uuid('elba_organisation_id').unique().notNull(),
    accountId: integer('account_id').unique(),
    accountLogin: text('account_login').notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (appInstallations) => ({
    organizationIdIdx: index('organisation_id_idx').on(appInstallations.accountId),
    elbaOrganizationIdIdx: index('elba_organization_id_idx').on(
      appInstallations.elbaOrganizationId
    ),
  })
);

export type SelectInstallation = InferSelectModel<typeof Installation>;

export const InstallationAdmin = pgTable(
  'installation_admin',
  {
    installationId: integer('installation_id')
      .references(() => Installation.id)
      .notNull(),
    adminId: text('admin_id').notNull(),
    lastSyncAt: timestamp('last_sync_at').notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('update_at').defaultNow().notNull(),
  },
  (t) => ({
    unq: unique().on(t.installationId, t.adminId),
  })
);
