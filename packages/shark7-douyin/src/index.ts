if (process.env.NODE_ENV != 'production') {
    require('dotenv').config({ debug: true })
}
import { logErrorDetail } from 'shark7-shared/dist/utils'
import logger from 'shark7-shared/dist/logger';
import winston from 'winston';
import { MongoController } from './MongoController';
import { SimpleIntervalJob, Task, ToadScheduler } from 'toad-scheduler';
import { Puppeteer } from 'shark7-shared/dist/Puppeteer'
import { DouyinWeb } from './DouyinWeb';

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
    const mongo = await MongoController.getInstance()

    logger.add(new winston.transports.MongoDB({
        level: 'debug', db: MongoController.getMongoClientConfig().connect(), collection: 'log-douyin', tryReconnect: true
    }))

    await mongo.run()
    const puppeteerClient = await Puppeteer.getInstance(mongo, DouyinWeb)
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
