#!/bin/bash

echo ""
echo "╔══════════════════════════════════════════════════════════════════════╗"
echo "║                    YOUR APPLICATION URLS                              ║"
echo "╚══════════════════════════════════════════════════════════════════════╝"
echo ""

if command -v /usr/local/bin/gitpod &> /dev/null; then
    /usr/local/bin/gitpod environment port list
    echo ""
    echo "📍 Frontend: Click the URL next to port 3000"
    echo "📍 Backend:  Click the URL next to port 5002"
else
    echo "📍 Frontend: http://localhost:3000"
    echo "📍 Backend:  http://localhost:5002"
fi

echo ""
echo "💡 Tip: Use the PORTS panel at the bottom of your workspace!"
echo ""
