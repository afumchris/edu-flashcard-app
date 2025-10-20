# Port Mapping & URL Access Guide

## How Port Forwarding Works in Gitpod

### Automatic Port Forwarding

The `.devcontainer/devcontainer.json` configures automatic port forwarding:

```json
{
  "forwardPorts": [3000, 5002],
  "portsAttributes": {
    "3000": {
      "label": "Frontend (React)",
      "onAutoForward": "openPreview"
    },
    "5002": {
      "label": "Backend (API)",
      "onAutoForward": "notify"
    }
  }
}
```

### URL Format

**Gitpod URL Pattern:**
```
https://[PORT]--[WORKSPACE_ID].[REGION].gitpod.dev
```

**Example:**
- Workspace URL: `https://workspace-abc123.eu-central-1.gitpod.dev`
- Backend (5002): `https://5002--workspace-abc123.eu-central-1.gitpod.dev`
- Frontend (3000): `https://3000--workspace-abc123.eu-central-1.gitpod.dev`

### How the Application Detects URLs

#### Backend Detection (`backend/server.js`)

```javascript
app.listen(PORT, '0.0.0.0', () => {
  const isGitpod = process.env.GITPOD_WORKSPACE_ID !== undefined;
  const gitpodUrl = process.env.GITPOD_WORKSPACE_URL;
  
  if (isGitpod && gitpodUrl) {
    // Extract workspace URL and construct port-specific URL
    const workspaceUrl = gitpodUrl.replace('https://', '');
    const backendUrl = `https://${PORT}--${workspaceUrl}`;
    console.log(`📍 Backend URL: ${backendUrl}`);
  } else {
    console.log(`📍 Backend URL: http://localhost:${PORT}`);
  }
});
```

#### Frontend Detection (`frontend/start-with-url.js`)

```javascript
const isGitpod = process.env.GITPOD_WORKSPACE_ID !== undefined;
const gitpodUrl = process.env.GITPOD_WORKSPACE_URL;

if (isGitpod && gitpodUrl) {
  const workspaceUrl = gitpodUrl.replace('https://', '');
  const frontendUrl = `https://3000--${workspaceUrl}`;
  console.log(`📍 Frontend URL: ${frontendUrl}`);
}
```

#### Frontend API Configuration (`frontend/src/config/api.js`)

```javascript
const getBackendUrl = () => {
  const isGitpod = window.location.hostname.includes('gitpod.dev');
  
  if (isGitpod) {
    // Replace port in current URL (3000 -> 5002)
    const currentUrl = window.location.hostname;
    const backendUrl = currentUrl.replace(/^\d+--/, '5002--');
    return `${window.location.protocol}//${backendUrl}`;
  }
  
  return process.env.REACT_APP_BACKEND_URL || 'http://localhost:5002';
};
```

---

## Environment Variables

### Gitpod Environment Variables

Gitpod automatically sets these variables:

```bash
GITPOD_WORKSPACE_ID=abc123def456
GITPOD_WORKSPACE_URL=https://workspace-abc123.eu-central-1.gitpod.dev
GITPOD_WORKSPACE_CLUSTER_HOST=eu-central-1.gitpod.dev
```

### Application Environment Variables

**Backend (`.env`):**
```bash
OPENAI_API_KEY=your_key_here  # Optional
PORT=5002                      # Default: 5002
NODE_ENV=development           # Default: development
```

**Frontend (`.env.local`):**
```bash
REACT_APP_BACKEND_URL=http://localhost:5002  # Optional, auto-detected
```

---

## Port Access Methods

### Method 1: Automatic (Recommended)

When you start the servers, URLs are displayed in the terminal:

```bash
# Backend
cd backend && npm start

🚀 Backend API Server Started
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📍 Backend URL: https://5002--workspace-abc123.gitpod.dev
🌐 Environment: Gitpod
⚡ Port: 5002
✅ Status: Ready
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

**Just click the URL!**

### Method 2: Ports Panel

1. Open the "Ports" panel in Gitpod (bottom panel)
2. Find port 3000 or 5002
3. Click the URL in the "Address" column
4. Or right-click → "Open Browser"

### Method 3: Manual Construction

If you know your workspace URL:
```
Workspace: https://workspace-abc123.eu-central-1.gitpod.dev
Backend:   https://5002--workspace-abc123.eu-central-1.gitpod.dev
Frontend:  https://3000--workspace-abc123.eu-central-1.gitpod.dev
```

