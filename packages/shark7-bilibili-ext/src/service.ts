import { logger, type Shark7PgDatabase } from 'shark7-shared'
import { getLatestSeriesArchives } from './archive.ts'
import { getVideoMetaByBvid } from './video.ts'
import { getSubtitleByAidAndCid, joinSubtitleText } from './subtitle.ts'
import { BilibiliSubtitleRepository } from './repository.ts'
import type {
    BilibiliExtErrorCode,
    BilibiliFetchRetryPlan,
    FetchVideoSubtitlesResult,
    PageSubtitleResult,
    VideoPageMeta,
    VideoMeta,
} from './types.ts'
import { BilibiliExtError, isBilibiliExtError } from './types.ts'

function addMinutes(date: Date, minutes: number) {
    return new Date(date.getTime() + minutes * 60 * 1000)
}

function addHours(date: Date, hours: number) {
    return addMinutes(date, hours * 60)
}

function addDays(date: Date, days: number) {
    return addHours(date, days * 24)
}

function parsePublishedAt(value: unknown) {
    if (typeof value !== 'string') return null
    const date = new Date(value)
    if (Number.isNaN(date.getTime())) return null
    return date
}

function getRetryPlan(errorCode: BilibiliExtErrorCode, attempt: number, publishedAt?: Date | null): BilibiliFetchRetryPlan {
    const now = new Date()
    const attemptIndex = Math.max(attempt - 1, 0)

    if (publishedAt && publishedAt <= addDays(now, -7)) {
        return {
            retryable: false,
            maxAttempts: Math.max(attempt, 1),
            nextRetryAt: null,
        }
    }

    switch (errorCode) {
        case 'SUBTITLE_NOT_FOUND': {
            const schedule = [30, 120, 360, 1440, 1440, 1440, 1440]
            if (attemptIndex >= schedule.length) {
                return { retryable: false, maxAttempts: schedule.length, nextRetryAt: null }
            }
            return {
                retryable: true,
                maxAttempts: schedule.length,
                nextRetryAt: addMinutes(now, schedule[attemptIndex]),
            }
        }
        case 'SUBTITLE_URL_EXPIRED':
        case 'PLAYER_API_FAILED':
        case 'SERIES_API_FAILED':
        case 'VIDEO_API_FAILED':
        case 'UNKNOWN_ERROR': {
            const schedule = [5, 15, 60, 360, 360]
            if (attemptIndex >= schedule.length) {
                return { retryable: false, maxAttempts: schedule.length, nextRetryAt: null }
            }
            return {
                retryable: true,
                maxAttempts: schedule.length,
                nextRetryAt: addMinutes(now, schedule[attemptIndex]),
            }
        }
        case 'AUTH_REQUIRED':
        case 'AUTH_EXPIRED':
            return {
                retryable: true,
                maxAttempts: 100,
                nextRetryAt: addHours(now, 6),
            }
        case 'INVALID_BVID':
        case 'VIDEO_NOT_FOUND':
            return {
                retryable: false,
                maxAttempts: Math.max(attempt, 1),
                nextRetryAt: null,
            }
        default:
            return {
                retryable: true,
                maxAttempts: 5,
                nextRetryAt: addHours(now, 1),
            }
    }
}

function getErrorCodeAndMessage(error: unknown): { code: BilibiliExtErrorCode; message: string } {
    if (isBilibiliExtError(error)) {
        return {
            code: error.code,
            message: error.message,
        }
    }
    if (error instanceof Error) {
        return {
            code: 'UNKNOWN_ERROR',
            message: error.message,
        }
    }
    return {
        code: 'UNKNOWN_ERROR',
        message: String(error),
    }
}

