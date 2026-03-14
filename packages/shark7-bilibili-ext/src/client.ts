import { BiliGet, headers } from 'shark7-shared'
import type {
    BilibiliAiSubtitleDocument,
    BilibiliApiResponse,
    BilibiliExtErrorCode,
} from './types.ts'
import { BilibiliExtError } from './types.ts'

const BilibiliOrigin = 'https://www.bilibili.com'

function mapApiErrorCode(code: number, fallback: BilibiliExtErrorCode) {
    if (code === -101) return 'AUTH_EXPIRED'
    if (code === -400) return fallback
    if (code === -404) return 'VIDEO_NOT_FOUND'
    return fallback
}

export function getCookieString() {
    return process.env['cookie'] ?? ''
}

export function hasSessdataCookie() {
    return /(?:^|;)\s*SESSDATA=/.test(getCookieString())
}

export async function requestWbiData<T>(
    url: string,
    params: Record<string, string | number>,
    fallbackCode: BilibiliExtErrorCode,
): Promise<T> {
    const response = await BiliGet<BilibiliApiResponse<T>>(url, params)
    if (response.status !== 200) {
        throw new BilibiliExtError(fallbackCode, `B 站接口请求失败: ${url}`, {
            status: response.status,
            data: response.data,
        })
    }
    if (response.data.code !== 0) {
        throw new BilibiliExtError(
            mapApiErrorCode(response.data.code, fallbackCode),
            `B 站接口返回错误: ${url} code=${response.data.code} message=${response.data.message}`,
            response.data,
        )
    }
    return response.data.data
}

export async function requestSubtitleDocument(subtitleUrl: string): Promise<BilibiliAiSubtitleDocument> {
    const url = subtitleUrl.startsWith('//') ? `https:${subtitleUrl}` : subtitleUrl
    const response = await fetch(url, {
        headers: {
            ...headers,
            origin: BilibiliOrigin,
            referer: `${BilibiliOrigin}/`,
            accept: 'application/json, text/plain, */*',
        },
    })

    if (!response.ok) {
        const code = response.status === 401 || response.status === 403
            ? 'SUBTITLE_URL_EXPIRED'
            : 'SUBTITLE_DOWNLOAD_FAILED'
        throw new BilibiliExtError(code, `字幕下载失败: status=${response.status}`, {
            subtitleUrl: url,
            status: response.status,
        })
    }

    const data = await response.json() as BilibiliAiSubtitleDocument
    if (data.type !== 'AIsubtitle' || !Array.isArray(data.body)) {
        throw new BilibiliExtError('SUBTITLE_DOWNLOAD_FAILED', '字幕内容格式不正确', {
            subtitleUrl: url,
            data,
        })
    }
    return data
}
