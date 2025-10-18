#!/bin/bash

# Start backend server in background
echo "Starting backend server..."
cd /workspaces/edu-flashcard-app/backend
npm start > /tmp/backend.log 2>&1 &
BACKEND_PID=$!
echo "Backend server started (PID: $BACKEND_PID)"

# Wait for backend to be ready
sleep 3

# Start frontend server in background
echo "Starting frontend server..."
cd /workspaces/edu-flashcard-app/frontend
npm start > /tmp/frontend.log 2>&1 &
FRONTEND_PID=$!
echo "Frontend server started (PID: $FRONTEND_PID)"

echo "✅ Both servers started successfully!"
echo "Backend: http://localhost:5002"
echo "Frontend: http://localhost:3000"
echo ""
echo "Logs:"
echo "  Backend: tail -f /tmp/backend.log"
echo "  Frontend: tail -f /tmp/frontend.log"
