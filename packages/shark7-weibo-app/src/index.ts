if (process.env.NODE_ENV != 'production') {
    require('dotenv').config({ debug: true })
}
import { MongoControlClient, WeiboDBs } from 'shark7-shared/dist/database';
import logger from 'shark7-shared/dist/logger';
import { logErrorDetail } from 'shark7-shared/dist/utils';
import { SimpleIntervalJob, Task, ToadScheduler } from 'toad-scheduler';
import winston from 'winston';
import { fetchLike, getLike } from './fetchLike';
import { fetchOnline, getOnline } from './fetchOnline';
import { WeiboIdConfig, WeiboLikeIdConfig, WeiboOnlineIdConfig } from './model';
import { MongoController, onNewLike, onNewOnlineData } from './MongoController';

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
    const weibo_id_config = JSON.parse(process.env['weibo_id']) as WeiboIdConfig[]
    let like_id_config: WeiboLikeIdConfig[] = []
    let online_id_config: WeiboOnlineIdConfig[] = []
    for (const config of weibo_id_config) {
        if (config.like_cid) like_id_config.push({ id: config.id, like_cid: config.like_cid })
        if (config.online_cid) online_id_config.push({ id: config.id, online_cid: config.online_cid })
    }
    const originOnlineData = await Promise.all(online_id_config.map(async config => {
        return { id: String(config.id), data: await mongo.ctr.getOnlineDataByID(config.id) }
    }))
    mongo.addInsertChangeWatcher(mongo.ctr.dbs.likeDB, onNewLike)
    mongo.addUpdateChangeWatcher(mongo.ctr.dbs.onlineDB, originOnlineData, onNewOnlineData)
    await mongo.ctr.run()
    if (!await getLike(mongo.ctr, like_id_config[0]) || !await getOnline(mongo.ctr, online_id_config[0])) {
        logger.error('数据获取测试失败')
        process.exit(1)
    }
    const scheduler = new ToadScheduler()
    const fetchLikeTask = new Task(
        'fetchLike',
        () => { like_id_config.forEach(config => fetchLike(mongo.ctr, config)) },
        (err: Error) => { logErrorDetail('fetchLike错误', err) }
    )
    const fetchOnlineTask = new Task(
        'fetchOnline',
        () => { online_id_config.forEach(config => fetchOnline(mongo.ctr, config)) },
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

