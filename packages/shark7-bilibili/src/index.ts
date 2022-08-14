if (process.env.NODE_ENV != 'production') {
    require('dotenv').config({ debug: true })
}
import { BilibiliDBs } from 'shark7-shared/dist/database';
import { MongoControlClient } from 'shark7-shared/dist/db';
import logger from 'shark7-shared/dist/logger';
import { logErrorDetail } from 'shark7-shared/dist/utils';
import { SimpleIntervalJob, Task, ToadScheduler } from 'toad-scheduler';
import winston from 'winston';
import { MongoController } from './MongoController';
import { getUser, insertUser, onUserEvent } from './user';

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
    if (!await getUser(user_id)) {
        logger.error('数据获取测试失败')
        process.exit(1)
    }
    const scheduler = new ToadScheduler()
    const fetchUserTask = new Task(
        'fetchUser',
        () => { insertUser(mongo.ctr, user_id) },
        (err: Error) => { logErrorDetail('fetchUser错误', err) }
    )
    let interval = 10
    if (process.env['interval']) {
        interval = Number(process.env['interval'])
    }
    scheduler.addSimpleIntervalJob(new SimpleIntervalJob({ seconds: interval, }, fetchUserTask))
    logger.info('模块已启动')
}

