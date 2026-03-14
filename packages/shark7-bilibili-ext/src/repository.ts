import { and, desc, eq, sql } from 'drizzle-orm'
import {
    bilibiliFetchJobs,
    bilibiliVideos,
    bilibiliVideoPages,
    bilibiliVideoSubtitleSegments,
    bilibiliVideoSubtitleTracks,
    type Shark7PgDatabase,
} from 'shark7-shared'
import type {
    BilibiliExtErrorCode,
    BilibiliFetchJobStatus,
    BilibiliFetchRetryPlan,
    BilibiliFetchJobType,
    FetchVideoSubtitlesResult,
    PageSubtitleResult,
    VideoMeta,
    VideoPageMeta,
} from './types.ts'

function toVideoRaw(video: VideoMeta) {
    return {
        bvid: video.bvid,
        aid: video.aid,
        title: video.title,
        ownerMid: video.ownerMid,
        ownerName: video.ownerName,
        pages: video.pages,
    }
}

function toPageRaw(page: VideoPageMeta) {
    return {
        cid: page.cid,
        page: page.page,
        part: page.part,
        duration: page.duration,
    }
}

function toTrackRaw(pageResult: PageSubtitleResult) {
    return pageResult.track ?? {
        cid: pageResult.cid,
        page: pageResult.page,
        error: pageResult.error,
    }
}

export class BilibiliSubtitleRepository {
    db: Shark7PgDatabase

    constructor(db: Shark7PgDatabase) {
        this.db = db
    }

    async upsertVideo(video: VideoMeta) {
        const [row] = await this.db.insert(bilibiliVideos)
            .values({
                bvid: video.bvid,
                aid: video.aid,
                title: video.title,
                ownerMid: video.ownerMid,
                ownerName: video.ownerName,
                videos: video.pages.length,
                raw: toVideoRaw(video),
                updatedAt: sql`now()`,
            })
            .onConflictDoUpdate({
                target: bilibiliVideos.bvid,
                set: {
                    aid: video.aid,
                    title: video.title,
                    ownerMid: video.ownerMid,
                    ownerName: video.ownerName,
                    videos: video.pages.length,
                    raw: toVideoRaw(video),
                    updatedAt: sql`now()`,
                },
            })
            .returning({ id: bilibiliVideos.id })

        return row.id
    }

    async upsertPage(videoId: number, page: VideoPageMeta) {
        const [row] = await this.db.insert(bilibiliVideoPages)
            .values({
                videoId,
                cid: page.cid,
                pageNo: page.page,
                part: page.part,
                durationSeconds: page.duration,
                raw: toPageRaw(page),
                updatedAt: sql`now()`,
            })
            .onConflictDoUpdate({
                target: bilibiliVideoPages.cid,
                set: {
                    videoId,
                    pageNo: page.page,
                    part: page.part,
                    durationSeconds: page.duration,
                    raw: toPageRaw(page),
                    updatedAt: sql`now()`,
                },
            })
            .returning({ id: bilibiliVideoPages.id })

        return row.id
    }

    async replacePageSubtitle(pageId: number, pageResult: PageSubtitleResult) {
        if (!pageResult.track || !pageResult.subtitle) {
            return null
        }

        await this.db.update(bilibiliVideoSubtitleTracks)
            .set({
                isAutoSelected: false,
                updatedAt: sql`now()`,
            })
            .where(eq(bilibiliVideoSubtitleTracks.pageId, pageId))

        const [trackRow] = await this.db.insert(bilibiliVideoSubtitleTracks)
            .values({
                pageId,
                subtitleIdStr: pageResult.track.id_str,
                lan: pageResult.track.lan,
                lanDoc: pageResult.track.lan_doc,
                isAi: true,
                isAutoSelected: true,
                isAvailable: true,
                subtitleUrl: pageResult.track.subtitle_url,
                aiType: pageResult.track.ai_type,
                aiStatus: pageResult.track.ai_status,
                raw: toTrackRaw(pageResult),
                fetchedAt: new Date(),
                updatedAt: sql`now()`,
            })
            .onConflictDoUpdate({
                target: [bilibiliVideoSubtitleTracks.pageId, bilibiliVideoSubtitleTracks.subtitleIdStr],
                set: {
                    lan: pageResult.track.lan,
                    lanDoc: pageResult.track.lan_doc,
                    isAi: true,
                    isAutoSelected: true,
                    isAvailable: true,
                    subtitleUrl: pageResult.track.subtitle_url,
                    aiType: pageResult.track.ai_type,
                    aiStatus: pageResult.track.ai_status,
                    raw: toTrackRaw(pageResult),
                    fetchedAt: new Date(),
                    updatedAt: sql`now()`,
                },
            })
            .returning({ id: bilibiliVideoSubtitleTracks.id })

        await this.db.delete(bilibiliVideoSubtitleSegments)
            .where(eq(bilibiliVideoSubtitleSegments.trackId, trackRow.id))

        if (pageResult.subtitle.body.length > 0) {
            await this.db.insert(bilibiliVideoSubtitleSegments)
                .values(pageResult.subtitle.body.map((item) => ({
                    trackId: trackRow.id,
                    cid: pageResult.cid,
                    sid: item.sid,
                    startSeconds: item.from,
                    endSeconds: item.to,
                    content: item.content,
                    musicScore: item.music,
                    location: item.location,
                    raw: item as unknown as Record<string, unknown>,
                })))
        }

        return trackRow.id
    }

