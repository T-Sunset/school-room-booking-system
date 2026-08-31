# School Room Booking System Deployment Guide

This guide is for the school IT administrator responsible for creating and operating a school-owned production deployment. It describes the deployment shape rehearsed in the separate `school-room-booking-rehearsal` project. Do not reuse that project for production.

## 1. Ownership model

The ownership boundary should be explicit:

```text
Developer
    |
    | owns and maintains the GitHub source repository
    v
School
    |
    +-- owns the production Google Cloud/Firebase project
    +-- owns production Firebase Authentication
    +-- owns production Firestore and school data
    +-- owns the production Cloud Run service
    +-- owns production Firebase Hosting
```

The developer can publish reviewed bug fixes and features to the GitHub repository without ordinary access to the school's production student data. The school controls production project access, deployment approval, credentials, backups, monitoring, and incident response.

## 2. Prerequisites

The school should provide:

- A Google account or managed Google Workspace account for the deployment administrator.
- A new Google Cloud project owned and billed by the school.
- A billing account attached to that project. Firebase, Firestore, Cloud Run, Cloud Build, Artifact Registry, and related usage may incur charges.
- Node.js and npm for local validation and frontend builds.
- Firebase CLI: `npm install -g firebase-tools`.
- Google Cloud CLI: install `gcloud` from the official Google Cloud documentation.
- A Git client and access to the source repository.
- Permission to create Firebase resources, service accounts, Cloud Run services, Cloud Build builds, and Hosting releases.

Docker Desktop is not required. The included `backend/Dockerfile` can be built remotely with Cloud Build. A local Docker installation is useful only for optional local container testing.

Enable or allow the following APIs in the production project as prompted:

- Cloud Resource Manager API
- Service Usage API
- Cloud Run Admin API
- Cloud Build API
- Artifact Registry API
- Firestore API
- Firebase Management API
- Firebase Authentication API
- Firebase Hosting API
- IAM Service Account Credentials API, where required by the selected deployment workflow

## 3. Create a production project

1. In Google Cloud Console, create a new project owned by the school. Use a clear school-controlled project ID.
2. Attach the school's billing account.
3. Record the project ID. It is used in every deployment command.
4. Do not select or reuse `school-room-booking-rehearsal`; that project is test-only.
5. Grant deployment access to the small set of school IT administrators who need it. Use least privilege and managed accounts.

Then authenticate the command-line tools:

```bash
gcloud auth login
gcloud config set project <school-production-project-id>
firebase login
firebase use --add
```

Select the school project when Firebase CLI asks. Because this repository does not commit a `.firebaserc`, always pass `--project <school-production-project-id>` explicitly in deployment commands.

## 4. Enable Firebase services

From Firebase Console, add Firebase to the new Google Cloud project. Then configure:

1. Authentication: enable the Email/Password sign-in provider.
2. Authentication > Settings > Authorized domains: add the final Firebase Hosting domain and any approved custom school domain.
3. Firestore Database: create a database in **Native mode** in the intended production region. Choose the region carefully because it cannot be changed casually later.
4. Hosting: initialise or link Firebase Hosting for the project, keeping the repository's `firebase.json` hosting target. The configured public directory is `frontend/dist` and non-file routes rewrite to `index.html` for Vue Router.
5. Add a Firebase Web App and record its web configuration. The web API key is a client identifier, not a server credential, but production values should still be kept in the school's deployment environment rather than committed to the repository.

## 5. Firestore setup and initial administrator

Deploy the repository indexes before exercising the application:

```bash
firebase deploy --only firestore:indexes --project <school-production-project-id>
```

In Firestore, confirm every index reaches **Ready/Enabled** before using the corresponding screens. The authoritative definitions are in `firestore.indexes.json`; they cover audit logs, bands, bookings, rooms, users, and strikes.

Create the initial school document using the project's controlled administrative provisioning process. The school document must contain the school identity and the permitted student email-domain configuration used by the application. Do not put real student data in source control.

Create the initial administrator in Firebase Authentication using the school's controlled account process, then create the matching Firestore user profile with:

- the Firebase Authentication UID;
- the production `schoolId`;
- role `admin`;
- the administrator's approved profile fields.

This is deliberately a controlled provisioning task. The normal application does not expose an unauthenticated bootstrap mechanism, and this repository does not provide a bootstrap script. Do not invent one by copying rehearsal credentials or service-account files. Use a reviewed, access-controlled Firebase Console/Admin SDK procedure and record who performed it.

