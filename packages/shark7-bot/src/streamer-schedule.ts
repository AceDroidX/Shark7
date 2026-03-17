import {
    Nats,
    Shark7RpcSubjects,
    logger,
    type AiStreamerScheduleQueryRequest,
    type AiStreamerScheduleQueryResponse,
    type AiStreamerScheduleReanalyzeRequest,
    type AiStreamerScheduleReanalyzeResponse,
    type StreamerScheduleQueryItem,
} from 'shark7-shared'

const encoder = new TextEncoder()
const decoder = new TextDecoder()

function getDefaultStreamerId() {
    const raw = process.env['SCHEDULE_DEFAULT_WEIBO_UID']?.trim() || process.env['weibo_id']?.split(',')[0]?.trim()
    if (!raw) {
        throw new Error('未配置 SCHEDULE_DEFAULT_WEIBO_UID 或 weibo_id')
    }
    const numeric = raw.startsWith('weibo:') ? raw.slice('weibo:'.length) : raw
    if (!/^\d+$/.test(numeric)) {
        throw new Error(`默认微博主播 UID 非法: ${raw}`)
    }
    return `weibo:${numeric}`
}

export async function requestStreamerSchedule(days = 7) {
    const streamerId = getDefaultStreamerId()
    const nc = await Nats.connect()
    try {
        const payload: AiStreamerScheduleQueryRequest = { streamerId, days }
        const timeout = Number(process.env['AI_RPC_TIMEOUT_MS'] ?? '300000')
        const msg = await nc.request(
            Shark7RpcSubjects.AI_STREAMER_SCHEDULE_QUERY,
            encoder.encode(JSON.stringify(payload)),
            { timeout },
        )
        return JSON.parse(decoder.decode(msg.data)) as AiStreamerScheduleQueryResponse
    } finally {
        await nc.close()
    }
}

export async function requestStreamerScheduleReanalyze(hours = 24) {
    const streamerId = getDefaultStreamerId()
    const nc = await Nats.connect()
    try {
        const payload: AiStreamerScheduleReanalyzeRequest = { streamerId, hours }
        const timeout = Number(process.env['AI_RPC_TIMEOUT_MS'] ?? '300000')
        const msg = await nc.request(
            Shark7RpcSubjects.AI_STREAMER_SCHEDULE_REANALYZE,
            encoder.encode(JSON.stringify(payload)),
            { timeout },
        )
        return JSON.parse(decoder.decode(msg.data)) as AiStreamerScheduleReanalyzeResponse
    } finally {
        await nc.close()
    }
}

function formatItem(item: StreamerScheduleQueryItem) {
    const parts: string[] = []
    if (item.startDate && item.endDate && item.startDate !== item.endDate) {
        parts.push(`${item.startDate}~${item.endDate}`)
    } else if (item.startDate) {
        parts.push(item.startDate)
    }
    if (item.timeText) {
        parts.push(item.timeText)
    } else if (item.startAt) {
        parts.push(item.startAt.replace('T', ' ').replace(/\.\d{3}Z$/, 'Z'))
    }
    const source = item.sources[0]
    const summary = item.summary ? ` - ${item.summary}` : ''
    const state = item.scheduleState === 'cancelled' ? '取消' : '安排'
    const certainty = item.certainty === 'confirmed'
        ? '确定'
        : item.certainty === 'likely'
            ? '大概率'
            : item.certainty === 'tentative'
                ? '暂定'
                : '未知'
    const sourceText = source ? ` | 来源：${source.sourceId}` : ''
    return `- ${parts.join(' ')} ${item.title}${summary} [${state}/${certainty}]${sourceText}`.trim()
}

export function formatStreamerScheduleResponse(response: AiStreamerScheduleQueryResponse) {
    if (!response.ok) {
        logger.warn(`主播日程查询失败: ${response.error}`)
        return `查询日程失败：${response.error}`
    }

    const todayCancelledLive = response.todayItems.filter((item) => item.category === 'live' && item.scheduleState === 'cancelled')
    const todayScheduledLive = response.todayItems.filter((item) => item.category === 'live' && item.scheduleState !== 'cancelled')
    const todayLiveText = todayCancelledLive.length > 0 && todayScheduledLive.length === 0
        ? '今天明确说了不播。'
        : response.todayLiveStatus === 'yes'
            ? '今天有直播安排。'
            : response.todayLiveStatus === 'uncertain'
                ? '今天可能有直播安排，但还不够确定。'
                : '今天暂未看到明确直播安排。'

    const todayBlock = response.todayItems.length > 0
        ? response.todayItems.map(formatItem).join('\n')
        : '- 今天暂无公开安排'

    const upcomingBlock = response.upcomingItems.length > 0
        ? response.upcomingItems.map(formatItem).join('\n')
        : '- 未来 7 天暂无更多公开安排'

    return [
        todayLiveText,
        response.todaySummary,
        '',
        '今天安排：',
        todayBlock,
        '',
        `未来 ${response.windowDays} 天日程：`,
        upcomingBlock,
    ].join('\n')
}

export function formatStreamerScheduleReanalyzeResponse(response: AiStreamerScheduleReanalyzeResponse) {
    if (!response.ok) {
        logger.warn(`主播日程重分析失败: ${response.error}`)
        return `重新分析日程失败：${response.error}`
    }

    const failedText = response.failedSources.length > 0
        ? `\n失败来源：\n- ${response.failedSources.join('\n- ')}`
        : ''

    return [
        `已完成最近 ${response.hours} 小时的日程重分析。`,
        `时间范围：${response.fromIso} ~ ${response.toIso}`,
        `命中微博：${response.matchedSources}`,
        `重新刷新：${response.refreshedSources}`,
        `跳过重复：${response.skippedSources}`,
        `应用操作：${response.appliedOperations}`,
        failedText,
    ].filter(Boolean).join('\n')
}
