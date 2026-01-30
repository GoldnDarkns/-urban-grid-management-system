# Urban Grid Management System - React Frontend
# Build context: project root (docker build -f frontend/Dockerfile .)
# Stage 1: build
FROM node:20-alpine AS builder

WORKDIR /app

COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci

COPY frontend/ .
# Use /api when served behind Nginx (Docker)
ENV VITE_API_BASE_URL=/api
RUN npm run build

# Stage 2: serve with Nginx
FROM nginx:alpine

COPY frontend/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=builder /app/dist /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
