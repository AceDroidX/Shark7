export enum WeiboDataName {
    Cookie = 'cookie'
}

export type DataDBDoc<N,T> = {
    name: N,
    data: T,
}