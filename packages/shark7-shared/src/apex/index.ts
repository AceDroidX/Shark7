import { UpdateTypeDoc } from ".."

export type ApexUserInfo = UpdateTypeDoc & typeof UserInfoDemo

//curl.exe -A "Respawn HTTPS/1.0" "https://r5-crossplay.r5prod.stryder.respawn.com/user.php?qt=user-getinfo&getinfo=1&hardware=PC&uid=1111111111111&language=english&timezoneOffset=8&ugc=1&rep=1&searching=0&change=7&loadidx=1"
//"userInfo":
const UserInfoDemo = {
    "uid": 1111111111111,
    "hardware": "PC",
    "name": "aaaaaaaaaa",    //用户名
    "kills": 0,
    "wins": 0,
    "matches": 0,
    "banReason": 2,
    "banSeconds": 0,
    "eliteStreak": 1,
    "rankScore": 5834,    //排位分数
    "arenaScore": 2745,   //竞技场分数
    "charVer": 15219,     //用户数据版本(每次改动加一)
    "charIdx": 0,
    "privacy": "invite",  //群隐私
    "cdata0": 0,          //Version
    "cdata1": 2147483648,
    "cdata2": 898565421,  //LegendType
    "cdata3": 200518223,  //皮肤
    "cdata4": 2059064253, //边框
    "cdata5": 1649961270, //姿势
    "cdata6": 1488777442, //第一个徽章类型
    "cdata7": 2,          //第一个徽章数据
    "cdata8": 716028665,  //第二个徽章类型
    "cdata9": 3,          //第二个徽章数据
    "cdata10": 1488777442,//第三个徽章类型
    "cdata11": 2,         //第三个徽章数据
    "cdata12": 1905735931,//第一个追踪器类型
    "cdata13": 102,       //第一个追踪器数据
    "cdata14": 1905735931,//第二个追踪器类型
    "cdata15": 2,         //第二个追踪器数据
    "cdata16": 1905735931,//第三个追踪器类型
    "cdata17": 702,       //第三个追踪器数据
    "cdata18": 1920175737,//开场台词
    "cdata19": 2147483648,
    "cdata20": 2147483648,
    "cdata21": 2147483648,
    "cdata22": 2147483648,
    "cdata23": 599,       //玩家等级
    "cdata24": 92,        //AccountProgress
    "cdata25": 2147483648,
    "cdata26": 2147483648,
    "cdata27": 2147483648,
    "cdata28": 2147483648,
    "cdata29": 2147483648,
    "cdata30": 2147483648,
    "cdata31": 0,         //游戏状态
    "online": 0,          //在线状态
    "joinable": 0,        //可加入状态
    "partyFull": 0,       //群满员状态
    "partyInMatch": 0,    //比赛状态
    "timeSinceServerChange": -1,
    "userInfo": 1
}
