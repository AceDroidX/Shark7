import axios from "axios";
import { ChangeStreamInsertDocument, ChangeStreamUpdateDocument } from "mongodb";
import { Shark7Event } from "shark7-shared";
import { BiliApi, BiliDynamic } from "shark7-shared";
import { logger } from "shark7-shared";
import { Scope } from 'shark7-shared';
import { logAxiosError, logErrorDetail } from "shark7-shared";
import { MongoController } from "./MongoController";

const UserAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/109.0.0.0 Safari/537.36'

export async function getDynamic(user_id: number): Promise<BiliDynamic[] | null> {
    try {
        const cookie = process.env['cookie'] ?? 'buvid3=12345678-1234-1234-1234-123456789123infoc;DedeUserID=123456789'
        const headers = { 'user-agent': UserAgent, 'referer': 'https://space.bilibili.com/', cookie }
        const resp = await axios.get<BiliApi>(`https://api.bilibili.com/x/polymer/web-dynamic/v1/feed/space?host_mid=${user_id}`, { headers })
        if (resp.status != 200) {
            logger.warn(`getDynamic resp.status!=200\nstatus:${resp.status}\n` + JSON.stringify(resp.data))
            return null
        }
        if (resp.data.code != 0) {
            logger.warn(`getDynamic resp.data.code!=0\nstatus:${resp.status}\n` + JSON.stringify(resp.data))
            return null
        }
        let data = resp.data.data.items
        for (const [index, item] of data.entries()) {
            data[index].shark7_id = String(user_id)
        }
        return data
    } catch (err) {
        if (axios.isAxiosError(err)) {
            logAxiosError(err)
        } else {
            logErrorDetail('抓取数据失败', err)
        }
        return null
    }
}

export async function insertDynamic(ctr: MongoController, user_id: number): Promise<boolean> {
    const data = await getDynamic(user_id)
    if (!data) return false
    for (const item of data) {
        await ctr.insertDynamic(item)
    }
    return true
}

export async function onDynamicEvent(ctr: MongoController, event: ChangeStreamInsertDocument<BiliDynamic>): Promise<Shark7Event | null> {
    const data = event.fullDocument
    if (!data) {
        logger.error(`fullDocument为${data}`)
        process.exit(1)
    }
    let type: string, content: string | undefined
    switch (data.type) {
        case 'DYNAMIC_TYPE_LIVE_RCMD':
            return null
        case 'DYNAMIC_TYPE_AV':
            type = 'B站视频'
            if (data.modules.module_dynamic.major.type != 'MAJOR_TYPE_ARCHIVE') {
                logger.warn('not MAJOR_TYPE_ARCHIVE in DYNAMIC_TYPE_AV')
                return null
            }
            content = data.modules.module_dynamic.desc?.text ?? ''
            content += data.modules.module_dynamic.major.archive.title + '\nhttps://b23.tv/' + data.modules.module_dynamic.major.archive.bvid
            break
        case 'DYNAMIC_TYPE_DRAW':
        case 'DYNAMIC_TYPE_WORD':
            type = 'B站动态'
            content = data.modules.module_dynamic.desc?.text
            break
        case 'DYNAMIC_TYPE_FORWARD':
            type = 'B站转发'
            content = data.modules.module_dynamic.desc?.text
            break
        default:
            logger.warn('未知类型' + data.type)
            return null
    }
    const msg = `${type}\n${content}}`
    return { ts: Number(new Date()), name: String(data.modules.module_author.name), scope: Scope.Bilibili.Dynamic, msg }
}

export async function onDynamicUpdate(ctr: MongoController, event: ChangeStreamUpdateDocument): Promise<Shark7Event | null> {
    logger.debug('忽略onDynamicUpdate')
    return null
}
