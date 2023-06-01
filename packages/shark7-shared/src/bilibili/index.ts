export * from './BiliDynamic'
export * from './BiliUser'
export * from './BiliVideo'
export * from './BiliWbi'

export type BiliApi<T = any> = {
    code: number
    message: string
    data: T
}
