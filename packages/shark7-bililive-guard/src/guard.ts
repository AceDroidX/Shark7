import { GuardState, RoomGuard } from "./RoomGuard"
import { BiliUsers } from "shark7-shared/dist/bililive/BiliUsers"
import logger from "shark7-shared/dist/logger"
import { MongoController } from "./MongoController"
import { Shark7Event } from "shark7-shared"
import { Scope } from "shark7-shared/dist/scope"

export {
    guardMain
}

async function guardMain(mongo: MongoController, roomid_Users: BiliUsers, marked_Users: BiliUsers) {
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
                    const event: Shark7Event = { ts: Number(new Date()), name: `${roomguard.name}/${roomguard.roomid}`, scope: Scope.BiliLive.GuardOnline, msg: `${state.name}离线` }
                    mongo.addShark7Event(event)
                } else if (state.isOnline == 1) {
                    logger.info(`<${roomguard.name}/${roomguard.roomid}>${state.name}在线`)
                    const event: Shark7Event = { ts: Number(new Date()), name: `${roomguard.name}/${roomguard.roomid}`, scope: Scope.BiliLive.GuardOnline, msg: `${state.name}在线` }
                    mongo.addShark7Event(event)
                } else {
                    logger.info(`<${roomguard.name}/${roomguard.roomid}>${state.name}未找到`)
                    const event: Shark7Event = { ts: Number(new Date()), name: `${roomguard.name}/${roomguard.roomid}`, scope: Scope.BiliLive.GuardOnline, msg: `${state.name}未找到` }
                    mongo.addShark7Event(event)
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