# 小程序后端接口文档

本文档仅描述微信小程序当前使用的后端接口，不包含 Web 端接口。

## 1. 基本说明

- 后端项目：`LiuLiu/backend`
- 默认本地地址：`http://127.0.0.1:8080`
- 小程序当前基础配置：`miniprogram/utils/config.js`
- 接口统一返回结构：

```json
{
  "code": 0,
  "message": "成功",
  "data": {}
}
```

- `code = 0` 表示成功
- 非 `0` 表示失败
- 需要登录的接口通过请求头传：

```http
Authorization: Bearer <token>
```

## 2. 鉴权接口

### 2.1 同步用户并换取登录态

- 方法：`POST`
- 路径：`/api/v1/miniapp/auth/sync-user`
- 是否鉴权：否

请求体：

```json
{
  "code": "wx-login-code",
  "nickName": "六六",
  "avatarUrl": "https://xxx/avatar.jpg"
}
```

返回示例：

```json
{
  "code": 0,
  "message": "成功",
  "data": {
    "token": "access-token",
    "refreshToken": "refresh-token",
    "expiresIn": 7200,
    "openid": "wx_xxxxx",
    "user": {
      "id": 12,
      "openid": "wx_xxxxx",
      "nickName": "六六",
      "avatarUrl": "https://xxx/avatar.jpg",
      "role": "user",
      "createdAt": 1743220000000,
      "lastLoginAt": 1743221111111
    }
  }
}
```

说明：

- 小程序登录后先调这个接口
- 返回的 `token` 需要本地保存，后续请求放到 `Authorization` 头里

### 2.2 获取当前登录用户

- 方法：`GET`
- 路径：`/api/v1/miniapp/auth/me`
- 是否鉴权：是

返回示例：

```json
{
  "code": 0,
  "message": "成功",
  "data": {
    "id": 12,
    "openid": "wx_xxxxx",
    "nickName": "六六",
    "avatarUrl": "https://xxx/avatar.jpg",
    "role": "user",
    "createdAt": 1743220000000,
    "lastLoginAt": 1743221111111
  }
}
```

## 3. AI 与地点接口

### 3.1 生成主题

- 方法：`POST`
- 路径：`/api/v1/miniapp/themes/generate`
- 是否鉴权：否

请求体：

```json
{
  "mood": "好奇",
  "weather": "晴朗",
  "season": "春季",
  "preference": "人文历史",
  "locationName": "武康路",
  "locationContext": "梧桐街区",
  "walkMode": "pure"
}
```

返回示例：

```json
{
  "code": 0,
  "message": "成功",
  "data": {
    "source": "rag+ai",
    "theme": {
      "id": 1,
      "title": "城市灵感漫步",
      "description": "围绕街区氛围进行一次轻量观察。",
      "category": "探索",
      "missions": ["找一个让你停下来的细节"],
      "vibeColor": "#f59e0b",
      "provider": "deepseek"
    }
  }
}
```

### 3.2 随机主题

- 方法：`POST`
- 路径：`/api/v1/miniapp/themes/random`
- 是否鉴权：否

请求体：

```json
{
  "category": "色彩漫步",
  "locationName": "安福路",
  "locationContext": "街区步行空间",
  "walkMode": "advanced"
}
```

返回结构与“生成主题”一致。

### 3.3 组合主题

- 方法：`POST`
- 路径：`/api/v1/miniapp/themes/combined`
- 是否鉴权：否

请求体：

```json
{
  "categories": ["颜色", "声音"],
  "locationName": "愚园路",
  "locationContext": "城市街区",
  "walkMode": "advanced"
}
```

返回结构与“生成主题”一致。

### 3.4 获取地点语境

- 方法：`GET`
- 路径：`/api/v1/miniapp/location/context`
- 是否鉴权：否

请求参数：

- `latitude`
- `longitude`
- `placeName`：可选

示例：

```http
GET /api/v1/miniapp/location/context?latitude=31.2243&longitude=121.4457&placeName=武康路
```

返回示例：

```json
{
  "code": 0,
  "message": "成功",
  "data": {
    "context": "梧桐街区与生活化街景混合环境",
    "placeName": "武康路"
  }
}
```

### 3.5 任务校验

- 方法：`POST`
- 路径：`/api/v1/miniapp/missions/verify`
- 是否鉴权：否

请求体：

```json
{
  "mission": "找到一处最有生活感的门面",
  "noteText": "门口有猫和旧招牌",
  "fileUrls": [
    "http://127.0.0.1:8080/uploads/walk/f_xxx.jpg"
  ]
}
```

返回示例：

```json
{
  "code": 0,
  "message": "成功",
  "data": {
    "passed": true,
    "comment": "图文信息已经比较贴近任务意图，先为你记作完成。",
    "confidence": "medium",
    "reviewedAt": 1743222222222,
    "reason": null
  }
}
```

## 4. 文件上传接口

### 4.1 上传图片

- 方法：`POST`
- 路径：`/api/v1/files/upload`
- 是否鉴权：建议带 token
- 请求类型：`multipart/form-data`

表单字段：

- `file`：图片文件
- `bizType`：业务类型，当前小程序使用 `walk`

返回示例：

```json
{
  "code": 0,
  "message": "成功",
  "data": {
    "fileId": "f_1743223333333_xxx",
    "url": "http://127.0.0.1:8080/uploads/walk/f_1743223333333_xxx.jpg",
    "contentType": "image/jpeg",
    "size": 182736
  }
}
```

说明：

