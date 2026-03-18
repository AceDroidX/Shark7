import { createHash } from 'node:crypto'
import {
    StreamerScheduleCategories,
    StreamerScheduleCertainties,
    StreamerScheduleStates,
    type StreamerScheduleStatus,
    StreamerScheduleTimePrecisions,
    type AiStreamerScheduleRefreshRequest,
    type StreamerScheduleCategory,
    type StreamerScheduleCertainty,
    type StreamerScheduleState,
    type StreamerScheduleTimePrecision,
} from 'shark7-shared'
import { z } from 'zod'

export const StreamerSchedulePromptVersion = 'v4'
export const DefaultScheduleModel = process.env['DEEPSEEK_MODEL'] ?? 'deepseek-chat'
export const DefaultScheduleTimezone = 'Asia/Shanghai'

export type ScheduleRefreshSource = AiStreamerScheduleRefreshRequest['source']

export type ScheduleRefreshSourceMblog = Extract<ScheduleRefreshSource, { sourceType: 'weibo_mblog' }>
export type ScheduleRefreshSourceComment = Extract<ScheduleRefreshSource, { sourceType: 'weibo_comment' }>

export type ExistingSchedulePromptItem = {
    itemId: number
    title: string
    category: StreamerScheduleCategory
    scheduleState: StreamerScheduleState
    status: StreamerScheduleStatus
    certainty: StreamerScheduleCertainty
    startDate: string | null
    endDate: string | null
    startAt: string | null
    endAt: string | null
    dateText: string | null
    timeText: string | null
    timePrecision: StreamerScheduleTimePrecision
    summary: string | null
    sources: Array<{
        sourceType: string
        sourceId: string
        sourcePublishedAt: string
        evidenceText: string
    }>
}

export type ScheduleSourceComment = {
    commentId: string
    rootId: string
    createdAt: string
    textRaw: string
    userId: number
    screenName: string
    replyCommentId: string | null
    replyTextRaw: string | null
    replyScreenName: string | null
    conversationText: string | null
}

export const SchedulePatchItemSchema = z.object({
    title: z.string().trim().min(1),
    category: z.enum(StreamerScheduleCategories),
    scheduleState: z.enum(StreamerScheduleStates),
    summary: z.string().trim().nullable(),
    startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable(),
    endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable(),
    startAt: z.string().datetime({ offset: true }).nullable(),
    endAt: z.string().datetime({ offset: true }).nullable(),
    dateText: z.string().trim().nullable(),
    timeText: z.string().trim().nullable(),
    timePrecision: z.enum(StreamerScheduleTimePrecisions),
    certainty: z.enum(StreamerScheduleCertainties),
    confidence: z.number().min(0).max(1),
    evidenceText: z.string().trim().min(1),
}).superRefine((item, ctx) => {
    if (item.startDate && item.endDate && item.startDate > item.endDate) {
        ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ['endDate'],
            message: 'endDate 不能早于 startDate',
        })
    }

    if (item.startAt && item.endAt) {
        const startAt = new Date(item.startAt)
        const endAt = new Date(item.endAt)
        if (!Number.isNaN(startAt.getTime()) && !Number.isNaN(endAt.getTime()) && startAt.getTime() > endAt.getTime()) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                path: ['endAt'],
                message: 'endAt 不能早于 startAt',
            })
        }
    }
})

export const SchedulePatchOperationSchema = z.object({
    kind: z.enum(['add', 'update', 'cancel', 'noop']),
    targetItemId: z.number().int().positive().nullable(),
    reason: z.string().trim().min(1),
    item: SchedulePatchItemSchema.nullable(),
})

export const SchedulePatchSchema = z.object({
    needsUpdate: z.boolean(),
    ignoredReason: z.string().trim().nullable(),
    operations: z.array(SchedulePatchOperationSchema),
})

export type SchedulePatchItem = z.infer<typeof SchedulePatchItemSchema>
export type SchedulePatchOperation = z.infer<typeof SchedulePatchOperationSchema>
export type SchedulePatch = z.infer<typeof SchedulePatchSchema>

