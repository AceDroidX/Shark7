import type { WeiboComment, WeiboCommentApi, WeiboReplyComment, WeiboRootComment } from 'shark7-shared';
import { logger } from 'shark7-shared';
import { MongoController } from './MongoController.ts';
import { WeiboHTTP } from './model/WeiboHTTP.ts';

type TrackCommentChange = (comment: WeiboComment) => Promise<void>;

const CommentFlow = {
    ByHot: 0,
    ByTime: 1,
} as const;
type CommentFlow = typeof CommentFlow[keyof typeof CommentFlow];

function attachCommentContext(comment: WeiboComment, mblogId: number, uid: number): WeiboComment {
    return Object.assign(comment, {
        _mblogid: mblogId,
        _userid: uid,
    })
}

function hydrateReplyContext(comment: WeiboComment, commentMap: Map<number, WeiboComment>) {
    if (comment.reply_comment) {
        return comment
    }
    if (comment.rootid === comment.id) {
        return comment
    }
    const replyComment = commentMap.get(comment.rootid)
    if (!replyComment) {
        return comment
    }
    return Object.assign(comment, {
        reply_comment: replyComment,
    })
}

async function getComments<T extends WeiboComment>(wbhttp: WeiboHTTP, id: number, flow: CommentFlow, count = 20, isSubComment = false): Promise<T[] | null> {
    const result = await wbhttp.getURL<WeiboCommentApi<T>>(`https://weibo.com/ajax/statuses/buildComments?flow=${flow}&id=${id}&is_show_bulletin=2&count=${count}&fetch_level=${Number(isSubComment)}`)
    if (!result) return null;
    if (result.status != 200) {
        logger.error(`getComments result.status != 200:\n${JSON.stringify(result.data)}`);
        return null
    }
    if (result.data.ok != 1) {
        logger.error(`getComments result.data.ok != 1:\n${JSON.stringify(result.data)}`);
        return null
    }
    return result.data.data
}

async function getInnerComments(wbhttp: WeiboHTTP, comments: WeiboRootComment[]): Promise<WeiboReplyComment[]> {
    let innerComments: WeiboReplyComment[] = []
    for (const item of comments) {
        if (item.more_info) {
            const data = await getComments<WeiboReplyComment>(wbhttp, item.id, CommentFlow.ByHot, 100, true)
            if (data) {
                innerComments = innerComments.concat(data)
            }
        } else {
            if (item.comments) innerComments = innerComments.concat(item.comments)
        }
    }
    return innerComments
}

async function getMblogComments(mongo: MongoController, wbhttp: WeiboHTTP, id: number, flow: CommentFlow = CommentFlow.ByHot, count = 100): Promise<WeiboComment[] | null> {
    const root = await getComments<WeiboRootComment>(wbhttp, id, flow, count)
    if (!root) return null
    const inner = await getInnerComments(wbhttp, root)
    return (root as WeiboComment[]).concat(inner)
}


function commentsFilter(comments: WeiboComment[], uid: number): WeiboComment[] {
    let filtedComments: WeiboComment[] = []
    for (const item of comments) {
        if (item.user.id == uid) {
            filtedComments.push(item)
        }
    }
    return filtedComments
}

export async function fetchComments(mongo: MongoController, wbhttp: WeiboHTTP, id: number, uid: number, trackCommentChange: TrackCommentChange): Promise<boolean> {
    logger.debug('开始抓取评论')
    const hotComments = await getMblogComments(mongo, wbhttp, id, CommentFlow.ByHot, 100)
    const timeComments = await getMblogComments(mongo, wbhttp, id, CommentFlow.ByTime, 10)
    if (!hotComments || !timeComments) {
        return false
    }

    const commentMap = new Map<number, WeiboComment>()
    for (const comment of hotComments.concat(timeComments)) {
        commentMap.set(comment.id, comment)
    }

    for (const data of commentsFilter(hotComments, uid)) {
        await trackCommentChange(attachCommentContext(hydrateReplyContext(data, commentMap), id, uid))
    }
    for (const data of commentsFilter(timeComments, uid)) {
        await trackCommentChange(attachCommentContext(hydrateReplyContext(data, commentMap), id, uid))
    }
    return true
}