function pickPrimaryFetchErrorCode(codes: BilibiliExtErrorCode[]): BilibiliExtErrorCode {
    const priorities: BilibiliExtErrorCode[] = [
        'AUTH_EXPIRED',
        'AUTH_REQUIRED',
        'SUBTITLE_URL_EXPIRED',
        'PLAYER_API_FAILED',
        'SERIES_API_FAILED',
        'VIDEO_API_FAILED',
        'SUBTITLE_NOT_FOUND',
        'SUBTITLE_DOWNLOAD_FAILED',
        'VIDEO_NOT_FOUND',
        'INVALID_BVID',
        'UNKNOWN_ERROR',
    ]

    for (const code of priorities) {
        if (codes.includes(code)) {
            return code
        }
    }

    return codes[0] ?? 'UNKNOWN_ERROR'
}

function getIncompleteFetchResultError(result: FetchVideoSubtitlesResult) {
    const failedPages = result.pages
        .filter((page) => page.error)
        .map((page) => ({
            page: page.page,
            cid: page.cid,
            code: page.error!.code,
            message: page.error!.message,
        }))

    if (failedPages.length === 0) {
        return null
    }

    const code = pickPrimaryFetchErrorCode(failedPages.map((page) => page.code))
    const detail = failedPages
        .map((page) => `P${page.page}[${page.code}]`)
        .join(', ')

    return {
        code,
        message: `视频 ${result.video.bvid} 仍有 ${failedPages.length}/${result.pages.length} 个分 P 未抓取成功: ${detail}`,
        failedPages,
    }
}

function createEmptyPageResult(page: VideoPageMeta): PageSubtitleResult {
    return {
        cid: page.cid,
        page: page.page,
        part: page.part,
        duration: page.duration,
        needLoginSubtitle: false,
        tracks: [],
        track: null,
        subtitle: null,
        segments: [],
        text: '',
        error: null,
    }
}

async function getPageSubtitleResult(video: VideoMeta, page: VideoPageMeta): Promise<PageSubtitleResult> {
    try {
        const result = await getSubtitleByAidAndCid(video.aid, page.cid)
        return {
            cid: page.cid,
            page: page.page,
            part: page.part,
            duration: page.duration,
            needLoginSubtitle: result.needLoginSubtitle,
            tracks: result.tracks,
            track: result.track,
            subtitle: result.subtitle,
            segments: result.segments,
            text: joinSubtitleText(result.segments),
            error: null,
        }
    } catch (error) {
        const pageResult = createEmptyPageResult(page)
        if (isBilibiliExtError(error)) {
            logger.warn(`P${page.page} 字幕抓取失败 [${error.code}]: ${error.message}`)
            pageResult.error = {
                code: error.code,
                message: error.message,
            }
            return pageResult
        }
        throw error
    }
}

export async function getVideoSubtitlesByBvid(bvid: string): Promise<FetchVideoSubtitlesResult> {
    const video = await getVideoMetaByBvid(bvid)
    const pages: PageSubtitleResult[] = []

    for (const page of video.pages) {
        pages.push(await getPageSubtitleResult(video, page))
    }

    const successCount = pages.filter((page) => page.segments.length > 0).length
    if (successCount === 0) {
        const authError = pages.find((page) => page.error?.code === 'AUTH_REQUIRED' || page.error?.code === 'AUTH_EXPIRED')
        if (authError?.error) {
            throw new BilibiliExtError(authError.error.code, authError.error.message)
        }
        throw new BilibiliExtError('SUBTITLE_NOT_FOUND', `视频 ${video.bvid} 暂无可用字幕`)
    }

    return { video, pages }
}

export async function saveVideoSubtitlesResult(db: Shark7PgDatabase, result: FetchVideoSubtitlesResult) {
    const repository = new BilibiliSubtitleRepository(db)
    return repository.saveFetchResult(result)
}

export async function fetchAndSaveVideoSubtitlesByBvid(db: Shark7PgDatabase, bvid: string) {
    const result = await getVideoSubtitlesByBvid(bvid)
    const videoId = await saveVideoSubtitlesResult(db, result)
    return { result, videoId }
}

