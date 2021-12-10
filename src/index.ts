import config from './config'
import { logError } from './utils'
import { Users } from './model/Users';
import { guardMain } from './guard';
import { WeiboController } from './weibo';
import logger from './logger';
import { getFiltedMsg } from './bilibili/live';

var marked_uid: number[]
var marked_Users: Users
var roomid_Users: Users
var weibo_Controller: WeiboController

process.on('uncaughtException', function (err) {
    //打印出错误 
    if (err.name == 'WeiboError') {
        logger.error(`Weibo模块出现致命错误:\nname:${err.name}\nmessage:${err.message}\nstack:${err.stack}`)
    } else {
        logError('未捕获的错误', err)
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

    const marked_uid_str = config.get('marked_uid')
    if (typeof marked_uid_str != "string") {
        logger.error('请设置marked_uid')
        process.exit(1)
    }
    marked_uid = marked_uid_str.split(',').map(x => parseInt(x))
    logger.debug(marked_uid)

    logger.info(`设置${marked_uid.length}个用户:`)
    marked_Users = new Users()
    for (const uid of marked_uid) {
        const user = await marked_Users.addByUID(uid);
        logger.info(user.toString())
        await new Promise(resolve => setTimeout(resolve, 200));
    }

    const roomid_str = config.get('room_id')
    if (typeof roomid_str != "string") {
        logger.error('房间id获取出错:' + typeof roomid_str)
        process.exit(1)
    }
    const roomid = roomid_str.split(',').map(x => parseInt(x))
    logger.info(`设置${roomid.length}个房间:`)
    roomid_Users = new Users()
    for (const id of roomid) {
        const user = await roomid_Users.addByRoomid(id);
        logger.info(user.toString())
        await new Promise(resolve => setTimeout(resolve, 200));
    }
    roomid.forEach((value: number, index: number) => {
        // openOneRoom(parseInt(element))
        // getAllMsg(parseInt(element)) 
        setTimeout(() => getFiltedMsg(value, marked_uid, marked_Users, roomid_Users), 500 * index)
    });

    guardMain(roomid_Users, marked_Users)

    const weibo_id_str = config.get('weibo_id')
    if (typeof weibo_id_str != "string") {
        logger.error('请设置weibo_id')
        process.exit(1)
    }
    // const weibo_id = roomid_str.split(',').map(x => parseInt(x))
    const weibo_id = parseInt(weibo_id_str)
    weibo_Controller = await WeiboController.init(weibo_id)
    weibo_Controller.run()
}