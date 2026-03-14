import { and, asc, desc, eq, isNull, sql } from 'drizzle-orm'
import {
    aiVideoSummaries,
    bilibiliVideos,
    bilibiliVideoPages,
    bilibiliVideoSubtitleSegments,
    bilibiliVideoSubtitleTracks,
    type Shark7PgDatabase,
} from 'shark7-shared'
import type { SubtitlePageTranscript, VideoTranscript } from './types.ts'

export class AiSummaryRepository {
    db: Shark7PgDatabase

    constructor(db: Shark7PgDatabase) {
        this.db = db
    }

    async getVideoTranscriptByBvid(bvid: string): Promise<VideoTranscript | null> {
        const rows = await this.db.select({
            videoId: bilibiliVideos.id,
            bvid: bilibiliVideos.bvid,
            aid: bilibiliVideos.aid,
            title: bilibiliVideos.title,
            ownerMid: bilibiliVideos.ownerMid,
            ownerName: bilibiliVideos.ownerName,
            pageId: bilibiliVideoPages.id,
            pageNo: bilibiliVideoPages.pageNo,
            cid: bilibiliVideoPages.cid,
            part: bilibiliVideoPages.part,
            durationSeconds: bilibiliVideoPages.durationSeconds,
            trackId: bilibiliVideoSubtitleTracks.id,
            sid: bilibiliVideoSubtitleSegments.sid,
            startSeconds: bilibiliVideoSubtitleSegments.startSeconds,
            endSeconds: bilibiliVideoSubtitleSegments.endSeconds,
            content: bilibiliVideoSubtitleSegments.content,
        })
            .from(bilibiliVideos)
            .innerJoin(bilibiliVideoPages, eq(bilibiliVideoPages.videoId, bilibiliVideos.id))
            .innerJoin(
                bilibiliVideoSubtitleTracks,
                and(
                    eq(bilibiliVideoSubtitleTracks.pageId, bilibiliVideoPages.id),
                    eq(bilibiliVideoSubtitleTracks.isAutoSelected, true),
                    eq(bilibiliVideoSubtitleTracks.isAvailable, true),
                ),
            )
            .innerJoin(bilibiliVideoSubtitleSegments, eq(bilibiliVideoSubtitleSegments.trackId, bilibiliVideoSubtitleTracks.id))
            .where(eq(bilibiliVideos.bvid, bvid))
            .orderBy(
                asc(bilibiliVideoPages.pageNo),
                asc(bilibiliVideoSubtitleSegments.sid),
            )

        if (rows.length === 0) {
            return null
        }

        const first = rows[0]
        const pages = new Map<number, SubtitlePageTranscript>()

        for (const row of rows) {
            const current = pages.get(row.pageId) ?? {
                pageId: row.pageId,
                pageNo: row.pageNo,
                cid: row.cid,
                part: row.part,
                durationSeconds: row.durationSeconds,
                trackId: row.trackId,
                text: '',
                segmentCount: 0,
            }
            const line = `[${formatTimestamp(row.startSeconds)}-${formatTimestamp(row.endSeconds)}] ${row.content.trim()}`
            current.text = current.text ? `${current.text}\n${line}` : line
            current.segmentCount += 1
            pages.set(row.pageId, current)
        }

        return {
            videoId: first.videoId,
            bvid: first.bvid,
            aid: first.aid,
            title: first.title,
            ownerMid: first.ownerMid,
            ownerName: first.ownerName,
            pages: [...pages.values()].sort((left, right) => left.pageNo - right.pageNo),
        }
    }

    async findSuccessfulFullSummary(videoId: number, inputHash: string) {
        return this.db.query.aiVideoSummaries.findFirst({
            where: and(
                eq(aiVideoSummaries.videoId, videoId),
                isNull(aiVideoSummaries.pageId),
                eq(aiVideoSummaries.summaryType, 'full'),
                eq(aiVideoSummaries.inputHash, inputHash),
                eq(aiVideoSummaries.status, 'success'),
            ),
            orderBy: [desc(aiVideoSummaries.createdAt)],
        })
    }

