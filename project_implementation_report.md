# Digital Document Management System on Cloud - Implementation Report

## 1. Project Overview
- **Project Name:** Digital Document Management System on Cloud (CloudVault)
- **Purpose of the project:** To provide a secure, scalable, and intuitive cloud-based platform for users to upload, manage, share, and organize their digital documents.
- **Main objectives:** Enable secure file storage using AWS S3, offer robust file organization (folders, tags, favorites), facilitate collaboration through a permission-based sharing system, and track storage limits.
- **Problem it solves:** Eliminates the need for local file storage by providing accessible cloud storage with sharing capabilities, secure access through pre-signed URLs, and an organized folder structure to prevent document loss.

## 2. Technology Stack
- **Frontend:** React.js, TailwindCSS
- **Backend:** Node.js, Express.js
- **Database:** MongoDB (using Mongoose ORM)
- **Authentication:** JWT (JSON Web Tokens), bcryptjs, Passport.js (Google OAuth20)
- **Cloud Services:** AWS S3 (Simple Storage Service) using `@aws-sdk/client-s3`
- **Storage:** AWS S3 for binary files, MongoDB for metadata
- **Email Service:** Nodemailer (SMTP/Ethereal fallback)
- **Libraries (Frontend):** Axios, React Router DOM, Framer Motion, Recharts, Chart.js, React Dropzone, React Toastify, date-fns
- **Icons/UI Libraries:** Lucide React, React Icons
- **Other APIs:** Google OAuth API
- **Development Tools:** Nodemon, Multer (Memory Storage)

## 3. Complete Folder Structure
### Frontend (`client/`)
- `src/components/`: Contains reusable UI components (Common elements, Layout wrappers, Folder components).
- `src/context/`: Contains React Context providers for global state management (`AuthContext.js`, `NotificationContext.js`).
- `src/pages/`: Main application views (Dashboard, Auth, Documents, Trash, Search, SharedItems, etc.).
- `src/services/`: API integration layer (`api.js` sets up Axios interceptors and defines API call methods).
- `src/utils/`: Helper and utility functions for the frontend.

### Backend (`server/`)
- `config/`: Configuration files for MongoDB connection (`db.js`), AWS S3 client (`s3.js`), and Passport strategies (`passport.js`).
- `controllers/`: Core business logic handling HTTP requests and responses for each feature (Auth, Documents, Folders, Shares, etc.).
- `jobs/`: Automated background tasks (`cronJobs`).
- `middleware/`: Custom Express middleware for authentication (`auth.js`) and error handling.
- `models/`: Mongoose schemas defining the database structure (User, Document, Folder, Notification, OTP, Share, Version).
- `routes/`: Express router definitions mapping API endpoints to controller functions.
- `services/`: Complex business logic abstracted from controllers (e.g., `sharedWithMeService.js`).
- `utils/`: Helper utilities such as environment validation (`validateEnv.js`), email templates, and the email sender (`sendEmail.js`).

## 4. Backend Architecture
- **Server structure:** An Express.js application configured with security middleware (Helmet, CORS, Rate Limiting), JSON/URL-encoded body parsers (with 50MB limits), and modular routing.
- **Routes:** API endpoints are grouped by resource (e.g., `/api/auth`, `/api/documents`) and mounted in `server.js`.
- **Controllers:** Handle request validation via `express-validator`, interact with MongoDB models, perform AWS S3 operations, and format API responses.
- **Models:** Mongoose schemas with predefined validation rules, default values, and optimized database indexes (compound, text, and sparse indexes).
- **Middleware:** `protect` middleware verifies JWTs and attaches the user object to the request. Error handlers catch Multer file size errors and general server errors.
- **Utilities:** Include email sending capabilities and environment variable validation before server startup.
- **Services:** Separate logic for complex data aggregations.
- **API structure:** RESTful architecture adhering to standard HTTP methods and status codes.
- **Error handling:** Global error handling middleware formats error responses. Validation errors are caught early in controllers.
- **JWT Authentication:** Tokens are generated on login/registration, sent to the client, and required in the `Authorization` header for protected routes.
- **Password Encryption:** Passwords are automatically hashed using `bcryptjs` in a Mongoose `pre('save')` hook.
- **Email Verification / OTP Flow:** A 6-digit OTP is generated, saved in the `OTP` collection (with a 24h TTL), and sent via Nodemailer. Verified via the `/api/auth/verify-otp` endpoint. Supports passwordless login.
- **File Upload Flow:** `multer` receives the file into a memory buffer -> controller checks the user's storage limit atomically -> file is uploaded to AWS S3 via `PutObjectCommand` -> metadata (S3 key, URL, size, mime type) is saved to MongoDB -> success notification is created.

