import { initLogger, logErrorDetail, logger, MongoControlClient, Nats, WeiboCookieMgr, WeiboDBs, createChangeTracker, Scope, Scheduler } from 'shark7-shared';
import type { WeiboMsg, WeiboComment, WeiboUser } from 'shark7-shared';
import { fetchComments } from './comment.ts';
import { fetchMblog } from './fetchMblog.ts';
import { fetchUser } from './fetchUser.ts';
import { WeiboHTTP } from './model/WeiboHTTP.ts';
import { MongoController } from './MongoController.ts';
import { formatWeiboUserChanges, formatWeiboCommentChanges, formatWeiboMblogChanges, createWeiboMblogEvent, createWeiboCommentEvent } from './formatters.ts';

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
    
    const trackUserChange = createChangeTracker<WeiboUser>(
        async (newData) => mongo.ctr.getUserInfoByID(newData.id),
        (data) => mongo.ctr.insertUserInfo(data),
        (event) => mongo.publishShark7Event(event),
        {
            formatter: formatWeiboUserChanges,
            scope: Scope.Weibo.User,
            name: (newData) => newData.screen_name
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
            formatter: formatWeiboMblogChanges,
            onInsert: (newData) => createWeiboMblogEvent(newData.user.screen_name, newData),
            scope: Scope.Weibo.Mblog,
            name: (newData) => newData.user.screen_name,
            onUpdateExtra: async (oldData, newData) => {
                await fetchComments(mongo.ctr, wbhttp, newData.id, newData._userid, trackCommentChange);
            }
        }
    )

    const trackCommentChange = createChangeTracker<WeiboComment>(
        async (newData) => mongo.ctr.getCommentById(newData.id),
        (data) => mongo.ctr.insertComment(data),
        (event) => mongo.publishShark7Event(event),
        {
            formatter: formatWeiboCommentChanges,
            onInsert: (newData) => createWeiboCommentEvent(newData.user.screen_name, newData),
            scope: Scope.Weibo.Comment,
            name: (newData) => newData.user.screen_name
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
