# SitePilot

A modern, self-hosted static site deployment platform with a Vercel-like dashboard.

## Features
- 🚀 **Drag & Drop Deployment**: Upload ZIP or HTML files instantly.
- 💅 **Modern UI**: React + Tailwind + Framer Motion dashboard.
- 🐳 **Dockerized**: Full stack (Nginx + Node + React) in containers.
- 🧱 **Infrastructure**: Auto-configured Nginx for dynamic host routing.

## Quick Start (Production)

1) 配置 CI 推镜像  
- 仓库变量/Secrets：`REGISTRY`(默认 ghcr.io)、`IMAGE_NAME`(默认 ghcr.io/<repo_owner>/sitepilot)、`REGISTRY_USERNAME`/`REGISTRY_PASSWORD`（GHCR 可用 `GITHUB_TOKEN`）。  
- 推送 `main` 或打标签 `v*`，GitHub Actions 会构建并推送镜像。

2) 部署到服务器（已安装 Docker / Compose）  
```bash
# 使用 CI 推送的镜像标签
export IMAGE_NAME=ghcr.io/<your-account>/sitepilot:latest

# 登录镜像仓库
docker login ghcr.io -u <user> -p <token>

# 拉取并启动（nginx + backend + mysql）
docker compose pull backend
docker compose up -d
```

3) 访问  
`http://<服务器IP或域名>/admin`  
默认 Token: `admin123`（在 `docker-compose.yml` 或环境变量中修改）

## Local Development

```bash
# Install all dependencies
npm run install:all

# Start Dev Servers (Frontend: 5173, Backend: 3000)
npm run dev
```

See [walkthrough.md](C:/Users/Administrator/.gemini/antigravity/brain/f30d05de-fe2f-4d3b-ac39-41090bdd40e2/walkthrough.md) for detailed instructions.