    async findRunningFullSummary(videoId: number, inputHash: string) {
        return this.db.query.aiVideoSummaries.findFirst({
            where: and(
                eq(aiVideoSummaries.videoId, videoId),
                isNull(aiVideoSummaries.pageId),
                eq(aiVideoSummaries.summaryType, 'full'),
                eq(aiVideoSummaries.inputHash, inputHash),
                eq(aiVideoSummaries.status, 'running'),
            ),
            orderBy: [desc(aiVideoSummaries.createdAt)],
        })
    }

    async markSummaryFailedById(summaryId: number, errorMessage: string) {
        await this.markSummaryFailed(summaryId, errorMessage)
    }

    async createRunningSummary(params: {
        videoId: number
        inputHash: string
        modelName: string
        promptVersion: string
    }) {
        const conflictTarget = [
            aiVideoSummaries.videoId,
            aiVideoSummaries.summaryType,
            aiVideoSummaries.inputHash,
        ]

        const [row] = await this.db.insert(aiVideoSummaries)
            .values({
                videoId: params.videoId,
                summaryType: 'full',
                status: 'running',
                modelName: params.modelName,
                promptVersion: params.promptVersion,
                inputHash: params.inputHash,
                startedAt: new Date(),
                updatedAt: sql`now()`,
            })
            .onConflictDoNothing({
                target: conflictTarget,
                where: sql`${aiVideoSummaries.pageId} is null`,
            })
            .returning({ id: aiVideoSummaries.id })
        return row?.id ?? null
    }

    async findLatestFullSummary(videoId: number, inputHash: string) {
        return this.db.query.aiVideoSummaries.findFirst({
            where: and(
                eq(aiVideoSummaries.videoId, videoId),
                isNull(aiVideoSummaries.pageId),
                eq(aiVideoSummaries.summaryType, 'full'),
                eq(aiVideoSummaries.inputHash, inputHash),
            ),
            orderBy: [desc(aiVideoSummaries.createdAt)],
        })
    }

    async reclaimFailedFullSummary(params: {
        videoId: number
        inputHash: string
        modelName: string
        promptVersion: string
    }) {
        const [row] = await this.db.update(aiVideoSummaries)
            .set({
                status: 'running',
                modelName: params.modelName,
                promptVersion: params.promptVersion,
                errorMessage: null,
                summaryText: null,
                summaryJson: null,
                startedAt: new Date(),
                finishedAt: null,
                updatedAt: sql`now()`,
            })
            .where(and(
                eq(aiVideoSummaries.videoId, params.videoId),
                isNull(aiVideoSummaries.pageId),
                eq(aiVideoSummaries.summaryType, 'full'),
                eq(aiVideoSummaries.inputHash, params.inputHash),
                eq(aiVideoSummaries.status, 'failed'),
            ))
            .returning({ id: aiVideoSummaries.id })

        return row?.id ?? null
    }

    async markSummarySuccess(summaryId: number, summaryText: string, summaryJson: Record<string, unknown>) {
        await this.db.update(aiVideoSummaries)
            .set({
                status: 'success',
                summaryText,
                summaryJson,
                finishedAt: new Date(),
                updatedAt: sql`now()`,
            })
            .where(eq(aiVideoSummaries.id, summaryId))
    }

    async markSummaryFailed(summaryId: number, errorMessage: string) {
        await this.db.update(aiVideoSummaries)
            .set({
                status: 'failed',
                errorMessage,
                finishedAt: new Date(),
                updatedAt: sql`now()`,
            })
            .where(eq(aiVideoSummaries.id, summaryId))
    }
}

function formatTimestamp(seconds: number) {
    const totalSeconds = Math.max(Math.floor(seconds), 0)
    const hour = Math.floor(totalSeconds / 3600)
    const minute = Math.floor((totalSeconds % 3600) / 60)
    const second = totalSeconds % 60
    if (hour > 0) {
        return `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}:${second.toString().padStart(2, '0')}`
    }
    return `${minute.toString().padStart(2, '0')}:${second.toString().padStart(2, '0')}`
}
