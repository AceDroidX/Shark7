if (process.env.NODE_ENV != 'production') {
    require('dotenv').config({ debug: true })
}
import { toNumOrStr } from 'shark7-shared/dist/utils'
import { WeiboController } from './WeiboController';
import logger from 'shark7-shared/dist/logger';
import { MongoController } from './MongoController';
import winston from 'winston';
import { MongoControlClient, WeiboDBs } from 'shark7-shared/dist/database';
import { onMblogEvent } from './event';

process.on('uncaughtException', function (err) {
    //打印出错误
    if (err.name == 'WeiboError') {
        logger.error(`Weibo模块出现致命错误:\nname:${err.name}\nmessage:${err.message}\nstack:${err.stack}`)
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
        level: 'debug', db: MongoControlClient.getMongoClientConfig().connect(), collection: 'log-weibo', tryReconnect: true
    }))

    const weibo_id = toNumOrStr(process.env['weibo_id'])
    if (typeof weibo_id != "number") {
        logger.error('请设置weibo_id')
        process.exit(1)
    }
    mongo.addInsertChangeWatcher(mongo.ctr.dbs.mblogsDB, onMblogEvent)
    await mongo.ctr.run()
    // const weibo_id = roomid_str.split(',').map(x => parseInt(x))
    const weibo_Controller = await WeiboController.init(weibo_id, mongo.ctr)
    weibo_Controller.run()
}
