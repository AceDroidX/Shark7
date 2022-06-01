import { KeepLiveTCP } from "bilibili-live-ws"
import logger from "shark7-shared/dist/logger"
import { BiliUser } from "shark7-shared/dist/bililive/BiliUser"
import { BiliUsers } from "shark7-shared/dist/bililive/BiliUsers"
import { Shark7Event } from "shark7-shared"
import { Scope } from "shark7-shared/dist/scope"
import { MongoController } from "./MongoController"

const BILILIVEPREFIX = 'https://live.bilibili.com'

export function getFiltedMsg(mongo: MongoController, roomid: any, marked_uid: number[], marked_Users: BiliUsers, roomid_Users: BiliUsers) {
    const live = new KeepLiveTCP(roomid)
    // live.on('open', () => logger.info(`<${id}>WebSocket连接上了`))
    live.on('live', () => logger.info(`<${roomid}>成功登入房间`))
    // live.on('heartbeat', (online) => logger.info(`<${id}>当前人气值${online}`))
    live.on('msg', async (data) => {
        try {
            if (process.env.NODE_ENV != 'production') {
                logger.debug('弹幕服务器消息:\n' + JSON.stringify(data))
            }
            const filter = await msgFilter(data, marked_uid, marked_Users, roomid)
            if (filter) {
                const targetuser = roomid_Users.getUserByRoomid(roomid)
                logger.info(`<${targetuser.name}/${roomid}>${filter.msg}`)
                filter.name = `${targetuser.name}/${roomid}`
                mongo.addShark7Event(filter)
            }
        } catch (error) {
            logger.info(`<${roomid}>遇到错误，请检查日志；\n${error}`)
        }
    })
    live.on('close', () => logger.info(`<${roomid}>连接关闭`))
    live.on('error', (e) => logger.info(`<${roomid}>连接错误：${e}`))
}

async function msgFilter(data: any, marked_uid: number[], marked_Users: BiliUsers, msgRoomid: number): Promise<Shark7Event | undefined> {
    // if (!isValidKey('cmd', data)) {
    //     throw Error('invalid sequence');
    // }
    if (data['cmd'] == 'DANMU_MSG') {
        const uid = data['info'][2][0]
        if (marked_uid.includes(uid)) {
            const user = marked_Users.getUserByUID(uid)
            if (data['info'][0][12] == 0) {
                return { ts: Number(new Date()), name: 'null', scope: Scope.BiliLive.Danmaku, msg: `${user.name}发送弹幕：${data['info'][1]}` }
            } else if (data['info'][0][12] == 1) {
                return { ts: Number(new Date()), name: 'null', scope: Scope.BiliLive.Danmaku, msg: `${user.name}发送表情弹幕：[${data['info'][1]}](${data['info'][0][13]['url']})` }
            } else if (data['info'][0][9] == 2) {
                return { ts: Number(new Date()), name: 'null', scope: Scope.BiliLive.Danmaku, msg: `${user.name}发送抽奖弹幕：${data['info'][1]}` }
            } else {
                return { ts: Number(new Date()), name: 'null', scope: Scope.BiliLive.Danmaku, msg: `${user.name}发送特殊弹幕(${data['info'][0][12]})：${data['info'][1]}` }
            }
        }
    } else if (data['cmd'] == 'ENTRY_EFFECT') {
        const uid = data['data']['uid']
        if (marked_uid.includes(uid)) {
            // const user = marked_Users.getUserByUID(uid)
            return { ts: Number(new Date()), name: 'null', scope: Scope.BiliLive.EntryEffect, msg: data['data']['copy_writing_v2'] }
        }
    } else if (data['cmd'] == 'INTERACT_WORD') {
        const uid = data['data']['uid']
        if (marked_uid.includes(uid)) {
            const user = marked_Users.getUserByUID(uid)
            return { ts: Number(new Date()), name: 'null', scope: Scope.BiliLive.EntryWord, msg: `${user.name}进入直播间` }
        }
    } else if (data['cmd'] == 'SEND_GIFT') {
        const uid = data['data']['uid']
        if (marked_uid.includes(uid)) {
            const user = marked_Users.getUserByUID(uid)
            return { ts: Number(new Date()), name: 'null', scope: Scope.BiliLive.Gift, msg: `${user.name}送出礼物：${data['data']['giftName']}x${data['data']['num']}` }
        }
    } else if (data['cmd'] == 'LIVE') {
        const user = await new BiliUser().initByRoomid(data['roomid'])
        if (marked_uid.includes(user.uid)) {
            return { ts: Number(new Date()), name: 'null', scope: Scope.BiliLive.Live, msg: `${user.name}开始直播：\n${BILILIVEPREFIX}/${user.roomid}` }
        }
    } else if (data['cmd'] == 'PREPARING') {
        const user = await new BiliUser().initByRoomid(parseInt(data['roomid']))
        if (marked_uid.includes(user.uid)) {
            return { ts: Number(new Date()), name: 'null', scope: Scope.BiliLive.Live, msg: `${user.name}停止直播：\n${BILILIVEPREFIX}/${user.roomid}` }
        }
    } else if (data['cmd'] == 'LIVE_INTERACTIVE_GAME') {
        const uid = data['data']['uid']
        if (marked_uid.includes(uid)) {
            const user = marked_Users.getUserByUID(uid)
            return { ts: Number(new Date()), name: 'null', scope: Scope.BiliLive.Gift, msg: `${user.name}动画礼物：${data['data']['gift_name']}x${data['data']['gift_num']}` }
        }
    } else if (data['cmd'] == 'SUPER_CHAT_MESSAGE') {
        const uid = data['data']['uid']
        if (marked_uid.includes(uid)) {
            const user = marked_Users.getUserByUID(uid)
            return { ts: Number(new Date()), name: 'null', scope: Scope.BiliLive.Gift, msg: `${user.name}发送SC：[${data['data']['price']}CNY]${data['data']['message']}` }
        }
    } else if (data['cmd'] == 'ROOM_CHANGE') {
        const user = await new BiliUser().initByRoomid(msgRoomid)
        if (marked_uid.includes(user.uid)) {
            const user = await new BiliUser().initByRoomid(msgRoomid)
            return { ts: Number(new Date()), name: 'null', scope: Scope.BiliLive.Live, msg: `${user.name}更改直播间标题：${data['data']['title']}` }
        }
    } else if (data['cmd'] == 'GUARD_BUY') {
        const uid = data['data']['uid']
        if (marked_uid.includes(uid)) {
            const user = marked_Users.getUserByUID(uid)
            return { ts: Number(new Date()), name: 'null', scope: Scope.BiliLive.Gift, msg: `${user.name}上舰：${data['data']['gift_name']}` }
        }
    } else if (data['cmd'] == 'COMBO_SEND') {
        const uid = data['data']['uid']
        if (marked_uid.includes(uid)) {
            const user = marked_Users.getUserByUID(uid)
            return { ts: Number(new Date()), name: 'null', scope: Scope.BiliLive.Gift, msg: `${user.name}连续送出礼物：${data['data']['gift_name']}x${data['data']['combo_num']}` }
        }
    } else {
        // if(JSON.stringify(data).includes(`uid:${marked_uid}`)){
        //     return new FiltedMsg(0, `${marked_uid}未知操作：${JSON.stringify(data)}`, data)
        // }
    }
}