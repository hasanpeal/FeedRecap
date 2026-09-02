FROM node:20-alpine3.18

WORKDIR /app

COPY package*.json ./

RUN npm install

COPY . .

RUN npm run build

# Run node directly (not through npm) so it becomes PID 1 and receives
# SIGTERM directly on Railway redeploys, letting BullMQ workers finish or
# hand off in-flight jobs instead of being killed with no graceful shutdown.
ENV TZ=America/New_York

EXPOSE 3000

CMD ["node", "dist/server.js"]