## 5. Frontend Architecture
- **React structure:** Functional components utilizing React Hooks (`useState`, `useEffect`).
- **Components:** Modularized structure separating Layout components (Sidebar, Navbar) from page-specific content.
- **Context API:** 
  - `AuthContext`: Manages user session, authentication state, login/logout functions, and automatically checks for existing tokens on mount.
  - `NotificationContext`: Manages real-time or fetched notifications state globally.
- **Routing:** Handled by `react-router-dom`. Uses custom wrapper components (`ProtectedRoute` and `PublicRoute`) to restrict access based on authentication status.
- **Authentication flow:** User logs in -> JWT is stored in `localStorage` -> `AuthContext` updates state -> user is redirected to the Dashboard.
- **Protected routes:** Wrap core application pages; if a user is unauthenticated, they are redirected to `/login`.
- **API communication:** Centralized in `services/api.js` using `axios`. Interceptors automatically inject the JWT into request headers and handle global 401 (Unauthorized) errors by logging the user out.
- **State management:** Local component state for UI logic, Context API for global state (User, Notifications).

## 6. Database Design
Implemented MongoDB collections using Mongoose:
- **User:** `name`, `email`, `password` (hashed), `avatar`, `storageUsed`, `storageLimit` (default 100MB), `resetPasswordToken`, `resetPasswordExpire`, `isEmailVerified`.
- **Document:** `name`, `originalName`, `description`, `fileType`, `mimeType`, `size`, `s3Key`, `s3Url`, `tags`, `folderId` (ref Folder), `isFavorite`, `isDeleted`, `deletedAt`, `uploadedBy` (ref User). (Includes Text indexes for search).
- **Folder:** `name`, `parentFolderId` (ref Folder), `userId` (ref User). (Compound unique index on userId, parentFolderId, name).
- **Share:** `ownerId` (ref User), `sharedWithUserId` (ref User), `fileId` (ref Document), `folderId` (ref Folder), `permission` (viewer/editor), `shareType` (people/link), `linkToken`, `linkEnabled`, `generalAccess` (restricted/anyone), `expiresAt`, `accessCount`, `lastAccessed`.
- **Notification:** `user` (ref User), `title`, `message`, `type` (success, info, warning, etc.), `icon`, `referenceId`, `referenceType`, `isRead`. (Uses TTL index for 30-day auto-deletion).
- **OTP:** `email`, `otp`, `otpExpiry`, `otpAttempts`, `isVerified`, `createdAt` (TTL index 24h).
- **Version:** `versionNumber`, `fileId` (ref Document), `ownerId`, `s3Key`, `s3Url`, `size`, `mimeType`, `uploadedAt`, `uploadedBy`.

## 7. AWS Services Used
- **AWS S3 (Simple Storage Service):** Utilized as the primary blob storage for all uploaded files.
  - `@aws-sdk/client-s3` is used to instantiate the `S3Client`.
  - `PutObjectCommand`: Used during document and version uploads to stream the file buffer directly into the configured S3 Bucket.
  - `GetObjectCommand` + `getSignedUrl`: Used to securely generate pre-signed URLs (valid for 1 hour) for users to download or preview files without exposing the S3 bucket publicly.
  - `DeleteObjectCommand`: Used to permanently delete physical files from the bucket when a user empties their trash or permanently deletes an item.

