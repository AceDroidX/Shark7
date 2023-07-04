if (process.env.NODE_ENV != 'production') {
    require('dotenv').config({ debug: true })
}
import { DouyinDBs, MongoControlClient, Scheduler, initLogger, logErrorDetail, logger } from 'shark7-shared';
import { MongoController } from './MongoController';
import { onUserDBEvent } from "./event";
import { insertUser } from './user';

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

    initLogger('douyin')

    const sec_uid = process.env['douyin_sec_uid']
    if (!sec_uid) {
        logger.error('请设置douyin_sec_uid')
        process.exit(1)
    }
    mongo.addUpdateChangeWatcher(mongo.ctr.dbs.userDB, onUserDBEvent)
    await mongo.ctr.run()
    if (!await insertUser(mongo.ctr, sec_uid)) {
        logger.error('数据获取测试失败')
        process.exit(1)
    }
    let interval = process.env['interval'] ? Number(process.env['interval']) : 60
    const scheduler = new Scheduler()
    scheduler.addJob('fetchUserInfo', interval, () => { insertUser(mongo.ctr,sec_uid) })
    logger.info('douyin模块已启动')
}