After bootstrap, sign in as the administrator and create or invite the remaining accounts through the school's approved account-management process. Verify every profile has the intended school and role.

## 6. Backend deployment

### Build and validate

```bash
cd backend
npm ci
npm test
npx tsc --noEmit
npm run build
```

The backend Dockerfile performs the production build in a build stage and runs compiled output with production dependencies in the runtime stage.

### Runtime identity

Create a dedicated Cloud Run runtime service account owned by the school, for example `room-booking-runtime@<project-id>.iam.gserviceaccount.com`. Grant only the data access required by the chosen Firestore/IAM design, typically `roles/datastore.user`, and review the permission set with the school's cloud administrator.

Cloud Run should use this managed runtime identity through its service configuration. It uses Application Default Credentials automatically. The production service should **not** require a service-account JSON key.

A local `serviceAccountKey.json` is a different thing: it is a sensitive downloaded key used only for local development when explicitly configured. It is ignored by Git and must never be uploaded to Cloud Run, copied into a container, or committed to the repository. Prefer local Application Default Credentials where practical.

### Build and deploy with Cloud Build

From the repository root, submit the backend Dockerfile to Cloud Build. The exact Artifact Registry repository and region are school choices; keep them in the school project:

```bash
gcloud builds submit backend \
  --tag <region>-docker.pkg.dev/<school-project-id>/<repository>/room-booking-api:latest \
  --project <school-project-id>
```

Deploy the image to Cloud Run with the school-owned runtime account:

```bash
gcloud run deploy room-booking-api \
  --image <region>-docker.pkg.dev/<school-project-id>/<repository>/room-booking-api:latest \
  --region <cloud-run-region> \
  --service-account room-booking-runtime@<school-project-id>.iam.gserviceaccount.com \
  --set-env-vars TZ=Australia/Melbourne,CORS_ALLOWED_ORIGINS=https://<hosting-domain> \
  --project <school-project-id>
```

Cloud Run provides `PORT`; the application listens on that runtime port. Required application configuration is:

- `PORT`: supplied by Cloud Run; use `3000` for local development.
- `TZ=Australia/Melbourne`: the school's IANA timezone, confirmed in the rehearsal.
- `CORS_ALLOWED_ORIGINS`: the exact production Hosting origin, with comma-separated origins only if additional approved origins are required.
- `SERVICE_ACCOUNT_KEY_PATH`: local-only configuration when using a local key; do not set it to a committed or containerised key in production.

After deployment, record the Cloud Run service URL and use it as the frontend API URL. Review Cloud Run revision logs and confirm the service starts without credential, Firestore, or CORS errors.

## 7. Frontend deployment

Create the production Vite environment in the school's protected build environment. Do not commit `.env.local`, `.env.production`, or real environment files. The required variables are represented by `frontend/.env.example`:

```text
VITE_FIREBASE_API_KEY=<school-firebase-web-api-key>
VITE_FIREBASE_AUTH_DOMAIN=<school-project-id>.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=<school-project-id>
VITE_FIREBASE_STORAGE_BUCKET=<school-project-id>.firebasestorage.app
VITE_FIREBASE_MESSAGING_SENDER_ID=<school-sender-id>
VITE_FIREBASE_APP_ID=<school-app-id>
VITE_API_BASE_URL=https://<cloud-run-service-url>
```

Build and deploy from the `frontend` directory while those variables are available to Vite:

```bash
cd frontend
npm ci
npm run build
cd ..
firebase deploy --only hosting --project <school-production-project-id>
```

Firebase Hosting serves `frontend/dist` according to `firebase.json`. Confirm the deployed URL is included in Firebase Authentication authorized domains and matches `CORS_ALLOWED_ORIGINS` exactly, including scheme and hostname.

## 8. Acceptance checklist

Use synthetic or approved school test accounts and avoid real student data in development. Record the result for each item:

