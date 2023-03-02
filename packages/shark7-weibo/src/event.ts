import { ChangeStreamInsertDocument, ChangeStreamUpdateDocument } from "mongodb"
import { WeiboUser, WeiboMsg, WeiboComment } from 'shark7-shared'
import { Shark7Event } from "shark7-shared"
import { Scope } from 'shark7-shared'
import { logger } from "shark7-shared"
import { MongoController } from "./MongoController"
import { fetchComments } from './comment'
import { WeiboHTTP } from "./model/WeiboHTTP"

export async function onMblogEvent(ctr: MongoController, event: ChangeStreamInsertDocument<WeiboMsg>): Promise<Shark7Event | null> {
    const nmb = event.fullDocument
    const user = await ctr.getUserInfoByID(nmb._userid)
    if (!user) {
        logger.error(`user为null,event:\n${JSON.stringify(event)}`)
        return null
    }
    let shark7event = { ts: Number(new Date()), name: user.screen_name, scope: Scope.Weibo.Mblog, msg: '' }
    if (nmb.user.id != user.id) {
        if (nmb.title?.includes('赞过的微博')) {
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
    logger.info(`新微博:${nmb.mblogid}`)
    return shark7event
}

export async function onMblogUpdate(ctr: MongoController, event: ChangeStreamUpdateDocument<WeiboMsg>, wbhttp?: WeiboHTTP): Promise<Shark7Event | null> {
    if (!event.fullDocument) {
        logger.error('onMblogUpdate !event.fullDocument')
        return null
    }
    if (!wbhttp) {
        logger.error('onMblogUpdate !wbhttp')
        return null
    }
    await fetchComments(ctr, wbhttp, event.fullDocument.id, event.fullDocument._userid)
    return null
}

export async function onUserDBEvent(ctr: MongoController, event: ChangeStreamUpdateDocument<WeiboUser>, origin?: WeiboUser): Promise<Shark7Event | null> {
    if (!origin) {
        logger.error(`origin为null,event:\n${JSON.stringify(event)}`)
        return null
    }
    const user = event.updateDescription.updatedFields
    if (!user) {
        logger.warn(`event.updateDescription.updatedFields为${user}`)
        return null
    }
    if (Object.keys(user).length == 0) {
        return null
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

export async function onCommentInsert(ctr: MongoController, event: ChangeStreamInsertDocument<WeiboComment>): Promise<Shark7Event | null> {
    const comment = event.fullDocument
    let msg = comment.text_raw
    if (comment.reply_comment) {
        msg = `原评论<${comment.reply_comment.user.screen_name}>:\n${comment.reply_comment.text}\n回复:\n` + msg
    }
    logger.info('添加评论:' + msg)
    return { ts: Number(new Date()), name: String(comment.user.screen_name), scope: Scope.Weibo.Comment, msg }
}

export async function onCommentUpdate(ctr: MongoController, event: ChangeStreamUpdateDocument<WeiboComment>): Promise<Shark7Event | null> {
    logger.debug('忽略CommentUpdate')
    return null
}
