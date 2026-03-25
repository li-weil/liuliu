# Spring Boot 前后端分离方案

## 目标

把当前这个 `Vite + React` 项目改造成下面这种结构：

- 前端：`React/Vite` 的 H5 页面
- 后端：`Spring Boot REST API`
- AI 调用：只允许后端调用
- 数据存储：由后端统一管理数据库和对象存储

改造后，前端不再直接调用 `Gemini`、`Firebase Auth`、`Firestore`、`Firebase Storage`。

## 当前前端承担了什么

你现在这个项目里，前端除了做界面，还做了很多本该后端做的事情：

- 在 `src/services/themeService.ts` 里直接调用 Gemini
- 在 `src/firebase.ts` 里直接调用 Firebase 登录、数据库、存储
- 在 `src/App.tsx` 里直接写社区主题和漫步记录
- 在 `src/App.tsx` 里直接把图片、音频、视频上传到云存储

这些都建议迁移到 `Spring Boot`。

## 推荐的新架构

### 前端保留的职责

- 页面渲染
- 用户交互
- 获取定位
- 拍照、录音、录像
- 地图展示
- 调用你自己的后端接口

### 前端需要移除的职责

- `Gemini API Key`
- 直接使用 Gemini SDK
- Firebase 登录
- Firestore 读写
- 直接上传到 Firebase Storage

### 后端负责的职责

- 登录、会话、Token 校验
- AI Prompt 组织和模型调用
- 数据库增删改查
- 文件上传
- 社区内容审核
- 限流、日志、审计

## 前端需要怎么改

### 1. 去掉前端直连 Gemini

当前文件：

- `src/services/themeService.ts`

改法：

- 把里面直接调用 Gemini 的逻辑，改成通过 `fetch` 或 `axios` 请求你的后端接口。

建议新增这些前端服务文件：

- `src/services/apiClient.ts`
- `src/services/themeApi.ts`
- `src/services/walkApi.ts`
- `src/services/authApi.ts`
- `src/services/uploadApi.ts`

### 2. 去掉 Firebase 在业务中的核心地位

当前文件：

- `src/firebase.ts`
- `src/App.tsx`

改法：

- 前端运行流程里逐步移除 Firebase
- 登录状态改成以后端返回的 Token 为准
- 把 `Firestore` 的 `addDoc`、`onSnapshot`、`query` 改成 REST API 调用

### 3. 文件上传改成走后端

当前方式：

- 前端把拍到的图片、音频、视频保存成 base64
- 前端直接上传到 Firebase Storage

建议方式：

- 前端拿到 `File` 或 `Blob`
- 通过 `multipart/form-data` 上传给 Spring Boot
- Spring Boot 再存到 `OSS / COS / S3 / MinIO`
- 后端返回可访问的文件地址

### 4. 增加统一的接口地址配置

前端 `.env` 建议新增：

- `VITE_API_BASE_URL=https://api.yourdomain.com`

注意：

- 不要再把任何私钥、模型 Key 注入到前端构建里

## 接口设计约定

统一前缀：

- `/api/v1`

统一返回格式：

成功：

```json
{
  "code": 0,
  "message": "成功",
  "data": {}
}
```

失败：

```json
{
  "code": 4001,
  "message": "参数错误",
  "data": null
}
```

## 1. 登录相关接口

### 1.1 登录

`POST /api/v1/auth/login`

作用：

- 用登录凭证换取你系统自己的 Token 或会话信息

请求示例：

```json
{
  "loginType": "wechat_web",
  "code": "temporary-auth-code"
}
```

返回示例：

```json
{
  "code": 0,
  "message": "成功",
  "data": {
    "token": "jwt-token",
    "refreshToken": "refresh-token",
    "expiresIn": 7200,
    "user": {
      "id": 1001,
      "nickname": "liuliu",
      "avatar": "https://cdn.example.com/a.jpg"
    }
  }
}
```

### 1.2 获取当前用户

`GET /api/v1/auth/me`

请求头：

- `Authorization: Bearer <token>`

返回示例：

```json
{
  "code": 0,
  "message": "成功",
  "data": {
    "id": 1001,
    "nickname": "liuliu",
    "avatar": "https://cdn.example.com/a.jpg"
  }
}
```

