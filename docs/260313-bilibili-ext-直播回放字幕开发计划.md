# shark7-bilibili-ext 直播回放字幕开发计划

## 当前目标

当前阶段只完成 `shark7-bilibili-ext` 的最基础能力：

- 输入一个 `BV` 号
- 获取该视频全部分 P 的字幕轨道信息
- 下载可用的 AI 字幕 JSON
- 解析出结构化字幕片段

暂不包含以下内容：

- 每 1 分钟轮询直播回放列表
- PostgreSQL + Drizzle 入库
- NATS 消息收发
- AI 总结
- QQ 机器人指令

## 参考资料

- 需求背景：`docs/260310-AI功能计划.md`
- 抓包：`backup/bilibili-ext/space.bilibili.com_x_series_archives_Archive [26-03-10 23-47-22].har`
- 抓包：`backup/bilibili-ext/www.bilibili.com_x_web-interface_wbi_view_detail_Archive [26-03-10 23-55-23].har`
- 抓包：`backup/bilibili-ext/www.bilibili.com_x_player_wbi_v2_Archive [26-03-10 23-56-14].har`
- 抓包：`backup/bilibili-ext/www.bilibili.com_bfs_ai_subtitle_prod_11620164895027936586785381a17f550d8a0f825fdb078431f7f250d7_Archive [26-03-10 23-58-21].har`
- 现有 WBI 工具：`packages/shark7-shared/src/bilibili/BiliWbi.ts`

## 最小可行调用链路

当前输入已经是 `BV` 号，因此最小链路可以压缩为 3 步：

1. 调视频详情接口，拿到 `aid`、`cid`、`pages`
2. 对每个 `cid` 调播放器接口，拿到 `subtitle.subtitles[].subtitle_url`
3. 下载字幕 JSON，解析 `body[]`

即：

```text
bvid
  -> /x/web-interface/wbi/view/detail
  -> aid + pages[].cid
  -> /x/player/wbi/v2
  -> subtitle_url
  -> aisubtitle json
  -> body[].from/to/content
```

`/x/series/archives` 只在后续“定时扫描某个 UP 的直播回放列表”时需要，当前阶段不是必需接口。

## API 提炼

### 1. 获取视频详情

推荐接口：

- `GET https://api.bilibili.com/x/web-interface/wbi/view/detail`

用途：

- 根据 `bvid` 获取视频基础信息
- 获取 `aid`
- 获取全部分 P 的 `pages[]`

最小必要参数：

- `bvid`

推荐参数：

- `platform=web`
- `bvid`

抓包里还有很多页面级参数，例如：

- `aid`
- `page_no`
- `p`
- `need_elec`
- `need_operation_card`
- `web_location`
- `dm_img_list`

这些参数对“获取字幕所需元数据”不是必需，第一版实现不建议照单全收。

关键请求头：

- `User-Agent`
- `Referer: https://www.bilibili.com/video/{bvid}`
- `Origin: https://www.bilibili.com`
- `Cookie`

Cookie 建议：

- 最低要求：`SESSDATA`
- 建议保留：`buvid3`

关键响应字段：

- `data.View.bvid`
- `data.View.aid`
- `data.View.title`
- `data.View.owner.mid`
- `data.View.owner.name`
- `data.View.cid`
- `data.View.pages[]`

`pages[]` 中当前阶段需要的字段：

- `cid`
- `page`
- `part`
- `duration`

抓包样本结论：

- `BV1SPPZz6EHw`
- `aid = 116201648950279`
- `videos = 5`
- 第 1P `cid = 36586785381`

备注：

- 这个接口是 WBI 接口，需带 `w_rid` 和 `wts`
- 项目里已经有 `packages/shark7-shared/src/bilibili/BiliWbi.ts`，第一版应直接复用，不要重复实现签名逻辑

### 2. 获取播放器字幕信息

推荐接口：

- `GET https://api.bilibili.com/x/player/wbi/v2`

用途：

- 根据 `aid + cid` 获取当前分 P 的播放器元数据
- 从响应里提取字幕轨道信息

最小必要参数：

- `aid`
- `cid`

抓包中的额外参数：

- `isGaiaAvoided=false`
- `web_location=1315873`
- `dm_img_list=[]`
- `dm_img_str`
- `dm_cover_img_str`
- `dm_img_inter`

这些参数更像页面播放态参数，第一版实现可以先不保留，优先验证最小参数是否可用；若后续触发风控，再逐步补齐。

关键请求头：

- `User-Agent`
- `Referer: https://www.bilibili.com/video/{bvid}`
- `Origin: https://www.bilibili.com`
- `Cookie`

Cookie 建议：

- 最低要求：`SESSDATA`
- 建议保留：`buvid3`

关键响应字段：

