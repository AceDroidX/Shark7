export * from './BiliDynamic.ts'
export * from './BiliUser.ts'
export * from './BiliVideo.ts'
export * from './BiliWbi.ts'

export type BiliApi<T = any> = {
    code: number
    message: string
    data: T
}
