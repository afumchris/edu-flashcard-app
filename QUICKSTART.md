# Quick Start Guide

## Starting the Application

### Option 1: Automatic (Gitpod/Dev Container)
The application starts automatically when you open the workspace. No action needed!

### Option 2: Manual Start

Open two terminals:

**Terminal 1 - Backend:**
```bash
cd backend
npm start
```

**Terminal 2 - Frontend:**
```bash
cd frontend
npm start
```

## Accessing the Application

### In Gitpod
- URLs are automatically generated and displayed in the terminal
- Backend: `https://5002--[workspace-id].gitpod.dev`
- Frontend: `https://3000--[workspace-id].gitpod.dev`
- Ports are automatically forwarded

### Local Development
- Backend: [http://localhost:5002](http://localhost:5002)
- Frontend: [http://localhost:3000](http://localhost:3000)

## What You'll See

When you start the servers, you'll see output like this:

**Backend:**
```
⚠️  No OpenAI API key - using fallback mode

🚀 Backend API Server Started
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📍 Backend URL: https://5002--workspace-id.gitpod.dev
🌐 Environment: Gitpod
⚡ Port: 5002
✅ Status: Ready
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

**Frontend:**
```
🚀 Frontend Server Starting...
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📍 Frontend URL: https://3000--workspace-id.gitpod.dev
🌐 Environment: Gitpod
⚡ Port: 3000
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

## Troubleshooting

### Backend won't start
```bash
# Check if port is in use
lsof -i :5002

# Kill existing process
pkill -f "node server.js"

# Restart
cd backend && npm start
```

### Frontend won't start
```bash
# Check if port is in use
lsof -i :3000

# Kill existing process
pkill -f "react-scripts"

# Restart
cd frontend && npm start
```

### Can't access the URLs
- **Gitpod:** Make sure ports 3000 and 5002 are public (check Ports panel)
- **Local:** Make sure no firewall is blocking the ports
- **Both:** Check that both servers are running

## View Logs

```bash
# Backend logs
tail -f /tmp/backend.log

# Frontend logs
tail -f /tmp/frontend.log
```

## Configuration

### Add OpenAI API Key (Optional)

Create `backend/.env`:
```bash
OPENAI_API_KEY=your_key_here
```

The application works without an API key using the fallback system.

## Next Steps

1. Open the frontend URL in your browser
2. Upload a PDF, DOCX, or TXT file
3. Wait for processing (10-30 seconds)
4. Review generated flashcards
5. Study using the flashcard interface

For more details, see [README.md](README.md)
