

import { LiveWS, LiveTCP, KeepLiveWS, KeepLiveTCP } from 'bilibili-live-ws';
import axios from 'axios';
import config from './config'
import { FiltedMsg } from './model/model'
import { BILILIVEPREFIX } from './constants';
import { sendMsgToKHL, timePrefix } from './utils'
import { Users } from './model/Users';
import { User } from './model/User';
import { guardMain } from './guard';
import { WeiboController } from './weibo';
import winston from 'winston';
import logger from './logger';
import { refreshWeiboCookie } from './puppeteer';

var marked_uid: number[]
var marked_Users: Users
var roomid_Users: Users
var weibo_Controller: WeiboController


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
        setTimeout(() => getFiltedMsg(value), 500 * index)
    });

    guardMain(roomid_Users, marked_Users)

    await refreshWeiboCookie()

    const weibo_id_str = config.get('weibo_id')
    if (typeof weibo_id_str != "string") {
        logger.error('请设置weibo_id')
        process.exit(1)
    }
    // const weibo_id = roomid_str.split(',').map(x => parseInt(x))
    const weibo_id = parseInt(weibo_id_str)
    weibo_Controller = await WeiboController.getFromID(weibo_id)
    weibo_Controller.run()
}

function getFiltedMsg(id: any) {
    const live = new KeepLiveTCP(id)
    // live.on('open', () => logger.info(`<${id}>WebSocket连接上了`))
    live.on('live', () => logger.info(`<${id}>成功登入房间`))
    // live.on('heartbeat', (online) => logger.info(`<${id}>当前人气值${online}`))
    live.on('msg', async (data) => {
        try {
            const filter = await msgFilter(data)
            if (filter.code == 0) {
                const targetuser = roomid_Users.getUserByRoomid(id)
                logger.info(`<${targetuser.name}/${id}>${filter.msg}`)
                sendMsgToKHL(timePrefix() + `<${targetuser.name}/${id}>${filter.msg}`)
            }
        } catch (error) {
            logger.info(`<${id}>遇到错误，请检查日志；\n${error}`)
            sendMsgToKHL(timePrefix() + `<${id}>遇到错误，请检查日志；\n${error}`)
        }

    })
    live.on('close', () => logger.info(`<${id}>连接关闭`))
    live.on('error', (e) => logger.info(`<${id}>连接错误：${e}`))
}

async function msgFilter(data: any) {
    // if (!isValidKey('cmd', data)) {
    //     throw Error('invalid sequence');
    // }
    if (data['cmd'] == 'DANMU_MSG') {
        const uid = data['info'][2][0]
        if (marked_uid.includes(uid)) {
            const user = marked_Users.getUserByUID(uid)
            return new FiltedMsg(0, `${user.name}发送弹幕：${data['info'][1]}`, data)
        }
    } else if (data['cmd'] == 'ENTRY_EFFECT') {
        const uid = data['data']['uid']
        if (marked_uid.includes(uid)) {
            const user = marked_Users.getUserByUID(uid)
            return new FiltedMsg(0, `${user.name}舰长进入直播间`, data)
        }
    } else if (data['cmd'] == 'INTERACT_WORD') {
        const uid = data['data']['uid']
        if (marked_uid.includes(uid)) {
            const user = marked_Users.getUserByUID(uid)
            return new FiltedMsg(0, `${user.name}进入直播间`, data)
        }
    } else if (data['cmd'] == 'SEND_GIFT') {
        const uid = data['data']['uid']
        if (marked_uid.includes(uid)) {
            const user = marked_Users.getUserByUID(uid)
            return new FiltedMsg(0, `${user.name}送出礼物：${data['data']['giftName']}x${data['data']['num']}`, data)
        }
    } else if (data['cmd'] == 'LIVE') {
        const user = await new User().initByRoomid(data['roomid'])
        if (marked_uid.includes(user.uid)) {
            return new FiltedMsg(0, `${user.name}开始直播：\n${BILILIVEPREFIX}/${user.roomid}`, data)
        }
    } else if (data['cmd'] == 'PREPARING') {
        const user = await new User().initByRoomid(parseInt(data['roomid']))
        if (marked_uid.includes(user.uid)) {
            return new FiltedMsg(0, `${user.name}停止直播：\n${BILILIVEPREFIX}/${user.roomid}`, data)
        }
    } else {
        // if(JSON.stringify(data).includes(`uid:${marked_uid}`)){
        //     return new FiltedMsg(0, `${marked_uid}未知操作：${JSON.stringify(data)}`, data)
        // }
    }
    return new FiltedMsg(1, '', data)
}

export function getAllMsg(id: number) {
    const live = new KeepLiveTCP(id)
    live.on('open', () => logger.info(`<${id}>WebSocket连接上了`))
    live.on('live', () => logger.info(`<${id}>成功登入房间`))
    live.on('heartbeat', (online) => logger.info(`<${id}>当前人气值${online}`))
    live.on('msg', (data) => logger.info(`<${id}>收到消息\n${JSON.stringify(data)}`))
    live.on('close', () => logger.info(`<${id}>连接关闭`))
    live.on('error', (e) => logger.info(`<${id}>连接错误`))
}

function openOneRoom(id: number) {
    const live = new KeepLiveTCP(id)
    live.on('open', () => logger.info(`<${id}>Connection is established`))
    // Connection is established
    live.on('live', () => {
        live.on('heartbeat', () => { logger.info(`<${id}>heartbeat`) })
    })
    live.on('LIVE', (data) => {
        logger.info(`<${id}>LIVE ${JSON.stringify(data)}`)
        sendMsgToKHL(timePrefix() + `<${id}>开始直播\n${BILILIVEPREFIX}/${id}`)
    })
    live.on('PREPARING', (data) => {
        logger.info(`<${id}>PREPARING ${JSON.stringify(data)}`)
        sendMsgToKHL(timePrefix() + `<${id}>停止直播\n${BILILIVEPREFIX}/${id}`)
    })
}