import { MongoClient } from 'mongodb'
import type { WeiboMsg } from 'shark7-shared'
import type { HistoricalScheduleSource } from './types.ts'

function getMongoClient() {
    return new MongoClient(`mongodb://admin:${process.env['MONGODB_PASS'] ?? 'admin'}@${process.env['MONGODB_IP'] ?? '127.0.0.1'}:27017/?authMechanism=DEFAULT`, {
        retryReads: true,
        retryWrites: true,
    })
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

        const rows = await mblogsDB.find({
            _userid: params.externalUserId,
            _timestamp: {
                $gte: params.from.getTime(),
                $lte: params.to.getTime(),
            },
        }).sort({ _timestamp: 1 }).toArray()

        return rows.map((mblog) => ({
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
        }))
    } finally {
        await client.close()
    }
}
