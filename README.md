# Chat App — Enhanced Edition

## New Features Added
- **Group Chat** — Create groups, add/remove members, group messaging
- **Video Sharing** — Send videos (up to 50MB) in direct & group chats
- **File Sharing** — Share any file type (PDFs, docs, zips, etc. up to 20MB)
- **Media Gallery** — Right sidebar shows Images / Videos / Files tabs
- **Unseen badges** — for both direct and group chats

## Setup

### Server
```bash
cd server
npm install
# Edit .env with your MongoDB URI, JWT secret, Cloudinary credentials
npm run server
```

### Client
```bash
cd client
npm install
# Edit .env: VITE_BACKEND_URL=http://localhost:5000
npm run dev
```

## Environment Variables

### server/.env
```
MONGODB_URI=your_mongodb_connection_string
JWT_SECRET=your_jwt_secret
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
PORT=5000
```

### client/.env
```
VITE_BACKEND_URL=http://localhost:5000
```

## Notes
- Videos and files are uploaded via Cloudinary (resource_type: video / raw)
- Cloudinary free tier supports ~1GB storage
- For large video uploads, consider upgrading Cloudinary plan
