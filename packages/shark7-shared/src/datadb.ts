export const WeiboDataName = {
    Cookie: 'cookie'
} as const;
export type WeiboDataName = typeof WeiboDataName[keyof typeof WeiboDataName];

export type DataDBDoc<N,T> = {
    name: N,
    data: T,
}