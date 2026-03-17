import { and, asc, desc, eq, inArray, sql } from 'drizzle-orm'
import {
    aiStreamerScheduleRuns,
    streamerScheduleEvidence,
    streamerScheduleItems,
    type InsertStreamerScheduleItem,
    type Shark7PgDatabase,
    type StreamerScheduleQueryItem,
} from 'shark7-shared'
import type { ExistingSchedulePromptItem, ScheduleRefreshSource } from './types.ts'

export class AiStreamerScheduleRepository {
    db: Shark7PgDatabase

    constructor(db: Shark7PgDatabase) {
        this.db = db
    }

    async findSuccessfulRunBySourceHash(sourceType: string, sourceId: string, inputHash: string) {
        return this.db.query.aiStreamerScheduleRuns.findFirst({
            where: and(
                eq(aiStreamerScheduleRuns.sourceType, sourceType),
                eq(aiStreamerScheduleRuns.sourceId, sourceId),
                eq(aiStreamerScheduleRuns.inputHash, inputHash),
                eq(aiStreamerScheduleRuns.status, 'success'),
            ),
            orderBy: [desc(aiStreamerScheduleRuns.createdAt)],
        })
    }

    async findLatestRunBySourceHash(sourceType: string, sourceId: string, inputHash: string) {
        return this.db.query.aiStreamerScheduleRuns.findFirst({
            where: and(
                eq(aiStreamerScheduleRuns.sourceType, sourceType),
                eq(aiStreamerScheduleRuns.sourceId, sourceId),
                eq(aiStreamerScheduleRuns.inputHash, inputHash),
            ),
            orderBy: [desc(aiStreamerScheduleRuns.createdAt)],
        })
    }

    async createRunningRun(params: {
        streamerId: string
        sourceType: string
        sourceId: string
        inputHash: string
        modelName: string
        promptVersion: string
        requestJson: Record<string, unknown>
    }) {
        const [row] = await this.db.insert(aiStreamerScheduleRuns)
            .values({
                streamerId: params.streamerId,
                sourceType: params.sourceType,
                sourceId: params.sourceId,
                status: 'running',
                modelName: params.modelName,
                promptVersion: params.promptVersion,
                inputHash: params.inputHash,
                requestJson: params.requestJson,
                startedAt: new Date(),
                updatedAt: sql`now()`,
            })
            .onConflictDoNothing({
                target: [
                    aiStreamerScheduleRuns.sourceType,
                    aiStreamerScheduleRuns.sourceId,
                    aiStreamerScheduleRuns.inputHash,
                ],
            })
            .returning({ id: aiStreamerScheduleRuns.id })
        return row?.id ?? null
    }

    async reclaimFailedRun(runId: number, params: {
        modelName: string
        promptVersion: string
        requestJson: Record<string, unknown>
    }) {
        const [row] = await this.db.update(aiStreamerScheduleRuns)
            .set({
                status: 'running',
                modelName: params.modelName,
                promptVersion: params.promptVersion,
                requestJson: params.requestJson,
                responseJson: null,
                errorMessage: null,
                startedAt: new Date(),
                finishedAt: null,
                updatedAt: sql`now()`,
            })
            .where(and(
                eq(aiStreamerScheduleRuns.id, runId),
                eq(aiStreamerScheduleRuns.status, 'failed'),
            ))
            .returning({ id: aiStreamerScheduleRuns.id })
        return row?.id ?? null
    }

    async markRunSuccess(runId: number, responseJson: Record<string, unknown>) {
        await this.db.update(aiStreamerScheduleRuns)
            .set({
                status: 'success',
                responseJson,
                finishedAt: new Date(),
                updatedAt: sql`now()`,
            })
            .where(eq(aiStreamerScheduleRuns.id, runId))
    }

    async markRunFailed(runId: number, errorMessage: string, responseJson?: Record<string, unknown>) {
        await this.db.update(aiStreamerScheduleRuns)
            .set({
                status: 'failed',
                errorMessage,
                responseJson: responseJson ?? null,
                finishedAt: new Date(),
                updatedAt: sql`now()`,
            })
            .where(eq(aiStreamerScheduleRuns.id, runId))
    }

    async listActivePromptItems(streamerId: string): Promise<ExistingSchedulePromptItem[]> {
        const items = await this.db.select().from(streamerScheduleItems)
            .where(and(
                eq(streamerScheduleItems.streamerId, streamerId),
                eq(streamerScheduleItems.status, 'active'),
            ))
            .orderBy(asc(streamerScheduleItems.startAt), asc(streamerScheduleItems.startDate), asc(streamerScheduleItems.id))

        return this.attachEvidenceToPromptItems(items)
    }

    async listWindowItems(streamerId: string): Promise<StreamerScheduleQueryItem[]> {
        const items = await this.db.select().from(streamerScheduleItems)
            .where(and(
                eq(streamerScheduleItems.streamerId, streamerId),
                eq(streamerScheduleItems.status, 'active'),
            ))
            .orderBy(asc(streamerScheduleItems.startAt), asc(streamerScheduleItems.startDate), asc(streamerScheduleItems.id))

        const evidenceMap = await this.getEvidenceMap(items.map((item) => item.id))
        return items.map((item) => ({
            itemId: item.id,
            startDate: item.startDate,
            endDate: item.endDate,
            startAt: item.startAt?.toISOString() ?? null,
            endAt: item.endAt?.toISOString() ?? null,
            timeText: item.timeText,
            title: item.title,
            summary: item.summary,
            category: item.category as StreamerScheduleQueryItem['category'],
            scheduleState: item.scheduleState as StreamerScheduleQueryItem['scheduleState'],
            certainty: item.certainty as StreamerScheduleQueryItem['certainty'],
            timePrecision: item.timePrecision as StreamerScheduleQueryItem['timePrecision'],
            confidence: item.confidence,
            sources: evidenceMap.get(item.id) ?? [],
        }))
    }

