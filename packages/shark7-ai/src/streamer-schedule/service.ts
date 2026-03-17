import { createHash } from 'node:crypto'
import { ChatDeepSeek } from '@langchain/deepseek'
import { HumanMessage, SystemMessage } from '@langchain/core/messages'
import { CallbackHandler } from '@langfuse/langchain'
import {
    logger,
    type AiStreamerScheduleReanalyzeResponse,
    type AiStreamerScheduleQueryResponse,
    type Shark7PgDatabase,
    type StreamerScheduleQueryItem,
} from 'shark7-shared'
import { configureLangfuseLogger } from '../langfuse-logger.ts'
import { listWeiboSourcesInWindow } from './mongo.ts'
import { buildStreamerSchedulePatchPrompt } from './prompt.ts'
import {
    DefaultScheduleModel,
    DefaultScheduleTimezone,
    SchedulePatchSchema,
    StreamerSchedulePromptVersion,
    buildScheduleInputHash,
    type ExistingSchedulePromptItem,
    type SchedulePatch,
    type SchedulePatchItem,
    type ScheduleRefreshResult,
    type ScheduleRefreshSource,
} from './types.ts'
import { AiStreamerScheduleRepository } from './repository.ts'

const MaxScheduleTokens = Number(process.env['SCHEDULE_MAX_TOKENS'] ?? '2048')

function createCallbacks(streamerId: string, sourceId: string) {
    if (!process.env['LANGFUSE_SECRET_KEY'] || !process.env['LANGFUSE_PUBLIC_KEY']) {
        return undefined
    }
    configureLangfuseLogger()
    return [new CallbackHandler({
        sessionId: `${streamerId}:${sourceId}`,
        tags: ['shark7-ai', 'streamer-schedule'],
        traceMetadata: { streamerId, sourceId },
    })]
}

function createModel() {
    return new ChatDeepSeek({
        apiKey: process.env['DEEPSEEK_API_KEY'],
        model: DefaultScheduleModel,
        temperature: 0,
        maxTokens: MaxScheduleTokens,
    })
}

function getNowInTimezone() {
    return new Date()
}

function formatDateInTimezone(date: Date, timeZone: string) {
    const parts = new Intl.DateTimeFormat('en-CA', {
        timeZone,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
    }).formatToParts(date)
    const year = parts.find((item) => item.type === 'year')?.value ?? '1970'
    const month = parts.find((item) => item.type === 'month')?.value ?? '01'
    const day = parts.find((item) => item.type === 'day')?.value ?? '01'
    return `${year}-${month}-${day}`
}

function addDays(dateText: string, days: number) {
    const date = new Date(`${dateText}T00:00:00+08:00`)
    date.setUTCDate(date.getUTCDate() + days)
    return formatDateInTimezone(date, DefaultScheduleTimezone)
}

function overlapsDateRange(item: StreamerScheduleQueryItem, startDate: string, endDate: string) {
    const itemStart = item.startDate ?? item.endDate
    const itemEnd = item.endDate ?? item.startDate
    if (!itemStart || !itemEnd) {
        return false
    }
    return itemEnd >= startDate && itemStart <= endDate
}

function toDateOrNull(value: string | null) {
    if (!value) return null
    const date = new Date(value)
    if (Number.isNaN(date.getTime())) {
        return null
    }
    return date
}

function toNullableString(value: unknown) {
    if (typeof value !== 'string') return null
    const trimmed = value.trim()
    return trimmed || null
}

