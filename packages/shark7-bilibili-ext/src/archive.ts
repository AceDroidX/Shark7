import { requestWbiData } from './client.ts'
import type { BilibiliSeriesArchivesData, BilibiliSeriesArchive } from './types.ts'

const SeriesArchivesUrl = 'https://api.bilibili.com/x/series/archives'

export async function getSeriesArchives(userId: number, seriesId: number, page = 1, pageSize = 30) {
    return requestWbiData<BilibiliSeriesArchivesData>(
        SeriesArchivesUrl,
        {
            mid: userId,
            series_id: seriesId,
            only_normal: 'true',
            sort: 'desc',
            ps: pageSize,
            pn: page,
        },
        'SERIES_API_FAILED',
    )
}

export async function getLatestSeriesArchives(userId: number, seriesId: number, limit = 10): Promise<BilibiliSeriesArchive[]> {
    const data = await getSeriesArchives(userId, seriesId, 1, Math.max(limit, 1))
    return data.archives.slice(0, limit)
}
