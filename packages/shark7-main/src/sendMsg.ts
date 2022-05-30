import { sendToKHL } from "./khl"

type KHLChannel = {
    id: string,
    include?: string[],
    exclude?: string[],
}

if (!process.env['khl_channels']) {
    console.error('khl_channels未设置')
    process.exit(1)
}

const channelConfig = JSON.parse(process.env['khl_channels']) as KHLChannel[]

export function sendMsgWithScope(msg: string, msgScope: string) {
    for (let channel of channelConfig) {
        if (channel.exclude) {
            if (channel.exclude.some((e) => msgScope.startsWith(e))) {
                continue
            }
        }
        if (channel.include) {
            if (channel.include.some((e) => msgScope.startsWith(e)) || channel.include.includes('all')) {
                sendToKHL(msg, channel.id)
            }
        }
    }
}