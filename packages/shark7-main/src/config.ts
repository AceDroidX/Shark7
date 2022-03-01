import fs from 'fs';
import logger from './logger';

// export const config = getConfig()

// export default ConfigManager;

export class ConfigManager {
    json: any;

    get(key: string): string | undefined | number {
        var env = process.env[key]
        if (env == undefined) {
            logger.warn('设置中没有这个key:' + key)
            return undefined
        } else {
            var n = Number(env)
            if (isNaN(n)) {
                return env
            } else {
                return n
            }
        }
    }
    getStr(key: string): string {
        let data = this.get(key)
        if (typeof data == 'number') {
            data = data.toString()
        } else if (typeof data != 'string') {
            throw new Error('配置文件中的key:' + key + '不是字符串')
        }
        return data
    }
}
const config = new ConfigManager()
export default config

function isValidKey(key: string | number | symbol, object: object): key is keyof typeof object {
    return key in object;
}