FROM nginx:alpine

COPY . /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

RUN rm /usr/share/nginx/html/Dockerfile 2>/dev/null || true
