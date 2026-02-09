import { MongoControlClient, NeteaseMusicDBs, Scheduler, initLogger, logErrorDetail, logger, Nats, createChangeTracker, createUpdateEvent, Scope } from 'shark7-shared';
import type { NeteaseMusicUser } from 'shark7-shared';
import { MongoController } from './MongoController.ts';
import { fetchUser } from './user.ts';
import { formatNeteaseMusicUserChanges } from './formatters.ts';

process.on('uncaughtException', function (err) {
    if (err.name == 'WeiboError') {
        logger.error(`Weibo模块出现致命错误:\nname:${err.name}\nmessage:${err.message}\nstack:${err.stack}`)
    } else {
        logErrorDetail('未捕获的错误', err)
        process.exit(1);
    }
});
if (import.meta.main) {
    main()
}
async function main() {
    const nc = await Nats.connect()
    const mongo = await MongoControlClient.getInstance(NeteaseMusicDBs, MongoController, nc)

    initLogger('netease-music')

    if (!process.env['user_id']) {
        logger.error('请设置user_id')
        process.exit(1)
    }
    const user_id = Number(process.env['user_id'])

    const trackUserChange = createChangeTracker<NeteaseMusicUser>(
        async (newData) => mongo.ctr.getUser(user_id),
        (data) => mongo.ctr.insertUser(data),
        (event) => mongo.publishShark7Event(event),
        {
            onUpdate: createUpdateEvent(
                formatNeteaseMusicUserChanges,
                (newData) => ({
                    name: newData.profile?.nickname || 'Unknown',
                    scope: Scope.NeteaseMusic.User
                })
            )
        }
    )
    
    if (!await fetchUser(user_id)) {
        logger.error('数据获取测试失败')
        process.exit(1)
    }
    let interval = process.env['interval'] ? Number(process.env['interval']) : 30
    const scheduler = new Scheduler()
    scheduler.addJob('fetchUser', interval, async () => {
        const data = await fetchUser(user_id);
        if (data) await trackUserChange(data);
    })
    logger.info('模块已启动')
}
