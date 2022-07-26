import { ChangeStreamUpdateDocument } from "mongodb";
import { Shark7Event } from "shark7-shared";
import { Scope } from 'shark7-shared/dist/scope'
import logger from "shark7-shared/dist/logger";
import { MongoController } from "./MongoController";

export async function onUserDBEvent(ctr: MongoController, event: ChangeStreamUpdateDocument, origin: any): Promise<Shark7Event | null> {
    const user = event.updateDescription.updatedFields
    if (!user) {
        logger.warn(`event.fullDocument为${user}`)
        return null
    }
    var result: any[] = [];
    Object.keys(user).forEach(key => {
        switch (key) {
            case 'cover_url':
            case 'white_cover_url':
            case 'share_info':
                return
        }
        if (user[key] != undefined) {
            logger.debug(`${key}发生变化:${user[key]}`)
            result.push(`${key}更改\n原：${JSON.stringify(origin[key])}\n现：${JSON.stringify(user[key])}`);
        }
    })
    if (result.length == 0) return null
    return { ts: Number(new Date()), name: String(origin.nickname), scope: Scope.Douyin.User, msg: result.join('\n') }
}
