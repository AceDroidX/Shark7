import { KeepLiveTCP } from "bilibili-live-ws"
import { BILILIVEPREFIX } from "../constants"
import logger from "../logger"
import { FiltedMsg, MsgType } from "../model/model"
import { User } from "../model/User"
import { Users } from "../model/Users"
import { sendLogToKHL, sendMsg, timePrefix } from "../utils"

export function getFiltedMsg(id: any, marked_uid: number[], marked_Users: Users, roomid_Users: Users) {
    const live = new KeepLiveTCP(id)
    // live.on('open', () => logger.info(`<${id}>WebSocket连接上了`))
    live.on('live', () => logger.info(`<${id}>成功登入房间`))
    // live.on('heartbeat', (online) => logger.info(`<${id}>当前人气值${online}`))
    live.on('msg', async (data) => {
        try {
            const filter = await msgFilter(data, marked_uid, marked_Users)
            if (filter.code == 0) {
                const targetuser = roomid_Users.getUserByRoomid(id)
                logger.info(`<${targetuser.name}/${id}>${filter.msg}`)
                sendMsg(timePrefix() + `<${targetuser.name}/${id}>${filter.msg}`, filter.type)
            }
        } catch (error) {
            logger.info(`<${id}>遇到错误，请检查日志；\n${error}`)
            sendLogToKHL(timePrefix() + `<${id}>遇到错误，请检查日志；\n${error}`)
        }
    })
    live.on('close', () => logger.info(`<${id}>连接关闭`))
    live.on('error', (e) => logger.info(`<${id}>连接错误：${e}`))
}

async function msgFilter(data: any, marked_uid: number[], marked_Users: Users) {
    // if (!isValidKey('cmd', data)) {
    //     throw Error('invalid sequence');
    // }
    if (data['cmd'] == 'DANMU_MSG') {
        const uid = data['info'][2][0]
        if (marked_uid.includes(uid)) {
            const user = marked_Users.getUserByUID(uid)
            if (data['info'][0][12] == 0) {
                return new FiltedMsg(0, `${user.name}发送弹幕：${data['info'][1]}`, MsgType.live.Danmaku, data)
            } else if (data['info'][0][12] == 1) {
                return new FiltedMsg(0, `${user.name}发送表情弹幕：[${data['info'][1]}](${data['info'][0][13]['url']})`, MsgType.live.Danmaku, data)
            } else {
                return new FiltedMsg(0, `${user.name}发送特殊弹幕：${data['info'][1]}`, MsgType.live.Danmaku, data)
            }
        }
    } else if (data['cmd'] == 'ENTRY_EFFECT') {
        const uid = data['data']['uid']
        if (marked_uid.includes(uid)) {
            const user = marked_Users.getUserByUID(uid)
            return new FiltedMsg(0, `${user.name}舰长进入直播间`, MsgType.live.GuardEntry, data)
        }
    } else if (data['cmd'] == 'INTERACT_WORD') {
        const uid = data['data']['uid']
        if (marked_uid.includes(uid)) {
            const user = marked_Users.getUserByUID(uid)
            return new FiltedMsg(0, `${user.name}进入直播间`, MsgType.live.Entry, data)
        }
    } else if (data['cmd'] == 'SEND_GIFT') {
        const uid = data['data']['uid']
        if (marked_uid.includes(uid)) {
            const user = marked_Users.getUserByUID(uid)
            return new FiltedMsg(0, `${user.name}送出礼物：${data['data']['giftName']}x${data['data']['num']}`, MsgType.live.Gift, data)
        }
    } else if (data['cmd'] == 'LIVE') {
        const user = await new User().initByRoomid(data['roomid'])
        if (marked_uid.includes(user.uid)) {
            return new FiltedMsg(0, `${user.name}开始直播：\n${BILILIVEPREFIX}/${user.roomid}`, MsgType.live.Live, data)
        }
    } else if (data['cmd'] == 'PREPARING') {
        const user = await new User().initByRoomid(parseInt(data['roomid']))
        if (marked_uid.includes(user.uid)) {
            return new FiltedMsg(0, `${user.name}停止直播：\n${BILILIVEPREFIX}/${user.roomid}`, MsgType.live.Live, data)
        }
    } else if (data['cmd'] == 'LIVE_INTERACTIVE_GAME') {
        const uid = data['data']['uid']
        if (marked_uid.includes(uid)) {
            const user = marked_Users.getUserByUID(uid)
            return new FiltedMsg(0, `${user.name}动画礼物：${data['data']['gift_name']}x${data['data']['gift_num']}`, MsgType.live.Gift, data)
        }
    } else if (data['cmd'] == 'SUPER_CHAT_MESSAGE') {
        const uid = data['data']['uid']
        if (marked_uid.includes(uid)) {
            const user = marked_Users.getUserByUID(uid)
            return new FiltedMsg(0, `${user.name}发送SC：[${data['data']['price']}CNY]${data['data']['message']}`, MsgType.live.Gift, data)
        }
    } else {
        // if(JSON.stringify(data).includes(`uid:${marked_uid}`)){
        //     return new FiltedMsg(0, `${marked_uid}未知操作：${JSON.stringify(data)}`, data)
        // }
    }
    return new FiltedMsg(1, '', '', data)
}