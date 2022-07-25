if (process.env.NODE_ENV != 'production') {
    require('dotenv').config({ debug: true })
}
import { logErrorDetail } from 'shark7-shared/dist/utils'
import logger from 'shark7-shared/dist/logger';
import winston from 'winston';
import { MongoController, onNewLike } from './MongoController';
import { SimpleIntervalJob, Task, ToadScheduler } from 'toad-scheduler';
import { fetchLike } from './fetchLike';
import { fetchOnline } from './fetchOnline';
import { MongoControlClient, WeiboDBs } from 'shark7-shared/dist/database';

process.on('uncaughtException', function (err) {
    //打印出错误
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
// init
if (require.main === module) {
    main()
}
async function main() {
    const mongo = await MongoControlClient.getInstance(WeiboDBs, MongoController)

    logger.add(new winston.transports.MongoDB({
        level: 'debug', db: MongoControlClient.getMongoClientConfig().connect(), collection: 'log-weibo-app', tryReconnect: true
    }))

    if (!process.env['weibo_id']) {
        logger.error('请设置weibo_id')
        process.exit(1)
    }
    const weibo_id = Number(process.env['weibo_id'])

    mongo.addInsertChangeWatcher(mongo.ctr.dbs.likeDB, onNewLike)
    await mongo.ctr.run()
    await fetchLike(mongo.ctr, weibo_id)
    const scheduler = new ToadScheduler()
    const fetchLikeTask = new Task(
        'fetchLike',
        () => { fetchLike(mongo.ctr, weibo_id) },
        (err: Error) => { logErrorDetail('fetchLike错误', err) }
    )
    const fetchOnlineTask = new Task(
        'fetchOnline',
        () => { fetchOnline(mongo.ctr, weibo_id) },
        (err: Error) => { logErrorDetail('fetchOnline错误', err) }
    )
    let interval = 10
    if (process.env['interval']) {
        interval = Number(process.env['interval'])
    }
    scheduler.addSimpleIntervalJob(new SimpleIntervalJob({ seconds: interval, }, fetchLikeTask))
    scheduler.addSimpleIntervalJob(new SimpleIntervalJob({ seconds: interval, }, fetchOnlineTask))
    logger.info('weibo-app模块已启动')
}

