# AI 主题系统：后端实现、前后端链路、数据库说明

## 1. 模块定位

本模块负责按用户输入生成 City Walk 主题，以及生成地点环境描述。

核心文件：

- `backend/src/main/java/com/liuliu/citywalk/controller/AiThemeController.java`
- `backend/src/main/java/com/liuliu/citywalk/service/DeepSeekThemeService.java`
- `backend/src/main/java/com/liuliu/citywalk/config/DeepSeekProperties.java`
- `src/services/themeService.ts`
- `src/App.tsx`

## 2. Web 后端实现（当前）

接口前缀：`/api/v1/ai`

1. `POST /themes/generate`
- 入参：`GenerateThemeRequest`
- 字段：`mood/weather/season/preference/locationName/locationContext/walkMode`
- 处理：`DeepSeekThemeService.generateTheme`
- 出参：`ThemeResponse`

2. `POST /themes/preset`
- 入参：`GeneratePresetThemeRequest`
- 字段：`category/locationName/locationContext/walkMode`
- 处理：`DeepSeekThemeService.generatePreset`
- 出参：`ThemeResponse`

3. `POST /themes/combine`
- 入参：`CombineThemeRequest`
- 字段：`categories/locationName/locationContext/walkMode`
- 处理：`DeepSeekThemeService.combineTheme`
- 出参：`ThemeResponse`

4. `GET /location/context?lat=...&lng=...`
- 处理：`DeepSeekThemeService.locationContext`
- 会先调用 `MapSearchService.nearbyPois` 拼装 POI 摘要，再请求大模型生成语境描述
- 出参：`LocationContextResponse`

5. `GET /location/search-context?query=...`
- 处理：`DeepSeekThemeService.searchContext`
- 出参：`LocationContextResponse`

实现要点：

- 大模型优先使用 DeepSeek（`deepseek.api-key/model/base-url`）
- 未配置 key 或请求失败时有 fallback 文案/主题，接口可用性高于严格失败
- 输出通过 `ThemeResponse` 标准化：`title/description/category/missions/vibeColor/provider`

## 3. 前后端链路（Web）

前端 `src/services/themeService.ts` 与后端对应关系：

- `generateAITheme` -> `POST /api/v1/ai/themes/generate`
- `generateDynamicPreset` -> `POST /api/v1/ai/themes/preset`
- `generateCombinedTheme` -> `POST /api/v1/ai/themes/combine`
- `getLocationContext` -> `GET /api/v1/ai/location/context`
- `searchLocationContext` -> `GET /api/v1/ai/location/search-context`

前端在 `App.tsx` 中根据用户操作触发这些函数，渲染当前主题和任务列表。

## 4. 数据库说明

### 4.1 当前状态

当前 AI 主题模块不落库：

- 无 AI 请求日志表
- 无主题生成历史表
- 无 prompt 版本管理表

### 4.2 建议表结构

1. `ai_generation_log`
- `id`
- `user_id`
- `scene` (`theme_generate` / `theme_preset` / `location_context` ...)
- `provider`
- `request_json`
- `response_json`
- `status`
- `error_message`
- `created_at`

2. `user_generated_themes`（可选）
- `id`
- `user_id`
- `title`
- `description`
- `category`
- `missions_json`
- `vibe_color`
- `provider`
- `created_at`

## 5. 结论

- Web 侧 AI 主题链路已打通且有降级兜底。
- 当前更偏“在线生成能力”，不是“可追溯可统计”的生产数据系统。
