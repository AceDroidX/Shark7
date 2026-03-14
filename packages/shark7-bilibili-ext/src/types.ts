export type BilibiliApiResponse<T> = {
    code: number
    message: string
    ttl: number
    data: T
}

export type BilibiliViewPage = {
    cid: number
    page: number
    from: string
    part: string
    duration: number
}

export type BilibiliViewDetailData = {
    View: {
        bvid: string
        aid: number
        title: string
        cid: number
        videos: number
        owner: {
            mid: number
            name: string
        }
        pages: BilibiliViewPage[]
    }
}

export type BilibiliSubtitleTrack = {
    id: number
    id_str: string
    lan: string
    lan_doc: string
    is_lock: boolean
    subtitle_url: string
    type: number
    ai_type?: number
    ai_status?: number
}

export type BilibiliPlayerSubtitle = {
    allow_submit: boolean
    lan: string
    lan_doc: string
    subtitles: BilibiliSubtitleTrack[]
}

export type BilibiliPlayerData = {
    aid: number
    bvid: string
    cid: number
    need_login_subtitle: boolean
    subtitle?: BilibiliPlayerSubtitle
}

export type BilibiliAiSubtitleItem = {
    from: number
    to: number
    sid: number
    location: number
    content: string
    music?: number
}

export type BilibiliAiSubtitleDocument = {
    font_size: number
    font_color: string
    background_alpha: number
    background_color: string
    Stroke: string
    type: 'AIsubtitle'
    lang: string
    version: string
    body: BilibiliAiSubtitleItem[]
}

export type SubtitleSegment = {
    cid: number
    sid: number
    from: number
    to: number
    content: string
}

export type VideoPageMeta = {
    cid: number
    page: number
    part: string
    duration: number
}

export type VideoMeta = {
    bvid: string
    aid: number
    title: string
    ownerMid: number
    ownerName: string
    pages: VideoPageMeta[]
}

export type BilibiliExtErrorCode =
    | 'INVALID_BVID'
    | 'VIDEO_NOT_FOUND'
    | 'VIDEO_API_FAILED'
    | 'SERIES_API_FAILED'
    | 'PLAYER_API_FAILED'
    | 'SUBTITLE_NOT_FOUND'
    | 'SUBTITLE_DOWNLOAD_FAILED'
    | 'SUBTITLE_URL_EXPIRED'
    | 'AUTH_REQUIRED'
    | 'AUTH_EXPIRED'
    | 'UNKNOWN_ERROR'

export type BilibiliSeriesArchive = {
    aid: number
    bvid: string
    title: string
    pubdate: number
    ctime: number
    pic: string
    duration: number
    upMid: number
}

export type BilibiliSeriesArchivesData = {
    aids: number[]
    page: {
        num: number
        size: number
        total: number
    }
    archives: BilibiliSeriesArchive[]
}

export type BilibiliFetchJobType = 'scan_series_archives' | 'fetch_video_subtitle'
export type BilibiliFetchJobStatus = 'running' | 'success' | 'failed'

export type BilibiliFetchRetryPlan = {
    retryable: boolean
    maxAttempts: number
    nextRetryAt: Date | null
}

export class BilibiliExtError extends Error {
    code: BilibiliExtErrorCode
    details?: unknown

    constructor(code: BilibiliExtErrorCode, message: string, details?: unknown) {
        super(message)
        this.name = 'BilibiliExtError'
        this.code = code
        this.details = details
    }
}

export function isBilibiliExtError(error: unknown): error is BilibiliExtError {
    return error instanceof BilibiliExtError
}

export type PageSubtitleError = {
    code: BilibiliExtErrorCode
    message: string
}

export type PageSubtitleResult = {
    cid: number
    page: number
    part: string
    duration: number
    needLoginSubtitle: boolean
    tracks: BilibiliSubtitleTrack[]
    track: BilibiliSubtitleTrack | null
    subtitle: BilibiliAiSubtitleDocument | null
    segments: SubtitleSegment[]
    text: string
    error: PageSubtitleError | null
}

export type FetchVideoSubtitlesResult = {
    video: VideoMeta
    pages: PageSubtitleResult[]
}
