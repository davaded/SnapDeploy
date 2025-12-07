# SitePilot

A modern, self-hosted static site deployment platform with a Vercel-like dashboard.

## Features
- 🚀 **Drag & Drop Deployment**: Upload ZIP or HTML files instantly.
- 💅 **Modern UI**: React + Tailwind + Framer Motion dashboard.
- 🐳 **Dockerized**: Full stack (Nginx + Node + React) in containers.
- 🧱 **Infrastructure**: Auto-configured Nginx for dynamic host routing.

## Quick Start (Production)

```bash
# 1. Start Services
docker compose up -d --build

# 2. Access Dashboard
http://localhost/admin (or your server IP)
Token: admin123 (Change in docker-compose.yml)
```

## Local Development

```bash
# Install all dependencies
npm run install:all

# Start Dev Servers (Frontend: 5173, Backend: 3000)
npm run dev
```

See [walkthrough.md](C:/Users/Administrator/.gemini/antigravity/brain/f30d05de-fe2f-4d3b-ac39-41090bdd40e2/walkthrough.md) for detailed instructions.
