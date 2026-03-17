export const StreamerScheduleCategories = [
    'live',
    'collab',
    'recording',
    'event',
    'travel',
    'post',
    'other',
] as const

export const StreamerScheduleStatuses = [
    'active',
    'cancelled',
    'superseded',
    'expired',
] as const

export const StreamerScheduleCertainties = [
    'confirmed',
    'likely',
    'tentative',
    'unknown',
] as const

export const StreamerScheduleTimePrecisions = [
    'exact',
    'date_only',
    'range',
    'relative',
    'unknown',
] as const

export const StreamerScheduleStates = [
    'scheduled',
    'cancelled',
] as const

export type StreamerScheduleCategory = typeof StreamerScheduleCategories[number]
export type StreamerScheduleStatus = typeof StreamerScheduleStatuses[number]
export type StreamerScheduleCertainty = typeof StreamerScheduleCertainties[number]
export type StreamerScheduleTimePrecision = typeof StreamerScheduleTimePrecisions[number]
export type StreamerScheduleState = typeof StreamerScheduleStates[number]

export type StreamerScheduleSourceRef = {
    sourceType: 'weibo_mblog' | 'weibo_comment'
    sourceId: string
    sourceUrl: string | null
    sourcePublishedAt: string
    evidenceText: string
}

export type StreamerScheduleQueryItem = {
    itemId: number
    startDate: string | null
    endDate: string | null
    startAt: string | null
    endAt: string | null
    timeText: string | null
    title: string
    summary: string | null
    category: StreamerScheduleCategory
    scheduleState: StreamerScheduleState
    certainty: StreamerScheduleCertainty
    timePrecision: StreamerScheduleTimePrecision
    confidence: number | null
    sources: StreamerScheduleSourceRef[]
}

export type AiStreamerScheduleRefreshRequest = {
    source:
        | {
            streamerId: string
            platform: 'weibo'
            externalUserId: number
            screenName: string
            sourceType: 'weibo_mblog'
            sourceId: string
            sourceUrl: string | null
            sourcePublishedAt: string
            textRaw: string
            title: string | null
            visibleType: number
            repostType: number | null
            isTop: boolean
            authorUserId: number
            raw: Record<string, unknown> | null
        }
        | {
            streamerId: string
            platform: 'weibo'
            externalUserId: number
            screenName: string
            sourceType: 'weibo_comment'
            sourceId: string
            sourceUrl: string | null
            sourcePublishedAt: string
            textRaw: string
            authorUserId: number
            raw: Record<string, unknown> | null
            replyCommentId: string | null
            replyTextRaw: string | null
            replyScreenName: string | null
            conversationText: string | null
            mblog: {
                sourceId: string
                sourceUrl: string | null
                sourcePublishedAt: string
                textRaw: string
                title: string | null
                visibleType: number
                repostType: number | null
                isTop: boolean
                raw: Record<string, unknown> | null
            }
        }
}

export type AiStreamerScheduleQueryRequest = {
    streamerId: string
    days?: number
}

export type AiStreamerScheduleReanalyzeRequest = {
    streamerId: string
    hours?: number
}

export type AiStreamerScheduleQueryResponse =
    | {
        ok: true
        streamerId: string
        generatedAt: string
        windowDays: number
        todayDate: string
        todayLiveStatus: 'yes' | 'no' | 'uncertain'
        todaySummary: string
        todayItems: StreamerScheduleQueryItem[]
        upcomingItems: StreamerScheduleQueryItem[]
    }
    | {
        ok: false
        streamerId: string
        error: string
    }

export type AiStreamerScheduleReanalyzeResponse =
    | {
        ok: true
        streamerId: string
        hours: number
        fromIso: string
        toIso: string
        matchedSources: number
        refreshedSources: number
        skippedSources: number
        failedSources: string[]
        appliedOperations: number
    }
    | {
        ok: false
        streamerId: string
        error: string
    }
