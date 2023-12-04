import { uuid, integer, text, timestamp, unique, pgTable, boolean } from 'drizzle-orm/pg-core';
import { type InferSelectModel } from 'drizzle-orm';

export const Organisation = pgTable('organisation', {
  id: uuid('organisation_id').primaryKey(),
  isActivated: boolean('is_activated').default(false),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const Installation = pgTable('installation', {
  id: integer('id').unique().notNull(),
  organisationId: uuid('organisation_id')
    .references(() => Organisation.id, { onDelete: 'cascade' })
    .unique()
    .notNull(),
  accountId: integer('account_id').unique(),
  accountLogin: text('account_login').notNull(),
  suspendedAt: timestamp('suspended_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export type SelectOrganisation = InferSelectModel<typeof Organisation>;

export const InstallationAdmin = pgTable(
  'installation_admin',
  {
    installationId: integer('installation_id')
      .references(() => Installation.id, { onDelete: 'cascade' })
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
