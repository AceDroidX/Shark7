import axios from "axios"

import { guardlist_prefix } from './constants'
import { GuardList } from "./model/GuardList"

export {
    makeURL,
    isGuardOnline,
    GuardList
}

function makeURL(roomid: number, ruid: number, page: number) {
    return `${guardlist_prefix}&roomid=${roomid}&ruid=${ruid}&page=${page}`
}

async function isGuardOnline(roomid: number, ruid: number, marked_uid: number[]): Promise<GuardList> {
    var pages = 1
    var guardlist: GuardList = new GuardList(roomid, marked_uid)
    for (let i = 1; i <= pages; i++) {
        var response = await axios.get(makeURL(roomid, ruid, i))
        // console.log(response.data)
        console.debug(`roomid:${roomid} page:${i}`)
        pages = response.data['data']['info']['page']
        if (i == 1) {
            console.debug(`pages:${pages}`)
            if (guardlist.pageFilter(response.data['data']['top3']).competed()) return guardlist
        }
        if (guardlist.pageFilter(response.data['data']['list']).competed()) return guardlist
        await new Promise(resolve => {
            setTimeout(resolve, 500)
        })
    }
    guardlist.fillEmpty()
    return guardlist
}