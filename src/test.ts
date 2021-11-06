import { KeepLiveTCP } from "bilibili-live-ws";
import { getAllMsg } from "./index";
import { User } from "./model/User";

// getAllMsg(4351529)

test()

async function test() {
    console.log((await new User().initByUID(39373763)).toString());
    console.log((await new User().initByRoomid(21452505)).toString());
}