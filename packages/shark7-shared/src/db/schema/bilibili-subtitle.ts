import { relations, sql } from 'drizzle-orm'
import {
    bigint,
    boolean,
    foreignKey,
    doublePrecision,
    index,
    integer,
    jsonb,
    pgTable,
    text,
    timestamp,
    uniqueIndex,
    varchar,
} from 'drizzle-orm/pg-core'

const createdAt = timestamp('created_at', { withTimezone: true }).defaultNow().notNull()
const updatedAt = timestamp('updated_at', { withTimezone: true }).defaultNow().notNull()

export const bilibiliVideos = pgTable('bilibili_video', {
    id: bigint('id', { mode: 'number' }).primaryKey().generatedAlwaysAsIdentity(),
    bvid: varchar('bvid', { length: 32 }).notNull(),
    aid: bigint('aid', { mode: 'number' }).notNull(),
    title: text('title').notNull(),
    ownerMid: bigint('owner_mid', { mode: 'number' }).notNull(),
    ownerName: text('owner_name').notNull(),
    videos: integer('videos').notNull().default(1),
    coverUrl: text('cover_url'),
    publishTime: timestamp('publish_time', { withTimezone: true }),
    raw: jsonb('raw').$type<Record<string, unknown>>().notNull(),
    createdAt,
    updatedAt,
}, (table) => [
    uniqueIndex('bilibili_video_bvid_uidx').on(table.bvid),
    uniqueIndex('bilibili_video_aid_uidx').on(table.aid),
    index('bilibili_video_owner_mid_idx').on(table.ownerMid),
])

export const bilibiliVideoPages = pgTable('bilibili_video_page', {
    id: bigint('id', { mode: 'number' }).primaryKey().generatedAlwaysAsIdentity(),
    videoId: bigint('video_id', { mode: 'number' })
        .notNull()
        .references(() => bilibiliVideos.id, { onDelete: 'cascade' }),
    cid: bigint('cid', { mode: 'number' }).notNull(),
    pageNo: integer('page_no').notNull(),
    part: text('part').notNull(),
    durationSeconds: integer('duration_seconds').notNull(),
    firstFrameUrl: text('first_frame_url'),
    raw: jsonb('raw').$type<Record<string, unknown>>().notNull(),
    createdAt,
    updatedAt,
}, (table) => [
    uniqueIndex('bilibili_video_page_cid_uidx').on(table.cid),
    uniqueIndex('bilibili_video_page_video_page_no_uidx').on(table.videoId, table.pageNo),
    index('bilibili_video_page_video_id_idx').on(table.videoId),
])

export const bilibiliVideoSubtitleTracks = pgTable('bilibili_video_subtitle_track', {
    id: bigint('id', { mode: 'number' }).primaryKey().generatedAlwaysAsIdentity(),
    pageId: bigint('page_id', { mode: 'number' })
        .notNull()
        .references(() => bilibiliVideoPages.id, { onDelete: 'cascade' }),
    subtitleIdStr: varchar('subtitle_id_str', { length: 64 }).notNull(),
    lan: varchar('lan', { length: 32 }).notNull(),
    lanDoc: varchar('lan_doc', { length: 64 }).notNull(),
    isAi: boolean('is_ai').notNull().default(true),
    isAutoSelected: boolean('is_auto_selected').notNull().default(false),
    isAvailable: boolean('is_available').notNull().default(true),
    subtitleUrl: text('subtitle_url'),
    aiType: integer('ai_type'),
    aiStatus: integer('ai_status'),
    sourceType: varchar('source_type', { length: 32 }).notNull().default('bilibili'),
    raw: jsonb('raw').$type<Record<string, unknown>>().notNull(),
    fetchedAt: timestamp('fetched_at', { withTimezone: true }).defaultNow().notNull(),
    createdAt,
    updatedAt,
}, (table) => [
    uniqueIndex('bilibili_video_subtitle_track_page_subtitle_uidx').on(table.pageId, table.subtitleIdStr),
    index('bilibili_video_subtitle_track_page_id_idx').on(table.pageId),
    index('bilibili_video_subtitle_track_page_lan_idx').on(table.pageId, table.lan),
    index('bilibili_video_subtitle_track_page_selected_idx').on(table.pageId, table.isAutoSelected),
])

