# CloudVault — Session Walkthrough (July 1, 2026)

## What we did

### 1. Project Review
- Explored the full **CloudVault** project structure (MERN stack + AWS S3)
- Created a comprehensive [project_overview.md](file:///C:/Users/teaml/.gemini/antigravity-ide/brain/124ff0e1-65a0-495e-8a84-d42110a69226/project_overview.md) documenting architecture, API endpoints, features, and observations

### 2. Security: `.env` Protection
- Created [.env.example](file:///c:/Users/teaml/Pictures/Project%20Based%20Learning/Project%20Based%20Learning/Digital%20Document%20Management%20System%20on%20Cloud/server/.env.example) — safe-to-share template with placeholder values
- Created [validateEnv.js](file:///c:/Users/teaml/Pictures/Project%20Based%20Learning/Project%20Based%20Learning/Digital%20Document%20Management%20System%20on%20Cloud/server/utils/validateEnv.js) — startup check that fails fast if env vars are missing
- Wired validator into [server.js](file:///c:/Users/teaml/Pictures/Project%20Based%20Learning/Project%20Based%20Learning/Digital%20Document%20Management%20System%20on%20Cloud/server/server.js) (runs right after `dotenv.config()`)

### 3. Bug Fix: Scoped DNS Override
- Fixed [db.js](file:///c:/Users/teaml/Pictures/Project%20Based%20Learning/Project%20Based%20Learning/Digital%20Document%20Management%20System%20on%20Cloud/server/config/db.js) — DNS override is now scoped to only the MongoDB connection, then restored via `finally` block

### 4. Running the Project
- Fixed PowerShell execution policy for npm
- Started both servers and confirmed the app loads at `http://localhost:3000`

## Files Changed

| File | Change |
|------|--------|
| `server/.env.example` | **NEW** — env template |
| `server/utils/validateEnv.js` | **NEW** — startup env validation |
| `server/server.js` | **MODIFIED** — added validateEnv call |
| `server/config/db.js` | **MODIFIED** — scoped DNS override |

## How to Run Again
```powershell
# Terminal 1 — Backend
cd "c:\Users\teaml\Pictures\Project Based Learning\Project Based Learning\Digital Document Management System on Cloud\server"
npm run dev

# Terminal 2 — Frontend
cd "c:\Users\teaml\Pictures\Project Based Learning\Project Based Learning\Digital Document Management System on Cloud\client"
npm start
```
Then open **http://localhost:3000**
