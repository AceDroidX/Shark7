if (process.env.NODE_ENV != 'production') {
    require('dotenv').config({ debug: true })
}
import { NeteaseMusicDBs } from 'shark7-shared/dist/database';
import { MongoControlClient } from 'shark7-shared/dist/db';
import logger from 'shark7-shared/dist/logger';
import { Scheduler } from 'shark7-shared/dist/scheduler';
import { logErrorDetail } from 'shark7-shared/dist/utils';
import winston from 'winston';
import { MongoController } from './MongoController';
import { fetchUser, insertUser, onUserEvent } from './user';

process.on('uncaughtException', function (err) {
    if (err.name == 'WeiboError') {
        logger.error(`Weibo模块出现致命错误:\nname:${err.name}\nmessage:${err.message}\nstack:${err.stack}`)
    } else {
        logErrorDetail('未捕获的错误', err)
        process.exit(1);
    }
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
    const mongo = await MongoControlClient.getInstance(NeteaseMusicDBs, MongoController)

    logger.add(new winston.transports.MongoDB({
        level: 'debug', db: MongoControlClient.getMongoClientConfig().connect(), collection: 'log-netease-music', tryReconnect: true
    }))

    if (!process.env['user_id']) {
        logger.error('请设置user_id')
        process.exit(1)
    }
    const user_id = Number(process.env['user_id'])

    mongo.addUpdateChangeWatcher(mongo.ctr.dbs.userDB, onUserEvent)
    if (!await fetchUser(user_id)) {
        logger.error('数据获取测试失败')
        process.exit(1)
    }
    let interval = process.env['interval'] ? Number(process.env['interval']) : 30
    const scheduler = new Scheduler()
    scheduler.addJob('fetchUser', interval, () => { insertUser(mongo.ctr, user_id) })
    logger.info('模块已启动')
}

