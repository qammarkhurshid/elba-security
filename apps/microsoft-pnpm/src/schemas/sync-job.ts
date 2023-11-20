import type { InferInsertModel, InferSelectModel } from 'drizzle-orm';
import { pgEnum, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { organizations } from './organization';

export const SyncJobStatusEnum = pgEnum('sync_job_status', ['scheduled', 'started']);

export const SyncJobTypeEnumValues = ['users', 'apps'] as const;
export const SyncJobTypeEnum = pgEnum('sync_job_type', SyncJobTypeEnumValues);

export type SyncJobType = (typeof SyncJobTypeEnumValues)[number];

export const syncJobs = pgTable('sync_job', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: text('tenant_id')
    .notNull()
    .references(() => organizations.tenantId),
  status: SyncJobStatusEnum('status').default('scheduled').notNull(),
  type: SyncJobTypeEnum('type').notNull(),
  paginationToken: text('pagination_token'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export type SyncJob = InferSelectModel<typeof syncJobs>;
export type SyncJobInsertInput = InferInsertModel<typeof syncJobs>;
