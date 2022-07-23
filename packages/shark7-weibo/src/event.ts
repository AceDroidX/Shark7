import { ChangeStreamInsertDocument, ChangeStreamUpdateDocument, WithId } from "mongodb"
import { WeiboMsg } from "./model/model"
import { Shark7Event } from "shark7-shared"
import { Scope } from 'shark7-shared/dist/scope'
import { WeiboUser } from "./model/WeiboUser"
import logger from "shark7-shared/dist/logger"

export function onMblogEvent(user: WeiboUser | WithId<WeiboUser>, event: ChangeStreamInsertDocument<WeiboMsg>): Shark7Event | null {
    const nmb = event.fullDocument
    let shark7event = { ts: Number(new Date()), name: user.screen_name, scope: Scope.Weibo.Mblog, msg: '' }
    if (nmb.user.id != user.id) {
        if (nmb.title.includes('赞过的微博')) {
            logger.debug(`跳过赞过的微博:${nmb.mblogid}`)
            return null
        }
        shark7event.msg = `${nmb.title}:${nmb.user.screen_name}\n${nmb.text_raw}`
    }
    else if (nmb.visible_type == 0) {
        if (nmb.repost_type == 1) {
            shark7event.msg = `微博转发\n${nmb.text_raw}`
        } else {
            shark7event.msg = `微博动态\n${nmb.text_raw}`
        }
    } else if (nmb.visible_type == 10) {
        if (nmb.repost_type == 1) {
            shark7event.msg = `微博仅粉丝可见转发\n${nmb.text_raw}`
        } else {
            shark7event.msg = `微博仅粉丝可见动态\n${nmb.text_raw}`
        }
    } else {
        shark7event.msg = `微博动态(visible_type=${nmb.visible_type})\n${nmb.text_raw}`
    }
    return shark7event
}

export function onUserDBEvent(origin: WeiboUser, event: ChangeStreamUpdateDocument<WeiboUser>): Shark7Event | undefined {
    const user = event.updateDescription.updatedFields
    if (!user) {
        logger.warn(`event.updateDescription.updatedFields为${user}`)
        return
    }
    var result = [];
    if (user.screen_name != undefined) {
        result.push(`微博昵称更改\n原：${origin.screen_name}\n现：${user.screen_name}`);
    }
    if (user.avatar_hd != undefined) {
        result.push(`微博头像更改\n原：${origin.avatar_hd}\n现：\n${user.avatar_hd}`);
    }
    if (user.friends_count != undefined) {
        result.push(`微博关注数更改\n原：${origin.friends_count}\n现：${user.friends_count}`);
    }
    if (user.description != undefined) {
        result.push(`微博简介更改\n原：${origin.description}\n现：${user.description}`);
    }
    if (user.verified_reason != undefined) {
        result.push(`微博认证更改\n原：${origin.verified_reason}\n现：${user.verified_reason}`);
    }
    return { ts: Number(new Date()), name: String(origin.screen_name), scope: Scope.Weibo.User, msg: result.join('\n') }
}
