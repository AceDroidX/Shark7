export type SubtitlePageTranscript = {
    pageId: number
    pageNo: number
    cid: number
    part: string
    durationSeconds: number
    trackId: number
    text: string
    segmentCount: number
}

export type VideoTranscript = {
    videoId: number
    bvid: string
    aid: number
    title: string
    ownerMid: number
    ownerName: string
    pages: SubtitlePageTranscript[]
}

export type SummaryChunkResult = {
    pageNo: number
    summary: string
    chunkCount: number
}

export type VideoSummaryResult = {
    summaryId: number
    videoId: number
    bvid: string
    inputHash: string
    summaryText: string
    pageSummaries: SummaryChunkResult[]
    cached: boolean
}

export type AiSummaryByBvidRequest = {
    bvid: string
}

export type AiSummaryByBvidResponse =
    | {
        ok: true
        bvid: string
        summaryId: number
        cached: boolean
        summaryText: string
    }
    | {
        ok: false
        bvid: string
        error: string
    }
