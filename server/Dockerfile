FROM node:20-alpine3.18

WORKDIR /app

# bcrypt ships a native addon; if its prebuilt binary download fails (e.g. a
# transient network hiccup reaching GitHub's release CDN), node-gyp falls
# back to compiling from source, which needs Python + a C++ toolchain that
# alpine doesn't include by default.
RUN apk add --no-cache python3 make g++

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