## 8. Authentication Module
- **Registration:** Users provide name, email, and strong password. Storage limit is initialized.
- **Login:** Email and password verification. Returns JWT and user object.
- **JWT:** JSON Web Tokens used for stateless session management.
- **Forgot Password:** Generates a crypto-hashed token, saves it with an expiration time, and emails a reset link.
- **Reset Password:** Validates the reset token from the URL and updates the password.
- **OTP Verification:** Email verification and passwordless login flow using short-lived OTP codes.
- **Google OAuth:** Integrated via Passport.js.
- **Logout:** Handled primarily on the frontend by destroying the token and redirecting.
- **Session Handling:** Token stored in `localStorage`. Automatically cleared if the API returns a 401 status.

## 9. File Management Features
- **Upload:** Memory-buffered via Multer, atomic storage check, streamed to S3.
- **Download:** Generates temporary AWS S3 pre-signed URL.
- **Preview:** Generates S3 pre-signed URL for browser viewing.
- **Delete:** Soft delete (sets `isDeleted: true` and `deletedAt`).
- **Restore:** Reverts soft delete status from the Trash bin.
- **Permanent Delete:** Removes from AWS S3, decrements user `storageUsed`, and deletes MongoDB record.
- **Favorites:** Toggle `isFavorite` flag on documents.
- **Search:** Global regex-based search on file names, original names, and types.
- **Folder Creation:** Hierarchical folder structure via `parentFolderId`.
- **Folder Navigation:** Navigating through folders dynamically.
- **Move:** Bulk moving multiple documents into a target folder.
- **Rename/Edit:** Implemented via document update endpoint (`name`, `description`, `tags`).
- **Storage Usage:** Atomically tracked per user (`storageUsed` vs `storageLimit`). Prevents uploads exceeding limit.
- **File Types:** Automatically categorized into Images, PDF, Doc, Xls, Ppt, Text, Video, Audio, Zip based on MIME type.
- **Filtering & Sorting:** API supports pagination, sorting (default `-createdAt`), and filtering by `folderId`, `fileType`, and `favorite`.

## 10. Sharing System
- **Shared with Me:** Items explicitly shared with a user via their email address (`shareType: 'people'`).
- **Shared Links:** Management view for all public/private links generated by the user.
- **Permission Levels:** Viewer, Editor.
- **Link Sharing:** Generates a unique 12-byte hex `linkToken` for URL-based sharing.
- **Expiration:** Schema supports `expiresAt` for time-limited shares.
- **Public/Private Links:** Controlled via `generalAccess` ('restricted' vs 'anyone').
- **Access Validation:** Checks if the link is enabled, restricts access if 'restricted', and verifies expiration dates before granting access. Tracks `accessCount` and `lastAccessed`.

## 11. Dashboard Features
- **Statistics:** Calculates total documents, trash count, favorite count, and total folders.
- **Storage Overview:** Displays total storage used, storage limit, and calculates percentage utilization.
- **Charts / Breakdown:** Aggregates document sizes and counts grouped by `fileType` to feed charting components.
- **Quick Actions:** Recent uploads tracking (documents uploaded in the last 7 days).

## 12. Notification System
Notifications are triggered by backend events (e.g., successful upload, item shared, storage warning at 90%). Stored in the `Notification` collection. Real-time aspects are managed via Context API. The database automatically purges notifications older than 30 days using a MongoDB TTL index.

## 13. Search Module
- **Global Search:** Backend endpoint handles queries using MongoDB `$regex` (case-insensitive) across `name`, `originalName`, and `fileType`.
- **Backend Search Logic:** Integrated directly into the `getDocuments` controller.
- **Performance:** Optimized by a Mongoose text index (`{ name: 'text', description: 'text', tags: 'text' }`).

## 14. Security Features
- **JWT:** Secures API endpoints.
- **Password Hashing:** `bcryptjs` used before saving to DB.
- **Protected APIs:** Express `protect` middleware ensures only authenticated users can access core features.
- **Authorization:** Controllers strictly enforce that users can only access, update, or delete documents and folders where `uploadedBy` matches their User ID.
- **Input Validation:** Strict payload validation via `express-validator` across auth and file routes.
- **File Validation:** Multer `fileFilter` restricts uploads to a strictly defined whitelist of MIME types (PDF, Word, Excel, PPT, Images, ZIP).
- **Secure Cloud Storage:** S3 bucket objects are private by default; accessed only via temporary pre-signed URLs.
- **Rate Limiting:** Protects authentication routes from brute-force attacks.

