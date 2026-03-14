import type {
    BilibiliAiSubtitleDocument,
    BilibiliPlayerData,
    BilibiliSubtitleTrack,
    SubtitleSegment,
} from './types.ts'
import { BilibiliExtError } from './types.ts'
import { hasSessdataCookie, requestSubtitleDocument, requestWbiData } from './client.ts'

const PlayerUrl = 'https://api.bilibili.com/x/player/wbi/v2'

function scoreSubtitleTrack(track: BilibiliSubtitleTrack) {
    let score = 0
    const lan = track.lan.toLowerCase()
    const lanDoc = track.lan_doc.toLowerCase()

    if (lan === 'ai-zh' || lan.startsWith('ai-zh')) score += 120
    if (lan.startsWith('zh')) score += 90
    if (lanDoc.includes('中文')) score += 80
    if (track.type === 1) score += 20
    if ((track.ai_status ?? 0) === 0) score += 10
    return score
}

export async function getPlayerData(aid: number, cid: number) {
    return requestWbiData<BilibiliPlayerData>(
        PlayerUrl,
        { aid, cid },
        'PLAYER_API_FAILED',
    )
}

export function getSubtitleTracks(playerData: BilibiliPlayerData) {
    return playerData.subtitle?.subtitles ?? []
}

export function pickBestSubtitleTrack(tracks: BilibiliSubtitleTrack[]) {
    if (tracks.length === 0) return null
    return [...tracks].sort((left, right) => scoreSubtitleTrack(right) - scoreSubtitleTrack(left))[0] ?? null
}

export function buildSubtitleSegments(cid: number, subtitle: BilibiliAiSubtitleDocument): SubtitleSegment[] {
    return subtitle.body.map((item) => ({
        cid,
        sid: item.sid,
        from: item.from,
        to: item.to,
        content: item.content,
    }))
}

export function joinSubtitleText(segments: SubtitleSegment[]) {
    return segments
        .map((segment) => segment.content.trim())
        .filter(Boolean)
        .join('\n')
}

export async function getSubtitleByAidAndCid(aid: number, cid: number) {
    const playerData = await getPlayerData(aid, cid)
    const tracks = getSubtitleTracks(playerData)

    if (tracks.length === 0) {
        if (playerData.need_login_subtitle && !hasSessdataCookie()) {
            throw new BilibiliExtError('AUTH_REQUIRED', '当前视频字幕需要登录后获取')
        }
        throw new BilibiliExtError('SUBTITLE_NOT_FOUND', '当前分 P 没有可用字幕轨道')
    }

    const track = pickBestSubtitleTrack(tracks)
    if (!track) {
        throw new BilibiliExtError('SUBTITLE_NOT_FOUND', '当前分 P 没有可用字幕轨道')
    }

    let subtitle: BilibiliAiSubtitleDocument
    try {
        subtitle = await requestSubtitleDocument(track.subtitle_url)
    } catch (error) {
        if (error instanceof BilibiliExtError && error.code === 'SUBTITLE_URL_EXPIRED') {
            const refreshedPlayerData = await getPlayerData(aid, cid)
            const refreshedTrack = pickBestSubtitleTrack(getSubtitleTracks(refreshedPlayerData))
            if (!refreshedTrack) {
                throw new BilibiliExtError('SUBTITLE_NOT_FOUND', '字幕链接已过期，且刷新后未找到可用字幕轨道')
            }
            subtitle = await requestSubtitleDocument(refreshedTrack.subtitle_url)
            return {
                needLoginSubtitle: refreshedPlayerData.need_login_subtitle,
                tracks: getSubtitleTracks(refreshedPlayerData),
                track: refreshedTrack,
                subtitle,
                segments: buildSubtitleSegments(cid, subtitle),
            }
        }
        throw error
    }

    return {
        needLoginSubtitle: playerData.need_login_subtitle,
        tracks,
        track,
        subtitle,
        segments: buildSubtitleSegments(cid, subtitle),
    }
}
