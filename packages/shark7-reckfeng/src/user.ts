import axios from 'axios';
import { ChangeStreamUpdateDocument } from "mongodb";
import { Scope, Shark7Event, flattenObj, logErrorDetail, logger } from "shark7-shared";
import { ReckfengData } from "shark7-shared/dist/reckfeng";
import { MongoController } from "./MongoController";
import { ReckfengApi } from 'shark7-shared/dist/reckfeng';

export async function fetchUser(user_id: number, user_name: string): Promise<ReckfengData[] | null> {
    try {
        const headers = {
            'Accept': 'application/json, text/plain, */*',
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) QtWebEngine/5.15.2 Chrome/83.0.4103.122 Safari/537.36 Platform/1.x',
            'token': process.env['token'],
            'Referer': `https://platform.reckfeng.com/my-center/${user_id}/rpg?language=zh_CN`,
            'Accept-Encoding': 'gzip, deflate, br',
        }
        const resp = await axios.get<ReckfengApi>(`https://map-api.reckfeng.com/api/v1/rpg/rpg_my_game?guid=${user_id}&start=0&limit=10&_ag=0&_lang=cn`, { headers })
        if (resp.status != 200) {
            logger.warn('resp.status!=200\n' + JSON.stringify(resp))
            return null
        }
        if (resp.data.status != 200) {
            logger.warn('resp.data.status!=200\n' + JSON.stringify(resp))
            return null
        }
        // logger.debug(JSON.stringify(resp))
        let data = resp.data.data.rows
        return data.map(item => {
            item.shark7_id = String(user_id)
            item.shark7_name = user_name
            return item
        })
    } catch (err) {
        logErrorDetail('抓取数据失败', err)
        // TODO: token过期事件 目前先退出程序
        process.exit(1)
        return null
    }
}

export async function insertUser(ctr: MongoController, user_id: number, user_name: string) {
    const data = await fetchUser(user_id, user_name)
    if (!data) return
    return await Promise.all(data.map(item => ctr.insertUser(item)))
}

export async function onUserEvent(ctr: MongoController, event: ChangeStreamUpdateDocument<ReckfengData>, origin?: ReckfengData): Promise<Shark7Event | null> {
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
            case 'lastplayedSecond':
                return
        }
        // if (JSON.stringify(value) == '[]' || JSON.stringify(value) == '{}') {
        //     return
        // }
        if (flattenOrigin[key] == value) {
            return
        }
        logger.info(`${key}更改\n原：${JSON.stringify(flattenOrigin[key])}\n现：${JSON.stringify(value)}`)
        result.push(`${key}更改\n原：${JSON.stringify(flattenOrigin[key])}\n现：${JSON.stringify(value)}`)
    })
    if (result.length == 0) return null
    return { ts: Number(new Date()), name: String(user.shark7_name), scope: Scope.Reckfeng.User, msg: result.join('\n') }
}
