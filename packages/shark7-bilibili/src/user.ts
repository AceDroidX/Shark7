import axios from "axios";
import { ChangeStreamUpdateDocument } from "mongodb";
import { Shark7Event } from "shark7-shared";
import { BiliApi, BiliUser } from "shark7-shared/dist/bilibili";
import logger from "shark7-shared/dist/logger";
import { Scope } from 'shark7-shared/dist/scope';
import { flattenObj, logAxiosError, logErrorDetail } from "shark7-shared/dist/utils";
import { MongoController } from "./MongoController";

const UserAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/105.0.0.0 Safari/537.36 Edg/105.0.1343.4'

export async function getUser(user_id: number): Promise<BiliUser | null> {
    try {
        const resp = await axios.get<BiliApi<BiliUser>>(`https://api.bilibili.com/x/space/acc/info?mid=${user_id}`, { headers: { 'user-agent': UserAgent } })
        if (resp.status != 200) {
            logger.warn('resp.status!=200\n' + JSON.stringify(resp))
            return null
        }
        if (resp.data.code != 0) {
            logger.warn('resp.data.code!=0\n' + JSON.stringify(resp))
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
            case 'live_room.watched_show.num':
            case 'live_room.watched_show.text_small':
            case 'live_room.watched_show.text_large':
                return
        }
        if ((flattenOrigin[key] != null && value == null) || (flattenOrigin[key] == null && value != null)) {
            switch (key) {
                case 'live_room':
                    return
            }
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
