#!/bin/bash

echo "Starting Backend Server..."
cd backend
npm start &
BACKEND_PID=$!

echo "Starting Frontend Server..."
cd ../frontend
npm start &
FRONTEND_PID=$!

echo "Backend PID: $BACKEND_PID"
echo "Frontend PID: $FRONTEND_PID"

# Wait for user input to stop
read -p "Press enter to stop servers..."

# Kill processes
kill $BACKEND_PID
kill $FRONTEND_PID

echo "Servers stopped"