- Administrator can sign in and sees Admin navigation.
- Teacher can sign in and sees only teacher-authorised operations.
- Student can sign in and sees only student navigation.
- Student2 or a second approved student can sign in if the school's test procedure requires it.
- Admin can create and edit a room.
- Room rules, allowed days, year levels, opening hours, and booking agreement are correct.
- Room timetable displays available and booked intervals.
- Student can search for a valid room slot and create a solo booking.
- Staff can approve or deny the booking where approval is required.
- Student can view booking history and cancel an eligible future booking.
- Cancelled history remains visible and no longer blocks availability where applicable.
- Students can create a band with valid same-school student members.
- Staff can approve the band and members can use it for a band booking.
- Staff can issue a strike and the student warning/ban state persists.
- Staff can view Dashboard Current Rollcall and Today's Attendance when a booking is active.
- Staff can record Present/Absent and verify refresh persistence and audit events.
- Admin can assign a role to another account and restore it to the intended role.
- Admin audit viewer loads, filters, and paginates without missing-index errors.
- Admin can deactivate and reactivate a room, leaving it active/bookable.
- Test navigation and dialogs at desktop and mobile widths, including 320px.

## 9. Maintenance and release workflow

The intended workflow is:

```text
Developer
    |
    | fix or feature
    v
GitHub source repository
    |
    | school IT reviews the release
    v
School IT deploys the approved revision
```

No CI/CD is required by this repository. School IT should review source changes, dependency changes, release notes, environment values, database/index changes, and rollback options before production deployment. Deploy backend and frontend revisions in a controlled order, then run the acceptance checklist.

## 10. Backups and operations

These are school responsibilities unless a separate support agreement says otherwise:

- Configure and regularly test Firestore backups or exports, with retention appropriate to school policy.
- Monitor Firestore, Cloud Run, Cloud Build, Firebase Authentication, and Hosting usage and errors.
- Review Cloud Run structured logs after releases and during incidents.
- Administer Authentication accounts, password recovery, MFA or Workspace policy where applicable, and authorised domains.
- Remove access and disable accounts promptly when staff or contractors leave.
- Maintain at least two authorised school administrators and a documented recovery route.
- Preserve audit records according to school retention and privacy policy.
- Define incident response for compromised accounts, incorrect role assignments, data access concerns, and service outages.
- Monitor Google Cloud billing, budgets, quotas, and billing alerts.
- Review production IAM periodically and rotate any local development credentials.

## 11. Troubleshooting

### Missing Firestore index

A valid request can return `FAILED_PRECONDITION` when a required composite index is absent or still building. Deploy the repository definitions:

```bash
firebase deploy --only firestore:indexes --project <school-production-project-id>
```

Then wait for each index to become Ready/Enabled. Retry the affected screen only after the index is ready. Do not treat an empty result as proof that the query is valid: distinguish an intentional empty database state from a failed request in browser Network, Cloud Run logs, and Firebase logs.

### Wrong frontend environment

Vite embeds `VITE_*` values at build time. If the page authenticates against the wrong Firebase project or calls localhost, inspect the protected build environment, remove stale `.env.local` overrides, rebuild, and redeploy Hosting. Confirm the built application points to the school's project and Cloud Run URL.

### Wrong API URL

The frontend must use `VITE_API_BASE_URL` pointing to the deployed Cloud Run service. A localhost URL or an old rehearsal URL causes failed API requests even if Firebase Authentication works.

### CORS mismatch

Set Cloud Run `CORS_ALLOWED_ORIGINS` to the exact Hosting origin. Check scheme, hostname, and custom-domain variants. Redeploy the Cloud Run revision after changing it, then inspect the browser Network response and Cloud Run logs.

### Authentication authorized-domain failure

Add the Firebase Hosting hostname and any approved custom hostname under Firebase Authentication authorized domains. This is separate from the Firebase Web App configuration and separate from CORS.

### Cloud Run credentials or runtime identity

Production Cloud Run should use its school-owned managed service account and Application Default Credentials. Do not upload `serviceAccountKey.json`. Check the Cloud Run revision service account, IAM roles, project selection, Firestore API, and startup logs. A local key that works on a developer machine does not prove the Cloud Run identity is configured.

### Empty database versus missing-index behavior

A newly provisioned school may legitimately show empty rooms, bookings, bands, or audit results. A missing index usually appears as a failed request and a `FAILED_PRECONDITION` entry in logs. Check both the UI state and the request/log status before creating test data or changing application code.

### Runtime and build checks

Run the commands separately so failures are attributable:

```bash
cd backend
npm test
npx tsc --noEmit
npm run build

cd ../frontend
npm run build
```

Do not deploy a revision until the relevant checks and the school acceptance checklist pass.
