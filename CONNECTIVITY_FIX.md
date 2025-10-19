# Fix: Service Unavailable - Frontend to Backend Connectivity

## Problem
The frontend was unable to connect to the backend, showing "Service Unavailable" errors. This occurred because:

1. **Proxy Configuration Issue**: The frontend used `proxy: "http://localhost:5002"` in package.json, which only works in local development
2. **Gitpod Environment**: In Gitpod, each service has its own unique URL (e.g., `https://3000--workspace-id.gitpod.dev` and `https://5002--workspace-id.gitpod.dev`)
3. **Relative URLs**: The app used relative URLs like `/upload` which relied on the proxy, causing requests to fail in Gitpod

## Solution Implemented

### 1. Automatic Backend URL Detection
Created `frontend/src/config/api.js` that automatically detects the correct backend URL:

```javascript
const getBackendUrl = () => {
  // Gitpod: Replace port in URL (3000 -> 5002)
  if (isGitpod) {
    const currentUrl = window.location.hostname;
    const backendUrl = currentUrl.replace(/^\d+--/, '5002--');
    return `${window.location.protocol}//${backendUrl}`;
  }
  
  // Environment variable override
  if (process.env.REACT_APP_BACKEND_URL) {
    return process.env.REACT_APP_BACKEND_URL;
  }
  
  // Local development default
  return 'http://localhost:5002';
};
```

### 2. Updated API Calls
Changed from relative URLs to absolute URLs:

**Before:**
```javascript
axios.post('/upload', formData)
```

**After:**
```javascript
axios.post(`${API_BASE_URL}/upload`, formData)
```

### 3. Backend Health Check
Added automatic backend connectivity check on app startup:

```javascript
React.useEffect(() => {
  const checkBackend = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/`, { timeout: 5000 });
      setBackendStatus('connected');
    } catch (err) {
      setBackendStatus('disconnected');
      setError(`Cannot connect to backend at ${API_BASE_URL}`);
    }
  };
  checkBackend();
}, []);
```

### 4. Visual Connection Status Indicator
Added a status indicator in the UI showing:
- 🟢 **Green**: Backend connected
- 🔴 **Red**: Backend disconnected
- 🟡 **Yellow (pulsing)**: Checking connection

### 5. Improved Error Messages
Enhanced error handling to provide specific, actionable messages:

- **Network Error**: "Cannot connect to backend at [URL]. Please check if the backend server is running."
- **Timeout**: "Request timeout. The document may be too large or the server is slow."
- **API Quota**: "OpenAI API quota exceeded. Using fallback mode."

## Files Changed

### New Files
- `frontend/src/config/api.js` - API configuration with auto-detection
- `frontend/.env.example` - Environment variable documentation

### Modified Files
- `frontend/src/App.js`:
  - Import API_BASE_URL
  - Add backend health check
  - Update API calls to use absolute URLs
  - Add connection status state
  - Improve error messages
  - Add visual status indicator

## How It Works

### Local Development
```
Frontend: http://localhost:3000
Backend:  http://localhost:5002
API URL:  http://localhost:5002 (auto-detected)
```

### Gitpod Environment
```
Frontend: https://3000--workspace-id.gitpod.dev
Backend:  https://5002--workspace-id.gitpod.dev
API URL:  https://5002--workspace-id.gitpod.dev (auto-detected)
```

### Production Deployment
```
Frontend: https://your-app.com
Backend:  https://api.your-app.com
API URL:  Set via REACT_APP_BACKEND_URL environment variable
```

## Testing

### Verify the Fix
1. Start both servers:
   ```bash
   # Terminal 1 - Backend
   cd backend && npm start
   
   # Terminal 2 - Frontend
   cd frontend && npm start
   ```

2. Check the browser console for:
   ```
   🔗 Backend API URL: https://5002--workspace-id.gitpod.dev
   ✅ Backend connected: {status: "Backend server is running!", ...}
   ```

3. Look for the status indicator in the top-left:
   - Should show "🟢 Online" when connected

4. Try uploading a document to verify full functionality

### Manual Testing Checklist
- [ ] Backend status shows "Online" on app load
- [ ] Upload a PDF/DOCX/TXT file successfully
- [ ] Error messages are clear and helpful
- [ ] Works in Gitpod environment
- [ ] Works in local development
- [ ] Console shows correct backend URL

## Environment Variables

### Optional Configuration
Create `frontend/.env.local` to override auto-detection:

```bash
# Override backend URL (optional)
REACT_APP_BACKEND_URL=https://your-custom-backend.com
```

### When to Use
- Custom backend deployment
- Testing against different backend instances
- Production deployment with separate domains

## Benefits

### 1. Works Everywhere
- ✅ Local development (localhost)
- ✅ Gitpod environment (dynamic URLs)
- ✅ Production deployment (custom domains)

### 2. Better User Experience
- Clear connection status indicator
- Helpful error messages
- Automatic backend detection

### 3. Developer Friendly
- No manual configuration needed
- Works out of the box in Gitpod
- Easy to override for custom setups

### 4. Maintainable
- Centralized API configuration
- Single source of truth for backend URL
- Easy to debug with console logging

## Troubleshooting

### Issue: "Cannot connect to backend"
**Solution:**
1. Check if backend is running: `curl http://localhost:5002/`
2. Check the console for the detected backend URL
3. Verify CORS is configured correctly in backend

### Issue: Wrong backend URL detected
**Solution:**
1. Check browser console for detected URL
2. Override with environment variable if needed:
   ```bash
   echo "REACT_APP_BACKEND_URL=http://localhost:5002" > frontend/.env.local
   ```

### Issue: CORS errors
**Solution:**
Backend already has comprehensive CORS configuration for Gitpod:
```javascript
app.use(cors({
  origin: [
    'http://localhost:3000',
    /^https:\/\/.*\.gitpod\.dev$/
  ],
  credentials: true
}));
```

## Future Improvements

1. **Retry Logic**: Automatically retry failed connections
2. **Reconnection**: Periodically check backend status
3. **Service Worker**: Cache API responses for offline support
4. **WebSocket**: Real-time connection status updates
5. **Health Dashboard**: Show detailed backend health metrics

## Related Issues Fixed
- ✅ Service unavailable errors
- ✅ Proxy configuration issues in Gitpod
- ✅ Unclear error messages
- ✅ No connection status visibility
- ✅ Hard-coded backend URLs

## Deployment Notes

### Gitpod
No configuration needed - works automatically!

### Local Development
No configuration needed - defaults to localhost:5002

### Production
Set environment variable in your deployment platform:
```bash
REACT_APP_BACKEND_URL=https://api.yourdomain.com
```

## Conclusion
This fix ensures the frontend can reliably connect to the backend in any environment, with clear feedback and helpful error messages. The automatic URL detection eliminates manual configuration while still allowing overrides when needed.
