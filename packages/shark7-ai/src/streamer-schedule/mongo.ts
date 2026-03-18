import { MongoClient } from 'mongodb'
import type { WeiboComment, WeiboMsg } from 'shark7-shared'
import type { HistoricalScheduleSource } from './types.ts'

function getMongoClient() {
    return new MongoClient(`mongodb://admin:${process.env['MONGODB_PASS'] ?? 'admin'}@${process.env['MONGODB_IP'] ?? '127.0.0.1'}:27017/?authMechanism=DEFAULT`, {
        retryReads: true,
        retryWrites: true,
    })
}

function toSourcePublishedAt(value: string | number) {
    const date = new Date(value)
    if (Number.isNaN(date.getTime())) {
        return null
    }
    return date.toISOString()
}

function buildMblogSource(mblog: WeiboMsg): HistoricalScheduleSource {
    return {
        streamerId: `weibo:${mblog._userid}`,
        platform: 'weibo',
        externalUserId: mblog._userid,
        screenName: mblog.user.screen_name,
        sourceType: 'weibo_mblog',
        sourceId: String(mblog.id),
        sourceUrl: `https://weibo.com/${mblog.user.id}/${mblog.mblogid}`,
        sourcePublishedAt: new Date(mblog._timestamp).toISOString(),
        textRaw: mblog.text_raw,
        title: mblog.title ?? null,
        visibleType: mblog.visible_type,
        repostType: mblog.repost_type ?? null,
        isTop: Boolean(mblog.isTop),
        authorUserId: mblog.user.id,
        raw: mblog.shark7_raw as Record<string, unknown> | null,
    }
}

function buildCommentSource(comment: WeiboComment, mblog: WeiboMsg): HistoricalScheduleSource {
    return {
        streamerId: `weibo:${comment._userid}`,
        platform: 'weibo',
        externalUserId: comment._userid!,
        screenName: comment.user.screen_name,
        sourceType: 'weibo_comment',
        sourceId: String(comment.id),
        sourceUrl: `https://weibo.com/${mblog.user.id}/${mblog.mblogid}`,
        sourcePublishedAt: new Date(comment.created_at).toISOString(),
        textRaw: comment.text_raw,
        authorUserId: comment.user.id,
        raw: comment.shark7_raw as Record<string, unknown> | null,
        replyCommentId: comment.reply_comment ? String(comment.reply_comment.id) : null,
        replyTextRaw: comment.reply_comment?.text_raw ?? comment.reply_comment?.text ?? null,
        replyScreenName: comment.reply_comment?.user.screen_name ?? null,
        conversationText: comment.reply_comment
            ? `原评论<${comment.reply_comment.user.screen_name}>:\n${comment.reply_comment.text_raw ?? comment.reply_comment.text ?? ''}\n回复:\n${comment.text_raw}`
            : comment.text_raw,
        mblog: {
            sourceId: String(mblog.id),
            sourceUrl: `https://weibo.com/${mblog.user.id}/${mblog.mblogid}`,
            sourcePublishedAt: new Date(mblog._timestamp).toISOString(),
            textRaw: mblog.text_raw,
            title: mblog.title ?? null,
            visibleType: mblog.visible_type,
            repostType: mblog.repost_type ?? null,
            isTop: Boolean(mblog.isTop),
            raw: mblog.shark7_raw as Record<string, unknown> | null,
        },
    }
}

export async function listWeiboSourcesInWindow(params: {
    externalUserId: number
    from: Date
    to: Date
}): Promise<HistoricalScheduleSource[]> {
    const client = getMongoClient()
    await client.connect()
    try {
        const db = client.db('weibo')
        const mblogsDB = db.collection<WeiboMsg>('mblogs')
        const commentsDB = db.collection<WeiboComment>('comments')
        const fromTimestamp = params.from.getTime()
        const toTimestamp = params.to.getTime()

        const [mblogs, authorComments] = await Promise.all([
            mblogsDB.find({
                _userid: params.externalUserId,
                _timestamp: {
                    $gte: fromTimestamp,
                    $lte: toTimestamp,
                },
            }).sort({ _timestamp: 1 }).toArray(),
            commentsDB.find({
                _userid: params.externalUserId,
                'user.id': params.externalUserId,
            }).toArray(),
        ])

        const comments = authorComments.filter((comment) => {
            const timestamp = Date.parse(comment.created_at)
            return Number.isFinite(timestamp) && timestamp >= fromTimestamp && timestamp <= toTimestamp
        })

        const mblogMap = new Map<number, WeiboMsg>()
        for (const mblog of mblogs) {
            mblogMap.set(mblog.id, mblog)
        }

        const missingMblogIds = Array.from(new Set(
            comments
                .map((comment) => comment._mblogid)
                .filter((mblogId): mblogId is number => typeof mblogId === 'number' && !mblogMap.has(mblogId)),
        ))

        if (missingMblogIds.length > 0) {
            const relatedMblogs = await mblogsDB.find({
                id: { $in: missingMblogIds },
            }).toArray()
            for (const mblog of relatedMblogs) {
                mblogMap.set(mblog.id, mblog)
            }
        }

        const sources = [
            ...mblogs.map((mblog) => buildMblogSource(mblog)),
            ...comments.flatMap((comment) => {
                if (!comment._userid || !comment._mblogid) {
                    return []
                }
                const mblog = mblogMap.get(comment._mblogid)
                if (!mblog) {
                    return []
                }
                return [buildCommentSource(comment, mblog)]
            }),
        ]

        return sources.sort((left, right) => {
            const leftPublishedAt = toSourcePublishedAt(left.sourcePublishedAt) ?? left.sourcePublishedAt
            const rightPublishedAt = toSourcePublishedAt(right.sourcePublishedAt) ?? right.sourcePublishedAt
            const comparePublishedAt = leftPublishedAt.localeCompare(rightPublishedAt)
            if (comparePublishedAt !== 0) {
                return comparePublishedAt
            }
            if (left.sourceType !== right.sourceType) {
                return left.sourceType.localeCompare(right.sourceType)
            }
            return left.sourceId.localeCompare(right.sourceId)
        })
    } finally {
        await client.close()
    }
}
