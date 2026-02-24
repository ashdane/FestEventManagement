# Felicity Event Management System (FEMS)

MERN-based event management platform for Participants, Organizers, and Admin.

## Deployed URLs

- Frontend: https://festeventmanagement.vercel.app
- Backend Base API: https://festeventmanagement-w21b.onrender.com

## Local Setup

### Backend

1. Go to backend:
   - `cd backend`
2. Install dependencies:
   - `npm install`
3. Create env file from template:
   - `copy .env.example .env` (Windows)
4. Fill real values in `.env`:
   - `MONGO_URI`, `JWT_SECRET`, `EMAIL_*`, `CLOUDINARY_*`, `CORS_ORIGIN`
5. Run backend:
   - `npm start`

### Frontend

1. Go to frontend:
   - `cd frontend`
2. Install dependencies:
   - `npm install`
3. Create env file from template:
   - `copy .env.example .env` (Windows)
4. Set:
   - `VITE_API_BASE_URL=https://festeventmanagement-w21b.onrender.com`
5. Run frontend:
   - `npm run dev`

## Production Deployment

### Frontend (Vercel)

- Root directory: `frontend`
- Build command: `npm run build`
- Output directory: `dist`
- Environment variable:
  - `VITE_API_BASE_URL=https://festeventmanagement-w21b.onrender.com`

### Backend (Render)

- Root directory: `backend`
- Build command: `npm install`
- Start command: `npm start`
- Environment variables:
  - `MONGO_URI`, `JWT_SECRET`, `EMAIL_*`, `CLOUDINARY_*`
  - `CORS_ORIGIN=https://festeventmanagement.vercel.app`

## Chosen Advanced Features

### Tier A (2 chosen)

1. Merchandise Payment Approval Workflow
   - participant payment proof upload
   - organizer approve/reject
   - stock decrement on approval
   - ticket + QR + email on approval
2. QR Scanner & Attendance Tracking
   - scan attendance endpoint
   - duplicate prevention
   - live checked-in vs pending dashboard
   - attendance CSV export
   - manual override + attendance audit log

### Tier B (2 chosen)

1. Real-Time Discussion Forum (polling-based)
   - event discussion, replies, reactions
   - organizer moderation: pin/delete
   - organizer announcements
   - notifications endpoint for new messages
2. Organizer Password Reset Workflow
   - organizer reset request
   - admin approve/reject with comments
   - status tracking + history
   - generated password shown to admin on approval

### Tier C (1 chosen)

1. Add to Calendar Integration
   - direct Google + Outlook links
   - downloadable `.ics`
   - automatic timezone handling (request/query based fallback)
   - reminder configuration
   - batch export for selected events

## Assumptions / Known Limitations

1. Camera QR scanning uses browser `BarcodeDetector`; unsupported browsers fall back to manual ticket entry/file scan behavior.
2. Forum real-time is implemented with polling, not WebSockets.
3. Admin shares generated organizer credentials manually (displayed in Admin dashboard after create/reset approval).
4. Attendance scanner is role-protected for organizers and event ownership-checked on backend.
5. Root backend URL may return `Cannot GET /`; APIs are under `/api/*`.

## Security Notes

1. `.env` files are gitignored and should never be committed.
2. Use `.env.example` templates for sharing config shape only.
3. If secrets were exposed previously, rotate MongoDB/JWT/Gmail/Cloudinary credentials.

## Evaluator Sanity Test Checklist

### Admin

1. Login as admin.
2. Create organizer and verify generated credentials shown.
3. Disable organizer and verify login blocked with disabled message.
4. Archive organizer and verify login blocked with archived message.
5. Remove organizer and verify account deleted.
6. Approve/reject organizer reset requests and verify reset history.

### Organizer

1. Create draft event.
2. Define registration form.
3. Publish event.
4. Open event detail, verify analytics and participants list.
5. Export participants CSV.

### Participant

1. Browse events with search/filters/trending/followed options.
2. Open event details.
3. Register for event and verify dashboard record.
4. Update profile and follow/unfollow organizers.

### Merchandise

1. Purchase with payment proof (pending approval).
2. Organizer approves/rejects.
3. Verify stock updates and successful ticket flow.

### Attendance

1. Scan valid ticket.
2. Verify duplicate scan returns conflict.
3. Manual override check-in/check-out.
4. Verify audit entries.
5. Export attendance CSV.

### Calendar

1. Open Google/Outlook links from participant dashboard.
2. Download single/all/selected batch `.ics` exports.
3. Verify timezone/reminder options affect generated links/ics.