function normalizePatchItem(item: SchedulePatchItem) {
    const startAt = toDateOrNull(item.startAt)
    const endAt = toDateOrNull(item.endAt)
    const startDate = item.startDate ?? (startAt ? formatDateInTimezone(startAt, DefaultScheduleTimezone) : null)
    const endDate = item.endDate ?? (endAt ? formatDateInTimezone(endAt, DefaultScheduleTimezone) : startDate)
    const dateText = toNullableString(item.dateText)
    const timeText = toNullableString(item.timeText)
    const summary = toNullableString(item.summary)
    const dedupeHash = createHash('sha256')
    dedupeHash.update(JSON.stringify({
        title: item.title.trim(),
        category: item.category,
        scheduleState: item.scheduleState,
        startDate,
        endDate,
        startAt: startAt?.toISOString() ?? null,
        endAt: endAt?.toISOString() ?? null,
        timeText,
    }))
    return {
        title: item.title.trim(),
        category: item.category,
        scheduleState: item.scheduleState,
        certainty: item.certainty,
        confidence: item.confidence,
        startDate,
        endDate,
        startAt,
        endAt,
        dateText,
        timeText,
        timePrecision: item.timePrecision,
        timezone: DefaultScheduleTimezone,
        summary,
        dedupeKey: dedupeHash.digest('hex'),
        evidenceText: item.evidenceText.trim(),
        extraJson: {
            rawStartDate: item.startDate,
            rawEndDate: item.endDate,
            rawStartAt: item.startAt,
            rawEndAt: item.endAt,
        } satisfies Record<string, unknown>,
    }
}

function getScheduleSourceEvidenceText(source: ScheduleRefreshSource) {
    if (source.sourceType === 'weibo_comment') {
        return source.conversationText ?? source.textRaw
    }
    return source.textRaw
}

function extractJsonText(input: string) {
    const trimmed = input.trim()
    const fenced = trimmed.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '')
    const start = fenced.indexOf('{')
    const end = fenced.lastIndexOf('}')
    if (start === -1 || end === -1 || end < start) {
        throw new Error('模型返回中未找到 JSON 对象')
    }
    return fenced.slice(start, end + 1)
}

async function invokeSchedulePatch(input: {
    streamerId: string
    source: ScheduleRefreshSource
    currentItems: ExistingSchedulePromptItem[]
}) {
    const prompt = buildStreamerSchedulePatchPrompt({
        nowIso: new Date().toISOString(),
        timezone: DefaultScheduleTimezone,
        source: input.source,
        currentItems: input.currentItems,
    })
    const model = createModel()
    logger.info(`开始调用日程模型: streamer=${input.streamerId} source=${input.source.sourceId}`)
    const response = await model.invoke([
        new SystemMessage(prompt.system),
        new HumanMessage(prompt.user),
    ], {
        callbacks: createCallbacks(input.streamerId, input.source.sourceId),
    })
    logger.info(`日程模型调用完成: streamer=${input.streamerId} source=${input.source.sourceId}`)

    const content = typeof response.content === 'string'
        ? response.content
        : JSON.stringify(response.content)
    const parsed = JSON.parse(extractJsonText(content)) as Record<string, unknown>
    return SchedulePatchSchema.parse(parsed)
}

export async function refreshStreamerScheduleBySource(db: Shark7PgDatabase, source: ScheduleRefreshSource): Promise<ScheduleRefreshResult> {
    const repository = new AiStreamerScheduleRepository(db)
    const inputHash = buildScheduleInputHash(source)
    const requestJson = source as unknown as Record<string, unknown>

    const cached = await repository.findSuccessfulRunBySourceHash(source.sourceType, source.sourceId, inputHash)
    if (cached) {
        logger.info(`命中已处理日程刷新: streamer=${source.streamerId} source=${source.sourceId}`)
        return { runId: cached.id, skipped: true, appliedOperations: 0 }
    }

    const latest = await repository.findLatestRunBySourceHash(source.sourceType, source.sourceId, inputHash)
    if (latest?.status === 'running') {
        logger.info(`日程刷新任务正在处理中: streamer=${source.streamerId} source=${source.sourceId}`)
        return { runId: latest.id, skipped: true, appliedOperations: 0 }
    }

    let runId = await repository.createRunningRun({
        streamerId: source.streamerId,
        sourceType: source.sourceType,
        sourceId: source.sourceId,
        inputHash,
        modelName: DefaultScheduleModel,
        promptVersion: StreamerSchedulePromptVersion,
        requestJson,
    })

    if (!runId && latest?.status === 'failed') {
        runId = await repository.reclaimFailedRun(latest.id, {
            modelName: DefaultScheduleModel,
            promptVersion: StreamerSchedulePromptVersion,
            requestJson,
        })
    }

    if (!runId) {
        throw new Error(`无法创建日程刷新任务: source=${source.sourceId}`)
    }

    try {
        const currentItems = await repository.listActivePromptItems(source.streamerId)
        const patch = await invokeSchedulePatch({
            streamerId: source.streamerId,
            source,
            currentItems,
        })

        const appliedOperations = await applySchedulePatch(repository, source, patch)
        await repository.markRunSuccess(runId, patch as unknown as Record<string, unknown>)
        logger.info(`日程刷新完成: streamer=${source.streamerId} source=${source.sourceId} ops=${appliedOperations}`)
        return { runId, skipped: false, appliedOperations }
    } catch (error) {
        const message = error instanceof Error ? error.message : String(error)
        logger.error(`日程刷新失败: streamer=${source.streamerId} source=${source.sourceId} error=${message}`)
        await repository.markRunFailed(runId, message)
        throw error
    }
}