    async findActiveItemById(itemId: number) {
        return this.db.query.streamerScheduleItems.findFirst({
            where: and(
                eq(streamerScheduleItems.id, itemId),
                eq(streamerScheduleItems.status, 'active'),
            ),
        })
    }

    async findActiveItemByDedupeKey(streamerId: string, dedupeKey: string) {
        return this.db.query.streamerScheduleItems.findFirst({
            where: and(
                eq(streamerScheduleItems.streamerId, streamerId),
                eq(streamerScheduleItems.dedupeKey, dedupeKey),
                eq(streamerScheduleItems.status, 'active'),
            ),
            orderBy: [desc(streamerScheduleItems.updatedAt)],
        })
    }

    async createScheduleItem(values: InsertStreamerScheduleItem) {
        const [row] = await this.db.insert(streamerScheduleItems)
            .values(values)
            .returning({ id: streamerScheduleItems.id })
        if (!row) {
            throw new Error('创建日程项失败')
        }
        return row.id
    }

    async updateScheduleItem(itemId: number, values: Partial<InsertStreamerScheduleItem>) {
        await this.db.update(streamerScheduleItems)
            .set({
                ...values,
                updatedAt: sql`now()`,
            })
            .where(eq(streamerScheduleItems.id, itemId))
    }

    async cancelScheduleItem(itemId: number) {
        await this.db.update(streamerScheduleItems)
            .set({
                status: 'cancelled',
                updatedAt: sql`now()`,
            })
            .where(eq(streamerScheduleItems.id, itemId))
    }

    async upsertEvidence(itemId: number, source: ScheduleRefreshSource, evidenceText: string) {
        const rawJson = source.sourceType === 'weibo_comment'
            ? {
                comment: source.raw,
                mblog: source.mblog.raw,
            }
            : source.raw

        await this.db.insert(streamerScheduleEvidence)
            .values({
                itemId,
                sourceType: source.sourceType,
                sourceId: source.sourceId,
                sourceUrl: source.sourceUrl,
                sourcePublishedAt: new Date(source.sourcePublishedAt),
                evidenceText,
                isPrimary: true,
                rawJson,
            })
            .onConflictDoUpdate({
                target: [
                    streamerScheduleEvidence.itemId,
                    streamerScheduleEvidence.sourceType,
                    streamerScheduleEvidence.sourceId,
                ],
                set: {
                    sourceUrl: source.sourceUrl,
                    sourcePublishedAt: new Date(source.sourcePublishedAt),
                    evidenceText,
                    isPrimary: true,
                    rawJson,
                },
            })
    }

    async attachEvidenceToPromptItems(items: Array<typeof streamerScheduleItems.$inferSelect>): Promise<ExistingSchedulePromptItem[]> {
        const evidenceMap = await this.getEvidenceMap(items.map((item) => item.id))
        return items.map((item) => ({
            itemId: item.id,
            title: item.title,
            category: item.category as ExistingSchedulePromptItem['category'],
            scheduleState: item.scheduleState as ExistingSchedulePromptItem['scheduleState'],
            status: item.status,
            certainty: item.certainty as ExistingSchedulePromptItem['certainty'],
            startDate: item.startDate,
            endDate: item.endDate,
            startAt: item.startAt?.toISOString() ?? null,
            endAt: item.endAt?.toISOString() ?? null,
            dateText: item.dateText,
            timeText: item.timeText,
            timePrecision: item.timePrecision as ExistingSchedulePromptItem['timePrecision'],
            summary: item.summary,
            sources: (evidenceMap.get(item.id) ?? []).map((source) => ({
                sourceType: source.sourceType,
                sourceId: source.sourceId,
                sourcePublishedAt: source.sourcePublishedAt,
                evidenceText: source.evidenceText,
            })),
        }))
    }

    async getEvidenceMap(itemIds: number[]) {
        const evidenceRows = itemIds.length === 0
            ? []
            : await this.db.select().from(streamerScheduleEvidence)
                .where(inArray(streamerScheduleEvidence.itemId, itemIds))
                .orderBy(asc(streamerScheduleEvidence.itemId), asc(streamerScheduleEvidence.createdAt))

        const result = new Map<number, StreamerScheduleQueryItem['sources']>()
        for (const row of evidenceRows) {
            const current = result.get(row.itemId) ?? []
            current.push({
                sourceType: row.sourceType as 'weibo_mblog' | 'weibo_comment',
                sourceId: row.sourceId,
                sourceUrl: row.sourceUrl,
                sourcePublishedAt: row.sourcePublishedAt.toISOString(),
                evidenceText: row.evidenceText,
            })
            result.set(row.itemId, current)
        }
        return result
    }
}
