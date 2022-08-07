import { WeiboUser } from ".";
import { InsertTypeDoc } from "..";

const WeiboCommentDemo = {
    "created_at": "Sun Aug 07 09:32:04 +0800 2022",
    "id": 4799762106156993,
    "rootid": 4799762106156993,
    "rootidstr": "4799762106156993",
    "floor_number": 10,
    "text": "早上好",
    "disable_reply": 0,
    "restrictOperate": 0,
    "source_allowclick": 0,
    "source_type": 4,
    "source": "来自美国",
    "user": WeiboUser,
    "mid": "4799762106156993",
    "idstr": "4799762106156993",
    "url_objects": [],
    "liked": false,
    "readtimetype": "comment",
    "comments": [],
    "max_id": 0,
    "total_number": 0,
    "isLikedByMblogAuthor": false,
    "like_counts": 0,
    "text_raw": "早上好"
}

export type WeiboComment = typeof WeiboCommentDemo & InsertTypeDoc & {
    "comments": WeiboComment[]
}

const WeiboCommentApiDemo = {
    "ok": 1,
    "total_number": 135,
    "max_id": 82511576961854,
    "trendsText": "已加载全部评论"
}

export type WeiboCommentApi = typeof WeiboCommentApiDemo & {
    data: WeiboComment[]
}
