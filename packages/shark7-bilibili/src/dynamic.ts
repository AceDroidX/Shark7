import axios from "axios";
import { ChangeStreamInsertDocument, ChangeStreamUpdateDocument } from "mongodb";
import { Shark7Event } from "shark7-shared";
import { BiliApi, BiliDynamic } from "shark7-shared/dist/bilibili";
import logger from "shark7-shared/dist/logger";
import { Scope } from 'shark7-shared/dist/scope';
import { logErrorDetail } from "shark7-shared/dist/utils";
import { MongoController } from "./MongoController";

const UserAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/105.0.0.0 Safari/537.36 Edg/105.0.1343.4'

export async function getDynamic(user_id: number): Promise<BiliDynamic[] | null> {
    try {
        const resp = await axios.get<BiliApi>(`https://api.bilibili.com/x/polymer/web-dynamic/v1/feed/space?host_mid=${user_id}`, { headers: { 'user-agent': UserAgent } })
        if (resp.status != 200) {
            logger.warn('resp.status!=200\n' + JSON.stringify(resp))
            return null
        }
        if (resp.data.code != 0) {
            logger.warn('resp.data.code!=0\n' + JSON.stringify(resp))
            return null
        }
        let data = resp.data.data.items
        for (const [index, item] of data.entries()) {
            data[index].shark7_id = String(user_id)
        }
        return data
    } catch (err) {
        logErrorDetail('抓取数据失败', err)
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
    let type
    switch (data.type) {
        case 'DYNAMIC_TYPE_DRAW':
        case 'DYNAMIC_TYPE_WORD':
            type = 'B站动态'
            break
        case 'DYNAMIC_TYPE_AV':
            type = 'B站视频'
            break
        case 'DYNAMIC_TYPE_FORWARD':
            type = 'B站转发'
            break
        default:
            type = data.type
            logger.warn('未知类型' + data.type)
    }
    const msg = `${type}\n${data.modules.module_dynamic.desc.text}`
    return { ts: Number(new Date()), name: String(data.modules.module_author.name), scope: Scope.Bilibili.Dynamic, msg }
}

export async function onDynamicUpdate(ctr: MongoController, event: ChangeStreamUpdateDocument): Promise<Shark7Event | null> {
    logger.debug('忽略onDynamicUpdate')
    return null
}
