# 文件上传系统：后端实现、前后端链路、数据库说明

## 1. 模块定位

本模块负责媒体文件上传（图片/音频/视频）并返回可访问 URL。

核心文件：

- `backend/src/main/java/com/liuliu/citywalk/controller/FileController.java`
- `backend/src/main/java/com/liuliu/citywalk/model/dto/response/FileUploadResponse.java`
- `backend/src/main/java/com/liuliu/citywalk/config/WebCorsConfig.java`
- `src/services/fileApi.ts`

## 2. Web 后端实现（当前）

接口：

- `POST /api/v1/files/upload`（`multipart/form-data`）

请求字段：

- `file`（二进制文件）
- `bizType`（业务类型）

处理流程（`FileController`）：

1. 清洗 `bizType`，仅保留字母数字下划线中划线。  
2. 生成 `fileId` 和目标文件名。  
3. 按 `uploads/<bizType>/` 创建目录。  
4. 将上传内容落盘到本地文件系统。  
5. 返回 `FileUploadResponse(fileId,url,contentType,size)`。  

静态访问：

- `WebCorsConfig.addResourceHandlers` 将 `/uploads/**` 映射到本地 `uploads` 目录绝对路径。

## 3. 前后端链路（Web）

前端 `src/services/fileApi.ts`：

1. `uploadDataUrl(dataUrl,bizType,fileName)`  
2. 前端先把 dataURL 转为 `File`  
3. 组装 `FormData(file,bizType)`  
4. `fetch POST /api/v1/files/upload`  
5. 拿到 `fileId/url/contentType/size` 返回给业务层  

## 4. 数据库说明

### 4.1 当前状态

文件模块当前只做“本地落盘 + URL 返回”：

- 无文件元数据表
- 无上传者绑定关系
- 无生命周期管理（过期、清理、去重）

### 4.2 建议表结构

1. `file_assets`
- `file_id` (PK, 对应返回值)
- `owner_user_id`
- `biz_type`
- `original_name`
- `content_type`
- `size_bytes`
- `storage_provider` (`local` / `s3` / `oss` ...)
- `storage_key`
- `public_url`
- `created_at`

2. `file_bindings`（可选）
- `id`
- `file_id`
- `biz_entity` (`walk` / `theme` / `mission`)
- `biz_entity_id`
- `created_at`

## 5. 结论

- 当前文件上传能力可满足本地开发与联调。
- 若用于生产，建议升级到对象存储（OSS/S3/MinIO）并补文件元数据落库。