export const bilibiliVideoSubtitleSegments = pgTable('bilibili_video_subtitle_segment', {
    id: bigint('id', { mode: 'number' }).primaryKey().generatedAlwaysAsIdentity(),
    trackId: bigint('track_id', { mode: 'number' })
        .notNull()
        .references(() => bilibiliVideoSubtitleTracks.id, { onDelete: 'cascade' }),
    cid: bigint('cid', { mode: 'number' }).notNull(),
    sid: integer('sid').notNull(),
    startSeconds: doublePrecision('start_seconds').notNull(),
    endSeconds: doublePrecision('end_seconds').notNull(),
    content: text('content').notNull(),
    musicScore: doublePrecision('music_score'),
    location: integer('location'),
    raw: jsonb('raw').$type<Record<string, unknown>>(),
    createdAt,
}, (table) => [
    uniqueIndex('bilibili_video_subtitle_segment_track_sid_uidx').on(table.trackId, table.sid),
    index('bilibili_video_subtitle_segment_cid_start_idx').on(table.cid, table.startSeconds),
])

export const aiVideoSummaries = pgTable('ai_video_summary', {
    id: bigint('id', { mode: 'number' }).primaryKey().generatedAlwaysAsIdentity(),
    videoId: bigint('video_id', { mode: 'number' })
        .notNull()
        .references(() => bilibiliVideos.id, { onDelete: 'cascade' }),
    pageId: bigint('page_id', { mode: 'number' })
        .references(() => bilibiliVideoPages.id, { onDelete: 'cascade' }),
    summaryType: varchar('summary_type', { length: 32 }).notNull().default('full'),
    status: varchar('status', { length: 32 }).notNull().default('pending'),
    modelName: varchar('model_name', { length: 128 }),
    promptVersion: varchar('prompt_version', { length: 64 }),
    subtitleTrackId: bigint('subtitle_track_id', { mode: 'number' })
        .references(() => bilibiliVideoSubtitleTracks.id, { onDelete: 'set null' }),
    inputHash: varchar('input_hash', { length: 128 }).notNull(),
    summaryText: text('summary_text'),
    summaryJson: jsonb('summary_json').$type<Record<string, unknown>>(),
    errorMessage: text('error_message'),
    startedAt: timestamp('started_at', { withTimezone: true }),
    finishedAt: timestamp('finished_at', { withTimezone: true }),
    createdAt,
    updatedAt,
}, (table) => [
    uniqueIndex('ai_video_summary_scope_hash_uidx')
        .on(table.videoId, table.pageId, table.summaryType, table.inputHash),
    uniqueIndex('ai_video_summary_full_scope_hash_uidx')
        .on(table.videoId, table.summaryType, table.inputHash)
        .where(sql`${table.pageId} is null`),
    index('ai_video_summary_video_status_idx').on(table.videoId, table.status),
    index('ai_video_summary_page_status_idx').on(table.pageId, table.status),
])

export const bilibiliFetchJobs = pgTable('bilibili_fetch_job', {
    id: bigint('id', { mode: 'number' }).primaryKey().generatedAlwaysAsIdentity(),
    jobType: varchar('job_type', { length: 32 }).notNull(),
    targetBvid: varchar('target_bvid', { length: 32 }),
    targetMid: bigint('target_mid', { mode: 'number' }),
    targetSeriesId: bigint('target_series_id', { mode: 'number' }),
    status: varchar('status', { length: 32 }).notNull().default('pending'),
    attempt: integer('attempt').notNull().default(0),
    maxAttempts: integer('max_attempts').notNull().default(1),
    errorCode: varchar('error_code', { length: 64 }),
    errorMessage: text('error_message'),
    retryable: boolean('retryable').notNull().default(false),
    nextRetryAt: timestamp('next_retry_at', { withTimezone: true }),
    sourceJobId: bigint('source_job_id', { mode: 'number' }),
    payload: jsonb('payload').$type<Record<string, unknown>>(),
    startedAt: timestamp('started_at', { withTimezone: true }),
    finishedAt: timestamp('finished_at', { withTimezone: true }),
    createdAt,
    updatedAt,
}, (table) => [
    index('bilibili_fetch_job_type_status_idx').on(table.jobType, table.status),
    index('bilibili_fetch_job_target_bvid_idx').on(table.targetBvid),
    index('bilibili_fetch_job_retry_idx').on(table.jobType, table.status, table.retryable, table.nextRetryAt),
    foreignKey({
        name: 'bilibili_fetch_job_source_job_id_fk',
        columns: [table.sourceJobId],
        foreignColumns: [table.id],
    }).onDelete('set null'),
])

