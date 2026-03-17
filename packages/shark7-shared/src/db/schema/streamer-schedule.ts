import { relations, sql } from 'drizzle-orm'
import {
    bigint,
    boolean,
    doublePrecision,
    index,
    jsonb,
    pgTable,
    text,
    timestamp,
    uniqueIndex,
    varchar,
} from 'drizzle-orm/pg-core'

const createdAt = timestamp('created_at', { withTimezone: true }).defaultNow().notNull()
const updatedAt = timestamp('updated_at', { withTimezone: true }).defaultNow().notNull()

export const streamerScheduleItems = pgTable('streamer_schedule_item', {
    id: bigint('id', { mode: 'number' }).primaryKey().generatedAlwaysAsIdentity(),
    streamerId: varchar('streamer_id', { length: 64 }).notNull(),
    platform: varchar('platform', { length: 32 }).notNull().default('weibo'),
    externalUserId: bigint('external_user_id', { mode: 'number' }).notNull(),
    title: text('title').notNull(),
    category: varchar('category', { length: 32 }).notNull(),
    scheduleState: varchar('schedule_state', { length: 32 }).notNull().default('scheduled'),
    status: varchar('status', { length: 32 }).notNull().default('active'),
    certainty: varchar('certainty', { length: 32 }).notNull().default('unknown'),
    confidence: doublePrecision('confidence'),
    startDate: varchar('start_date', { length: 10 }),
    endDate: varchar('end_date', { length: 10 }),
    startAt: timestamp('start_at', { withTimezone: true }),
    endAt: timestamp('end_at', { withTimezone: true }),
    dateText: text('date_text'),
    timeText: text('time_text'),
    timePrecision: varchar('time_precision', { length: 32 }).notNull().default('unknown'),
    timezone: varchar('timezone', { length: 64 }).notNull().default('Asia/Shanghai'),
    summary: text('summary'),
    dedupeKey: varchar('dedupe_key', { length: 128 }).notNull(),
    extraJson: jsonb('extra_json').$type<Record<string, unknown>>(),
    lastExtractedAt: timestamp('last_extracted_at', { withTimezone: true }).defaultNow().notNull(),
    lastConfirmedAt: timestamp('last_confirmed_at', { withTimezone: true }),
    createdAt,
    updatedAt,
}, (table) => [
    index('streamer_schedule_item_streamer_status_date_idx').on(table.streamerId, table.status, table.startDate),
    index('streamer_schedule_item_streamer_start_at_idx').on(table.streamerId, table.startAt),
    index('streamer_schedule_item_streamer_dedupe_idx').on(table.streamerId, table.dedupeKey),
])

export const streamerScheduleEvidence = pgTable('streamer_schedule_evidence', {
    id: bigint('id', { mode: 'number' }).primaryKey().generatedAlwaysAsIdentity(),
    itemId: bigint('item_id', { mode: 'number' })
        .notNull()
        .references(() => streamerScheduleItems.id, { onDelete: 'cascade' }),
    sourceType: varchar('source_type', { length: 32 }).notNull(),
    sourceId: varchar('source_id', { length: 128 }).notNull(),
    sourceUrl: text('source_url'),
    sourcePublishedAt: timestamp('source_published_at', { withTimezone: true }).notNull(),
    evidenceText: text('evidence_text').notNull(),
    isPrimary: boolean('is_primary').notNull().default(true),
    rawJson: jsonb('raw_json').$type<Record<string, unknown>>(),
    createdAt,
}, (table) => [
    uniqueIndex('streamer_schedule_evidence_item_source_uidx').on(table.itemId, table.sourceType, table.sourceId),
    index('streamer_schedule_evidence_source_idx').on(table.sourceType, table.sourceId),
])

export const aiStreamerScheduleRuns = pgTable('ai_streamer_schedule_run', {
    id: bigint('id', { mode: 'number' }).primaryKey().generatedAlwaysAsIdentity(),
    streamerId: varchar('streamer_id', { length: 64 }).notNull(),
    sourceType: varchar('source_type', { length: 32 }).notNull(),
    sourceId: varchar('source_id', { length: 128 }).notNull(),
    status: varchar('status', { length: 32 }).notNull().default('pending'),
    modelName: varchar('model_name', { length: 128 }),
    promptVersion: varchar('prompt_version', { length: 64 }),
    inputHash: varchar('input_hash', { length: 128 }).notNull(),
    requestJson: jsonb('request_json').$type<Record<string, unknown>>(),
    responseJson: jsonb('response_json').$type<Record<string, unknown>>(),
    errorMessage: text('error_message'),
    startedAt: timestamp('started_at', { withTimezone: true }),
    finishedAt: timestamp('finished_at', { withTimezone: true }),
    createdAt,
    updatedAt,
}, (table) => [
    uniqueIndex('ai_streamer_schedule_run_source_hash_uidx').on(table.sourceType, table.sourceId, table.inputHash),
    index('ai_streamer_schedule_run_streamer_status_idx').on(table.streamerId, table.status),
])

export const streamerScheduleItemRelations = relations(streamerScheduleItems, ({ many }) => ({
    evidence: many(streamerScheduleEvidence),
}))

export const streamerScheduleEvidenceRelations = relations(streamerScheduleEvidence, ({ one }) => ({
    item: one(streamerScheduleItems, {
        fields: [streamerScheduleEvidence.itemId],
        references: [streamerScheduleItems.id],
    }),
}))

export type InsertStreamerScheduleItem = typeof streamerScheduleItems.$inferInsert
export type SelectStreamerScheduleItem = typeof streamerScheduleItems.$inferSelect
export type InsertStreamerScheduleEvidence = typeof streamerScheduleEvidence.$inferInsert
export type SelectStreamerScheduleEvidence = typeof streamerScheduleEvidence.$inferSelect
export type InsertAiStreamerScheduleRun = typeof aiStreamerScheduleRuns.$inferInsert
export type SelectAiStreamerScheduleRun = typeof aiStreamerScheduleRuns.$inferSelect

export const streamerScheduleSchemaSqlHints = {
    touchUpdatedAt: sql`now()`,
}
