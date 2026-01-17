import { BilibiliDBs, createChangeTracker, initLogger, logErrorDetail, logger, MongoControlClient, Nats, Scheduler, Scope } from 'shark7-shared';
import { MongoController } from './MongoController.ts';
import { getDynamic } from './dynamic.ts';
import { createBilibiliCoinEvent, createBilibiliDynamicEvent, createBilibiliLikeEvent, formatBilibiliDynamicChanges, formatBilibiliUserChanges, formatBilibiliVideoChanges } from './formatters.ts';
import { getUser } from './user.ts';
import { getVideo } from './video.ts';

process.on('uncaughtException', function (err) {
    logErrorDetail('未捕获的错误', err)
    process.exit(1);
});

if (import.meta.main) {
    main()
}
async function main() {
    const nc = await Nats.connect()
    const mongo = await MongoControlClient.getInstance(BilibiliDBs, MongoController, nc)

    initLogger('bilibili')

    if (!process.env['user_id']) {
        logger.error('请设置user_id')
        process.exit(1)
    }
    const user_id = Number(process.env['user_id'])

    const trackUserChange = createChangeTracker(
        async (newData) => {
            const user = await mongo.ctr.getUser(user_id);
            return user;
        },
        (data) => mongo.ctr.insertUser(data),
        (event) => mongo.publishShark7Event(event),
        {
            formatter: formatBilibiliUserChanges,
            scope: Scope.Bilibili.User,
            name: (newData) => newData.name
        }
    )

    const trackCoinChange = createChangeTracker(
        async (newData: any) => {
            return await mongo.ctr.getCoinByAid(newData.shark7_id, newData.aid);
        },
        (data) => mongo.ctr.insertCoin(data),
        (event) => mongo.publishShark7Event(event),
        {
            formatter: formatBilibiliVideoChanges,
            onInsert: (newData: any) => createBilibiliCoinEvent(newData.shark7_name, newData),
            scope: Scope.Bilibili.Coin,
            name: (newData) => newData.shark7_name || newData.owner?.name || 'Unknown'
        }
    )

    const trackLikeChange = createChangeTracker(
        async (newData: any) => {
            return await mongo.ctr.getLikeByAid(newData.shark7_id, newData.aid);
        },
        (data) => mongo.ctr.insertLike(data),
        (event) => mongo.publishShark7Event(event),
        {
            formatter: formatBilibiliVideoChanges,
            onInsert: (newData: any) => createBilibiliLikeEvent(newData.shark7_name, newData),
            scope: Scope.Bilibili.Like,
            name: (newData) => newData.shark7_name || newData.owner?.name || 'Unknown'
        }
    )

    const trackDynamicChange = createChangeTracker(
        async (newData: any) => {
            return await mongo.ctr.getDynamicById(newData.id_str);
        },
        (data) => mongo.ctr.insertDynamic(data),
        (event) => mongo.publishShark7Event(event),
        {
            formatter: formatBilibiliDynamicChanges,
            onInsert: (newData: any) => createBilibiliDynamicEvent(newData.modules.module_author.name, newData),
            scope: Scope.Bilibili.Dynamic,
            name: (newData) => newData.modules?.module_author?.name || newData.shark7_name || 'Unknown'
        }
    )
    
    if (!getUser(user_id)) {
        logger.error('数据获取测试失败')
        process.exit(1)
    }
    const user = await getUser(user_id)
    if (!user) {
        logger.error('数据获取测试失败')
        process.exit(1)
    }
    await trackUserChange(user)
    let interval = process.env['interval'] ? Number(process.env['interval']) : 10
    const scheduler = new Scheduler()
    scheduler.addJob('fetchUser', interval, async () => {
        const data = await getUser(user_id);
        if (data) await trackUserChange(data);
    })
    scheduler.addJob('fetchCoin', interval, async () => {
        const data = await getVideo(user_id, user.name, 'coin');
        if (data) for (const item of data) await trackCoinChange(item);
    })
    scheduler.addJob('fetchLike', interval, async () => {
        const data = await getVideo(user_id, user.name, 'like');
        if (data) for (const item of data) await trackLikeChange(item);
    })
    scheduler.addJob('fetchDynamic', interval, async () => {
        const data = await getDynamic(user_id, user.name);
        if (data) for (const item of data) await trackDynamicChange(item);
    })
    logger.info('模块已启动')
}