- `data.aid`
- `data.bvid`
- `data.cid`
- `data.need_login_subtitle`
- `data.subtitle.subtitles[]`

`subtitles[]` 中当前阶段需要的字段：

- `id`
- `id_str`
- `lan`
- `lan_doc`
- `subtitle_url`
- `type`
- `ai_type`
- `ai_status`

字幕轨道选择规则建议：

1. 优先 `lan` 为 `ai-zh` 或类似中文 AI 标记
2. 其次 `lan_doc` 包含 `中文`
3. 再次退化为第一个可用轨道

抓包与文档可确认的事实：

- 未登录时，字幕数组可能为空
- `need_login_subtitle` 可用于辅助判断是否需要登录
- `subtitle_url` 一般是协议相对地址，例如 `//aisubtitle.hdslb.com/...`

### 3. 下载 AI 字幕 JSON

请求地址来源：

- `x/player/wbi/v2` 返回的 `subtitle.subtitles[].subtitle_url`

请求方式：

- `GET https:{subtitle_url}`

关键请求头：

- `User-Agent`
- `Origin: https://www.bilibili.com`
- `Referer: https://www.bilibili.com/`

Cookie：

- 不需要

注意事项：

- `subtitle_url` 自带 `auth_key`
- 该 URL 可能会过期，不能长期缓存
- 应缓存解析后的字幕内容，而不是缓存 URL 本身

字幕 JSON 顶层结构：

```ts
type BilibiliAiSubtitleJson = {
    font_size: number
    font_color: string
    background_alpha: number
    background_color: string
    Stroke: string
    type: 'AIsubtitle'
    lang: string
    version: string
    body: Array<{
        from: number
        to: number
        sid: number
        location: number
        content: string
        music?: number
    }>
}
```

当前阶段真正需要的字段：

- 顶层：`type`、`lang`、`version`、`body`
- 明细：`from`、`to`、`sid`、`content`

抓包样本特征：

- `type = AIsubtitle`
- `lang = zh`
- `body` 为字幕片段数组

### 4. 后续轮询阶段会用到但本阶段可暂缓的接口

接口：

- `GET https://api.bilibili.com/x/series/archives`

用途：

- 根据 `mid + series_id` 拉取直播回放列表
- 获取最新回放的 `bvid`

当前阶段为什么先不做：

- 当前输入已经是 `BV` 号
- 先打通“按 BV 获取字幕”的基础链路更重要

## 失败场景与降级策略

### 失败场景

- `bvid` 无效或视频不存在
- 视频存在，但某个 `cid` 没有字幕
- 未登录导致 `subtitle.subtitles` 为空
- `SESSDATA` 失效
- `subtitle_url` 过期
- B 站接口偶发风控或限流

### 降级策略

- 对每个 `cid` 分开抓取，不因某一 P 失败而中断整条任务
- 下载字幕失败时，先重新请求 player 接口刷新 `subtitle_url` 后再重试一次
- 若某一 P 没有字幕，记录为空结果，不直接抛致命错误
- 若所有 P 都没有字幕，再返回“该视频暂无可用字幕”
- 明确区分以下错误：
  - 视频不存在
  - 登录态失效
  - 字幕不存在
  - 字幕下载失败

## shark7-bilibili-ext 任务拆分清单

### 第 1 阶段：最小可运行链路

- 建立 `src/types.ts`，先定义接口响应和领域模型类型
- 建立 `src/client.ts`，统一封装 B 站请求逻辑
- 建立 `src/video.ts`，实现按 `bvid` 获取视频元数据
- 建立 `src/subtitle.ts`，实现按 `aid + cid` 获取字幕轨道和字幕正文
- 建立 `src/service.ts`，聚合“按 BV 抓全量字幕”的流程
- 建立 `src/index.ts`，提供最小运行入口

### 第 2 阶段：错误处理与可观测性

- 统一封装 API 错误对象
- 为每一步补充日志
- 区分“接口失败”和“无字幕”
- 对字幕 URL 过期增加一次刷新重试

### 第 3 阶段：输出结构稳定化

- 固定对外返回结构
- 为多 P 视频返回数组结果
- 增加字幕文本聚合方法，方便后续 AI 总结直接使用

### 第 4 阶段：为后续接库预留

- 输出中带上 `bvid`、`aid`、`cid`、`page`
- 输出中保留原始字幕轨道元信息
- 保证每个字幕片段都有稳定主键候选字段，例如 `cid + sid`

## 字幕相关 TypeScript 类型设计

建议分两层：

- B 站原始响应类型
- 微服务内部归一化类型

### 1. B 站原始响应类型

