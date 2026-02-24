# Felicity Event Management System (FEMS)

MERN-based event management platform for Participants, Organizers, and Admin.

## Setup and Run Steps

### Backend

1. `cd backend`
2. `npm install`
3. Create local env file from template: `copy .env.example .env` (Windows)
4. Fill `backend/.env` with valid values:
   - `PORT`
   - `MONGO_URI`
   - `JWT_SECRET`
   - `EMAIL_USER`, `EMAIL_PASS`
   - `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`
   - `CORS_ORIGIN`
5. Start backend: `npm start`

### Frontend

1. `cd frontend`
2. `npm install`
3. Create local env file from template: `copy .env.example .env` (Windows)
4. Set `VITE_API_BASE_URL` in `frontend/.env`
5. Start frontend: `npm run dev`

## Deployed URLs

- Frontend: `https://festeventmanagement.vercel.app`
- Backend Base API: `https://festeventmanagement-w21b.onrender.com`

## Chosen Advanced Features (Tier A / B / C)

### Tier A (2 features)

1. Merchandise Payment Approval Workflow
2. QR Scanner and Attendance Tracking

### Tier B (2 features)

1. Real-Time Discussion Forum (polling-based updates)
2. Organizer Password Reset Workflow

### Tier C (1 feature)

1. Add to Calendar Integration

## Deployment Config

### Frontend (Vercel)

- Project root: `frontend`
- Build command: `npm run build`
- Output directory: `dist`
- Environment variable: `VITE_API_BASE_URL=https://festeventmanagement-w21b.onrender.com`

### Backend (Render)

- Project root: `backend`
- Build command: `npm install`
- Start command: `npm start`
- Environment variables required:
  - `PORT`
  - `MONGO_URI`
  - `JWT_SECRET`
  - `EMAIL_USER`, `EMAIL_PASS`
  - `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`
  - `CORS_ORIGIN=https://festeventmanagement.vercel.app`

## Known Limitations and Assumptions

1. QR file scanning prefers browser `BarcodeDetector`; when unavailable, a fallback decoder is used. Manual ticket entry remains available.
2. Forum updates use polling at interval, not WebSocket transport.
3. Admin shares generated organizer credentials manually after account creation/reset approval.
4. Root backend URL may return `Cannot GET /`; API routes are under `/api/*`.
5. Environment secrets are expected from runtime env files/hosting settings; example values are provided only in `.env.example` files.
