if (process.env.NODE_ENV != 'production') {
    require('dotenv').config({ debug: true })
}
import { BilibiliDBs } from 'shark7-shared/dist/database';
import { MongoControlClient } from 'shark7-shared/dist/db';
import logger from 'shark7-shared/dist/logger';
import { Scheduler } from 'shark7-shared/dist/scheduler';
import { logErrorDetail } from 'shark7-shared/dist/utils';
import winston from 'winston';
import { insertDynamic, onDynamicEvent, onDynamicUpdate } from './dynamic';
import { MongoController } from './MongoController';
import { insertUser, onUserEvent } from './user';
import { insertVideo, onCoinEvent, onLikeEvent, onVideoUpdate } from './video';

process.on('uncaughtException', function (err) {
    logErrorDetail('未捕获的错误', err)
    process.exit(1);
});
// process.on('unhandledRejection', (reason, promise) => {
//     promise.catch((err) => {logger.error(err)});
//     logger.error(`Unhandled Rejection at:${promise}\nreason:${JSON.stringify(reason)}`);
//     process.exit(1);
// });
if (require.main === module) {
    main()
}
async function main() {
    const mongo = await MongoControlClient.getInstance(BilibiliDBs, MongoController)

    logger.add(new winston.transports.MongoDB({
        level: 'debug', db: MongoControlClient.getMongoClientConfig().connect(), collection: 'log-bilibili', tryReconnect: true
    }))

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
    let interval = process.env['interval'] ? Number(process.env['interval']) : 10
    const scheduler = new Scheduler()
    scheduler.addJob('fetchUser', interval, () => { insertUser(mongo.ctr, user_id) })
    scheduler.addJob('fetchCoin', interval, () => { insertVideo(mongo.ctr, user_id, 'coin') })
    scheduler.addJob('fetchLike', interval, () => { insertVideo(mongo.ctr, user_id, 'like') })
    scheduler.addJob('fetchDynamic', interval, () => { insertDynamic(mongo.ctr, user_id) })
    logger.info('模块已启动')
}

