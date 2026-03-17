import { initLogger, logErrorDetail, logger, MongoControlClient, Nats, WeiboCookieMgr, WeiboDBs, createChangeTracker, createUpdateEvent, Scope, Scheduler, Shark7JobSubjects, type AiStreamerScheduleRefreshRequest } from 'shark7-shared';
import type { WeiboMsg, WeiboComment, WeiboUser } from 'shark7-shared';
import type { IAtomicChange } from 'json-diff-ts';
import { fetchComments } from './comment.ts';
import { fetchMblog } from './fetchMblog.ts';
import { fetchUser } from './fetchUser.ts';
import { WeiboHTTP } from './model/WeiboHTTP.ts';
import { MongoController } from './MongoController.ts';
import { formatWeiboUserChanges, formatWeiboCommentChanges, formatWeiboMblogChanges, createWeiboMblogEvent, createWeiboCommentEvent } from './formatters.ts';
import { createCommentScheduleRefreshOnUpdateExtra, createMblogScheduleRefreshOnUpdateExtra, formatScheduleComment } from './schedule-refresh.ts';

const encoder = new TextEncoder()

process.on('uncaughtException', function (err) {
    if (err.name == 'WeiboError') {
        logger.error(`Weibo模块出现致命错误:\nname:${err.name}\nmessage:${err.message}\nstack:${err.stack}`)
    } else {
        logErrorDetail('未捕获的错误', err)
        process.exit(1);
    }
});

if (import.meta.main) {
    main()
}
async function main() {
    const nc = await Nats.connect()
    const mongo = await MongoControlClient.getInstance(WeiboDBs, MongoController, nc)

    initLogger('weibo')

    if (!process.env['weibo_id']) {
        logger.error('请设置weibo_id')
        process.exit(1)
    }
    const weibo_id = process.env['weibo_id'].split(',').map(x => parseInt(x))

    const wcm = await WeiboCookieMgr.init(nc)
    const wbhttp = new WeiboHTTP(wcm)

    async function publishMblogScheduleRefreshTask(mblog: WeiboMsg) {
        const payload: AiStreamerScheduleRefreshRequest = {
            source: {
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
            },
        }
        nc.publish(Shark7JobSubjects.AI_STREAMER_SCHEDULE_REFRESH, encoder.encode(JSON.stringify(payload)))
        logger.info(`已发送主播日程正文刷新任务: streamer=${payload.source.streamerId} source=${payload.source.sourceId}`)
    }

    async function publishCommentScheduleRefreshTask(comment: WeiboComment) {
        if (!comment._mblogid || !comment._userid) {
            logger.warn(`跳过缺少微博上下文的评论日程刷新: comment=${comment.id}`)
            return
        }

        const mblog = await mongo.ctr.getMblogByID(comment._mblogid)
        if (!mblog) {
            logger.warn(`跳过缺少微博正文的评论日程刷新: comment=${comment.id} mblog=${comment._mblogid}`)
            return
        }

        const payload: AiStreamerScheduleRefreshRequest = {
            source: {
                streamerId: `weibo:${comment._userid}`,
                platform: 'weibo',
                externalUserId: comment._userid,
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
            },
        }
        nc.publish(Shark7JobSubjects.AI_STREAMER_SCHEDULE_REFRESH, encoder.encode(JSON.stringify(payload)))
        logger.info(`已发送主播日程评论刷新任务: streamer=${payload.source.streamerId} comment=${payload.source.sourceId}`)
    }

    const trackUserChange = createChangeTracker<WeiboUser>(
        async (newData) => mongo.ctr.getUserInfoByID(newData.id),
        (data) => mongo.ctr.insertUserInfo(data),
        (event) => mongo.publishShark7Event(event),
        {
            onUpdate: createUpdateEvent(
                formatWeiboUserChanges,
                (newData) => ({
                    name: newData.screen_name,
                    scope: Scope.Weibo.User
                })
            )
        }
    )

    const trackMblogChange = createChangeTracker<WeiboMsg>(
        async (newData) => {
            const exists = await mongo.ctr.isMblogIDExist(newData.id);
            return exists ? await mongo.ctr.getMblogByID(newData.id) : null;
        },
        (data) => mongo.ctr.insertMblog(data),
        async (event) => {
            if (event) await mongo.publishShark7Event(event);
        },
        {
            onUpdate: createUpdateEvent(
                formatWeiboMblogChanges,
                (newData) => ({
                    name: newData.user.screen_name,
                    scope: Scope.Weibo.Mblog
                })
            ),
            onInsert: async (newData) => {
                await fetchComments(mongo.ctr, wbhttp, newData.id, newData._userid, trackCommentChange);
                await publishMblogScheduleRefreshTask(newData)
                return createWeiboMblogEvent(newData.user.screen_name, newData);
            },
            onUpdateExtra: createMblogScheduleRefreshOnUpdateExtra({
                fetchComments: async (newData) => {
                    await fetchComments(mongo.ctr, wbhttp, newData.id, newData._userid, trackCommentChange)
                },
                publishMblog: publishMblogScheduleRefreshTask,
            })
        }
    )

    const trackCommentChange = createChangeTracker<WeiboComment>(
        async (newData) => mongo.ctr.getCommentById(newData.id),
        (data) => mongo.ctr.insertComment(data),
        (event) => mongo.publishShark7Event(event),
        {
            onUpdate: createUpdateEvent(
                formatWeiboCommentChanges,
                (newData) => ({
                    name: newData.user.screen_name,
                    scope: Scope.Weibo.Comment
                })
            ),
            onInsert: async (newData) => {
                await publishCommentScheduleRefreshTask(newData)
                return createWeiboCommentEvent(newData.user.screen_name, newData)
            },
            onUpdateExtra: createCommentScheduleRefreshOnUpdateExtra({
                publishComment: publishCommentScheduleRefreshTask,
            }),
        }
    )

    const users = await fetchUser(weibo_id, wbhttp, wcm)
    if (users.length === 0) {
        logger.error('数据获取测试失败')
        process.exit(1)
    }
    for (const user of users) {
        await trackUserChange(user)
    }

    let mblogInterval = process.env['mblog_interval'] ? Number(process.env['mblog_interval']) : 4
    let userInterval = process.env['user_interval'] ? Number(process.env['user_interval']) : 10
    const scheduler = new Scheduler()
    scheduler.addJob('fetchUser', userInterval, async () => {
        const users = await fetchUser(weibo_id, wbhttp, wcm);
        for (const user of users) {
            await trackUserChange(user);
        }
    })
    scheduler.addJob('fetchMblog', mblogInterval, async () => {
        const mblogs = await fetchMblog(weibo_id, wbhttp, wcm);
        for (const mblog of mblogs) {
            await trackMblogChange(mblog);
        }
    })
    logger.info('weibo模块已启动')
}
