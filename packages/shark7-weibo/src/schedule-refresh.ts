import type { IAtomicChange } from 'json-diff-ts'
import type { WeiboComment, WeiboMsg } from 'shark7-shared'

export function formatScheduleComment(comment: WeiboComment) {
    return {
        commentId: String(comment.id),
        rootId: String(comment.rootid),
        createdAt: new Date(comment.created_at).toISOString(),
        textRaw: comment.text_raw,
        userId: comment.user.id,
        screenName: comment.user.screen_name,
        replyCommentId: comment.reply_comment ? String(comment.reply_comment.id) : null,
        replyTextRaw: comment.reply_comment?.text_raw ?? comment.reply_comment?.text ?? null,
        replyScreenName: comment.reply_comment?.user.screen_name ?? null,
        conversationText: comment.reply_comment
            ? `原评论<${comment.reply_comment.user.screen_name}>:\n${comment.reply_comment.text_raw ?? comment.reply_comment.text ?? ''}\n回复:\n${comment.text_raw}`
            : comment.text_raw,
    }
}

export function hasMblogTextChanged(changes: IAtomicChange[]) {
    return changes.some(change => change.path.replace(/^\$\./, '') === 'text_raw')
}

function getScheduleRelevantCommentSnapshot(comment: WeiboComment) {
    return {
        textRaw: comment.text_raw,
        replyCommentId: comment.reply_comment ? String(comment.reply_comment.id) : null,
        replyTextRaw: comment.reply_comment?.text_raw ?? comment.reply_comment?.text ?? null,
    }
}

export function hasCommentContentChanged(oldData: WeiboComment | null, newData: WeiboComment) {
    if (!oldData) {
        return true
    }
    return JSON.stringify(getScheduleRelevantCommentSnapshot(oldData)) !== JSON.stringify(getScheduleRelevantCommentSnapshot(newData))
}

export function createMblogScheduleRefreshOnUpdateExtra(deps: {
    fetchComments: (newData: WeiboMsg) => Promise<void>
    publishMblog: (newData: WeiboMsg) => Promise<void>
}) {
    return async (oldData: WeiboMsg | null, newData: WeiboMsg, changes: IAtomicChange[]) => {
        if (!oldData || oldData.comments_count !== newData.comments_count) {
            await deps.fetchComments(newData)
        }
        if (hasMblogTextChanged(changes)) {
            await deps.publishMblog(newData)
        }
    }
}

export function createCommentScheduleRefreshOnUpdateExtra(deps: {
    publishComment: (newData: WeiboComment) => Promise<void>
}) {
    return async (oldData: WeiboComment | null, newData: WeiboComment, _changes: IAtomicChange[]) => {
        if (hasCommentContentChanged(oldData, newData)) {
            await deps.publishComment(newData)
        }
    }
}
