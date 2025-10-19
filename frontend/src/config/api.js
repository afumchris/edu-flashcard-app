/**
 * API Configuration
 * Automatically detects the correct backend URL for different environments
 */

// Detect if we're in Gitpod environment
const isGitpod = window.location.hostname.includes('gitpod.dev');

// Extract the base Gitpod URL if in Gitpod
const getBackendUrl = () => {
  if (isGitpod) {
    // In Gitpod, replace the port in the URL
    // Example: https://3000--workspace-id.gitpod.dev -> https://5002--workspace-id.gitpod.dev
    const currentUrl = window.location.hostname;
    const backendUrl = currentUrl.replace(/^\d+--/, '5002--');
    return `${window.location.protocol}//${backendUrl}`;
  }
  
  // Check for environment variable (can be set in .env.local)
  if (process.env.REACT_APP_BACKEND_URL) {
    return process.env.REACT_APP_BACKEND_URL;
  }
  
  // Default to localhost for local development
  return 'http://localhost:5002';
};

export const API_BASE_URL = getBackendUrl();

// Log the detected URL for debugging
console.log('🔗 Backend API URL:', API_BASE_URL);

export default {
  baseURL: API_BASE_URL,
  timeout: 180000,
  headers: {
    'Content-Type': 'application/json',
  },
};
