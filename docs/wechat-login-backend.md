# 微信扫码登录后端改造说明

## 目标

把当前前端登录改成：

- 前端点击“微信登录”
- 前端请求后端获取微信扫码授权地址
- 浏览器跳转到微信扫码登录页
- 微信回调到后端
- 后端换取微信用户信息并签发你自己的系统 `token`
- 后端再重定向回前端，并把 `token` 带回前端

## 前端已经按下面的接口约定改造

前端当前会依赖这些接口：

### 1. 获取微信扫码登录地址

`GET /api/v1/auth/wechat/url?redirectUri=<前端回跳地址>`

返回格式：

```json
{
  "code": 0,
  "message": "成功",
  "data": {
    "authUrl": "https://open.weixin.qq.com/connect/qrconnect?appid=xxx..."
  }
}
```

### 2. 获取当前登录用户

`GET /api/v1/auth/me`

请求头：

```http
Authorization: Bearer <token>
```

返回格式：

```json
{
  "code": 0,
  "message": "成功",
  "data": {
    "id": 1001,
    "nickname": "六六",
    "avatar": "https://xxx/avatar.jpg"
  }
}
```

### 3. 退出登录

`POST /api/v1/auth/logout`

## 后端扫码登录流程建议

### 第一步：生成微信授权地址

后端接口：

`GET /api/v1/auth/wechat/url`

请求参数：

- `redirectUri`

逻辑：

- 生成 `state`
- 把前端传来的 `redirectUri` 和 `state` 缓存起来
- 拼接微信开放平台网站应用扫码登录地址
- 返回 `authUrl`

## 微信扫码登录地址参数

网站应用扫码登录一般会用到这些参数：

- `appid`
- `redirect_uri`
- `response_type=code`
- `scope=snsapi_login`
- `state`

最终跳转的是微信开放平台扫码登录页。

## 第二步：微信回调到后端

后端接口：

`GET /api/v1/auth/wechat/callback`

微信会带回来：

- `code`
- `state`

后端逻辑：

1. 校验 `state`
2. 用 `code` 去微信换 `access_token`
3. 再获取微信用户信息
4. 查找或创建系统用户
5. 签发你自己的 JWT
6. 重定向回前端 `redirectUri?token=xxx`

## 建议新增的 DTO

### WechatLoginUrlResponse

```java
public record WechatLoginUrlResponse(String authUrl) {}
```

### AppUserResponse

```java
public record AppUserResponse(Long id, String nickname, String avatar) {}
```

## 建议新增的 Controller 接口

### AuthController

- `GET /api/v1/auth/wechat/url`
- `GET /api/v1/auth/wechat/callback`
- `GET /api/v1/auth/me`
- `POST /api/v1/auth/logout`

## 建议新增的 Service

- `WechatOAuthService`
- `JwtTokenService`
- `AppUserService`

## 数据库建议增加字段

用户表建议有：

- `id`
- `openid`
- `unionid`
- `nickname`
- `avatar`
- `status`
- `created_at`
- `updated_at`

## 前端回跳约定

后端登录成功后，请重定向到前端页面并带上：

```text
http://localhost:3000/?token=你的JWT
```

前端已经会自动：

- 读取 `token`
- 存入 `localStorage`
- 删除地址栏里的 `token`
- 调用 `/api/v1/auth/me` 获取用户信息

## 本地联调建议

前端：

- `http://localhost:3000`

后端：

- `http://localhost:8080`

微信开放平台回调地址建议先指向后端，例如：

- `http://你的后端域名/api/v1/auth/wechat/callback`

本地开发如果微信平台不允许直接回调到本地，可以先通过内网穿透工具把后端暴露出来。
