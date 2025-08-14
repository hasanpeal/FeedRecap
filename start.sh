#!/bin/bash

# FeedRecap - Start Client and Server
# This script starts both the Next.js client and Express.js server simultaneously

echo "🚀 Starting FeedRecap Application..."
echo "=================================="

# Function to handle cleanup on script exit
cleanup() {
    echo ""
    echo "🛑 Shutting down FeedRecap..."
    kill $CLIENT_PID $SERVER_PID 2>/dev/null
    exit 0
}

# Set up signal handlers
trap cleanup SIGINT SIGTERM

# Check if we're in the right directory
if [ ! -d "client" ] || [ ! -d "server" ]; then
    echo "❌ Error: Please run this script from the FeedRecap root directory"
    echo "   Make sure both 'client' and 'server' folders exist"
    exit 1
fi

# Check if node_modules exist, if not install them
echo "📦 Checking dependencies..."

if [ ! -d "client/node_modules" ]; then
    echo "📥 Installing client dependencies..."
    cd client
    npm install
    cd ..
fi

if [ ! -d "server/node_modules" ]; then
    echo "📥 Installing server dependencies..."
    cd server
    npm install
    cd ..
fi

echo "✅ Dependencies ready!"

# Start the server in the background
echo "🔧 Starting server on port 3001..."
cd server
npm run build
node ./dist/server.js &
SERVER_PID=$!
cd ..

# Wait a moment for server to start
sleep 2

# Start the client in the background
echo "🌐 Starting client on port 3000..."
cd client
npm run dev &
CLIENT_PID=$!
cd ..

echo ""
echo "✅ FeedRecap is starting up!"
echo "   📱 Client: http://localhost:3000"
echo "   🔧 Server: http://localhost:3001"
echo ""
echo "Press Ctrl+C to stop both applications"

# Wait for both processes
wait $CLIENT_PID $SERVER_PID
