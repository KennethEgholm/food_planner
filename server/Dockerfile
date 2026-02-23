FROM node:22-alpine

WORKDIR /app

COPY package*.json ./

RUN npm install

COPY . .

RUN DATABASE_URL="postgresql://dummy" npx prisma generate

RUN npx tsc

EXPOSE 5000

CMD ["node", "dist/index.js"]
