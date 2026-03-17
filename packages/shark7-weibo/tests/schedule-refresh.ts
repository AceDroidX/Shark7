import assert from 'node:assert/strict'
import type { IAtomicChange } from 'json-diff-ts'
import { initLogger } from 'shark7-shared'
import { createCommentScheduleRefreshOnUpdateExtra, createMblogScheduleRefreshOnUpdateExtra } from '../src/schedule-refresh.ts'
import type { WeiboComment, WeiboMsg } from 'shark7-shared'

function createMockMblog(overrides: Partial<WeiboMsg> = {}) {
    return {
        id: 1,
        text_raw: '原微博正文',
        comments_count: 10,
        _userid: 7198559139,
        _timestamp: Date.now(),
        user: {
            id: 7198559139,
            screen_name: '七海Nana7mi',
        },
        mblogid: 'mock-mblog',
        visible_type: 0,
        repost_type: null,
        isTop: false,
        shark7_raw: null,
        ...overrides,
    } as WeiboMsg
}

function createMockComment(overrides: Partial<WeiboComment> = {}) {
    return {
        id: 1001,
        rootid: 1001,
        created_at: new Date().toISOString(),
        text_raw: '原评论内容',
        user: {
            id: 7198559139,
            screen_name: '七海Nana7mi',
        },
        _mblogid: 1,
        _userid: 7198559139,
        shark7_raw: null,
        ...overrides,
    } as WeiboComment
}

async function testCommentsCountChangedWithoutAuthorCommentUpdates() {
    let fetchCommentsCalls = 0
    let publishMblogCalls = 0

    const onUpdateExtra = createMblogScheduleRefreshOnUpdateExtra({
        fetchComments: async () => {
            fetchCommentsCalls += 1
        },
        publishMblog: async () => {
            publishMblogCalls += 1
        },
    })

    const oldData = createMockMblog({ comments_count: 10, text_raw: '原微博正文' })
    const newData = createMockMblog({ comments_count: 11, text_raw: '原微博正文' })
    const changes = [{ path: '$.comments_count' }] as IAtomicChange[]

    await onUpdateExtra(oldData, newData, changes)

    assert.equal(fetchCommentsCalls, 1, 'comments_count 变化时应重新抓取评论')
    assert.equal(publishMblogCalls, 0, '仅 comments_count 变化且作者评论无新增/更新时，不应发送正文刷新任务')
}

async function testTextChangedStillPublishesMblogTask() {
    let fetchCommentsCalls = 0
    let publishMblogCalls = 0

    const onUpdateExtra = createMblogScheduleRefreshOnUpdateExtra({
        fetchComments: async () => {
            fetchCommentsCalls += 1
        },
        publishMblog: async () => {
            publishMblogCalls += 1
        },
    })

    const oldData = createMockMblog({ comments_count: 10, text_raw: '原微博正文' })
    const newData = createMockMblog({ comments_count: 11, text_raw: '更新后的微博正文' })
    const changes = [{ path: '$.comments_count' }, { path: '$.text_raw' }] as IAtomicChange[]

    await onUpdateExtra(oldData, newData, changes)

    assert.equal(fetchCommentsCalls, 1, '正文变化时仍应抓取评论')
    assert.equal(publishMblogCalls, 1, 'text_raw 变化时应发送正文刷新任务')
}

async function testCommentCountOnlyChangeDoesNotPublishCommentTask() {
    let publishCommentCalls = 0

    const onUpdateExtra = createCommentScheduleRefreshOnUpdateExtra({
        publishComment: async () => {
            publishCommentCalls += 1
        },
    })

    const oldData = createMockComment({ text_raw: '原评论内容' })
    const newData = createMockComment({ text_raw: '原评论内容' })
    const changes = [{ path: '$.like_counts' }] as IAtomicChange[]

    await onUpdateExtra(oldData, newData, changes)

    assert.equal(publishCommentCalls, 0, '评论无正文/reply 变化时，不应发送评论刷新任务')
}

async function testCommentTextChangedPublishesCommentTask() {
    let publishCommentCalls = 0

    const onUpdateExtra = createCommentScheduleRefreshOnUpdateExtra({
        publishComment: async () => {
            publishCommentCalls += 1
        },
    })

    const oldData = createMockComment({ text_raw: '原评论内容' })
    const newData = createMockComment({ text_raw: '更新后的评论内容' })
    const changes = [{ path: '$.text_raw' }] as IAtomicChange[]

    await onUpdateExtra(oldData, newData, changes)

    assert.equal(publishCommentCalls, 1, '评论 text_raw 变化时，应发送评论刷新任务')
}

async function testReplyCommentChangedPublishesCommentTask() {
    let publishCommentCalls = 0

    const onUpdateExtra = createCommentScheduleRefreshOnUpdateExtra({
        publishComment: async () => {
            publishCommentCalls += 1
        },
    })

    const oldData = createMockComment({
        reply_comment: createMockComment({ id: 2001, text_raw: '今天真不来了吗', user: { id: 1, screen_name: '观众A' } as WeiboComment['user'] }),
    })
    const newData = createMockComment({
        reply_comment: createMockComment({ id: 2001, text_raw: '今天还播吗', user: { id: 1, screen_name: '观众A' } as WeiboComment['user'] }),
    })
    const changes = [{ path: '$.reply_comment.text_raw' }] as IAtomicChange[]

    await onUpdateExtra(oldData, newData, changes)

    assert.equal(publishCommentCalls, 1, '评论 reply_comment 变化时，应发送评论刷新任务')
}

async function main() {
    initLogger('weibo-schedule-refresh-test')

    await testCommentsCountChangedWithoutAuthorCommentUpdates()
    console.log('PASS comments_count-only update does not publish mblog refresh task')

    await testTextChangedStillPublishesMblogTask()
    console.log('PASS text_raw update still publishes mblog refresh task')

    await testCommentCountOnlyChangeDoesNotPublishCommentTask()
    console.log('PASS comment non-content update does not publish comment refresh task')

    await testCommentTextChangedPublishesCommentTask()
    console.log('PASS comment text_raw update publishes comment refresh task')

    await testReplyCommentChangedPublishesCommentTask()
    console.log('PASS comment reply_comment update publishes comment refresh task')
}

if (import.meta.main) {
    main().catch((error) => {
        console.error(error)
        process.exit(1)
    })
}