export async function reanalyzeStreamerScheduleWindow(db: Shark7PgDatabase, params: {
    streamerId: string
    hours?: number
}): Promise<AiStreamerScheduleReanalyzeResponse> {
    const streamerId = params.streamerId.trim()
    if (!streamerId) {
        return {
            ok: false,
            streamerId: '',
            error: '缺少 streamerId',
        }
    }

    const prefix = 'weibo:'
    if (!streamerId.startsWith(prefix)) {
        return {
            ok: false,
            streamerId,
            error: '当前只支持微博主播日程重分析',
        }
    }

    const externalUserId = Number(streamerId.slice(prefix.length))
    if (!Number.isFinite(externalUserId) || externalUserId <= 0) {
        return {
            ok: false,
            streamerId,
            error: 'streamerId 格式非法',
        }
    }

    const hours = Math.min(Math.max(Math.floor(params.hours ?? 24), 1), 24 * 30)
    const to = new Date()
    const from = new Date(to.getTime() - hours * 60 * 60 * 1000)
    const sources = await listWeiboSourcesInWindow({
        externalUserId,
        from,
        to,
    })

    let refreshedSources = 0
    let skippedSources = 0
    let appliedOperations = 0
    const failedSources: string[] = []

    for (const source of sources) {
        try {
            const result = await refreshStreamerScheduleBySource(db, source)
            if (result.skipped) {
                skippedSources += 1
            } else {
                refreshedSources += 1
                appliedOperations += result.appliedOperations
            }
        } catch (error) {
            failedSources.push(`${source.sourceId}: ${error instanceof Error ? error.message : String(error)}`)
        }
    }

    return {
        ok: true,
        streamerId,
        hours,
        fromIso: from.toISOString(),
        toIso: to.toISOString(),
        matchedSources: sources.length,
        refreshedSources,
        skippedSources,
        failedSources,
        appliedOperations,
    }
}

