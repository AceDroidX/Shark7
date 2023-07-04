if (process.env.NODE_ENV != 'production') {
    require('dotenv').config({ debug: true })
}
import { BiliSimpleUser, BiliUsers } from 'shark7-shared';
import { BiliLiveDBs } from 'shark7-shared';
import { MongoControlClient } from 'shark7-shared';
import { logger, initLogger } from 'shark7-shared';
import { logErrorDetail } from 'shark7-shared';
import { GetConfTask } from './GetConfTask';
import { getFiltedMsg } from './live';
import { MongoController } from './MongoController';

process.on('uncaughtException', function (err) {
    if (err.name == 'WeiboError') {
        logger.error(`Weibo模块出现致命错误:\nname:${err.name}\nmessage:${err.message}\nstack:${err.stack}`)
    } else {
        logErrorDetail('未捕获的错误', err)
        process.exit(1);
    }
});
if (require.main === module) {
    main()
}
async function main() {
    const mongo = await MongoControlClient.getInstance(BiliLiveDBs, MongoController)

    initLogger('bililive')

    const marked_uid_str = process.env['marked_uid']
    if (!marked_uid_str) {
        logger.error('请设置marked_uid')
        process.exit(1)
    }
    const marked_uid = marked_uid_str.split(',').map(x => parseInt(x))

    logger.info(`设置${marked_uid.length}个用户:`)
    const marked_Users = new BiliUsers()
    for (const uid of marked_uid) {
        const user = await marked_Users.addByUID(uid);
        if (!user) process.exit(1)
        logger.info(user.toString())
        await new Promise(resolve => setTimeout(resolve, 200));
    }

    const roomid_str = process.env['room_id']
    if (!roomid_str) {
        logger.error('请设置room_id')
        process.exit(1)
    }
    const roomid = roomid_str.split(',').map(x => parseInt(x.split(':')[0]))
    logger.info(`设置${roomid.length}个房间:`)
    const roomid_Users = new BiliUsers()
    for (const id of roomid) {
        const user = await roomid_Users.addByRoomid(id);
        if (!user) process.exit(1)
        logger.info(user.toString())
        await new Promise(resolve => setTimeout(resolve, 200));
    }
    const confTask = new GetConfTask()
    roomid_Users.users.forEach((value: BiliSimpleUser, index: number) => {
        // openOneRoom(parseInt(element))
        // getAllMsg(parseInt(element))
        setTimeout(() => getFiltedMsg(mongo.ctr, confTask, value, marked_uid, marked_Users, roomid_Users), 500 * index)
    });
}