export const bilibiliVideoRelations = relations(bilibiliVideos, ({ many }) => ({
    pages: many(bilibiliVideoPages),
    summaries: many(aiVideoSummaries),
}))

export const bilibiliVideoPageRelations = relations(bilibiliVideoPages, ({ one, many }) => ({
    video: one(bilibiliVideos, {
        fields: [bilibiliVideoPages.videoId],
        references: [bilibiliVideos.id],
    }),
    tracks: many(bilibiliVideoSubtitleTracks),
    summaries: many(aiVideoSummaries),
}))

export const bilibiliVideoSubtitleTrackRelations = relations(bilibiliVideoSubtitleTracks, ({ one, many }) => ({
    page: one(bilibiliVideoPages, {
        fields: [bilibiliVideoSubtitleTracks.pageId],
        references: [bilibiliVideoPages.id],
    }),
    segments: many(bilibiliVideoSubtitleSegments),
    summaries: many(aiVideoSummaries),
}))

export const bilibiliVideoSubtitleSegmentRelations = relations(bilibiliVideoSubtitleSegments, ({ one }) => ({
    track: one(bilibiliVideoSubtitleTracks, {
        fields: [bilibiliVideoSubtitleSegments.trackId],
        references: [bilibiliVideoSubtitleTracks.id],
    }),
}))

export const aiVideoSummaryRelations = relations(aiVideoSummaries, ({ one }) => ({
    video: one(bilibiliVideos, {
        fields: [aiVideoSummaries.videoId],
        references: [bilibiliVideos.id],
    }),
    page: one(bilibiliVideoPages, {
        fields: [aiVideoSummaries.pageId],
        references: [bilibiliVideoPages.id],
    }),
    subtitleTrack: one(bilibiliVideoSubtitleTracks, {
        fields: [aiVideoSummaries.subtitleTrackId],
        references: [bilibiliVideoSubtitleTracks.id],
    }),
}))

export type InsertBilibiliVideo = typeof bilibiliVideos.$inferInsert
export type SelectBilibiliVideo = typeof bilibiliVideos.$inferSelect
export type InsertBilibiliVideoPage = typeof bilibiliVideoPages.$inferInsert
export type SelectBilibiliVideoPage = typeof bilibiliVideoPages.$inferSelect
export type InsertBilibiliVideoSubtitleTrack = typeof bilibiliVideoSubtitleTracks.$inferInsert
export type SelectBilibiliVideoSubtitleTrack = typeof bilibiliVideoSubtitleTracks.$inferSelect
export type InsertBilibiliVideoSubtitleSegment = typeof bilibiliVideoSubtitleSegments.$inferInsert
export type SelectBilibiliVideoSubtitleSegment = typeof bilibiliVideoSubtitleSegments.$inferSelect
export type InsertAiVideoSummary = typeof aiVideoSummaries.$inferInsert
export type SelectAiVideoSummary = typeof aiVideoSummaries.$inferSelect
export type InsertBilibiliFetchJob = typeof bilibiliFetchJobs.$inferInsert
export type SelectBilibiliFetchJob = typeof bilibiliFetchJobs.$inferSelect

export const bilibiliSubtitleSchemaSqlHints = {
    touchUpdatedAt: sql`now()`,
}
