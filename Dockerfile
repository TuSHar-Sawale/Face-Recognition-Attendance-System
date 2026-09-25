# Multi-stage Dockerfile for Node.js Backend + Built React Client

# Stage 1: Build Frontend Client
FROM node:20-alpine AS client-builder
WORKDIR /app/client
COPY client/package*.json ./
RUN npm install
COPY client/ ./
RUN npm run build

# Stage 2: Production Server Runner
FROM node:20-alpine AS server
WORKDIR /app

# Install server dependencies
COPY server/package*.json ./server/
WORKDIR /app/server
RUN npm install --omit=dev

# Copy server source
COPY server/ ./

# Copy built frontend assets to client/dist for Express static serving
COPY --from=client-builder /app/client/dist /app/client/dist

ENV PORT=5000
ENV NODE_ENV=production
EXPOSE 5000

CMD ["node", "src/server.js"]
