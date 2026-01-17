import { initLogger, logErrorDetail, logger, MongoControlClient, Nats, Scheduler, WeiboCookieMgr, WeiboDBs, createChangeTracker } from 'shark7-shared';
import { fetchLike, getLike } from './fetchLike.ts';
import { fetchOnline, getOnline } from './fetchOnline.ts';
import type { WeiboIdConfig, WeiboLikeIdConfig, WeiboOnlineIdConfig } from './model.ts';
import { MongoController } from './MongoController.ts';
import type { OnlineData, WeiboMsg } from 'shark7-shared';
import { getTime, Scope } from 'shark7-shared';
import type { IAtomicChange } from 'json-diff-ts';

function formatOnlineChanges(changes: IAtomicChange[], newData: OnlineData): string[] {
    const messages: string[] = []
    for (const change of changes) {
        if (change.path === '$.online') {
            const msg = change.value ? '在线' : '离线'
            logger.info(`<${newData.screen_name}>微博在线状态改变:${msg}`)
            messages.push(msg)
        }
    }
    return messages
}

function formatLikeChanges(changes: IAtomicChange[], newData: WeiboMsg): string[] {
    const messages: string[] = []
    const msg = `${newData.user.screen_name} 发布于${getTime(newData._timestamp, false)}\n${newData.text_raw ? newData.text_raw : newData.text}`
    messages.push(msg)
    return messages
}

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

    initLogger('weibo-app')

    if (!process.env['weibo_id']) {
        logger.error('请设置weibo_id')
        process.exit(1)
    }
    const weibo_id_config = JSON.parse(process.env['weibo_id']) as WeiboIdConfig[]
    let like_id_config: WeiboLikeIdConfig[] = []
    let online_id_config: WeiboOnlineIdConfig[] = []
    for (const config of weibo_id_config) {
        if (config.like_cid) like_id_config.push({ id: config.id, like_cid: config.like_cid })
        if (config.online_cid) online_id_config.push({ id: config.id, online_cid: config.online_cid })
    }

    const trackOnlineChange = createChangeTracker(
        async (newData) => mongo.ctr.getOnlineDataByID(newData.id),
        (data) => mongo.ctr.insertOnline(data),
        async (event) => {
            const user = await mongo.ctr.getUserInfoByID(event.name as any)
            if (!user) {
                logger.error(`user为null, event:\n${JSON.stringify(event)}`)
                return
            }
            event.name = user.screen_name
            await mongo.publishShark7Event(event)
        },
        {
            formatter: formatOnlineChanges,
            scope: Scope.Weibo.Online,
            name: (newData) => String(newData.id),
            keysToSkip: ['_id', 'shark7_id']
        }
    )

    const trackLikeChange = createChangeTracker(
        async (newData) => mongo.ctr.getLikeByID(newData.id),
        (data) => mongo.ctr.insertLike(data),
        async (event) => {
            const user = await mongo.ctr.getUserInfoByID(event.name as any)
            if (!user) {
                logger.error(`user为null, event:\n${JSON.stringify(event)}`)
                return
            }
            event.name = user.screen_name
            await mongo.publishShark7Event(event)
        },
        {
            formatter: formatLikeChanges,
            onInsert: (newData) => ({
                ts: Number(new Date()),
                name: newData.user.screen_name,
                scope: Scope.Weibo.Like,
                msg: formatLikeChanges([], newData)[0]
            }),
            scope: Scope.Weibo.Like,
            name: (newData) => String(newData.id),
            keysToSkip: ['_id', 'shark7_id']
        }
    )

    const wcm = await WeiboCookieMgr.init(nc)
    if (!await getLike(wcm.cookie, like_id_config[0]) || !await getOnline(wcm.cookie, online_id_config[0])) {
        logger.error('数据获取测试失败')
        process.exit(1)
    }
    let interval = process.env['interval'] ? Number(process.env['interval']) : 10
    const scheduler = new Scheduler()
    scheduler.addJob('fetchLike', interval, () => { like_id_config.forEach(config => fetchLike(mongo.ctr, wcm.cookie, config, trackLikeChange)) })
    scheduler.addJob('fetchOnline', interval, () => { online_id_config.forEach(config => fetchOnline(mongo.ctr, wcm.cookie, config, trackOnlineChange)) })
    logger.info('weibo-app模块已启动')
}


