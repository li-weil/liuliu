# 主题社区系统：后端实现、前后端链路、数据库说明

## 1. 模块定位

本模块负责用户提交自定义主题、获取主题列表和主题详情。

核心文件：

- `backend/src/main/java/com/liuliu/citywalk/controller/ThemeController.java`
- `backend/src/main/java/com/liuliu/citywalk/model/dto/request/CreateThemeRequest.java`
- `backend/src/main/java/com/liuliu/citywalk/model/dto/response/ThemeResponse.java`
- `src/services/themeCommunityApi.ts`
- `src/App.tsx`

## 2. Web 后端实现（当前）

接口前缀：`/api/v1/themes`

1. `POST /`
- 入参：`CreateThemeRequest`
- 字段：`title/description/category/missions`
- 当前行为：返回固定 `id` 和入参组装结果，未落库

2. `GET /`
- 入参：`page/pageSize/status`
- 当前行为：返回固定 mock 主题列表

3. `GET /{themeId}`
- 当前行为：返回固定 mock 主题详情

结论：主题社区接口是原型态实现，尚未接入审核流与持久化。

## 3. 前后端链路（Web）

前端 `src/services/themeCommunityApi.ts`：

- `submitTheme(payload)` -> `POST /api/v1/themes`

链路说明：

1. 用户在 `App.tsx` 填写主题标题、描述、分类和任务。  
2. 前端调用 `submitTheme` 提交。  
3. 后端返回 `ThemeResponse`（当前为 mock 逻辑）。  
4. 前端可在页面展示提交结果（当前主要用于联调）。  

## 4. 数据库说明

### 4.1 当前状态

当前无主题社区真实落库：

- 无 `themes` 业务表
- 无审核状态流转表
- 无主题点赞/收藏/评论等扩展表

### 4.2 建议表结构

1. `themes`
- `theme_id` (PK)
- `author_user_id`
- `title`
- `description`
- `category`
- `missions_json`
- `vibe_color`
- `provider` (`user` / `community` / `ai`)
- `status` (`pending` / `approved` / `rejected`)
- `reviewed_by` (nullable)
- `reviewed_at` (nullable)
- `created_at`
- `updated_at`

2. `theme_review_logs`
- `id`
- `theme_id`
- `action`
- `operator_id`
- `comment`
- `created_at`

## 5. 结论

- 当前模块可以走通前后端提交流程，但没有真实社区数据沉淀。
- 若要上线社区，需要至少补齐 `themes + 审核流` 两层数据模型。