### 1.3 退出登录

`POST /api/v1/auth/logout`

## 2. AI 主题生成接口

这些接口用来替代你当前前端里的：

- `generateAITheme`
- `generateDynamicPreset`
- `generateCombinedTheme`
- `getLocationContext`
- `searchLocationContext`
- `fetchNearbyPOIs`

### 2.1 按心情生成主题

`POST /api/v1/ai/themes/generate`

请求示例：

```json
{
  "mood": "好奇",
  "weather": "晴朗",
  "season": "春季",
  "preference": "城市生活",
  "locationName": "上海武康路",
  "locationContext": "梧桐街区与历史建筑",
  "walkMode": "pure"
}
```

返回示例：

```json
{
  "code": 0,
  "message": "成功",
  "data": {
    "title": "梧桐影子漫步",
    "description": "在街道的细节中寻找温柔的城市切片",
    "category": "城市",
    "missions": ["寻找一处有时间痕迹的窗台"],
    "vibeColor": "#6b8f71",
    "provider": "gemini"
  }
}
```

### 2.2 生成预设主题

`POST /api/v1/ai/themes/preset`

请求示例：

```json
{
  "category": "颜色漫步",
  "locationName": "上海武康路",
  "locationContext": "梧桐街区与历史建筑",
  "walkMode": "advanced"
}
```

### 2.3 生成组合主题

`POST /api/v1/ai/themes/combine`

请求示例：

```json
{
  "categories": ["形状漫步", "声音漫步"],
  "locationName": "上海武康路",
  "locationContext": "梧桐街区与历史建筑",
  "walkMode": "advanced"
}
```

### 2.4 按经纬度获取地点环境描述

`GET /api/v1/ai/location/context?lat=31.2031&lng=121.4450`

返回示例：

```json
{
  "code": 0,
  "message": "成功",
  "data": {
    "locationContext": "历史街区与低密度商业混合环境"
  }
}
```

### 2.5 按关键词获取地点环境描述

`GET /api/v1/ai/location/search-context?query=上海武康路`

### 2.6 获取附近兴趣点

`GET /api/v1/map/pois/nearby?lat=31.2031&lng=121.4450`

返回示例：

```json
{
  "code": 0,
  "message": "成功",
  "data": [
    {
      "title": "武康大楼",
      "uri": "https://maps.example.com/poi/1",
      "lat": 31.203,
      "lng": 121.445
    }
  ]
}
```

## 3. 社区主题接口

### 3.1 提交自定义主题

`POST /api/v1/themes`

请求头：

- `Authorization: Bearer <token>`

请求示例：

```json
{
  "title": "夜色霓虹",
  "description": "观察城市灯光如何改变街道气质",
  "category": "视觉",
  "missions": ["寻找反射在玻璃上的灯牌", "记录一处安静的暗角", "找一条最适合慢走的街"]
}
```

### 3.2 获取已审核通过的主题列表

`GET /api/v1/themes?page=1&pageSize=20&status=approved`

### 3.3 获取主题详情

`GET /api/v1/themes/{themeId}`

## 4. 漫步记录接口

### 4.1 新建漫步记录

`POST /api/v1/walks`

请求头：

- `Authorization: Bearer <token>`

请求示例：

```json
{
  "themeTitle": "梧桐影子漫步",
  "themeCategory": "城市",
  "locationName": "上海武康路",
  "recordUnit": "image",
  "isPublic": true,
  "noteText": "今天的光线很好",
  "path": [
    {
      "lat": 31.2031,
      "lng": 121.4450,
      "timestamp": 1742770000000
    }
  ],
  "completedMissions": [
    {
      "mission": "寻找一处有时间痕迹的窗台",
      "mediaUrl": "https://cdn.example.com/missions/1.jpg",
      "mediaType": "photo"
    }
  ],
  "photoUrl": "https://cdn.example.com/walks/cover.jpg",
  "videoUrl": null,
  "audioUrl": null
}
```

### 4.2 获取我的漫步记录

`GET /api/v1/walks/me?page=1&pageSize=20`

### 4.3 获取公开漫步记录

`GET /api/v1/walks/public?page=1&pageSize=20`

### 4.4 获取漫步记录详情