async function applySchedulePatch(repository: AiStreamerScheduleRepository, source: ScheduleRefreshSource, patch: SchedulePatch) {
    if (!patch.needsUpdate || patch.operations.length === 0) {
        return 0
    }

    let applied = 0
    for (const operation of patch.operations) {
        if (operation.kind === 'noop') {
            continue
        }

        const normalized = operation.item ? normalizePatchItem(operation.item) : null
        if ((operation.kind === 'add' || operation.kind === 'update') && !normalized) {
            logger.warn(`忽略缺少 item 的日程操作: source=${source.sourceId} kind=${operation.kind}`)
            continue
        }

        if (operation.kind === 'add' && normalized) {
            const existing = await repository.findActiveItemByDedupeKey(source.streamerId, normalized.dedupeKey)
            const itemId = existing
                ? existing.id
                : await repository.createScheduleItem({
                    streamerId: source.streamerId,
                    platform: source.platform,
                    externalUserId: source.externalUserId,
                    title: normalized.title,
                    category: normalized.category,
                    scheduleState: normalized.scheduleState,
                    status: 'active',
                    certainty: normalized.certainty,
                    confidence: normalized.confidence,
                    startDate: normalized.startDate,
                    endDate: normalized.endDate,
                    startAt: normalized.startAt,
                    endAt: normalized.endAt,
                    dateText: normalized.dateText,
                    timeText: normalized.timeText,
                    timePrecision: normalized.timePrecision,
                    timezone: normalized.timezone,
                    summary: normalized.summary,
                    dedupeKey: normalized.dedupeKey,
                    extraJson: normalized.extraJson,
                    lastExtractedAt: new Date(),
                    lastConfirmedAt: normalized.certainty === 'confirmed' ? new Date() : null,
                })
            if (existing) {
                await repository.updateScheduleItem(existing.id, {
                    title: normalized.title,
                    category: normalized.category,
                    scheduleState: normalized.scheduleState,
                    certainty: normalized.certainty,
                    confidence: normalized.confidence,
                    startDate: normalized.startDate,
                    endDate: normalized.endDate,
                    startAt: normalized.startAt,
                    endAt: normalized.endAt,
                    dateText: normalized.dateText,
                    timeText: normalized.timeText,
                    timePrecision: normalized.timePrecision,
                    timezone: normalized.timezone,
                    summary: normalized.summary,
                    extraJson: normalized.extraJson,
                    lastExtractedAt: new Date(),
                    lastConfirmedAt: normalized.certainty === 'confirmed' ? new Date() : existing.lastConfirmedAt,
                })
            }
            await repository.upsertEvidence(itemId, source, normalized.evidenceText)
            applied += 1
            continue
        }

        if (operation.kind === 'update' && normalized) {
            const target = operation.targetItemId
                ? await repository.findActiveItemById(operation.targetItemId)
                : await repository.findActiveItemByDedupeKey(source.streamerId, normalized.dedupeKey)

            if (!target) {
                const itemId = await repository.createScheduleItem({
                    streamerId: source.streamerId,
                    platform: source.platform,
                    externalUserId: source.externalUserId,
                    title: normalized.title,
                    category: normalized.category,
                    scheduleState: normalized.scheduleState,
                    status: 'active',
                    certainty: normalized.certainty,
                    confidence: normalized.confidence,
                    startDate: normalized.startDate,
                    endDate: normalized.endDate,
                    startAt: normalized.startAt,
                    endAt: normalized.endAt,
                    dateText: normalized.dateText,
                    timeText: normalized.timeText,
                    timePrecision: normalized.timePrecision,
                    timezone: normalized.timezone,
                    summary: normalized.summary,
                    dedupeKey: normalized.dedupeKey,
                    extraJson: normalized.extraJson,
                    lastExtractedAt: new Date(),
                    lastConfirmedAt: normalized.certainty === 'confirmed' ? new Date() : null,
                })
                await repository.upsertEvidence(itemId, source, normalized.evidenceText)
            } else {
                await repository.updateScheduleItem(target.id, {
                    title: normalized.title,
                    category: normalized.category,
                    scheduleState: normalized.scheduleState,
                    status: 'active',
                    certainty: normalized.certainty,
                    confidence: normalized.confidence,
                    startDate: normalized.startDate,
                    endDate: normalized.endDate,
                    startAt: normalized.startAt,
                    endAt: normalized.endAt,
                    dateText: normalized.dateText,
                    timeText: normalized.timeText,
                    timePrecision: normalized.timePrecision,
                    timezone: normalized.timezone,
                    summary: normalized.summary,
                    dedupeKey: normalized.dedupeKey,
                    extraJson: normalized.extraJson,
                    lastExtractedAt: new Date(),
                    lastConfirmedAt: normalized.certainty === 'confirmed' ? new Date() : target.lastConfirmedAt,
                })
                await repository.upsertEvidence(target.id, source, normalized.evidenceText)
            }
            applied += 1
            continue
        }

        if (operation.kind === 'cancel') {
            if (operation.targetItemId) {
                const target = await repository.findActiveItemById(operation.targetItemId)
                if (target) {
                    await repository.cancelScheduleItem(target.id)
                    await repository.upsertEvidence(target.id, source, normalized?.evidenceText ?? getScheduleSourceEvidenceText(source))
                    applied += 1
                }
            }

            if (!normalized) {
                if (!operation.targetItemId) {
                    logger.warn(`忽略缺少 item 的 cancel 操作: source=${source.sourceId}`)
                }
                continue
            }

            const existing = await repository.findActiveItemByDedupeKey(source.streamerId, normalized.dedupeKey)
            const itemId = existing
                ? existing.id
                : await repository.createScheduleItem({
                    streamerId: source.streamerId,
                    platform: source.platform,
                    externalUserId: source.externalUserId,
                    title: normalized.title,
                    category: normalized.category,
                    scheduleState: normalized.scheduleState,
                    status: 'active',
                    certainty: normalized.certainty,
                    confidence: normalized.confidence,
                    startDate: normalized.startDate,
                    endDate: normalized.endDate,
                    startAt: normalized.startAt,
                    endAt: normalized.endAt,
                    dateText: normalized.dateText,
                    timeText: normalized.timeText,
                    timePrecision: normalized.timePrecision,
                    timezone: normalized.timezone,
                    summary: normalized.summary,
                    dedupeKey: normalized.dedupeKey,
                    extraJson: normalized.extraJson,
                    lastExtractedAt: new Date(),
                    lastConfirmedAt: normalized.certainty === 'confirmed' ? new Date() : null,
                })

            if (existing) {
                await repository.updateScheduleItem(existing.id, {
                    title: normalized.title,
                    category: normalized.category,
                    scheduleState: normalized.scheduleState,
                    status: 'active',
                    certainty: normalized.certainty,
                    confidence: normalized.confidence,
                    startDate: normalized.startDate,
                    endDate: normalized.endDate,
                    startAt: normalized.startAt,
                    endAt: normalized.endAt,
                    dateText: normalized.dateText,
                    timeText: normalized.timeText,
                    timePrecision: normalized.timePrecision,
                    timezone: normalized.timezone,
                    summary: normalized.summary,
                    extraJson: normalized.extraJson,
                    lastExtractedAt: new Date(),
                    lastConfirmedAt: normalized.certainty === 'confirmed' ? new Date() : existing.lastConfirmedAt,
                })
            }

            await repository.upsertEvidence(itemId, source, normalized.evidenceText)
            applied += 1
        }
    }
    return applied
}

