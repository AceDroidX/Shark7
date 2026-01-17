import axios from "axios";
import { logErrorDetail, logger, type NeteaseMusicUser } from "shark7-shared";

const api_url = process.env['api_url']

export async function fetchUser(user_id: number): Promise<NeteaseMusicUser | null> {
    try {
        const resp = await axios.get<NeteaseMusicUser>(`${api_url}/user/detail?uid=${user_id}&timestamp=${Number(new Date())}`)
        if (resp.status != 200) {
            logger.warn('resp.status!=200\n' + JSON.stringify(resp))
            return null
        }
        if (resp.data.code != 200) {
            logger.warn('resp.body.code!=200\n' + JSON.stringify(resp))
            return null
        }
        let data: any = resp.data
        data.shark7_id = String(user_id)
        return data
    } catch (err) {
        logErrorDetail('抓取数据失败', err)
        return null
    }
}