export async function fetchAndSaveVideoSubtitlesWithJob(
    db: Shark7PgDatabase,
    bvid: string,
    context?: {
        targetMid?: number
        targetSeriesId?: number
        attempt?: number
        sourceJobId?: number
        payload?: Record<string, unknown>
    },
) {
    const repository = new BilibiliSubtitleRepository(db)
    const attempt = context?.attempt ?? 1
    const publishedAt = context?.payload?.['publishedAt']
    const publishedAtDate = parsePublishedAt(publishedAt)
    const jobId = await repository.createFetchJob({
        jobType: 'fetch_video_subtitle',
        targetBvid: bvid,
        targetMid: context?.targetMid,
        targetSeriesId: context?.targetSeriesId,
        attempt,
        sourceJobId: context?.sourceJobId,
        payload: { bvid, ...context?.payload },
    })

    let persisted: Awaited<ReturnType<typeof fetchAndSaveVideoSubtitlesByBvid>>

    try {
        persisted = await fetchAndSaveVideoSubtitlesByBvid(db, bvid)
    } catch (error) {
        const { code, message } = getErrorCodeAndMessage(error)
        const retryPlan = getRetryPlan(code, attempt, publishedAtDate)
        await repository.finishFetchJob(jobId, 'failed', {
            errorCode: code,
            errorMessage: message,
            retryPlan,
            payload: {
                bvid,
                attempt,
                publishedAt: publishedAtDate?.toISOString() ?? (typeof publishedAt === 'string' ? publishedAt : null),
                nextRetryAt: retryPlan.nextRetryAt?.toISOString() ?? null,
                ...context?.payload,
            },
        })
        throw error
    }

    const incompleteError = getIncompleteFetchResultError(persisted.result)
    if (incompleteError) {
        const retryPlan = getRetryPlan(incompleteError.code, attempt, publishedAtDate)
        await repository.finishFetchJob(jobId, 'failed', {
            errorCode: incompleteError.code,
            errorMessage: incompleteError.message,
            retryPlan,
            payload: {
                bvid,
                videoId: persisted.videoId,
                pageCount: persisted.result.pages.length,
                successPageCount: persisted.result.pages.filter((page) => page.segments.length > 0).length,
                failedPageCount: incompleteError.failedPages.length,
                failedPages: incompleteError.failedPages,
                publishedAt: publishedAtDate?.toISOString() ?? (typeof publishedAt === 'string' ? publishedAt : null),
                nextRetryAt: retryPlan.nextRetryAt?.toISOString() ?? null,
                ...context?.payload,
            },
        })
        throw new BilibiliExtError(incompleteError.code, incompleteError.message, {
            failedPages: incompleteError.failedPages,
        })
    }

    await repository.finishFetchJob(jobId, 'success', {
        payload: {
            bvid,
            videoId: persisted.videoId,
            pageCount: persisted.result.pages.length,
            successPageCount: persisted.result.pages.filter((page) => page.segments.length > 0).length,
        },
    })
    return { ...persisted, jobId }
}

async function retryFailedSubtitleFetchJobs(
    db: Shark7PgDatabase,
    userId: number,
    seriesId: number,
    limit: number,
) {
    const repository = new BilibiliSubtitleRepository(db)
    const jobs = await repository.getLatestRetryableFailedJobs({
        targetMid: userId,
        targetSeriesId: seriesId,
        limit,
    })

    const now = new Date()
    const latestByBvid = new Map<string, typeof jobs[number]>()
    for (const job of jobs) {
        if (!job.targetBvid) continue
        if (latestByBvid.has(job.targetBvid)) continue
        latestByBvid.set(job.targetBvid, job)
    }

    const retried: Array<{ bvid: string; videoId: number; jobId: number }> = []
    const retryFailed: Array<{ bvid: string; message: string }> = []
    const retrySkipped: string[] = []

    for (const job of latestByBvid.values()) {
        if (!job.targetBvid) continue
        if (job.nextRetryAt && job.nextRetryAt > now) continue
        if (job.attempt >= job.maxAttempts) continue
        if (await repository.hasSuccessfulFetchJobByBvid(job.targetBvid)) {
            retrySkipped.push(job.targetBvid)
            continue
        }

        try {
            const persisted = await fetchAndSaveVideoSubtitlesWithJob(db, job.targetBvid, {
                targetMid: userId,
                targetSeriesId: seriesId,
                attempt: job.attempt + 1,
                sourceJobId: job.id,
                payload: {
                    retryFromJobId: job.id,
                    publishedAt: typeof job.payload?.['publishedAt'] === 'string' ? job.payload['publishedAt'] : null,
                },
            })
            retried.push({
                bvid: job.targetBvid,
                videoId: persisted.videoId,
                jobId: persisted.jobId,
            })
        } catch (error) {
            const { message } = getErrorCodeAndMessage(error)
            retryFailed.push({
                bvid: job.targetBvid,
                message,
            })
        }
    }

    return { retried, retryFailed, retrySkipped }
}

