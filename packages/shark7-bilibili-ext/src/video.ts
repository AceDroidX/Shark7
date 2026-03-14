import type { BilibiliViewDetailData, VideoMeta } from './types.ts'
import { BilibiliExtError } from './types.ts'
import { requestWbiData } from './client.ts'

const ViewDetailUrl = 'https://api.bilibili.com/x/web-interface/wbi/view/detail'

export function normalizeBvid(input: string) {
    return input.trim()
}

export function validateBvid(input: string) {
    return /^BV[0-9A-Za-z]+$/.test(input.trim())
}

export async function getVideoMetaByBvid(bvid: string): Promise<VideoMeta> {
    const normalizedBvid = normalizeBvid(bvid)
    if (!validateBvid(normalizedBvid)) {
        throw new BilibiliExtError('INVALID_BVID', `无效的 BV 号: ${bvid}`)
    }

    const data = await requestWbiData<BilibiliViewDetailData>(
        ViewDetailUrl,
        { platform: 'web', bvid: normalizedBvid },
        'VIDEO_API_FAILED',
    )

    const view = data.View
    return {
        bvid: view.bvid,
        aid: view.aid,
        title: view.title,
        ownerMid: view.owner.mid,
        ownerName: view.owner.name,
        pages: view.pages.map((page) => ({
            cid: page.cid,
            page: page.page,
            part: page.part,
            duration: page.duration,
        })),
    }
}
