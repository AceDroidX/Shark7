if (process.env.NODE_ENV != 'production') {
    require('dotenv').config({ debug: true })
}
import { logAxiosError, logErrorDetail, toNumOrStr } from 'shark7-shared/dist/utils'
import logger from 'shark7-shared/dist/logger';
import { MongoController } from './MongoController';
import winston from 'winston';
import axios from 'axios';
import { AsyncTask, SimpleIntervalJob, ToadScheduler } from 'toad-scheduler';

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
        level: 'debug', db: MongoController.getMongoClientConfig().connect(), collection: 'log-apex', tryReconnect: true
    }))

    const apex_uid_str = process.env['apex_uid']
    if (!apex_uid_str) {
        logger.error('apex_uid配置项未配置')
        process.exit(1)
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

    mongo.run()
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