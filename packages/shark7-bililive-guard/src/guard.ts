import axios from "axios"
import { ChangeStreamUpdateDocument } from "mongodb"
import { Shark7Event } from "shark7-shared"
import { BiliApi } from "shark7-shared/dist/bilibili"
import { BiliGuardApi, BiliGuardApiList, BiliGuardOnline, BiliGuardState, BiliSimpleUser } from "shark7-shared/dist/bililive"
import { BiliUsers } from "shark7-shared/dist/bililive/BiliUsers"
import logger from "shark7-shared/dist/logger"
import { Scope } from "shark7-shared/dist/scope"
import { logErrorDetail } from "shark7-shared/dist/utils"
import { MongoController } from "./MongoController"

const UserAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/105.0.0.0 Safari/537.36 Edg/105.0.1343.4'
const guardlist_prefix = 'https://api.live.bilibili.com/xlive/app-room/v2/guardTab/topList?page_size=30'

function makeURL(roomid: number, ruid: number, page: number) {
    return `${guardlist_prefix}&roomid=${roomid}&ruid=${ruid}&page=${page}`
}

export async function fetchExistGuardState(ctr: MongoController): Promise<boolean> {
    logger.debug('开始获取已存在的舰长数据')
    const guardStates = await ctr.getAllGuardState()
    for (const item of guardStates) {
        if (item.isOnline == BiliGuardOnline.ONLINE || item.isOnline == BiliGuardOnline.OFFLINE) {
            const result = await getGuardState(item, item.page, Number(item.shark7_id), item.shark7_name)
            if (!result) return false
            await ctr.insertGuardState(result)
        }
    }
    return true
}

export async function fetchNotExistGuardState(ctr: MongoController): Promise<boolean> {
    logger.debug('开始获取未找到的舰长数据')
    const guardStates = await ctr.getAllGuardState()
    for (const item of guardStates) {
        if (item.isOnline == BiliGuardOnline.NONE) {
            const result = await searchGuardState(item, Number(item.shark7_id), item.shark7_name)
            if (!result) return false
            await ctr.insertGuardState(result)
        }
    }
    return true
}

export async function delNotExistGuardState(ctr: MongoController): Promise<boolean> {
    logger.debug('开始删除未找到的舰长数据')
    const guardStates = await ctr.getAllGuardState()
    for (const item of guardStates) {
        if (item.isOnline == BiliGuardOnline.NONE) {
            await ctr.delGuardState(item.uid, item.shark7_id)
        }
    }
    return true
}

export async function fetchNewGuardState(ctr: MongoController, roomid_Users: BiliUsers, marked_Users: BiliUsers): Promise<boolean> {
    logger.info('开始获取新的舰长数据')
    for (const roomid_user of roomid_Users.users) {
        for (const marked_user of marked_Users.users) {
            const isExist = await ctr.getGuardState(roomid_user.uid, String(marked_user.uid))
            if (isExist) continue
            const result = await searchGuardState(roomid_user, marked_user.uid, marked_user.name)
            if (!result) return false
            await ctr.insertGuardState(result)
        }
    }
    return true
}

async function searchGuardState(user: BiliSimpleUser, marked_uid: number, marked_name: string): Promise<BiliGuardState | null> {
    const PAGE_LIMIT = 500
    let pages = 1
    for (let i = 1; i <= pages && i <= PAGE_LIMIT; i++) {
        const resp = await getGuardApi(user, i)
        if (!resp) return null
        logger.debug(`roomid:${user.roomid} page:${i}`)
        pages = resp.data.data.info.page
        if (i == 1) {
            logger.debug(`pages:${pages}`)
            const result = guardFilter(resp.data.data.top3, user, 0, marked_uid, marked_name)
            if (!result) return null
            if (result.isOnline != BiliGuardOnline.NONE) return result
        }
        const result = guardFilter(resp.data.data.list, user, i, marked_uid, marked_name)
        if (!result) return null
        if (result.isOnline != BiliGuardOnline.NONE) return result
        await new Promise(resolve => { setTimeout(resolve, 500) })
    }
    return { ...user, page: 0, shark7_id: String(marked_uid), shark7_name: marked_name, isOnline: BiliGuardOnline.NONE }
}

async function getGuardState(user: BiliSimpleUser, page: number, marked_uid: number, marked_name: string): Promise<BiliGuardState | null> {
    try {
        let realPage = page
        if (page == 0) {
            realPage = 1
        }
        const resp = await getGuardApi(user, realPage)
        if (!resp) return null
        let data: BiliGuardApiList[]
        if (page == 0) {
            data = resp.data.data.top3
        } else {
            data = resp.data.data.list
        }
        return guardFilter(data, user, page, marked_uid, marked_name)
    } catch (err) {
        logErrorDetail('抓取数据失败', err)
        return null
    }
}

function guardFilter(data: BiliGuardApiList[], user: BiliSimpleUser, page: number, marked_uid: number, marked_name: string): BiliGuardState | null {
    for (const item of data) {
        if (item.uid == marked_uid) {
            return { ...user, page, shark7_id: String(marked_uid), shark7_name: item.username, isOnline: item.is_alive }
        }
    }
    return { ...user, page, shark7_id: String(marked_uid), shark7_name: marked_name, isOnline: BiliGuardOnline.NONE }
}

async function getGuardApi(user: BiliSimpleUser, page: number) {
    const resp = await axios.get<BiliApi<BiliGuardApi>>(makeURL(user.roomid, user.uid, page), { headers: { 'user-agent': UserAgent } })
    if (resp.status != 200) {
        logger.error('resp.status != 200:' + JSON.stringify(resp))
        return null
    }
    if (resp.data.code != 0) {
        logger.error('resp.data.code != 0:' + JSON.stringify(resp))
        return null
    }
    return resp
}

export async function onGuardEvent(ctr: MongoController, event: ChangeStreamUpdateDocument<BiliGuardState>, origin?: BiliGuardState): Promise<Shark7Event | null> {
    const data = event.fullDocument
    const updated = event.updateDescription.updatedFields
    if (!data) {
        logger.error(`fullDocument为${data}`)
        process.exit(1)
    }
    if (!updated) {
        logger.error(`updatedFields为${data}`)
        process.exit(1)
    }
    let state
    switch (data.isOnline) {
        case BiliGuardOnline.OFFLINE:
            state = '离线'
            break;
        case BiliGuardOnline.ONLINE:
            state = '在线'
            break;
        case BiliGuardOnline.ONLINE:
            state = '未找到'
            break;
        default:
            state = `未知:${data.isOnline}`
            break;
    }
    const msg = `${data.shark7_name}${state}`
    logger.info(`<${data.name}/${data.roomid}>${msg}`)
    return { ts: Number(new Date()), name: `${data.name}/${data.roomid}`, scope: Scope.BiliLive.GuardOnline, msg }
}
