import { BilibiliDBs, MongoControlClient, Scheduler, initLogger, logErrorDetail, logger } from 'shark7-shared';
import { MongoController } from './MongoController.ts';
import { insertDynamic, onDynamicEvent, onDynamicUpdate } from './dynamic.ts';
import { insertUser, onUserEvent } from './user.ts';
import { insertVideo, onCoinEvent, onLikeEvent, onVideoUpdate } from './video.ts';

process.on('uncaughtException', function (err) {
    logErrorDetail('未捕获的错误', err)
    process.exit(1);
});
// process.on('unhandledRejection', (reason, promise) => {
//     promise.catch((err) => {logger.error(err)});
//     logger.error(`Unhandled Rejection at:${promise}\nreason:${JSON.stringify(reason)}`);
//     process.exit(1);
// });
if (import.meta.main) {
    main()
}
async function main() {
    const mongo = await MongoControlClient.getInstance(BilibiliDBs, MongoController)

    initLogger('bilibili')

    if (!process.env['user_id']) {
        logger.error('请设置user_id')
        process.exit(1)
    }
    const user_id = Number(process.env['user_id'])

    mongo.addUpdateChangeWatcher(mongo.ctr.dbs.userDB, onUserEvent)
    mongo.addInsertChangeWatcher(mongo.ctr.dbs.coinDB, onCoinEvent, onVideoUpdate)
    mongo.addInsertChangeWatcher(mongo.ctr.dbs.likeDB, onLikeEvent, onVideoUpdate)
    mongo.addInsertChangeWatcher(mongo.ctr.dbs.dynamicDB, onDynamicEvent, onDynamicUpdate)
    if (!insertUser(mongo.ctr, user_id)) {
        logger.error('数据获取测试失败')
        process.exit(1)
    }
    await insertUser(mongo.ctr, user_id) // 先获取用户数据
    let interval = process.env['interval'] ? Number(process.env['interval']) : 10
    const scheduler = new Scheduler()
    scheduler.addJob('fetchUser', interval, () => { insertUser(mongo.ctr, user_id) })
    scheduler.addJob('fetchCoin', interval, () => { insertVideo(mongo.ctr, user_id, 'coin') })
    scheduler.addJob('fetchLike', interval, () => { insertVideo(mongo.ctr, user_id, 'like') })
    scheduler.addJob('fetchDynamic', interval, () => { insertDynamic(mongo.ctr, user_id) })
    logger.info('模块已启动')
}

