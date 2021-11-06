

import { LiveWS, LiveTCP, KeepLiveWS, KeepLiveTCP } from 'bilibili-live-ws';
import axios from 'axios';
import config from './config'
import { FiltedMsg } from './model/model'
import { BILILIVEPREFIX } from './constants';
import { sendMsgToKHL, timePrefix } from './utils'
import { Users } from './model/Users';
import { User } from './model/User';

var marked_uid: number[]
var marked_Users: Users

// init
if (require.main === module) {
    main()
}
function main() {
    const marked_uid_str = config.get('marked_uid')
    if (typeof marked_uid_str != "string") {
        console.error('请设置marked_uid')
        process.exit(1)
    }
    marked_uid = marked_uid_str.split(',').map(x => parseInt(x))
    console.debug(marked_uid)

    marked_Users = new Users()
    marked_uid.forEach(uid => {
        marked_Users.addByUID(uid)
    })

    const roomid_str = config.get('room_id')
    if (typeof roomid_str != "string") {
        console.error('房间id获取出错:' + typeof roomid_str)
        process.exit(1)
    }
    const roomid = roomid_str.split(',').map(x => parseInt(x))
    roomid.forEach((value: number, index: number) => {
        // openOneRoom(parseInt(element))
        // getAllMsg(parseInt(element)) 
        setTimeout(() => getFiltedMsg(value), 500 * index)
    });
}

export function getAllMsg(id: number) {
    const live = new KeepLiveTCP(id)
    live.on('open', () => console.log(timePrefix() + `<${id}>WebSocket连接上了`))
    live.on('live', () => console.log(timePrefix() + `<${id}>成功登入房间`))
    live.on('heartbeat', (online) => console.log(timePrefix() + `<${id}>当前人气值${online}`))
    live.on('msg', (data) => console.log(timePrefix() + `<${id}>收到消息\n${JSON.stringify(data)}`))
    live.on('close', () => console.log(timePrefix() + `<${id}>连接关闭`))
    live.on('error', (e) => console.log(timePrefix() + `<${id}>连接错误`))
}

function getFiltedMsg(id: any) {
    const live = new KeepLiveTCP(id)
    live.on('open', () => console.info(timePrefix() + `<${id}>WebSocket连接上了`))
    live.on('live', () => console.info(timePrefix() + `<${id}>成功登入房间`))
    // live.on('heartbeat', (online) => console.log(timePrefix() + `<${id}>当前人气值${online}`))
    live.on('msg', async (data) => {
        const filter = await msgFilter(data)
        if (filter.code == 0) {
            console.info(timePrefix() + `<${id}>${filter.msg}`)
            sendMsgToKHL(timePrefix() + `<${id}>${filter.msg}`)
        }
    })
    live.on('close', () => console.info(timePrefix() + `<${id}>连接关闭`))
    live.on('error', (e) => console.info(timePrefix() + `<${id}>连接错误：${e}`))
}

async function msgFilter(data: any) {
    // if (!isValidKey('cmd', data)) {
    //     throw Error('invalid sequence');
    // }
    if (data['cmd'] == 'DANMU_MSG') {
        const uid = data['info'][2][0]
        if (marked_uid.includes(uid)) {
            return new FiltedMsg(0, `${uid}发送弹幕：${data['info'][1]}`, data)
        }
    } else if (data['cmd'] == 'ENTRY_EFFECT') {
        const uid = data['data']['uid']
        if (marked_uid.includes(uid)) {
            return new FiltedMsg(0, `${uid}进入直播间：${data['data']['target_id']}`, data)
        }
    } else if (data['cmd'] == 'SEND_GIFT') {
        const uid = data['data']['uid']
        if (marked_uid.includes(uid)) {
            return new FiltedMsg(0, `${uid}送出礼物：${data['data']['giftName']}x${data['data']['num']}`, data)
        }
    } else if (data['cmd'] == 'LIVE') {
        const user = await new User().initByRoomid(data['roomid'])
        if (marked_uid.includes(user.uid)) {
            return new FiltedMsg(0, `${user.uid}开始直播：\n${BILILIVEPREFIX}/${user.roomid}`, data)
        }
    } else if (data['cmd'] == 'PREPARING') {
        const user = await new User().initByRoomid(parseInt(data['roomid']))
        if (marked_uid.includes(user.uid)) {
            return new FiltedMsg(0, `${user.uid}停止直播：\n${BILILIVEPREFIX}/${user.roomid}`, data)
        }
    } else {
        // if(JSON.stringify(data).includes(`uid:${marked_uid}`)){
        //     return new FiltedMsg(0, `${marked_uid}未知操作：${JSON.stringify(data)}`, data)
        // }
    }
    return new FiltedMsg(1, '', data)
}


function openOneRoom(id: number) {
    const live = new KeepLiveTCP(id)
    live.on('open', () => console.log(timePrefix() + `<${id}>Connection is established`))
    // Connection is established
    live.on('live', () => {
        live.on('heartbeat', () => { console.log(timePrefix() + `<${id}>heartbeat`) })
    })
    live.on('LIVE', (data) => {
        console.log(timePrefix() + `<${id}>LIVE ${JSON.stringify(data)}`)
        sendMsgToKHL(timePrefix() + `<${id}>开始直播\n${BILILIVEPREFIX}/${id}`)
    })
    live.on('PREPARING', (data) => {
        console.log(timePrefix() + `<${id}>PREPARING ${JSON.stringify(data)}`)
        sendMsgToKHL(timePrefix() + `<${id}>停止直播\n${BILILIVEPREFIX}/${id}`)
    })
}