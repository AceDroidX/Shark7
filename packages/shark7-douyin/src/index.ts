import { DouyinDBs, MongoControlClient, Scheduler, initLogger, logErrorDetail, logger, Nats, createChangeTracker, Scope } from 'shark7-shared';
import { MongoController } from './MongoController.ts';
import { fetchUser } from './user.ts';
import { formatDouyinUserChanges } from './formatters.ts';

process.on('uncaughtException', function (err) {
    if (err.name == 'WeiboError') {
        logger.error(`Weibo模块出现致命错误:\nname:${err.name}\nmessage:${err.message}\nstack:${err.stack}`)
    } else {
        logErrorDetail('未捕获的错误', err)
        process.exit(1);
    }
});

main()
async function main() {
    const nc = await Nats.connect()
    const mongo = await MongoControlClient.getInstance(DouyinDBs, MongoController, nc)

    initLogger('douyin')

    const sec_uid = process.env['douyin_sec_uid']
    if (!sec_uid) {
        logger.error('请设置douyin_sec_uid')
        process.exit(1)
    }
    
    const trackUserChange = createChangeTracker(
        async (newData) => mongo.ctr.getUserInfoBySecUID(newData.sec_uid),
        (data) => mongo.ctr.updateUserInfo(data),
        (event) => mongo.publishShark7Event(event),
        {
            formatter: formatDouyinUserChanges,
            scope: Scope.Douyin.User,
            name: (newData) => newData.nickname
        }
    )
    
    await mongo.ctr.run()
    if (!await fetchUser(sec_uid)) {
        logger.error('数据获取测试失败')
        process.exit(1)
    }
    let interval = process.env['interval'] ? Number(process.env['interval']) : 60
    const scheduler = new Scheduler()
    scheduler.addJob('fetchUserInfo', interval, async () => {
        const data = await fetchUser(sec_uid);
        if (data) await trackUserChange(data);
    })
    logger.info('douyin模块已启动')
}
