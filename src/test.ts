import { KeepLiveTCP } from "bilibili-live-ws";
import { getAllMsg } from "./index";
import { User } from "./model/User";
import fs from 'fs';
import path from 'path';
import { WeiboHeader, WeiboMsg } from "./model/model";
import { WeiboUser } from "./model/WeiboUser";
import axios from "axios";
import { WeiboController } from "./weibo";

// getAllMsg(4351529)

test5()

async function test1() {
    console.log((await new User().initByUID(39373763)).toString());
    console.log((await new User().initByRoomid(21452505)).toString());
}

function test2() {
    const jsonpath = path.resolve(__dirname, '..') + '/doc/微博时间线.json'
    const json = JSON.parse(fs.readFileSync(jsonpath, "utf8"))
    json.data.list.forEach((item: any) => {
        const msg = new WeiboMsg(item)
        console.log(msg)
    })
}

async function test3() {
    const user = await WeiboUser.getFromID(7198559139)
    console.log(await user.getMblogs())
    console.log(user)
    // await new Promise(resolve => setTimeout(resolve, 5000))
}

async function test4() {
    const user = await WeiboUser.getFromID(123456789)
    await user.checkAndGetNewMblogs()
    console.log(user)
    console.log('已获取，等待10秒')
    await new Promise(resolve => setTimeout(resolve, 10000))
    await user.checkAndGetNewMblogs()
    // await new Promise(resolve => setTimeout(resolve, 5000))
}

async function test5() {
    var weibo_Controller = await WeiboController.getFromID(7198559139)
    weibo_Controller.run()
}