```ts
export type BilibiliApiResponse<T> = {
    code: number
    message: string
    ttl: number
    data: T
}

export type BilibiliVideoPage = {
    cid: number
    page: number
    from: string
    part: string
    duration: number
}

export type BilibiliViewDetailData = {
    View: {
        bvid: string
        aid: number
        title: string
        cid: number
        videos: number
        owner: {
            mid: number
            name: string
        }
        pages: BilibiliVideoPage[]
    }
}

export type BilibiliSubtitleTrack = {
    id: number
    id_str: string
    lan: string
    lan_doc: string
    is_lock: boolean
    subtitle_url: string
    type: number
    ai_type?: number
    ai_status?: number
}

export type BilibiliPlayerSubtitle = {
    allow_submit: boolean
    lan: string
    lan_doc: string
    subtitles: BilibiliSubtitleTrack[]
}

export type BilibiliPlayerData = {
    aid: number
    bvid: string
    cid: number
    need_login_subtitle: boolean
    subtitle?: BilibiliPlayerSubtitle
}

export type BilibiliAiSubtitleItem = {
    from: number
    to: number
    sid: number
    location: number
    content: string
    music?: number
}

export type BilibiliAiSubtitleDocument = {
    font_size: number
    font_color: string
    background_alpha: number
    background_color: string
    Stroke: string
    type: 'AIsubtitle'
    lang: string
    version: string
    body: BilibiliAiSubtitleItem[]
}
```

### 2. 微服务内部归一化类型

```ts
export type SubtitleSegment = {
    cid: number
    sid: number
    from: number
    to: number
    content: string
}

export type VideoPageMeta = {
    cid: number
    page: number
    part: string
    duration: number
}

export type VideoMeta = {
    bvid: string
    aid: number
    title: string
    ownerMid: number
    ownerName: string
    pages: VideoPageMeta[]
}

export type PageSubtitleResult = {
    cid: number
    page: number
    part: string
    duration: number
    track: BilibiliSubtitleTrack | null
    subtitle: BilibiliAiSubtitleDocument | null
    segments: SubtitleSegment[]
}

export type FetchVideoSubtitlesResult = {
    video: VideoMeta
    pages: PageSubtitleResult[]
}
```

### 3. 错误类型建议

```ts
export type BilibiliExtErrorCode =
    | 'INVALID_BVID'
    | 'VIDEO_NOT_FOUND'
    | 'PLAYER_API_FAILED'
    | 'SUBTITLE_NOT_FOUND'
    | 'SUBTITLE_URL_EXPIRED'
    | 'AUTH_REQUIRED'
    | 'AUTH_EXPIRED'

export class BilibiliExtError extends Error {
    code: BilibiliExtErrorCode
    cause?: unknown

    constructor(code: BilibiliExtErrorCode, message: string, cause?: unknown) {
        super(message)
        this.code = code
        this.cause = cause
    }
}
```

## 第一版代码实现顺序

### 1. 先定义类型

- 文件：`packages/shark7-bilibili-ext/src/types.ts`
- 先把输入、输出、接口响应、错误类型固定下来
- 这样后面每个模块都能直接按类型补实现

### 2. 封装请求客户端

- 文件：`packages/shark7-bilibili-ext/src/client.ts`
- 复用 `shark7-shared` 里的 `BiliGet` 和 `headers`
- 统一处理：请求头、Cookie、超时、日志、B 站响应码检查

### 3. 实现视频详情查询

- 文件：`packages/shark7-bilibili-ext/src/video.ts`
- 输入 `bvid`
- 输出 `VideoMeta`
- 只保留字幕抓取真正需要的字段

### 4. 实现字幕轨道查询与字幕下载

- 文件：`packages/shark7-bilibili-ext/src/subtitle.ts`
- 能力拆成 3 个函数：
  - `getSubtitleTracks(aid, cid)`
  - `pickBestSubtitleTrack(tracks)`
  - `downloadSubtitleDocument(subtitleUrl)`

### 5. 实现聚合服务

- 文件：`packages/shark7-bilibili-ext/src/service.ts`
- 实现 `getVideoSubtitlesByBvid(bvid)`
- 流程：
  - 查视频元数据
  - 遍历所有 `pages`
  - 对每个 `cid` 拉字幕
  - 归一化输出结果

### 6. 实现最小入口

- 文件：`packages/shark7-bilibili-ext/src/index.ts`
- 从环境变量或命令行读取 `bvid`
- 调用聚合服务
- 输出抓取结果摘要

### 7. 最后再补验证

- 使用抓包样本 `BV1SPPZz6EHw` 做联调
- 跑 `pnpm run check`
- 手动验证多 P、无字幕、失效 Cookie 等场景

## 第一版验收标准

- 输入一个有效 `BV` 号后，能返回结构化字幕数据
- 支持多 P 视频
- 任意单个 `cid` 失败不会中断全部任务
- 无字幕、无效 BV、登录态失效时有明确报错
- `pnpm run check` 通过
