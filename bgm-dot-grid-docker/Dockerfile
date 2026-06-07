FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install --only=production

COPY . .

RUN mkdir -p /app/image_cache && chmod 777 /app/image_cache

EXPOSE 3000

CMD ["node", "index.js"]
