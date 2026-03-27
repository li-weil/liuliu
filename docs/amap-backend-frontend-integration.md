# 地图系统（高德）：后端实现、前后端链路、数据库说明

## 1. 模块定位

本模块负责地点搜索、附近 POI 查询、地图渲染联动。

核心文件：

- `backend/src/main/java/com/liuliu/citywalk/controller/MapController.java`
- `backend/src/main/java/com/liuliu/citywalk/service/MapSearchService.java`
- `backend/src/main/java/com/liuliu/citywalk/config/AmapProperties.java`
- `backend/src/main/resources/application.yml`
- `src/services/mapApi.ts`
- `src/App.tsx`

## 2. Web 后端实现（当前）

接口前缀：`/api/v1/map`

1. `GET /search?query=...`
- 服务：`MapSearchService.search(query)`
- 调用高德：`/v3/place/text`
- 返回：`LocationSearchResponse[]`（`name/lat/lng`）

2. `GET /pois/nearby?lat=...&lng=...`
- 服务：`MapSearchService.nearbyPois(lat, lng)`
- 调用高德：`/v3/place/around`
- 固定半径：`3000m`
- 最大数量：`12`
- 返回：`PoiResponse[]`（`title/uri/lat/lng`）

实现要点：

- 通过 `AmapProperties` 注入 `amap.web-key` 与 `amap.base-url`
- 统一用 Java `HttpClient` 请求高德 REST API
- 校验返回 `status == "1"`，失败则走 fallback 数据
- 解析高德坐标字符串 `lng,lat`
- 自动生成 `uri.amap.com/marker` 跳转链接

## 3. 前后端链路（Web）

1. 前端输入地点关键词（`App.tsx`）。  
2. 前端调用 `searchLocations(query)` -> `GET /api/v1/map/search`。  
3. 后端查高德并返回候选地点。  
4. 用户选中地点后，前端调用 `fetchNearbyPois(lat,lng)` -> `GET /api/v1/map/pois/nearby`。  
5. 后端查高德并返回 POI 列表。  
6. 前端地图层（`AmapScene`）渲染 marker/callout/polyline 并联动 POI 卡片。  

## 4. 前端展示实现（Web）

`src/App.tsx` 使用高德 JS SDK：

- 动态加载 `https://webapi.amap.com/maps?v=2.0&key=...`
- 创建 `AMap.Map`
- 添加 `Scale`、`ToolBar` 控件
- 渲染：
  - 当前地点 marker
  - POI markers（点击后弹出 InfoWindow）
  - 轨迹 polyline

前端配置：

- `VITE_AMAP_JS_KEY`
- `VITE_API_BASE_URL`

## 5. 数据库说明

### 5.1 当前状态

地图模块当前不依赖数据库表：

- 搜索和 POI 结果来自高德实时接口
- 失败时返回后端内置 fallback 数据
- 无地点搜索历史、收藏地点、POI 缓存落库

### 5.2 可选数据库扩展

1. `location_search_history`
- `id`
- `user_id`
- `keyword`
- `selected_name`
- `lat`
- `lng`
- `created_at`

2. `poi_cache`（可选）
- `id`
- `lat_bucket`
- `lng_bucket`
- `radius`
- `payload_json`
- `expired_at`

## 6. 结论

- 后端高德 REST 接入已可用，Web 前端地图展示已打通。
- 小程序可以复用这两个后端接口，但地图渲染层需要单独用小程序地图组件实现。
