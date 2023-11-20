import type { InferSelectModel } from 'drizzle-orm';
import { integer, pgTable, text, timestamp } from 'drizzle-orm/pg-core';
import { organizations } from './organization';

export const UsersSyncJob = pgTable('users_sync_jobs', {
  tenantId: integer('tenant_id')
    .references(() => organizations.tenantId)
    .unique()
    .notNull(),
  priority: integer('priority').notNull(),
  cursor: text('cursor'),
  syncStartedAt: timestamp('sync_started_at').defaultNow().notNull(),
  retryCount: integer('retry_count').default(0).notNull(),
  retryAfter: timestamp('retry_after'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export type SelectUsersSyncJob = InferSelectModel<typeof UsersSyncJob>;
