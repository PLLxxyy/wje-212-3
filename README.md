# 邻里互助 - 社区互助平台

一个基于社区的邻里互助平台，居民之间可以发布求助、接单帮忙、互评积分。

## 功能特性

- **用户注册/登录**：居民注册账号，填写楼栋门牌信息
- **发布求助**：支持代买、搬运、维修、照看、辅导、跑腿等类型
- **接单帮忙**：浏览社区求助列表，选择合适的求助接单
- **求助流程**：接单 -> 确认开始 -> 确认完成 -> 评价积分
- **积分排行**：展示社区热心达人排行榜
- **个人中心**：查看我发的求助和我接的单

## 技术栈

| 层级 | 技术 |
|------|------|
| 前端 | Vite + React 18 + TypeScript |
| 后端 | Express + TypeScript |
| 数据库 | better-sqlite3 |
| 认证 | JWT + bcryptjs |
| 并行启动 | concurrently |

## 快速开始

```bash
# 安装所有依赖
npm run install:all

# 初始化种子数据
npm run seed

# 启动开发服务器（前端 + 后端同时启动）
npm run dev
```

启动后访问：
- 前端：http://localhost:5212
- 后端 API：http://localhost:3212

## 测试账号

种子数据包含以下测试账号，密码均为 `123456`：

| 用户名 | 昵称 | 楼栋 |
|--------|------|------|
| zhangsan | 张三 | A栋3单元502 |
| lisi | 李四 | B栋1单元201 |
| wangwu | 王五 | C栋2单元103 |
| zhaoliu | 赵六 | A栋1单元801 |
| sunqi | 孙七 | D栋4单元302 |
| zhouba | 周八 | B栋2单元601 |
| wujiu | 吴九 | E栋1单元405 |
| zhengshi | 郑十 | C栋3单元202 |

## API 接口

### 认证
- `POST /api/auth/register` - 注册
- `POST /api/auth/login` - 登录

### 求助
- `GET /api/requests` - 获取求助列表（支持 type/status/search 筛选）
- `GET /api/requests/:id` - 获取求助详情
- `POST /api/requests` - 发布求助（需登录）
- `POST /api/requests/:id/accept` - 接单（需登录）
- `POST /api/requests/:id/confirm-start` - 确认开始（求助人）
- `POST /api/requests/:id/complete` - 确认完成（求助人）
- `POST /api/requests/:id/review` - 评价帮助者（求助人）

### 用户
- `GET /api/users/me` - 获取当前用户信息
- `GET /api/users/me/requests` - 我发的求助
- `GET /api/users/me/helped` - 我接的单
- `GET /api/users/leaderboard` - 积分排行榜

## 项目结构

```
wje-212/
├── package.json          # 根配置，concurrently 并行启动
├── README.md
├── client/               # 前端 Vite + React
│   ├── index.html        # 包含所有样式
│   ├── package.json
│   ├── vite.config.ts
│   ├── tsconfig.json
│   └── src/
│       ├── main.tsx
│       ├── App.tsx       # 路由和布局
│       ├── api.ts        # API 请求封装
│       └── pages/
│           ├── Login.tsx
│           ├── Home.tsx
│           ├── CreateRequest.tsx
│           ├── RequestDetail.tsx
│           ├── Profile.tsx
│           └── Leaderboard.tsx
└── server/               # 后端 Express
    ├── package.json
    ├── tsconfig.json
    ├── neighborhood.db   # SQLite 数据库（seed 后生成）
    └── src/
        ├── index.ts      # 服务入口
        ├── database.ts   # 数据库初始化
        ├── auth.ts       # JWT 认证中间件
        ├── seed.ts       # 种子数据
        └── routes/
            ├── auth.ts
            ├── requests.ts
            └── users.ts
```

## 求助流程

```
发布求助 (open) -> 有人接单 (accepted) -> 求助人确认开始 (in_progress)
-> 求助人确认完成 (completed) -> 求助人评价帮助者 (积分+2x评分)
```
