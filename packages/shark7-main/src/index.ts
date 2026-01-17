import { Collection } from 'mongodb';
import { MongoControlClient, MongoDBs, initLogger, logErrorDetail, logger, Nats } from 'shark7-shared';
import { MongoController } from './MongoController.ts';
import { EventProcessor } from './event.ts';
import { FcmClient } from './fcm/index.ts';

process.on('uncaughtException', function (err) {
    //打印出错误
    if (err.name == 'WeiboError') {
        logger.error(`Weibo模块出现致命错误:\nname:${err.name}\nmessage:${err.message}\nstack:${err.stack}`)
    } else {
        logErrorDetail('未捕获的错误', err)
        process.exit(1);
    }
    //打印出错误的调用栈方便调试
    // console.log(err.stack);
});
// process.on('unhandledRejection', (reason, promise) => {
//     promise.catch((err) => {logger.error(err)});
//     logger.error(`Unhandled Rejection at:${promise}\nreason:${JSON.stringify(reason)}`);
//     process.exit(1);
// });
// init
if (import.meta.main) {
    // refreshWeiboCookie()
    main()
}
async function main() {
    let eventProcessor: EventProcessor
    if (process.env['fcm_channels']) {
        const fcm = new FcmClient()
        eventProcessor = new EventProcessor(fcm)
    } else {
        eventProcessor = new EventProcessor()
    }
    
    const nc = await Nats.connect()
    const mongo = await getAllEventDBs(eventProcessor, nc)

    initLogger('main')

    await mongo.ctr.subscribeEvents();
}

async function getAllEventDBs(eventProcessor: EventProcessor, nc?: any) {
    try {
        const client = await MongoControlClient.getMongoClientConfig().connect();
        const dbs = await MongoDBs.getInstance(client)
        const ctr = new MongoController(eventProcessor, dbs, nc);
        logger.info('数据库已连接');
        return new MongoControlClient(client, ctr);
    } catch (err) {
        logErrorDetail('数据库连接失败', err);
        process.exit(1);
    }
}