## 15. User Interface
- **Theme:** Modern dark/blue theme (referenced by `var(--bg-blue-600)`).
- **Layout:** Responsive sidebar and top navigation structure.
- **Components:** Built using TailwindCSS for rapid, utility-first styling.
- **Icons & Feedback:** Extensive use of `lucide-react` icons and `react-toastify` for immediate visual user feedback.

## 16. REST APIs

| Method | Endpoint | Purpose | Auth Required |
|--------|----------|---------|---------------|
| POST | `/api/auth/register` | Register new user | No |
| POST | `/api/auth/login` | Authenticate user | No |
| POST | `/api/auth/passwordless-login` | Login via OTP | No |
| POST | `/api/auth/send-otp` | Send verification OTP | No |
| POST | `/api/auth/verify-otp` | Verify email/login OTP | No |
| GET | `/api/auth/me` | Get current user profile | Yes |
| POST | `/api/documents/upload` | Upload a new file | Yes |
| GET | `/api/documents` | Fetch user documents | Yes |
| GET | `/api/documents/:id/download` | Generate download URL | Yes |
| GET | `/api/documents/:id/preview` | Generate preview URL | Yes |
| PUT | `/api/documents/:id` | Update metadata/rename | Yes |
| DELETE | `/api/documents/:id` | Move document to trash | Yes |
| PUT | `/api/documents/move` | Bulk move to folder | Yes |
| PUT | `/api/documents/:id/restore`| Restore from trash | Yes |
| DELETE | `/api/documents/:id/permanent`| Permanently delete | Yes |
| GET | `/api/documents/stats` | Dashboard statistics | Yes |
| POST | `/api/folders` | Create a folder | Yes |
| POST | `/api/shares` | Share file/folder with user | Yes |
| POST | `/api/shares/link/copy` | Generate shareable link | Yes |
| GET | `/api/shares/link/:token` | Access shared link | No (if public) |
| GET | `/api/notifications` | Fetch user notifications | Yes |
| POST | `/api/versions/upload` | Upload new document version | Yes |

## 17. Application Workflow
1. **User Registration:** User signs up -> `User` document created -> OTP sent for verification.
2. **Login:** User authenticates -> receives JWT -> UI redirects to Dashboard.
3. **Upload:** User selects file -> validated by Multer -> Backend atomically checks storage -> File streamed to AWS S3 -> Metadata saved to MongoDB -> Storage used incremented.
4. **Organize:** User creates folders and bulk moves documents.
5. **Share:** User generates a link or specifies an email. Permissions applied. Target user receives a Notification.
6. **Download:** User clicks download -> Backend requests AWS S3 -> Generates 1-hour pre-signed URL -> Client downloads file.
7. **Delete:** User deletes file -> `isDeleted` flag set to true (Soft Delete).
8. **Restore / Permanent Delete:** User navigates to Trash -> Can restore (flag removed) or permanently delete (Removed from S3 -> DB -> Storage capacity freed).
9. **Logout:** Token removed from local storage.

## 18. Important Algorithms
- **Storage Calculation:** Uses MongoDB's atomic `$expr` and `$add` within `findOneAndUpdate` to prevent race conditions during concurrent bulk uploads, ensuring a user cannot bypass their `storageLimit`.
- **Sharing Validation:** Uses compound unique indexes (`{ sharedWithUserId: 1, fileId: 1, folderId: 1 }`) with partial filters to prevent duplicate sharing records.
- **File Type Sorting:** A backend aggregation pipeline (`$group` by `$fileType`) instantly calculates the total size and count of different file categories to power dashboard charts.
- **Duplicate Prevention:** Folder schema utilizes a compound unique index on `{ userId: 1, parentFolderId: 1, name: 1 }` to prevent folders with identical names in the same directory.