function compareQueryItems(left: StreamerScheduleQueryItem, right: StreamerScheduleQueryItem) {
    const leftKey = left.startAt ?? `${left.startDate ?? '9999-99-99'}T99:99:99+08:00`
    const rightKey = right.startAt ?? `${right.startDate ?? '9999-99-99'}T99:99:99+08:00`
    return leftKey.localeCompare(rightKey)
}

function buildTodaySummary(todayItems: StreamerScheduleQueryItem[]) {
    if (todayItems.length === 0) {
        return '今天暂未看到明确公开安排。'
    }
    const titles = todayItems.slice(0, 3).map((item) => item.summary || item.title)
    const lead = titles.join('；')
    return `今天共有 ${todayItems.length} 条公开安排：${lead}${todayItems.length > 3 ? ' 等。' : '。'}`
}

export async function queryStreamerScheduleWindow(db: Shark7PgDatabase, streamerId: string, days = 7): Promise<AiStreamerScheduleQueryResponse> {
    const repository = new AiStreamerScheduleRepository(db)
    const safeDays = Math.min(Math.max(days, 1), 7)
    const now = getNowInTimezone()
    const todayDate = formatDateInTimezone(now, DefaultScheduleTimezone)
    const endDate = addDays(todayDate, safeDays - 1)
    const allItems = await repository.listWindowItems(streamerId)
    const windowItems = allItems
        .filter((item) => overlapsDateRange(item, todayDate, endDate))
        .sort(compareQueryItems)

    const todayItems = windowItems.filter((item) => overlapsDateRange(item, todayDate, todayDate))
    const upcomingItems = windowItems.filter((item) => !overlapsDateRange(item, todayDate, todayDate))

    const todayLiveItems = todayItems.filter((item) => item.category === 'live' && item.scheduleState !== 'cancelled')
    const todayLiveStatus = todayLiveItems.some((item) => item.certainty === 'confirmed' || item.certainty === 'likely')
        ? 'yes'
        : todayLiveItems.length > 0
            ? 'uncertain'
            : 'no'

    return {
        ok: true,
        streamerId,
        generatedAt: now.toISOString(),
        windowDays: safeDays,
        todayDate,
        todayLiveStatus,
        todaySummary: buildTodaySummary(todayItems),
        todayItems,
        upcomingItems,
    }
}
