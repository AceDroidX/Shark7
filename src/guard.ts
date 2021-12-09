import axios from "axios"


import { GuardState, RoomGuard } from "./model/Guard"
import { Users } from "./model/Users"
import { User } from "./model/User"
import { sendMsg, timePrefix } from "./utils"
import logger from "./logger"
import { MsgType } from "./model/model"

export {
    guardMain
}

async function guardMain(roomid_Users: Users, marked_Users: Users) {
    const SLEEP_TIME = 5000
    var RoomGuardList: RoomGuard[] = []
    RoomGuardList = roomid_Users.users.map(roomid_User => {
        return new RoomGuard(roomid_User, marked_Users.uidlist())
    })
    while (true) {
        for (let i = 0; i < RoomGuardList.length; i++) {
            let roomguard = RoomGuardList[i]
            if (marked_Users.users.length == 1 && marked_Users.users[0].uid == roomguard.uid) {
                logger.info(`跳过搜索${roomguard.name}/${roomguard.roomid}的舰队列表`)
                continue
            }
            logger.info(`开始搜索${roomguard.name}/${roomguard.roomid}的舰队列表`)
            const origin = roomguard.list
            const result = (await roomguard.isGuardOnline()).list
            const changedGuardStates = compareList(origin, result)
            logger.debug(`origin:${origin}`)
            logger.debug(`result:${result}`)
            logger.debug(`changedGuardStates:${changedGuardStates}`)
            // RoomGuardList[i].list = result
            for (const state of changedGuardStates) {
                if (state.isOnline == 0) {
                    logger.info(`<${roomguard.name}/${roomguard.roomid}>${state.name}离线`)
                    sendMsg(timePrefix() + `<${roomguard.name}/${roomguard.roomid}>${state.name}离线`, MsgType.live.GuardOnline)
                } else if (state.isOnline == 1) {
                    logger.info(`<${roomguard.name}/${roomguard.roomid}>${state.name}在线`)
                    sendMsg(timePrefix() + `<${roomguard.name}/${roomguard.roomid}>${state.name}在线`, MsgType.live.GuardOnline)
                } else {
                    logger.info(`<${roomguard.name}/${roomguard.roomid}>${state.name}未找到`)
                    sendMsg(timePrefix() + `<${roomguard.name}/${roomguard.roomid}>${state.name}未找到`, MsgType.live.GuardOnline)
                }
            }
            await new Promise(resolve => { setTimeout(resolve, SLEEP_TIME) })
        }
    }
}

function compareList(oldlist: GuardState[], newlist: GuardState[]): GuardState[] {
    var changedGuardStates: GuardState[] = []
    for (const newstate of newlist) {
        let oldstate: any = false
        if (oldlist == undefined) {
            oldstate = false
        }
        else {
            oldstate = oldlist.find(state => state.uid == newstate.uid)
        }
        if (oldstate) {
            if (oldstate.isOnline != newstate.isOnline) {
                changedGuardStates.push(newstate)
            }
        } else {
            if (newstate.isOnline == 1) {
                changedGuardStates.push(newstate)
            }
        }
    }
    return changedGuardStates
}