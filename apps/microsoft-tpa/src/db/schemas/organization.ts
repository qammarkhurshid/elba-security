import { InferInsertModel, InferSelectModel } from 'drizzle-orm';
import { date, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';

export const organizations = pgTable('organization', {
  id: uuid('id').notNull().primaryKey().defaultRandom(),
  tenantId: text('tenant_id').unique().notNull(),
  lastTpaScan: timestamp('last_tpa_scan'),
  lastUserScan: timestamp('last_user_scan'),
});

export type Organization = InferSelectModel<typeof organizations>;
export type OrganizationInsertInput = InferInsertModel<typeof organizations>;
