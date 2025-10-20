# How to View and Access Ports

## The Issue

When you start the frontend manually with `npm start`, you might not see the port URL immediately or clearly. This guide explains how to access your application.

---

## Solution 1: Look for the Custom Banner (Recommended)

After running `npm start` in the frontend directory, wait for the compilation to complete. You'll see:

```
Compiled successfully!

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🚀 Frontend Server Ready!
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📍 Frontend URL: http://localhost:3000
🌐 Environment: Local
⚡ Port: 3000
✅ Status: Ready
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

**Just click the URL!** (In Gitpod, it will show the Gitpod URL instead)

---

## Solution 2: Use the Ports Panel (Gitpod/VSCode)

### In Gitpod:
1. Look at the bottom panel of your workspace
2. Click on the **"Ports"** tab (next to Terminal, Problems, etc.)
3. You'll see a list of forwarded ports:
   ```
   PORT    STATUS    URL                                              VISIBILITY
   3000    open      https://3000--workspace-id.gitpod.dev           private
   5002    open      https://5002--workspace-id.gitpod.dev           private
   ```
4. Click on the URL to open it in your browser
5. Or right-click → "Open Browser"

### In VSCode with Dev Containers:
1. Look at the bottom panel
2. Click on the **"Ports"** tab
3. You'll see forwarded ports with local URLs
4. Click to open

---

## Solution 3: Manual URL Construction (Gitpod)

If you know your workspace URL, you can construct the port URLs:

**Find your workspace URL:**
```bash
echo $GITPOD_WORKSPACE_URL
```

**Example output:**
```
https://workspace-abc123.eu-central-1.gitpod.dev
```

**Construct port URLs:**
- Frontend: `https://3000--workspace-abc123.eu-central-1.gitpod.dev`
- Backend: `https://5002--workspace-abc123.eu-central-1.gitpod.dev`

**Pattern:**
```
https://[PORT]--[workspace-id].[region].gitpod.dev
```

---

## Solution 4: Check Running Ports

### List all listening ports:
```bash
lsof -i -P -n | grep LISTEN
```

### Check specific ports:
```bash
# Frontend
lsof -i :3000

# Backend
lsof -i :5002
```

### Test if ports are accessible:
```bash
# Frontend
curl http://localhost:3000

# Backend
curl http://localhost:5002
```

---

## Solution 5: Use gp Command (Gitpod Only)

### List all ports:
```bash
gp ports list
```

### Open a port in browser:
```bash
gp preview $(gp url 3000)
```

### Make a port public:
```bash
gp ports visibility 3000:public
```

---

## Why You Might Not See the Port

### Common Reasons:

1. **Server Still Starting**
   - Wait for "Compiled successfully!" message
   - Frontend takes 10-30 seconds to start

2. **Output Scrolled Away**
   - Scroll up in the terminal
   - Look for the custom banner with ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

3. **Port Not Forwarded**
   - Check `.devcontainer/devcontainer.json` has `"forwardPorts": [3000, 5002]`
   - Restart the dev container if needed

4. **Wrong Terminal**
   - Make sure you're looking at the terminal where you ran `npm start`
   - Backend and frontend are in different terminals

5. **Ports Panel Hidden**
   - Click on "Ports" tab in bottom panel
   - If not visible, go to View → Ports

---

## Quick Access Commands

### Start and Show URLs:

**Backend:**
```bash
cd backend && npm start
# Wait for the banner with URL
```

**Frontend:**
```bash
cd frontend && npm start
# Wait for "Compiled successfully!" then the banner
```

### Get URLs Programmatically:

**Backend URL:**
```bash
if [ -n "$GITPOD_WORKSPACE_URL" ]; then
  echo "https://5002--$(echo $GITPOD_WORKSPACE_URL | sed 's|https://||')"
else
  echo "http://localhost:5002"
fi
```

**Frontend URL:**
```bash
if [ -n "$GITPOD_WORKSPACE_URL" ]; then
  echo "https://3000--$(echo $GITPOD_WORKSPACE_URL | sed 's|https://||')"
else
  echo "http://localhost:3000"
fi
```

---

## Troubleshooting

### Port Already in Use

```bash
# Find what's using the port
lsof -i :3000

# Kill the process
kill -9 <PID>

# Or kill all node processes
pkill -f "craco start"
```

### Port Not Accessible

```bash
# Check if server is running
curl http://localhost:3000

# Check firewall (local development)
sudo ufw status

# Check port forwarding (Gitpod)
gp ports list
```

### Can't See Ports Panel

**In Gitpod:**
- Press `Ctrl+Shift+P` (or `Cmd+Shift+P` on Mac)
- Type "Ports: Focus on Ports View"
- Press Enter

**In VSCode:**
- Go to View → Ports
- Or press `Ctrl+` ` (backtick) to open terminal panel, then click Ports tab

---

## Visual Guide

### What You Should See:

**1. Backend Startup:**
```
$ cd backend && npm start

⚠️  No OpenAI API key - using fallback mode

🚀 Backend API Server Started
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📍 Backend URL: https://5002--workspace-id.gitpod.dev
🌐 Environment: Gitpod
⚡ Port: 5002
✅ Status: Ready
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

**2. Frontend Startup:**
```
$ cd frontend && npm start

Starting the development server...

Compiled successfully!

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🚀 Frontend Server Ready!
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📍 Frontend URL: https://3000--workspace-id.gitpod.dev
🌐 Environment: Gitpod
⚡ Port: 3000
✅ Status: Ready
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

You can now view frontend in the browser.
```

**3. Ports Panel:**
```
┌─────────────────────────────────────────────────────────────────┐
│ PORTS                                                           │
├──────┬────────┬──────────────────────────────────────┬──────────┤
│ PORT │ STATUS │ URL                                  │ VISIBILITY│
├──────┼────────┼──────────────────────────────────────┼──────────┤
│ 3000 │ open   │ https://3000--workspace.gitpod.dev  │ private  │
│ 5002 │ open   │ https://5002--workspace.gitpod.dev  │ private  │
└──────┴────────┴──────────────────────────────────────┴──────────┘
```

---

## Best Practices

### For Development:

1. **Start backend first:**
   ```bash
   cd backend && npm start
   ```
   Wait for the URL banner

2. **Start frontend second:**
   ```bash
   cd frontend && npm start
   ```
   Wait for "Compiled successfully!" and the URL banner

3. **Use the Ports panel** for easy access to URLs

4. **Keep terminals visible** so you can see the URLs

### For Sharing:

1. **Make frontend public:**
   ```bash
   gp ports visibility 3000:public
   ```

2. **Share the URL** from the Ports panel

3. **Keep backend private** for security

---

## Summary

✅ **URLs are displayed** in the terminal after startup  
✅ **Look for the custom banner** with ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  
✅ **Use the Ports panel** for easy access  
✅ **Wait for compilation** before looking for URLs  
✅ **Scroll up** if you missed the banner  

**The URLs ARE there - you just need to know where to look!**

---

For more information:
- See [README.md](README.md) for comprehensive documentation
- See [QUICKSTART.md](QUICKSTART.md) for quick reference
- See [PORT_MAPPING_GUIDE.md](PORT_MAPPING_GUIDE.md) for technical details