export type ScheduleRefreshResult = {
    runId: number | null
    skipped: boolean
    appliedOperations: number
}

export type HistoricalScheduleSource = ScheduleRefreshSource

type SchedulePromptSourceMblog = {
    sourceType: 'weibo_mblog'
    screenName: string
    sourcePublishedAt: string
    textRaw: string
    title?: string
}

type SchedulePromptSourceComment = {
    sourceType: 'weibo_comment'
    screenName: string
    sourcePublishedAt: string
    textRaw: string
    replyTextRaw?: string
    replyScreenName?: string
    conversationText?: string
    mblog: {
        sourcePublishedAt: string
        textRaw: string
        title?: string
    }
}

export type SchedulePromptSource = SchedulePromptSourceMblog | SchedulePromptSourceComment

export type SchedulePromptCurrentItem = {
    itemId: number
    title: string
    category: StreamerScheduleCategory
    scheduleState: StreamerScheduleState
    certainty: StreamerScheduleCertainty
    startDate?: string
    endDate?: string
    startAt?: string
    endAt?: string
    dateText?: string
    timeText?: string
    timePrecision: StreamerScheduleTimePrecision
    summary?: string
    evidence: Array<{
        sourceType: string
        sourcePublishedAt: string
        evidenceText: string
    }>
}

export type SchedulePromptPayload = {
    source: SchedulePromptSource
    currentItems: SchedulePromptCurrentItem[]
}

function compactObject<T extends Record<string, unknown>>(value: T) {
    const entries = Object.entries(value).filter(([, item]) => item !== null && item !== undefined && item !== '')
    return Object.fromEntries(entries)
}

function toStableScheduleSource(source: ScheduleRefreshSource) {
    if (source.sourceType === 'weibo_mblog') {
        return compactObject({
            sourceType: source.sourceType,
            screenName: source.screenName,
            sourcePublishedAt: source.sourcePublishedAt,
            textRaw: source.textRaw,
            title: source.title,
        }) as SchedulePromptSourceMblog
    }

    return compactObject({
        sourceType: source.sourceType,
        screenName: source.screenName,
        sourcePublishedAt: source.sourcePublishedAt,
        textRaw: source.textRaw,
        replyTextRaw: source.replyTextRaw,
        replyScreenName: source.replyScreenName,
        conversationText: source.conversationText,
        mblog: compactObject({
            sourcePublishedAt: source.mblog.sourcePublishedAt,
            textRaw: source.mblog.textRaw,
            title: source.mblog.title,
        }),
    }) as SchedulePromptSourceComment
}

function toPromptCurrentItem(item: ExistingSchedulePromptItem): SchedulePromptCurrentItem {
    return compactObject({
        itemId: item.itemId,
        title: item.title,
        category: item.category,
        scheduleState: item.scheduleState,
        certainty: item.certainty,
        startDate: item.startDate,
        endDate: item.endDate,
        startAt: item.startAt,
        endAt: item.endAt,
        dateText: item.dateText,
        timeText: item.timeText,
        timePrecision: item.timePrecision,
        summary: item.summary,
        evidence: item.sources.map((source) => compactObject({
            sourceType: source.sourceType,
            sourcePublishedAt: source.sourcePublishedAt,
            evidenceText: source.evidenceText,
        })),
    }) as SchedulePromptCurrentItem
}

export function buildSchedulePromptPayload(input: {
    source: ScheduleRefreshSource
    currentItems: ExistingSchedulePromptItem[]
}): SchedulePromptPayload {
    return {
        source: toStableScheduleSource(input.source),
        currentItems: input.currentItems.map((item) => toPromptCurrentItem(item)),
    }
}

export function buildScheduleInputHash(input: {
    source: ScheduleRefreshSource
    currentItems: ExistingSchedulePromptItem[]
}) {
    const hash = createHash('sha256')
    hash.update(JSON.stringify(buildSchedulePromptPayload(input)))
    hash.update(JSON.stringify({
        promptVersion: StreamerSchedulePromptVersion,
        model: DefaultScheduleModel,
    }))
    return hash.digest('hex')
}