## 19. Third-party Packages
- **Frontend:**
  - `react`, `react-router-dom`: Core framework and routing.
  - `tailwindcss`, `framer-motion`: UI styling and animations.
  - `axios`: Promise-based HTTP client for API requests.
  - `react-dropzone`: Drag-and-drop file upload interface.
  - `recharts`, `chart.js`: Dashboard data visualization.
  - `lucide-react`, `react-icons`: Iconography.
- **Backend:**
  - `express`: Web framework.
  - `mongoose`: MongoDB object modeling.
  - `@aws-sdk/client-s3`: AWS SDK v3 for S3 bucket operations.
  - `multer`: Middleware for handling `multipart/form-data`.
  - `bcryptjs`, `jsonwebtoken`: Security and authentication.
  - `nodemailer`: Sending automated emails (OTP, password reset).
  - `passport`, `passport-google-oauth20`: OAuth integration.
  - `express-rate-limit`, `helmet`: API security.

## 20. Current Project Modules
1. Authentication Module (JWT, OTP, Passwordless, Google)
2. Document Management Module (CRUD, AWS S3 Integration)
3. Folder Management Module (Hierarchy, Navigation)
4. Sharing Module (People Sharing, Link Generation, Permissions)
5. Notification Module (System Alerts)
6. Trash & Recovery Module (Soft Delete Lifecycle)
7. Dashboard & Analytics Module (Storage stats, Aggregations)
8. Version Control Module (Tracking document iterations)

## 21. Features Completed
- [x] Secure User Registration and Login
- [x] Passwordless Login via OTP
- [x] JWT based session management
- [x] File uploads to AWS S3 (with 50MB limit validation)
- [x] Document categorization and metadata storage
- [x] Folder creation and hierarchical navigation
- [x] Bulk moving files between folders
- [x] Presigned URLs for secure downloading and previewing
- [x] Soft delete, Trash Bin, and Permanent file deletion
- [x] Real-time storage capacity tracking and limits
- [x] People sharing (Viewer/Editor permissions)
- [x] Link generation for public/private sharing
- [x] Global regex-based search
- [x] In-app notifications for system events
- [x] Storage dashboard with charts
- [x] Email sending functionality

## 22. Features Partially Implemented
- **File Versioning:** The backend schema (`Version.js`) and API routes (`/api/versions`) exist and are functional, but UI integration details are dependent on the frontend implementation state.
- **Link Expiration:** The database schema tracks `expiresAt` for shared links, but active cleanup/enforcement logic needs full integration.

## 23. Future Enhancements (Based on Current Codebase)
- Implement automatic scheduled cleanup of the Trash bin (e.g., auto-delete items soft-deleted more than 30 days ago).
- Fully integrate the File Versioning system into the frontend UI, allowing users to restore previous versions of documents.
- Enhance the notification system with real-time WebSockets/Socket.io instead of polling or page-load fetching.

## 24. Project Statistics (Approximate)
- **Frontend Pages/Views:** ~12 (Auth, Dashboard, Documents, Trash, Upload, Search, SharedItems, etc.)
- **Backend Route Files:** 8 files
- **Backend Controllers:** 8 files
- **Mongoose Models:** 7 collections
- **API Endpoints:** ~40 RESTful endpoints

## 25. Overall Project Summary
The "Digital Document Management System on Cloud" (CloudVault) is a highly mature, secure, and fully functional cloud storage application. The backend is robust, leveraging Node.js and MongoDB for high-performance metadata operations, while offloading heavy binary storage to AWS S3. Security is prioritized throughout the stack, utilizing Helmet, rate limiting, JWTs, and secure pre-signed AWS URLs that prevent unauthorized file access. The application prevents storage abuse through atomic database increments during uploads. The frontend provides a modern, responsive user experience utilizing React and TailwindCSS, complete with interactive dashboards, seamless folder navigation, and drag-and-drop uploads. Collaboration is deeply integrated through a dual-mode sharing system (explicit user sharing vs. tokenized link sharing) with granular access controls.
