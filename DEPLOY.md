# 个人知识库 — 部署文档

## 系统要求

- Node.js >= 18
- npm >= 9
- 磁盘空间 >= 500MB（含依赖和上传文件）
- 内存 >= 512MB

## 快速部署

```bash
# 1. 克隆/上传项目到服务器
cd /opt/knowledge-base   # 或你选择的目录

# 2. 安装依赖 + 构建前端
npm run setup

# 3. 配置环境变量（可选）
cp .env.example .env
# 编辑 .env 设置端口和域名

# 4. 启动服务
npm start
```

服务默认运行在 `http://localhost:3000`。

## 环境变量

| 变量 | 默认值 | 说明 |
|------|--------|------|
| `PORT` | `3000` | 服务监听端口 |
| `ALLOWED_ORIGINS` | 不限制 | 允许的前端域名，多个用逗号分隔，如 `https://kb.example.com,https://www.example.com` |

## 目录结构

```
knowledge-base/
├── client/              # Vue 3 前端源码
│   └── dist/            # 构建产物（自动生成）
├── server/
│   ├── index.js         # Express 入口
│   ├── routes/          # API 路由
│   └── data/            # 数据目录
│       ├── config.json      # 访问密码哈希 + JWT Secret（自动生成）
│       ├── ai-config.json   # AI 提供商配置（含 API Key）
│       ├── app.sqlite       # 笔记数据库（SQLite，自动创建）
│       └── uploads/         # 上传的文件
├── .env.example         # 环境变量模板
├── ecosystem.config.cjs # PM2 配置
└── package.json         # 根目录脚本
```

## 使用 PM2 管理进程（推荐）

```bash
# 安装 PM2
npm install -g pm2

# 启动
pm2 start ecosystem.config.cjs

# 查看状态
pm2 status

# 查看日志
pm2 logs knowledge-base

# 开机自启
pm2 startup
pm2 save
```

## Nginx 反向代理（推荐）

```nginx
server {
    listen 80;
    server_name kb.example.com;

    client_max_body_size 10m;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

配合 HTTPS：
```bash
# 使用 certbot 自动签发 Let's Encrypt 证书
sudo certbot --nginx -d kb.example.com
```

## 数据备份

数据全部存储在 `server/data/` 目录。除手动打包外，应用内置了一键备份：登录后打开 **设置 → 数据备份**，可导出包含全部笔记、分类与上传文件的 zip（不含密码与 API Key），并支持合并式导入恢复。

```bash
# 手动备份
tar -czf backup-$(date +%Y%m%d).tar.gz server/data/

# 定时备份（crontab）
0 3 * * * cd /opt/knowledge-base && tar -czf /backups/kb-$(date +\%Y\%m\%d).tar.gz server/data/
```

## 更新部署

```bash
# 拉取最新代码
git pull

# 重新安装依赖 + 构建
npm run setup

# 重启服务
pm2 restart knowledge-base
```

## 首次使用

1. 浏览器访问 `http://your-server:3000`
2. 首次打开会提示设置访问密码（至少 8 位）
3. 设置后即可使用

## 安全说明

- 密码使用 bcrypt 加密存储（10 轮），登录接口带限流防爆破
- JWT Token 有效期 7 天
- 文件上传限制 50MB，仅允许 jpg / png / gif / webp / pdf / docx
- HTML 笔记在沙箱 iframe 中渲染，与主应用隔离
- `server/data/` 目录包含敏感数据，请勿暴露到公网
- 建议配合 Nginx + HTTPS 使用
- 设置 `ALLOWED_ORIGINS` 限制跨域访问

## 故障排查

```bash
# 查看日志
pm2 logs knowledge-base --lines 50

# 检查端口占用
lsof -i :3000

# 手动启动查看错误
cd server && node index.js
```
