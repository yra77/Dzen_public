# syntax=docker/dockerfile:1
FROM node:20-alpine AS build
WORKDIR /app
COPY src/Comments.Web/package*.json ./
RUN npm ci
COPY src/Comments.Web/ ./
RUN npm run build

FROM nginx:1.27-alpine AS final
COPY src/Comments.Web/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist/comments-web/browser /usr/share/nginx/html
EXPOSE 80