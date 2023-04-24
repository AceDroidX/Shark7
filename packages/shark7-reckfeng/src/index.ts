if (process.env.NODE_ENV != 'production') {
    require('dotenv').config({ debug: true })
}
import { MongoControlClient, ReckfengDBs, Scheduler, initLogger, logErrorDetail, logger } from 'shark7-shared';
import { MongoController } from './MongoController';
import { fetchUser, insertUser, onUserEvent } from './user';

process.on('uncaughtException', function (err) {
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
if (require.main === module) {
    main()
}
async function main() {
    const mongo = await MongoControlClient.getInstance(ReckfengDBs, MongoController)

    initLogger('reckfeng')

    if (!process.env['user_id']) {
        logger.error('请设置user_id')
        process.exit(1)
    }
    if (!process.env['user_name']) {
        logger.error('请设置user_name')
        process.exit(1)
    }
    if (!process.env['token']) {
        logger.error('请设置token')
        process.exit(1)
    }
    const user_id = Number(process.env['user_id'])
    const user_name = process.env['user_name']

    mongo.addUpdateChangeWatcher(mongo.ctr.dbs.userDB, onUserEvent)
    if (!await fetchUser(user_id, user_name)) {
        logger.error('数据获取测试失败')
        process.exit(1)
    }
    let interval = process.env['interval'] ? Number(process.env['interval']) : 10
    const scheduler = new Scheduler()
    scheduler.addJob('fetchUser', interval, () => { insertUser(mongo.ctr, user_id, user_name) })
    logger.info('模块已启动')
}

