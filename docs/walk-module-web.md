# 漫步记录系统：后端实现、前后端链路、数据库说明

## 1. 模块定位

本模块负责创建和查询 walk 记录（个人记录、公开记录、详情）。

核心文件：

- `backend/src/main/java/com/liuliu/citywalk/controller/WalkController.java`
- `backend/src/main/java/com/liuliu/citywalk/model/dto/request/CreateWalkRequest.java`
- `backend/src/main/java/com/liuliu/citywalk/model/dto/response/WalkResponse.java`
- `src/services/walkApi.ts`
- `src/App.tsx`

## 2. Web 后端实现（当前）

接口前缀：`/api/v1/walks`

1. `POST /`
- 入参：`CreateWalkRequest`
- 字段：`themeTitle/themeCategory/locationName/recordUnit/isPublic/noteText/path/completedMissions/photoUrl/videoUrl/audioUrl`
- 当前行为：回显式组装 `WalkResponse`，未落库

2. `GET /me`
- 入参：`page/pageSize`
- 当前行为：返回固定 mock 列表

3. `GET /public`
- 入参：`page/pageSize`
- 当前行为：返回固定 mock 列表

4. `GET /{walkId}`
- 当前行为：返回固定 mock 详情

结论：Web `WalkController` 目前是示例数据实现，不是持久化业务实现。

## 3. 前后端链路（Web）

前端 `src/services/walkApi.ts`：

- `createWalk(payload)` -> `POST /api/v1/walks`
- `fetchPublicWalks(page,pageSize)` -> `GET /api/v1/walks/public`

链路说明：

1. 前端在 `App.tsx` 收集路径点、任务完成信息、备注、公开状态。  
2. 前端调用 `createWalk` 提交给后端。  
3. 后端返回 `WalkResponse`（当前是回显/模拟）。  
4. 社区页调用 `fetchPublicWalks` 获取公开记录并渲染卡片。  

## 4. 数据库说明

### 4.1 当前状态

当前无 walk 落库实现：

- 无 `walk` 表
- 无 `path` 轨迹表
- 无 `mission` 完成记录表
- 无用户维度查询索引

### 4.2 建议表结构

1. `walks`
- `walk_id` (PK)
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
- `created_at`
- `updated_at`

2. `walk_path_points`
- `id`
- `walk_id`
- `seq_no`
- `lat`
- `lng`
- `timestamp_ms`

3. `walk_completed_missions`
- `id`
- `walk_id`
- `mission`
- `media_url`
- `media_type`

## 5. 结论

- 当前 Web 漫步记录接口已能联调前端，但本质是 mock。
- 若要与小程序共用业务，建议尽快抽出统一持久化 `WalkService + Repository`。