    async markPageSubtitleUnavailable(pageId: number, pageResult: PageSubtitleResult) {
        if (!pageResult.track) {
            return
        }

        await this.db.insert(bilibiliVideoSubtitleTracks)
            .values({
                pageId,
                subtitleIdStr: pageResult.track.id_str,
                lan: pageResult.track.lan,
                lanDoc: pageResult.track.lan_doc,
                isAi: true,
                isAutoSelected: false,
                isAvailable: false,
                subtitleUrl: pageResult.track.subtitle_url,
                aiType: pageResult.track.ai_type,
                aiStatus: pageResult.track.ai_status,
                raw: toTrackRaw(pageResult),
                fetchedAt: new Date(),
                updatedAt: sql`now()`,
            })
            .onConflictDoUpdate({
                target: [bilibiliVideoSubtitleTracks.pageId, bilibiliVideoSubtitleTracks.subtitleIdStr],
                set: {
                    lan: pageResult.track.lan,
                    lanDoc: pageResult.track.lan_doc,
                    isAvailable: false,
                    raw: toTrackRaw(pageResult),
                    fetchedAt: new Date(),
                    updatedAt: sql`now()`,
                },
            })
    }

    async saveFetchResult(result: FetchVideoSubtitlesResult) {
        return this.db.transaction(async (tx) => {
            const repo = new BilibiliSubtitleRepository(tx)
            const videoId = await repo.upsertVideo(result.video)

            for (const page of result.pages) {
                const pageId = await repo.upsertPage(videoId, {
                    cid: page.cid,
                    page: page.page,
                    part: page.part,
                    duration: page.duration,
                })

                if (page.track && page.subtitle) {
                    await repo.replacePageSubtitle(pageId, page)
                } else if (page.track) {
                    await repo.markPageSubtitleUnavailable(pageId, page)
                }
            }

            return videoId
        })
    }

    async createFetchJob(params: {
        jobType: BilibiliFetchJobType
        targetBvid?: string
        targetMid?: number
        targetSeriesId?: number
        attempt?: number
        maxAttempts?: number
        sourceJobId?: number
        payload?: Record<string, unknown>
    }) {
        const [row] = await this.db.insert(bilibiliFetchJobs)
            .values({
                jobType: params.jobType,
                targetBvid: params.targetBvid,
                targetMid: params.targetMid,
                targetSeriesId: params.targetSeriesId,
                status: 'running',
                attempt: params.attempt ?? 1,
                maxAttempts: params.maxAttempts ?? 1,
                sourceJobId: params.sourceJobId,
                payload: params.payload,
                startedAt: new Date(),
                updatedAt: sql`now()`,
            })
            .returning({ id: bilibiliFetchJobs.id })

        return row.id
    }

    async finishFetchJob(jobId: number, status: BilibiliFetchJobStatus, options?: {
        errorCode?: BilibiliExtErrorCode
        errorMessage?: string
        retryPlan?: BilibiliFetchRetryPlan
        payload?: Record<string, unknown>
    }) {
        await this.db.update(bilibiliFetchJobs)
            .set({
                status,
                errorCode: options?.errorCode,
                errorMessage: options?.errorMessage,
                retryable: options?.retryPlan?.retryable ?? false,
                maxAttempts: options?.retryPlan?.maxAttempts,
                nextRetryAt: options?.retryPlan?.nextRetryAt,
                payload: options?.payload,
                finishedAt: new Date(),
                updatedAt: sql`now()`,
            })
            .where(eq(bilibiliFetchJobs.id, jobId))
    }

    async hasSuccessfulFetchJobByBvid(bvid: string) {
        const job = await this.db.query.bilibiliFetchJobs.findFirst({
            where: and(
                eq(bilibiliFetchJobs.jobType, 'fetch_video_subtitle'),
                eq(bilibiliFetchJobs.targetBvid, bvid),
                eq(bilibiliFetchJobs.status, 'success'),
            ),
            columns: { id: true },
        })
        return Boolean(job)
    }

    async getLatestFetchJobByBvid(bvid: string) {
        return this.db.query.bilibiliFetchJobs.findFirst({
            where: and(
                eq(bilibiliFetchJobs.jobType, 'fetch_video_subtitle'),
                eq(bilibiliFetchJobs.targetBvid, bvid),
            ),
            orderBy: [desc(bilibiliFetchJobs.createdAt)],
        })
    }

    async getLatestRetryableFailedJobs(params: {
        targetMid: number
        targetSeriesId: number
        limit: number
    }) {
        return this.db.query.bilibiliFetchJobs.findMany({
            where: and(
                eq(bilibiliFetchJobs.jobType, 'fetch_video_subtitle'),
                eq(bilibiliFetchJobs.targetMid, params.targetMid),
                eq(bilibiliFetchJobs.targetSeriesId, params.targetSeriesId),
                eq(bilibiliFetchJobs.status, 'failed'),
                eq(bilibiliFetchJobs.retryable, true),
            ),
            orderBy: [desc(bilibiliFetchJobs.createdAt)],
            limit: Math.max(params.limit * 5, params.limit),
        })
    }

    async getVideoByBvid(bvid: string) {
        return this.db.query.bilibiliVideos.findFirst({
            where: eq(bilibiliVideos.bvid, bvid),
            with: {
                pages: {
                    with: {
                        tracks: true,
                    },
                },
            },
        })
    }

    async getSelectedTrackByCid(cid: number) {
        const page = await this.db.query.bilibiliVideoPages.findFirst({
            where: eq(bilibiliVideoPages.cid, cid),
        })

        if (!page) {
            return null
        }

        return this.db.query.bilibiliVideoSubtitleTracks.findFirst({
            where: and(
                eq(bilibiliVideoSubtitleTracks.isAutoSelected, true),
                eq(bilibiliVideoSubtitleTracks.pageId, page.id),
            ),
        })
    }
}
