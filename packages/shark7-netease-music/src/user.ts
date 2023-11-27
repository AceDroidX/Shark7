import axios from "axios";
import { ChangeStreamUpdateDocument } from "mongodb";
import { NeteaseMusicUser, Scope, Shark7Event, flattenObj, logErrorDetail, logger } from "shark7-shared";
import { MongoController } from "./MongoController";

const api_url = process.env['api_url']

export async function fetchUser(user_id: number): Promise<NeteaseMusicUser | null> {
    try {
        const resp = await axios.get<NeteaseMusicUser>(`${api_url}/user/detail?uid=${user_id}&timestamp=${Number(new Date())}`)
        if (resp.status != 200) {
            logger.warn('resp.status!=200\n' + JSON.stringify(resp))
            return null
        }
        if (resp.data.code != 200) {
            logger.warn('resp.body.code!=200\n' + JSON.stringify(resp))
            return null
        }
        // console.log(resp)
        let data: any = resp.data
        data.shark7_id = String(user_id)
        return data
    } catch (err) {
        logErrorDetail('抓取数据失败', err)
        return null
    }
}

export async function insertUser(ctr: MongoController, user_id: number) {
    const data = await fetchUser(user_id)
    if (!data) return
    await ctr.insertUser(data)
}

export async function onUserEvent(ctr: MongoController, event: ChangeStreamUpdateDocument<NeteaseMusicUser>, origin?: NeteaseMusicUser): Promise<Shark7Event | null> {
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
            case 'userPoint.updateTime':
            case 'profile.privacyItemUnlimit.gender':
                return
        }
        if ((flattenOrigin[key] != null && value == null) || (flattenOrigin[key] == null && value != null)) {
            if(['ip'].some(value => key==value)) return
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
    return { ts: Number(new Date()), name: String(user.profile.nickname), scope: Scope.NeteaseMusic.User, msg: result.join('\n') }
}
