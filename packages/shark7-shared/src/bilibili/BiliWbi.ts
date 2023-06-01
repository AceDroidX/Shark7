import axios from 'axios'
import md5 from 'md5'

const mixinKeyEncTab = [
    46, 47, 18, 2, 53, 8, 23, 32, 15, 50, 10, 31, 58, 3, 45, 35, 27, 43, 5, 49,
    33, 9, 42, 19, 29, 28, 14, 39, 12, 38, 41, 13, 37, 48, 7, 16, 24, 55, 40,
    61, 26, 17, 0, 1, 60, 51, 30, 4, 22, 25, 54, 21, 56, 59, 6, 63, 57, 62, 11,
    36, 20, 34, 44, 52
]

// 对 imgKey 和 subKey 进行字符顺序打乱编码
function getMixinKey(orig: string) {
    let temp = ''
    mixinKeyEncTab.forEach((n) => {
        temp += orig[n]
    })
    return temp.slice(0, 32)
}

// 为请求参数进行 wbi 签名
function encWbi(params: any, img_key: string, sub_key: string) {
    const mixin_key = getMixinKey(img_key + sub_key),
        curr_time = Math.round(Date.now() / 1000),
        chr_filter = /[!'\(\)*]/g
    let query: any = []
    params = Object.assign(params, { wts: curr_time })    // 添加 wts 字段
    // 按照 key 重排参数
    Object.keys(params).sort().forEach((key) => {
        query.push(
            encodeURIComponent(key) +
            '=' +
            // 过滤 value 中的 "!'()*" 字符
            encodeURIComponent(('' + params[key]).replace(chr_filter, ''))
        )
    })
    query = query.join('&')
    const wbi_sign = md5(query + mixin_key) // 计算 w_rid
    return query + '&w_rid=' + wbi_sign
}

// 获取最新的 img_key 和 sub_key
async function getWbiKeys() {
    const resp = await axios({
        url: 'https://api.bilibili.com/x/web-interface/nav',
        method: 'get',
        responseType: 'json'
    }),
        json_content = resp.data,
        img_url = json_content.data.wbi_img.img_url,
        sub_url = json_content.data.wbi_img.sub_url
    return {
        img_key: img_url.substring(img_url.lastIndexOf('/') + 1, img_url.length).split('.')[0],
        sub_key: sub_url.substring(sub_url.lastIndexOf('/') + 1, sub_url.length).split('.')[0]
    }
}

const UserAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/109.0.0.0 Safari/537.36'
const cookie = process.env['cookie'] ?? 'buvid3=12345678-1234-1234-1234-123456789123infoc'
const headers = { 'user-agent': UserAgent, 'referer': 'https://space.bilibili.com/', cookie }

var wbi_keys = {
    img_key: "",
    sub_key: "",
}
var wbi_keys_timestamp = 0
const roll_keys_interval = 1 * 60 * 60 * 1000

async function calculateSignQuery(params: any) {
    if (new Date().getTime() - wbi_keys_timestamp > roll_keys_interval) {
        wbi_keys = await getWbiKeys()
        wbi_keys_timestamp = new Date().getTime()
    }
    return encWbi(
        params,
        wbi_keys.img_key,
        wbi_keys.sub_key,
    )
}

export async function BiliGet<T = any>(baseUrl: string, params: any) {
    const query = await calculateSignQuery(params)
    // console.log(query)
    const url = baseUrl + "?" + query
    return axios.get<T>(url, { headers })
}