### Method 4: Command Line

```bash
# Get workspace URL
echo $GITPOD_WORKSPACE_URL

# Construct backend URL
echo "https://5002--$(echo $GITPOD_WORKSPACE_URL | sed 's|https://||')"

# Construct frontend URL
echo "https://3000--$(echo $GITPOD_WORKSPACE_URL | sed 's|https://||')"
```

---

## Port Visibility

### Public vs Private Ports

By default, ports are **private** (only you can access).

**Make a port public:**
1. Open Ports panel
2. Right-click on port
3. Select "Port Visibility" → "Public"

**Or via command line:**
```bash
gp ports visibility 3000:public
gp ports visibility 5002:public
```

### Security Considerations

- **Frontend (3000):** Can be public (read-only interface)
- **Backend (5002):** Should be private (API with file uploads)
- **Development:** Keep both private
- **Demo/Testing:** Make frontend public only

---

## Troubleshooting

### Port Not Accessible

**Check if server is running:**
```bash
# Backend
curl http://localhost:5002/

# Frontend
curl http://localhost:3000/
```

**Check port forwarding:**
```bash
gp ports list
```

**Expected output:**
```
PORT    STATUS    URL                                              VISIBILITY
3000    open      https://3000--workspace-abc123.gitpod.dev       private
5002    open      https://5002--workspace-abc123.gitpod.dev       private
```

### Wrong URL Displayed

**Check environment variables:**
```bash
echo "GITPOD_WORKSPACE_ID: $GITPOD_WORKSPACE_ID"
echo "GITPOD_WORKSPACE_URL: $GITPOD_WORKSPACE_URL"
```

**If empty, you're in local mode:**
- URLs will be `http://localhost:PORT`
- This is correct for local development

### CORS Errors

The backend is configured to accept requests from Gitpod URLs:

```javascript
app.use(cors({
  origin: [
    'http://localhost:3000',
    /^https:\/\/3000--.*\.gitpod\.dev$/,
    /^https:\/\/.*\.gitpod\.dev$/
  ]
}));
```

If you get CORS errors:
1. Check backend is running
2. Check frontend is using correct backend URL
3. Check port visibility settings

---

## Testing Port Mapping

### Test Backend URL Detection

```bash
# Local
cd backend && node server.js

# Gitpod (simulated)
GITPOD_WORKSPACE_ID=test \
GITPOD_WORKSPACE_URL=https://workspace-test.gitpod.dev \
cd backend && node server.js
```

### Test Frontend URL Detection

```bash
# Local
cd frontend && npm start

# Gitpod (simulated)
GITPOD_WORKSPACE_ID=test \
GITPOD_WORKSPACE_URL=https://workspace-test.gitpod.dev \
cd frontend && npm start
```

### Test API Connection

```bash
# From frontend, check backend URL
curl $(node -e "
const api = require('./src/config/api.js');
console.log(api.getBackendUrl());
")
```

---

## Best Practices

### Development Workflow

1. **Start backend first:**
   ```bash
   cd backend && npm start
   ```
   Note the displayed URL

2. **Start frontend second:**
   ```bash
   cd frontend && npm start
   ```
   Note the displayed URL

3. **Access frontend URL** in browser

4. **Frontend automatically connects** to backend

### Sharing Your Work

1. Make frontend port public:
   ```bash
   gp ports visibility 3000:public
   ```

2. Share the frontend URL (from Ports panel)

3. Keep backend private for security

### Debugging

1. **Check server logs:**
   ```bash
   tail -f /tmp/backend.log
   tail -f /tmp/frontend.log
   ```

2. **Check port status:**
   ```bash
   gp ports list
   ```

3. **Test connectivity:**
   ```bash
   curl http://localhost:5002/
   curl http://localhost:3000/
   ```

---

## Summary

✅ **Automatic Detection:** URLs are auto-detected and displayed on startup  
✅ **Environment Aware:** Works in Gitpod and local development  
✅ **Port Forwarding:** Configured in `.devcontainer/devcontainer.json`  
✅ **CORS Configured:** Backend accepts requests from all environments  
✅ **Easy Access:** Just click the URL in the terminal  

**No manual configuration needed!**

---

For more information:
- See [README.md](README.md) for comprehensive documentation
- See [QUICKSTART.md](QUICKSTART.md) for quick reference
- See [.devcontainer/devcontainer.json](.devcontainer/devcontainer.json) for port configuration
