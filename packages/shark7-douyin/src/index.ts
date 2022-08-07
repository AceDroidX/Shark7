if (process.env.NODE_ENV != 'production') {
    require('dotenv').config({ debug: true })
}
import { DouyinDBs } from 'shark7-shared/dist/database';
import { MongoControlClient } from 'shark7-shared/dist/db';
import logger from 'shark7-shared/dist/logger';
import { Puppeteer } from 'shark7-shared/dist/Puppeteer';
import { logErrorDetail } from 'shark7-shared/dist/utils';
import { SimpleIntervalJob, Task, ToadScheduler } from 'toad-scheduler';
import winston from 'winston';
import { DouyinWeb } from './DouyinWeb';
import { onUserDBEvent } from "./event";
import { MongoController } from './MongoController';

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
    const mongo = await MongoControlClient.getInstance(DouyinDBs, MongoController)

    logger.add(new winston.transports.MongoDB({
        level: 'debug', db: MongoControlClient.getMongoClientConfig().connect(), collection: 'log-douyin', tryReconnect: true
    }))

    if (!process.env['douyin_sec_uid']) {
        logger.error('请设置douyin_sec_uid')
        process.exit(1)
    }
    const user = await mongo.ctr.getUserInfoBySecUID(process.env['douyin_sec_uid'])
    mongo.addUpdateChangeWatcher(mongo.ctr.dbs.userDB, onUserDBEvent)
    await mongo.ctr.run()
    const puppeteerClient = await Puppeteer.getInstance(mongo.ctr, DouyinWeb)
    await fetchUserInfo(puppeteerClient)
    const scheduler = new ToadScheduler()
    const fetchUserInfoTask = new Task(
        'fetchUserInfo',
        () => { fetchUserInfo(puppeteerClient) },
        (err: Error) => { logErrorDetail('fetchUserInfo错误', err) }
    )
    let interval = 60
    if (process.env['interval']) {
        interval = Number(process.env['interval'])
    }
    scheduler.addSimpleIntervalJob(new SimpleIntervalJob({ seconds: interval, }, fetchUserInfoTask))
    logger.info('douyin模块已启动')
}

async function fetchUserInfo(puppeteerClient: Puppeteer<DouyinWeb>) {
    await puppeteerClient.web.refresh()
}
