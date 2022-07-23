if (process.env.NODE_ENV != 'production') {
    require('dotenv').config({ debug: true })
}
import { logErrorDetail } from 'shark7-shared/dist/utils'
import logger from 'shark7-shared/dist/logger';
import { MongoController } from './MongoController';
import winston from 'winston';
import { MongoControlClient, MongoDBs } from 'shark7-shared/dist/database';

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
    const mongo = await MongoControlClient.getInstance(MongoDBs, MongoController)

    logger.add(new winston.transports.MongoDB({
        level: 'debug', db: MongoControlClient.getMongoClientConfig().connect(), collection: 'log-main', tryReconnect: true
    }))

    mongo.ctr.run()
}
