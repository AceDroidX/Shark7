import fs from 'fs';
import path from 'path';
import logger from './logger';

const configpath = path.resolve(__dirname, '..') + '/config/config.json'
const weibocookiepath = path.resolve(__dirname, '..') + '/config/weibo_cookie.json'

// export const config = getConfig()

// export default ConfigManager;

export class ConfigManager {
    json: any;
    constructor() {
        logger.info(configpath)
        if (fs.existsSync(configpath)) {
            this.json = JSON.parse(fs.readFileSync(configpath, "utf8"));
        }
        else {
            logger.info("没有找到设置文件，将采用环境变量获取设置")
        }
    }

    get(key: string): string | undefined | number {
        this.json = JSON.parse(fs.readFileSync(configpath, "utf8"));
        if (!fs.existsSync(configpath) || this.json == undefined) {
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
        } else {
            if (isValidKey(key, this.json)) {
                return this.json[key];
            } else {
                logger.warn('设置中没有这个key:' + key)
                return undefined
            }
        }
    }

    set(key: string, value: string) {
        this.json = JSON.parse(fs.readFileSync(configpath, "utf8"));
        if (this.json == undefined) {
            return false
        }
        this.json[key] = value
        fs.writeFileSync(configpath, JSON.stringify(this.json), "utf8")
        return true
    }

    getWeiboCookie(): any {
        if (fs.existsSync(weibocookiepath)) {
            return JSON.parse(fs.readFileSync(weibocookiepath, "utf8"))
        } else {
            return false
        }
    }
    setWeiboCookie(cookie: any) {
        fs.writeFileSync(weibocookiepath, JSON.stringify(cookie), "utf8")
    }
}
const config = new ConfigManager()
export default config

function isValidKey(key: string | number | symbol, object: object): key is keyof typeof object {
    return key in object;
}