import config from './config'
import { logAxiosError, logError, logErrorDetail, toNumOrStr } from './utils'
import logger from './logger';
import { MongoController } from './MongoController';
import winston from 'winston';
import { MongoClient } from 'mongodb';
import axios from 'axios';
import { AsyncTask, SimpleIntervalJob, ToadScheduler } from 'toad-scheduler';

process.on('uncaughtException', function (err) {
    //打印出错误 
    if (err.name == 'WeiboError') {
        logger.error(`Weibo模块出现致命错误:\nname:${err.name}\nmessage:${err.message}\nstack:${err.stack}`)
    } else {
        logErrorDetail('未捕获的错误', err)
        process.exit(2);
    }
});
// process.on('unhandledRejection', (reason, promise) => {
//     promise.catch((err) => {logger.error(err)});
//     logger.error(`Unhandled Rejection at:${promise}\nreason:${JSON.stringify(reason)}`);
//     process.exit(2);
// });
// init
if (require.main === module) {
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
        ).connect(), collection: 'log-apex', tryReconnect: true
    }))

    const apex_uid_str = config.get('apex_uid')
    if (typeof apex_uid_str != 'string') {
        logger.error('apex_uid配置项必须是字符串')
        process.exit(2)
    }
    // const apex_uid = apex_uid_str.split(',').map(player => { return player.split(':').map(e => { return toNumOrStr(e) }) })
    const apex_uid = apex_uid_str.split(':').map(e => { return toNumOrStr(e) })
    console.log(apex_uid)
    const scheduler = new ToadScheduler()
    const refreshUserInfoTask = new AsyncTask(
        'refreshUserInfo',
        async () => {
            let userinfo = await getUserInfo(apex_uid[1])
            if (userinfo == null) {
                return
            }
            userinfo = userinfo.replace(/"userInfo":\n/g, '')
            userinfo = JSON.parse(userinfo)
            userinfo._name = apex_uid[0]
            await mongo.insertUserInfo(userinfo)
        },
        (err: Error) => { logErrorDetail('refreshUserInfo错误', err) }
    )
    scheduler.addSimpleIntervalJob(new SimpleIntervalJob({ seconds: 3, }, refreshUserInfoTask))
}

async function getUserInfo(uid: number) {
    try {
        let resp = await axios.get(`https://r5-crossplay.r5prod.stryder.respawn.com/user.php?qt=user-getinfo&getinfo=1&hardware=PC&uid=${uid}&language=english&timezoneOffset=8&ugc=1&rep=1&searching=0&change=7&loadidx=1`, { headers: { 'User-Agent': 'Respawn HTTPS/1.0' } })
        return resp.data
    } catch (err) {
        logAxiosError(err)
        return null
    }
}