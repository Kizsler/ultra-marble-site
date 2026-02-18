FROM nginx:alpine
COPY *.html /usr/share/nginx/html/
COPY *.json /usr/share/nginx/html/
COPY images/ /usr/share/nginx/html/images/
COPY nginx.conf /etc/nginx/nginx.conf
EXPOSE 8080
