
export function getBadgeName(badgeNameNum: number): string {
    switch (badgeNameNum) {
        case 1488777442:
            return "(空白)"
        default:
            return `未知(${badgeNameNum})`
    }
}


export function getTracerName(tracerNameNum: number): string {
    switch (tracerNameNum) {
        case 1618935778:
            return '击杀'
        case 1905735931:
            return '暂无数据(空白)'
        case 2047429420:
            return '侦察行动'
        default:
            return `未知(${tracerNameNum})`
    }
}