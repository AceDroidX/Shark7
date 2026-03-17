import { createHash } from 'node:crypto'
import {
    StreamerScheduleCategories,
    StreamerScheduleCertainties,
    StreamerScheduleStates,
    StreamerScheduleTimePrecisions,
    type AiStreamerScheduleRefreshRequest,
    type StreamerScheduleCategory,
    type StreamerScheduleCertainty,
    type StreamerScheduleState,
    type StreamerScheduleTimePrecision,
} from 'shark7-shared'
import { z } from 'zod'

export const StreamerSchedulePromptVersion = 'v2'
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
    status: string
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

export function buildScheduleInputHash(source: ScheduleRefreshSource) {
    const hash = createHash('sha256')
    hash.update(JSON.stringify(source))
    hash.update(JSON.stringify({
        promptVersion: StreamerSchedulePromptVersion,
        model: DefaultScheduleModel,
    }))
    return hash.digest('hex')
}
