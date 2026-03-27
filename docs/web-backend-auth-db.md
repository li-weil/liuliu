# Web 登录系统：后端实现、前后端链路、数据库说明

## 1. 模块定位

本模块对应 Web 端登录鉴权能力，当前代码可用于联调，但仍是 mock/占位实现，不是生产级认证系统。

核心文件：

- `backend/src/main/java/com/liuliu/citywalk/controller/AuthController.java`
- `backend/src/main/java/com/liuliu/citywalk/service/WechatAuthService.java`
- `backend/src/main/java/com/liuliu/citywalk/service/AuthTokenService.java`
- `src/services/authApi.ts`
- `src/services/apiClient.ts`

## 2. Web 后端实现（当前）

接口前缀：`/api/v1/auth`

1. `POST /login`
- 入参：`loginType`、`code`
- 当前行为：直接返回固定 mock token + mock user

2. `POST /mock-login`
- 用于本地联调，直接返回 mock token + mock user

3. `GET /wechat/url`
- 生成微信开放平台扫码地址：`open.weixin.qq.com/connect/qrconnect`
- 在内存 `redirectUriCache` 里缓存 `state -> redirectUri`

4. `GET /wechat/callback`
- 接收微信带回的 `code/state`
- 当前未调用微信换取真实用户，走 `mockWechatLoginSuccess(code)`
- 302 重定向回前端并附带 `token/refreshToken`

5. `GET /me`
- 当前直接返回固定用户（未校验真实 token）

6. `POST /logout`
- 当前固定返回 `true`（无会话失效逻辑）

## 3. 前后端链路（Web）

1. 前端点击登录，调用 `redirectToWechatLogin()`（`src/services/authApi.ts`）。  
2. 前端请求后端 `GET /api/v1/auth/wechat/url?redirectUri=...`。  
3. 前端跳转微信扫码页。  
4. 微信回调后端 `GET /api/v1/auth/wechat/callback?code=...&state=...`。  
5. 后端 302 回前端并携带 token 参数。  
6. 前端 `consumeLoginCallback()` 读取并保存 token 到 `localStorage`。  
7. 前端调用 `GET /api/v1/auth/me` 加载当前用户信息。  

## 4. Token 机制说明（当前）

`AuthTokenService` 目前是字符串编码，不是 JWT：

- access token: `citywalk:{userId}:{timestamp}` -> Base64URL
- refresh token: `refresh:{userId}:{nanoTime}` -> Base64URL

现状限制：

- 无签名、无标准 claims、无验签流程
- 无统一鉴权过滤器
- 无服务端 token 失效和会话持久化

## 5. 数据库说明

### 5.1 当前状态（代码事实）

- 未引入 MySQL/PostgreSQL/MongoDB/Redis 依赖
- 无 `@Entity` / `@Document` / Repository
- `application.yml` 无 `spring.datasource` 等数据库连接配置

结论：登录系统目前无真实落库，关键状态在内存中（如 `redirectUriCache`）。

### 5.2 建议最小表结构

1. `users`
- `user_id` (PK)
- `nickname`
- `avatar_url`
- `status`
- `created_at`
- `updated_at`

2. `user_identities`
- `id` (PK)
- `user_id` (FK -> users.user_id)
- `provider` (`wechat_open`, `wechat_miniapp`, `phone`, ...)
- `provider_uid` (openid / 手机号哈希等)
- `unionid` (nullable)
- `is_verified`
- `created_at`
- unique(`provider`, `provider_uid`)

3. `auth_sessions`
- `id`
- `user_id`
- `refresh_token_hash`
- `expires_at`
- `revoked_at` (nullable)
- `created_at`

4. `auth_login_state`（可选）
- `state` (PK)
- `redirect_uri`
- `expired_at`

## 6. 结论

- 当前登录模块可联调，不可直接用于生产。
- 若要支持 Web + 小程序共用用户体系，建议“登录入口分开、用户与会话内核统一”。
