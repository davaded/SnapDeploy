# Multi-stage build: build frontend, then run backend

# ---------- Frontend build ----------
FROM node:18-alpine AS frontend
WORKDIR /app
# Root manifests (workspaces) and frontend manifest for npm workspaces
COPY package.json package-lock.json ./
COPY frontend/package.json frontend/package.json
RUN npm ci --workspace frontend
COPY frontend ./frontend
RUN npm run build --workspace frontend

# ---------- Backend runtime ----------
FROM node:18-alpine AS backend
WORKDIR /usr/src/app
# Use root lockfile to install backend workspace only
COPY package.json package-lock.json ./
COPY backend/package.json backend/package.json
RUN npm ci --workspace backend
COPY backend ./backend
# Include frontend dist built in first stage
COPY --from=frontend /app/frontend/dist ./frontend/dist

ENV PORT=3000
ENV SITES_DIR=/var/www/sites
EXPOSE 3000

CMD ["npm","start","--workspace","backend"]
