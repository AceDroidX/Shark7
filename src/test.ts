import { KeepLiveTCP } from "bilibili-live-ws";
import { User } from "./model/User";
import fs from 'fs';
import path from 'path';
import { WeiboMsg } from "./model/model";
import { WeiboUser } from "./model/WeiboUser";
import { WeiboController } from "./weibo/weibo";
import logger from './logger'
import url from 'url'

// getAllMsg(4351529)

function getAllMsg(id: number) {
    const live = new KeepLiveTCP(id)
    live.on('open', () => console.log(`<${id}>WebSocket连接上了`))
    live.on('live', () => console.log(`<${id}>成功登入房间`))
    live.on('heartbeat', (online) => console.log(`<${id}>当前人气值${online}`))
    live.on('msg', (data) => console.log(`<${id}>收到消息\n${JSON.stringify(data)}`))
    live.on('close', () => console.log(`<${id}>连接关闭`))
    live.on('error', (e) => console.log(`<${id}>连接错误`))
}

test()

async function test() {
    getAllMsg(4351529)
}

async function test1() {
    logger.info((await new User().initByUID(39373763)).toString());
    logger.info((await new User().initByRoomid(21452505)).toString());
}

function test2() {
    const jsonpath = path.resolve(__dirname, '..') + '/doc/微博时间线.json'
    const json = JSON.parse(fs.readFileSync(jsonpath, "utf8"))
    json.data.list.forEach((item: any) => {
        const msg = new WeiboMsg(item)
        logger.info(msg)
    })
}

async function test3() {
    const user = await WeiboUser.getFromID(7198559139)
    logger.info(await user.getMblogs())
    logger.info(user)
    // await new Promise(resolve => setTimeout(resolve, 5000))
}

async function test4() {
    const user = await WeiboUser.getFromID(123456789)
    await user.checkAndGetNewMblogs()
    logger.info(user)
    logger.info('已获取，等待10秒')
    await new Promise(resolve => setTimeout(resolve, 10000))
    await user.checkAndGetNewMblogs()
    // await new Promise(resolve => setTimeout(resolve, 5000))
}

async function test5() {
    var weibo_Controller = await WeiboController.init(7198559139)
    weibo_Controller.run()
}

async function test6() {
    const live = new KeepLiveTCP(4351529)
    live.on('msg', (data) => {
        console.log(data)
    })
}

function test7() {
    const u = new url.URL('https://tvax4.sinaimg.cn/crop.0.0.1080.1080.1024/007Raq4zly8gw94itqv5zj30u00u0780.jpg?KID=imgbed,tva&Expires=1636888358&ssig=3IWcea2zRE')
    url.format(u, { search: false })
}
