# backend/Dockerfile
FROM node:18-alpine

WORKDIR /app

# copy package.json first to use build cache
COPY package*.json ./
RUN npm ci --only=production

COPY . .

# if you need dev deps for build, adjust accordingly
EXPOSE 5000

# Use environment variable for Mongo URI
CMD ["node", "server.js"]