export async function scanSeriesArchivesAndSyncSubtitles(db: Shark7PgDatabase, userId: number, seriesId: number, limit = 10) {
    const repository = new BilibiliSubtitleRepository(db)
    const scanJobId = await repository.createFetchJob({
        jobType: 'scan_series_archives',
        targetMid: userId,
        targetSeriesId: seriesId,
        payload: { userId, seriesId, limit },
    })

    try {
        const archives = await getLatestSeriesArchives(userId, seriesId, limit)
        const synced: Array<{ bvid: string; videoId: number; jobId: number }> = []
        const skipped: string[] = []
        const deferred: Array<{ bvid: string; nextRetryAt: string | null }> = []
        const failed: Array<{ bvid: string; message: string }> = []
        const now = new Date()

        for (const archive of archives) {
            const alreadyFetched = await repository.hasSuccessfulFetchJobByBvid(archive.bvid)
            if (alreadyFetched) {
                skipped.push(archive.bvid)
                continue
            }

            const latestJob = await repository.getLatestFetchJobByBvid(archive.bvid)
            if (latestJob?.status === 'failed') {
                if (!latestJob.retryable) {
                    skipped.push(archive.bvid)
                    continue
                }
                if (latestJob.nextRetryAt && latestJob.nextRetryAt > now) {
                    deferred.push({
                        bvid: archive.bvid,
                        nextRetryAt: latestJob.nextRetryAt.toISOString(),
                    })
                    continue
                }
                if (latestJob.attempt >= latestJob.maxAttempts) {
                    skipped.push(archive.bvid)
                    continue
                }
            }

            try {
                const persisted = await fetchAndSaveVideoSubtitlesWithJob(db, archive.bvid, {
                    targetMid: userId,
                    targetSeriesId: seriesId,
                    payload: {
                        source: 'series_scan',
                        scanJobId,
                        publishedAt: new Date(archive.pubdate * 1000).toISOString(),
                    },
                })
                synced.push({
                    bvid: archive.bvid,
                    videoId: persisted.videoId,
                    jobId: persisted.jobId,
                })
            } catch (error) {
                const message = error instanceof Error ? error.message : String(error)
                logger.warn(`跳过无法同步的 BV ${archive.bvid}: ${message}`)
                failed.push({ bvid: archive.bvid, message })
            }
        }

        const retryResult = await retryFailedSubtitleFetchJobs(db, userId, seriesId, limit)

        await repository.finishFetchJob(scanJobId, 'success', {
            payload: {
                userId,
                seriesId,
                archiveCount: archives.length,
                syncedCount: synced.length,
                skippedCount: skipped.length,
                deferredCount: deferred.length,
                failedCount: failed.length,
                retriedCount: retryResult.retried.length,
                retryFailedCount: retryResult.retryFailed.length,
                synced,
                skipped,
                deferred,
                failed,
                retried: retryResult.retried,
                retryFailed: retryResult.retryFailed,
                retrySkipped: retryResult.retrySkipped,
            },
        })

        return {
            scanJobId,
            archives,
            synced,
            skipped,
            deferred,
            failed,
            retried: retryResult.retried,
            retryFailed: retryResult.retryFailed,
            retrySkipped: retryResult.retrySkipped,
        }
    } catch (error) {
        const message = error instanceof Error ? error.message : String(error)
        await repository.finishFetchJob(scanJobId, 'failed', {
            errorMessage: message,
            payload: { userId, seriesId, limit },
        })
        throw error
    }
}
