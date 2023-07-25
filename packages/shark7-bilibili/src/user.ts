import axios from "axios";
import { ChangeStreamUpdateDocument } from "mongodb";
import { BiliApi, BiliGet, BiliUser, Scope, Shark7Event, flattenObj, logAxiosError, logErrorDetail, logger } from "shark7-shared";
import { MongoController } from "./MongoController";

export async function getUser(user_id: number): Promise<BiliUser | null> {
    try {
        const resp = await BiliGet<BiliApi<BiliUser>>(`https://api.bilibili.com/x/space/wbi/acc/info`, { platform: 'web', jsonp: 'jsonp', mid: user_id })
        if (resp.status != 200) {
            logger.warn(`getUser resp.status!=200\nstatus:${resp.status}\n` + JSON.stringify(resp.data))
            return null
        }
        if (resp.data.code != 0) {
            logger.warn(`getUser resp.data.code!=0\nstatus:${resp.status}\n` + JSON.stringify(resp.data))
            return null
        }
        // logger.debug(JSON.stringify(resp))
        let data = resp.data.data
        data.face = 'https://i0.' + data.face.match('hdslb.com.*$')?.[0]
        data.nameplate.image = 'https://i0.' + data.nameplate.image.match('hdslb.com.*$')?.[0]
        data.nameplate.image_small = 'https://i0.' + data.nameplate.image_small.match('hdslb.com.*$')?.[0]
        data.top_photo = 'https://i0.' + data.top_photo.match('hdslb.com.*$')?.[0]
        let dataAny: any = data
        dataAny.shark7_id = String(user_id)
        return dataAny
    } catch (err) {
        if (axios.isAxiosError(err)) {
            logAxiosError(err)
        } else {
            logErrorDetail('抓取数据失败', err)
        }
        return null
    }
}

export async function insertUser(ctr: MongoController, user_id: number): Promise<boolean> {
    const data = await getUser(user_id)
    if (!data) return false
    await ctr.insertUser(data)
    return true
}

export async function onUserEvent(ctr: MongoController, event: ChangeStreamUpdateDocument<BiliUser>, origin?: BiliUser): Promise<Shark7Event | null> {
    const user = event.fullDocument
    const updated = event.updateDescription.updatedFields
    if (!user) {
        logger.error(`fullDocument为${user}`)
        process.exit(1)
    }
    if (!updated) {
        logger.error(`updatedFields为${user}`)
        process.exit(1)
    }
    const flattenOrigin = flattenObj(origin)
    var result: string[] = [];
    Object.entries(updated).forEach(item => {
        const key = item[0]
        const value = item[1]
        if (key.startsWith('shark7_')) {
            return
        }
        switch (key) {
            case 'vip.label.path':
                return
        }
        if (key.startsWith('live_room.watched_show')) { // 忽略直播间看过人数
            return
        }
        if ((flattenOrigin[key] != null && value == null) || (flattenOrigin[key] == null && value != null)) {
            if(['live_room', 'elec', 'fans_medal.medal.wearing_status'].some(value => key==value)) return
        }
        if (JSON.stringify(value) == '[]' || JSON.stringify(value) == '{}') {
            return
        }
        if (flattenOrigin[key] == value) {
            return
        }
        logger.info(`${key}更改\n原：${JSON.stringify(flattenOrigin[key])}\n现：${JSON.stringify(value)}`)
        result.push(`${key}更改\n原：${JSON.stringify(flattenOrigin[key])}\n现：${JSON.stringify(value)}`)
    })
    if (result.length == 0) return null
    return { ts: Number(new Date()), name: String(user.name), scope: Scope.Bilibili.User, msg: result.join('\n') }
}
