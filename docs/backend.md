# 后端接口与“数据库”设计（当前实现）

当前项目已新增一个轻量后端服务（Express），用于把以下三类数据从“仅浏览器 localStorage”升级为可持久化的服务端数据：

- 需求单 submissions
- 价格表 pricing
- 聊天消息 chat messages

为降低引入成本与部署复杂度，当前服务端使用 JSON 文件作为持久化存储（相当于一个简化数据库）。后续可以无缝迁移到 MySQL / PostgreSQL / SQLite，只需把读写层替换为真实数据库即可。

## 运行方式

- 前端：`npm run dev`（Vite，默认 3000）
- 后端：`npm run dev:server`（Express + tsx，默认 3002）
- 开发期前端已配置代理：`/api/*` 会转发到 `http://localhost:3002`

## 数据结构（等价表结构）

后端持久化文件：`data/db.json`

### submissions（需求单）

- id: string（例如 `SUB-...`）
- date: string（YYYY-MM-DD）
- client: string（客户名称，当前默认 `当前访客`）
- desc: string（需求名称/画板名）
- image: string（画布预览图 base64 dataURL）
- state: any（画布的可编辑状态：baseImages/shapes/scale/position/uploadedFiles 等）

### pricing（价格表）

- id: string
- name: string
- en: string
- price: string
- unit: string
- iconType: string（与前端卡片 icon 对应）
- category: 'single' | 'package'

### chat.messages（聊天消息）

- id: string
- sender: 'client' | 'admin'
- text: string
- timestamp: number（毫秒时间戳）

## API 列表

基础：

- GET `/api/health`：健康检查
- GET `/api/events`：SSE 事件流（用于实时同步）

需求单：

- GET `/api/submissions`：获取需求单列表
- POST `/api/submissions`：创建或更新需求单（按 id upsert）
- PUT `/api/submissions/:id`：按 id 更新
- DELETE `/api/submissions/:id`：删除

价格表：

- GET `/api/pricing`：获取价格表
- PUT `/api/pricing`：整体替换价格表

聊天：

- GET `/api/chat/messages`：获取聊天消息列表（当前为全局一条会话）
- POST `/api/chat/messages`：发送消息

维护：

- POST `/api/reset`：重置服务端数据为初始空状态（开发调试用）
