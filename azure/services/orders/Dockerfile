FROM node:22-alpine
WORKDIR /app
COPY package.json ./
COPY service.js server.js ./
EXPOSE 3002
CMD ["node", "server.js"]
