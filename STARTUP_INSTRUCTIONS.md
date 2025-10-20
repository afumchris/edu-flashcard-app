# Startup Instructions

This document provides instructions for starting the Educational Flashcard Application.

## Overview

The application consists of two main components:
- **Backend**: Node.js/Express server running on port 5002
- **Frontend**: React application running on port 3000

## Prerequisites

Before starting the application, ensure you have:
- Node.js (v14 or higher)
- npm (Node Package Manager)
- All dependencies installed

## Installation

If you haven't installed dependencies yet, run:

```bash
# Install backend dependencies
cd backend
npm install

# Install frontend dependencies
cd ../frontend
npm install
```

## Starting the Application

### Option 1: Start Both Services Separately

#### Start the Backend Server

```bash
cd backend
npm start
```

The backend server will start on port 5002.

#### Start the Frontend Application

Open a new terminal and run:

```bash
cd frontend
npm start
```

The frontend application will start on port 3000.

### Option 2: Start Both Services (One-liner)

From the project root directory:

```bash
cd backend && npm start & cd ../frontend && npm start
```

## Accessing the Application

Once both services are running:

- **Frontend Application**: Access the main application interface
  - Local: `http://localhost:3000`
  - Gitpod: The frontend URL will be displayed in the terminal or available in the Ports view

- **Backend API**: The backend server handles API requests
  - Local: `http://localhost:5002`
  - Gitpod: The backend URL will be displayed in the terminal or available in the Ports view

## Environment Configuration

### Backend

The backend uses the following default configuration:
- Port: 5002
- Supports file uploads (PDF, DOCX)
- Integrates with OpenAI API for flashcard generation

If you need to configure environment variables, create a `.env` file in the `backend` directory.

### Frontend

The frontend is configured to proxy API requests to `http://localhost:5002`.

If you need to configure environment variables, create a `.env` file in the `frontend` directory based on `.env.example`.

## Stopping the Application

To stop the services:
- Press `Ctrl + C` in each terminal window where the services are running

## Troubleshooting

### Port Already in Use

If you encounter a "port already in use" error:

```bash
# Find and kill the process using port 5002 (backend)
lsof -ti:5002 | xargs kill -9

# Find and kill the process using port 3000 (frontend)
lsof -ti:3000 | xargs kill -9
```

### Dependencies Issues

If you encounter dependency errors:

```bash
# Clear node_modules and reinstall
cd backend
rm -rf node_modules package-lock.json
npm install

cd ../frontend
rm -rf node_modules package-lock.json
npm install
```

### API Connection Issues

Ensure:
1. The backend server is running before starting the frontend
2. The proxy configuration in `frontend/package.json` points to the correct backend URL
3. CORS is properly configured in the backend

## Development Notes

- The frontend uses React with Tailwind CSS for styling
- The backend uses Express.js with Multer for file uploads
- File uploads are stored in the `backend/uploads/` directory
- The application uses OpenAI API for generating flashcards from uploaded documents

## Additional Resources

- [README.md](./README.md) - Project overview and features
- [QUICKSTART.md](./QUICKSTART.md) - Quick start guide
- [PORT_MAPPING_GUIDE.md](./PORT_MAPPING_GUIDE.md) - Port configuration details