`GET /api/v1/walks/{walkId}`

## 5. 文件上传接口

### 5.1 上传媒体文件

`POST /api/v1/files/upload`

请求头：

- `Authorization: Bearer <token>`
- `Content-Type: multipart/form-data`

表单字段：

- `file`
- `bizType`，例如：`walk_cover`、`mission_media`、`audio`、`video`

返回示例：

```json
{
  "code": 0,
  "message": "成功",
  "data": {
    "fileId": "f_123456",
    "url": "https://cdn.example.com/uploads/a.jpg",
    "contentType": "image/jpeg",
    "size": 345678
  }
}
```

可选优化：

- `POST /api/v1/files/presign`

如果你以后想让前端直传对象存储，可以让后端先返回预签名地址。

## 数据库表建议

### user 表

- `id`
- `openid` 或外部账号 ID
- `nickname`
- `avatar`
- `status`
- `created_at`
- `updated_at`

### theme 表

- `id`
- `title`
- `description`
- `category`
- `missions_json`
- `author_user_id`
- `status`
- `created_at`
- `updated_at`

### walk 表

- `id`
- `user_id`
- `theme_title`
- `theme_category`
- `location_name`
- `record_unit`
- `is_public`
- `note_text`
- `photo_url`
- `video_url`
- `audio_url`
- `path_json`
- `completed_missions_json`
- `created_at`
- `updated_at`

### file_asset 表

- `id`
- `user_id`
- `biz_type`
- `file_name`
- `content_type`
- `file_size`
- `storage_key`
- `public_url`
- `created_at`

### ai_generation_log 表

- `id`
- `user_id`
- `scene`
- `provider`
- `request_json`
- `response_json`
- `status`
- `created_at`

## Spring Boot 模块建议

建议包结构：

```text
com.liuliu.citywalk
  |- controller
  |- service
  |- service.ai
  |- service.map
  |- service.storage
  |- repository
  |- model.entity
  |- model.dto.request
  |- model.dto.response
  |- common
  |- config
```

建议的 Controller 划分：

- `AuthController`
- `AiThemeController`
- `ThemeController`
- `WalkController`
- `FileController`
- `MapController`

## 前端旧逻辑和新接口的对应关系

- `generateAITheme(...)`
  对应 `POST /api/v1/ai/themes/generate`
- `generateDynamicPreset(...)`
  对应 `POST /api/v1/ai/themes/preset`
- `generateCombinedTheme(...)`
  对应 `POST /api/v1/ai/themes/combine`
- `getLocationContext(...)`
  对应 `GET /api/v1/ai/location/context`
- `searchLocationContext(...)`
  对应 `GET /api/v1/ai/location/search-context`
- Firestore 的 `walks` 列表查询
  对应 `GET /api/v1/walks/public`
- Firestore 的 `themes` 新增
  对应 `POST /api/v1/themes`
- Firebase Storage 上传
  对应 `POST /api/v1/files/upload`
- Firestore 的 `walks` 新增
  对应 `POST /api/v1/walks`

## 前端请求示例

```ts
const res = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/v1/ai/themes/generate`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
  },
  body: JSON.stringify({
    mood,
    weather,
    season,
    preference,
    locationName,
    locationContext,
    walkMode,
  }),
});

const json = await res.json();
return json.data;
```

## 推荐迁移顺序

### 第一阶段

- 先写 Spring Boot 的 AI 生成接口
- 前端去掉 Gemini SDK

### 第二阶段

- 再写文件上传接口
- 前端去掉 Firebase Storage

### 第三阶段

- 再写 walk 和 theme 的 CRUD 接口
- 前端去掉 Firestore

### 第四阶段

- 最后把 Google 登录换成你自己的登录，或者换成微信登录
- 前端彻底移除 Firebase Auth

## 重要说明

- 如果改成后端调用 Gemini，前端用户就不需要直接连接 Gemini 接口
- 但最终能不能稳定使用，仍然取决于你的后端服务器是否能访问 Gemini，以及你的业务场景是否符合 Gemini 的地区可用性和相关条款
- 为了后续降低风险，建议你在 Spring Boot 里把 AI 能力抽象成接口，不要把业务逻辑和 Gemini 强绑定
