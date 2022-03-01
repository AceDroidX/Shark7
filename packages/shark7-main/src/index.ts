import config from './config'
import { logErrorDetail } from './utils'
import logger from './logger';
import { MongoClient } from 'mongodb';
import { MongoController } from './MongoController';
import winston from 'winston';

var marked_uid: number[]

process.on('uncaughtException', function (err) {
    //打印出错误 
    if (err.name == 'WeiboError') {
        logger.error(`Weibo模块出现致命错误:\nname:${err.name}\nmessage:${err.message}\nstack:${err.stack}`)
    } else {
        logErrorDetail('未捕获的错误', err)
        process.exit(2);
    }
    //打印出错误的调用栈方便调试 
    // console.log(err.stack);
});
// process.on('unhandledRejection', (reason, promise) => {
//     promise.catch((err) => {logger.error(err)});
//     logger.error(`Unhandled Rejection at:${promise}\nreason:${JSON.stringify(reason)}`);
//     process.exit(2);
// });
// init
if (require.main === module) {
    // refreshWeiboCookie()
    main()
}
async function main() {
    const mongo = await MongoController.getInstance()

    logger.add(new winston.transports.MongoDB({
        level: 'debug', db: new MongoClient(
            process.env.NODE_ENV == 'development'
                ? 'mongodb://localhost:27017/'
                : 'mongodb://admin:' +
                process.env.MONGODB_PASS +
                '@' +
                process.env.MONGODB_IP +
                ':27017/?authMechanism=DEFAULT'
        ).connect(), collection: 'log-main', tryReconnect: true
    }))

    mongo.run()
}