if (process.env.NODE_ENV != 'production') {
    require('dotenv').config({ debug: true })
}
import { Collection } from 'mongodb';
import { MongoDBs } from 'shark7-shared';
import { MongoControlClient } from 'shark7-shared';
import { logger, initLogger } from 'shark7-shared';
import { logErrorDetail } from 'shark7-shared';
import { EventProcessor } from './event';
import { FcmClient } from './fcm';
import { MongoController } from './MongoController';

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
if (require.main === module) {
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
    const mongo = await getAllEventDBs(eventProcessor)

    initLogger('main')

    mongo.ctr.run();

    (await mongo.client.db('log').collections()).forEach(
        (col: Collection) => {
            logger.debug(col.collectionName)
            col.watch().on('change', (event) => eventProcessor.onLogChange(event, col.collectionName))
        }
    );
}

async function getAllEventDBs(eventProcessor: EventProcessor) {
    try {
        const client = await MongoControlClient.getMongoClientConfig().connect();
        const dbs = await MongoDBs.getInstance(client)
        const ctr = new MongoController(eventProcessor, dbs);
        logger.info('数据库已连接');
        return new MongoControlClient(client, ctr);
    } catch (err) {
        logErrorDetail('数据库连接失败', err);
        process.exit(1);
    }
}
