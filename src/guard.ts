import axios from "axios"

import { guardlist_prefix } from './constants'
import { GuardList } from "./model/GuardList"
import { Users } from "./model/Users"
import { User } from "./model/User"
import { sendMsgToKHL, timePrefix } from "./utils"
import { GuardState } from "./model/model"

export {
    makeURL,
    isGuardOnline,
    GuardList,
    guardMain
}

function makeURL(roomid: number, ruid: number, page: number) {
    return `${guardlist_prefix}&roomid=${roomid}&ruid=${ruid}&page=${page}`
}

async function guardMain(roomid_Users: Users, marked_Users: Users) {
    const SLEEP_TIME = 5000
    var GuardStates: any = []
    while (true) {
        for (const roomid_user of roomid_Users.users) {
            console.info(timePrefix() + `开始搜索${roomid_user.name}/${roomid_user.roomid}的舰队列表`)
            const result = await isGuardOnline(roomid_user.roomid, roomid_user.uid, marked_Users.uidlist())
            // console.log('a')
            // console.log(GuardStates[roomid_user.roomid.toString()])
            // console.log('b')
            // console.log(result.list)
            const changedGuardStates = compareList(GuardStates[roomid_user.roomid.toString()], result.list)
            // console.log('c')
            // console.log(changedGuardStates)
            GuardStates[roomid_user.roomid.toString()] = result.list
            for (const state of changedGuardStates) {
                const user = marked_Users.getUserByUID(state.uid)
                if (state.isOnline == 0) {
                    console.info(timePrefix() + `<${roomid_user.name}/${roomid_user.roomid}>${user.name}离线`)
                    sendMsgToKHL(timePrefix() + `<${roomid_user.name}/${roomid_user.roomid}>${user.name}离线`)
                } else if (state.isOnline == 1) {
                    console.info(timePrefix() + `<${roomid_user.name}/${roomid_user.roomid}>${user.name}在线`)
                    sendMsgToKHL(timePrefix() + `<${roomid_user.name}/${roomid_user.roomid}>${user.name}在线`)
                } else {
                    console.info(timePrefix() + `<${roomid_user.name}/${roomid_user.roomid}>${user.name}未找到`)
                    sendMsgToKHL(timePrefix() + `<${roomid_user.name}/${roomid_user.roomid}>${user.name}未找到`)
                }
            }
            await new Promise(resolve => { setTimeout(resolve, SLEEP_TIME) })
            // console.log(roomid_user)
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

async function isGuardOnline(roomid: number, ruid: number, marked_uid: number[]): Promise<GuardList> {
    const PAGE_LIMIT = 30
    var pages = 1
    var guardlist: GuardList = new GuardList(roomid, marked_uid)
    for (let i = 1; i <= pages && i <= PAGE_LIMIT; i++) {
        var response = await axios.get(makeURL(roomid, ruid, i))
        // console.log(response.data)
        console.debug(`roomid:${roomid} page:${i}`)
        pages = response.data['data']['info']['page']
        if (i == 1) {
            console.debug(`pages:${pages}`)
            if (guardlist.pageFilter(response.data['data']['top3']).competed()) return guardlist
        }
        if (guardlist.pageFilter(response.data['data']['list']).competed()) return guardlist
        await new Promise(resolve => { setTimeout(resolve, 500) })
    }
    guardlist.fillEmpty()
    return guardlist
}