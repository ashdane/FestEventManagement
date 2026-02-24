# Felicity Event Management System (FEMS)

MERN-based system for participant registration, organizer event management, and admin governance.

## 1) Setup and Local Run

### Backend

1. `cd backend`
2. `npm install`
3. Create env file:
   - Windows: `copy .env.example .env`
4. Fill `backend/.env` with real values:
   - `PORT`
   - `MONGO_URI`
   - `JWT_SECRET`
   - `EMAIL_USER`, `EMAIL_PASS`
   - `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`
   - `CORS_ORIGIN`
5. Start server:
   - `npm start`

### Frontend

1. `cd frontend`
2. `npm install`
3. Create env file:
   - Windows: `copy .env.example .env`
4. Set API base URL:
   - `VITE_API_BASE_URL=<backend_base_url>`
5. Start frontend:
   - `npm run dev`

## 2) Deployment URLs

- Frontend URL: `https://festeventmanagement.vercel.app`
- Backend API base URL: `https://festeventmanagement-w21b.onrender.com`

## 3) Libraries, Frameworks, and Modules (with justification)

### Backend

- `express`: REST API routing and middleware pipeline.
- `mongoose`: schema validation, relations, and MongoDB query layer.
- `dotenv`: environment configuration for local/deployed environments.
- `bcrypt`: password hashing for secure storage.
- `jsonwebtoken`: role-based JWT authentication for protected routes.
- `multer`: multipart/form-data parsing for uploads.
- `cloudinary` + `multer-storage-cloudinary`: payment proof and media upload storage.
- `nodemailer`: registration and ticket-related email delivery.
- `qrcode`: QR generation for ticket identity/attendance flow.
- `nodemon` (dev): hot-reload during local backend iteration.

### Frontend

- `react`: component-based UI.
- `react-router-dom`: role-aware route navigation and page flows.
- `jwt-decode`: decode token payload for client-side role checks.
- `jsqr`: fallback QR decode from file when `BarcodeDetector` is unavailable.
- `vite`: fast local dev server and production build.

## 4) Advanced Features Chosen

### Tier A (2/2 selected)

1. Merchandise Payment Approval Workflow
2. QR Scanner and Attendance Tracking

### Tier B (2/2 selected)

1. Real-Time Discussion Forum (polling-based implementation)
2. Organizer Password Reset Workflow

### Tier C (1/1 selected)

1. Add to Calendar Integration

## 5) Feature Design and Technical Decisions

### Tier A: Merchandise Payment Approval

- Purchase endpoint accepts payment proof upload and creates pending ticket/order.
- Organizer approval/rejection endpoints drive state transitions.
- Stock decrement and successful ticket state occur only on approval.
- QR + confirmation email are generated post-approval only.

### Tier A: QR Attendance Tracking

- Attendance scan endpoint validates ticket and prevents duplicate check-ins.
- Attendance page shows total/checked-in/pending metrics.
- Manual override and audit logging are included for exception handling.
- CSV export endpoint provides attendance report download.

### Tier B: Discussion Forum

- Event-linked forum with post/reply/reaction support.
- Organizer moderation includes pin/delete controls.
- Notification polling endpoint provides new-message indicators.
- Implemented with HTTP polling instead of socket transport for simplicity and reliability.

### Tier B: Organizer Password Reset Workflow

- Organizer raises reset request with reason.
- Admin views pending requests and history, approves/rejects with comments.
- On approval, system generates new password and returns it to admin for manual sharing.
- Status lifecycle persisted as Pending/Approved/Rejected.

### Tier C: Add to Calendar Integration

- Registered events export as `.ics`.
- Direct links generated for Google Calendar and Outlook.
- Supports batch export for selected/all registered events.
- Reminder minutes and timezone are handled via request params/headers.

## 6) Assumptions and Known Limitations

1. Forum is real-time via short-interval polling, not WebSocket push.
2. Organizer credentials (created/reset) are manually communicated by admin.
3. QR camera/file support depends on browser capabilities; manual ticket input is always available.
4. Backend root may show `Cannot GET /`; evaluation should use `/api/*` routes.
5. Team-specific analytics/flows are minimal because Hackathon Team Registration was not chosen.