- 文件本体保存在后端本机 `uploads/` 目录
- 数据库存的是相对路径，如 `/uploads/walk/xxx.jpg`
- 返回给小程序时会自动补成完整访问 URL

## 5. 漫步记录接口

### 5.1 创建漫步记录

- 方法：`POST`
- 路径：`/api/v1/miniapp/walks`
- 是否鉴权：是

请求体：

```json
{
  "themeSnapshot": {
    "title": "街区漫步",
    "description": "围绕社区边界做观察",
    "category": "城市",
    "missions": ["找一个拐角"],
    "vibeColor": "#5a5a40",
    "provider": "deepseek"
  },
  "locationName": "武康路",
  "locationContext": "梧桐街区",
  "routePoints": [
    {
      "latitude": 31.2243,
      "longitude": 121.4457,
      "timestamp": 1743224444444
    }
  ],
  "missionsCompleted": ["找一个拐角"],
  "missionReviews": {
    "找一个拐角": {
      "passed": true,
      "comment": "已完成",
      "confidence": "medium",
      "reviewedAt": 1743225555555
    }
  },
  "photoList": [
    "http://127.0.0.1:8080/uploads/walk/f_xxx.jpg"
  ],
  "noteText": "今天光线很好",
  "isPublic": true,
  "walkMode": "pure",
  "generationSource": "rag+ai"
}
```

返回示例：

```json
{
  "code": 0,
  "message": "成功",
  "data": {
    "ok": true,
    "id": "123"
  }
}
```

失败示例：

```json
{
  "code": 401,
  "message": "请先登录后再保存漫步记录",
  "data": null
}
```

### 5.2 获取我的足迹

- 方法：`GET`
- 路径：`/api/v1/miniapp/walks/me`
- 是否鉴权：是

请求参数：

- `limit`：默认 `20`，最大 `50`

返回示例：

```json
{
  "code": 0,
  "message": "成功",
  "data": {
    "records": [
      {
        "_id": "123",
        "userId": 12,
        "themeTitle": "街区漫步",
        "themeSnapshot": {
          "title": "街区漫步",
          "description": "围绕社区边界做观察",
          "category": "城市",
          "missions": ["找一个拐角"],
          "vibeColor": "#5a5a40",
          "provider": "deepseek"
        },
        "locationName": "武康路",
        "locationContext": "梧桐街区",
        "routePoints": [],
        "missionsCompleted": ["找一个拐角"],
        "missionReviews": {
          "找一个拐角": {
            "passed": true,
            "comment": "已完成",
            "confidence": "medium",
            "reviewedAt": 1743225555555
          }
        },
        "photoList": [
          "http://127.0.0.1:8080/uploads/walk/f_xxx.jpg"
        ],
        "coverImage": "http://127.0.0.1:8080/uploads/walk/f_xxx.jpg",
        "noteText": "今天光线很好",
        "isPublic": true,
        "walkMode": "pure",
        "generationSource": "rag+ai",
        "createdAt": 1743226666666
      }
    ]
  }
}
```

### 5.3 获取社区公开足迹

- 方法：`GET`
- 路径：`/api/v1/miniapp/walks/public`
- 是否鉴权：否

请求参数：

- `limit`：默认 `20`，最大 `50`

返回结构与“获取我的足迹”一致。

### 5.4 获取足迹详情

- 方法：`GET`
- 路径：`/api/v1/miniapp/walks/{id}`
- 是否鉴权：可选

说明：

- 如果记录是公开的，不登录也可访问
- 如果记录不是公开的，只有所属用户可访问

返回示例：

```json
{
  "code": 0,
  "message": "成功",
  "data": {
    "walk": {
      "_id": "123",
      "userId": 12,
      "themeTitle": "街区漫步",
      "themeSnapshot": {
        "title": "街区漫步",
        "description": "围绕社区边界做观察",
        "category": "城市",
        "missions": ["找一个拐角"],
        "vibeColor": "#5a5a40",
        "provider": "deepseek"
      },
      "locationName": "武康路",
      "locationContext": "梧桐街区",
      "routePoints": [],
      "missionsCompleted": ["找一个拐角"],
      "missionReviews": {},
      "photoList": [
        "http://127.0.0.1:8080/uploads/walk/f_xxx.jpg"
      ],
      "coverImage": "http://127.0.0.1:8080/uploads/walk/f_xxx.jpg",
      "noteText": "今天光线很好",
      "isPublic": true,
      "walkMode": "pure",
      "generationSource": "rag+ai",
      "createdAt": 1743226666666
    }
  }
}
```

## 6. 小程序当前实际使用的接口清单

- `POST /api/v1/miniapp/auth/sync-user`
- `GET /api/v1/miniapp/auth/me`
- `POST /api/v1/miniapp/themes/generate`
- `POST /api/v1/miniapp/themes/random`
- `POST /api/v1/miniapp/themes/combined`
- `GET /api/v1/miniapp/location/context`
- `POST /api/v1/miniapp/missions/verify`
- `POST /api/v1/files/upload`
- `POST /api/v1/miniapp/walks`
- `GET /api/v1/miniapp/walks/me`
- `GET /api/v1/miniapp/walks/public`
- `GET /api/v1/miniapp/walks/{id}`

## 7. 当前实现备注

- AI 主题和地点语境当前走后端 DeepSeek 能力
- 地点相关能力当前结合了高德地图服务
- 上传文件当前保存到后端本机 `uploads/` 目录
- 数据库存相对路径，返回给小程序时再拼完整 URL
- 当前用户体系仍以小程序登录换取后端 token 为主
