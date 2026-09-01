# School Room Booking System Deployment Guide

This guide is for a school IT administrator. It uses the successful deployment rehearsal as its reference. Create a new school-owned production project; do not reuse `school-room-booking-rehearsal`, which is test-only.

## Ownership

```text
Developer -> owns and maintains the GitHub source repository
School    -> owns production Google Cloud/Firebase project
          -> owns Authentication, Firestore/data, Cloud Run, and Hosting
```

The developer can publish reviewed fixes to GitHub without ordinary access to production student data. The school controls production access, approvals, credentials, backups, monitoring, and incidents.

## Prerequisites

The school needs a managed Google account, a new Google Cloud project, a billing account, Git, Node.js/npm, Firebase CLI (`npm install -g firebase-tools`), and Google Cloud CLI (`gcloud`). Cloud Build can build the included Dockerfile remotely; Docker Desktop is not required. Billing may apply to Firestore, Cloud Run, Cloud Build, Artifact Registry, Hosting, and related usage.

Enable or allow Cloud Resource Manager, Service Usage, Cloud Run Admin, Cloud Build, Artifact Registry, Firestore, Firebase Management, Firebase Authentication, Firebase Hosting, and IAM Service Account Credentials APIs.

## Create the production project

1. Create a new project owned by the school and attach its billing account.
2. Record its project ID and choose the production region carefully.
3. Do not reuse `school-room-booking-rehearsal`.
4. Grant deployment access only to approved school IT administrators.
5. Authenticate:

```bash
gcloud auth login
gcloud config set project <school-project-id>
firebase login
```

This repository has no committed `.firebaserc`; pass `--project <school-project-id>` explicitly.

## Firebase and Firestore

Add Firebase to the project. Enable Authentication with the Email/Password provider, add the final Hosting/custom domain under Authentication authorized domains, create Firestore in **Native mode**, and add a Firebase Web App. Initialise/link Firebase Hosting using the repository's `firebase.json`; it serves `frontend/dist` and rewrites Vue routes to `index.html`.

Deploy the authoritative repository indexes:

```bash
firebase deploy --only firestore:indexes --project <school-project-id>
```

The checked-in `firestore.indexes.json` covers audit logs, bands, bookings, rooms, users, and strikes. Confirm every index is Ready/Enabled before testing. A valid query can return `FAILED_PRECONDITION` until its index is enabled.

Create the initial school document with its production `schoolId`, identity, and permitted email domains. Provision the first Firebase Authentication account and matching Firestore profile manually through a controlled, access-restricted process with role `admin` and the production school ID. The normal app has no unauthenticated bootstrap mechanism, and this repository provides no bootstrap script. Do not copy rehearsal users, data, passwords, or keys.

## Backend deployment

Validate locally:

```bash
cd backend
npm ci
npm test
npx tsc --noEmit
npm run build
```

`backend/Dockerfile` builds TypeScript remotely/in a build stage and runs compiled output with production dependencies. Create a dedicated school-owned Cloud Run runtime service account and grant least-privilege Firestore access, typically `roles/datastore.user` after review.

Cloud Run uses its managed runtime identity and Application Default Credentials. This is different from a local `serviceAccountKey.json`, which is a sensitive downloaded key for local development only. Production must not require or contain a service-account JSON key.

Build and deploy with Cloud Build:

```bash
gcloud builds submit backend --tag <region>-docker.pkg.dev/<school-project-id>/<repository>/room-booking-api:latest --project <school-project-id>
gcloud run deploy room-booking-api --image <region>-docker.pkg.dev/<school-project-id>/<repository>/room-booking-api:latest --region <region> --service-account <runtime-account> --set-env-vars TZ=Australia/Melbourne,CORS_ALLOWED_ORIGINS=https://<hosting-domain> --project <school-project-id>
```

Cloud Run supplies `PORT`. Required runtime settings are `TZ=Australia/Melbourne` and the exact production `CORS_ALLOWED_ORIGINS`. `SERVICE_ACCOUNT_KEY_PATH` is local-only; do not point it at a committed/containerised key. Review startup and request logs after deployment.

## Frontend deployment

Provide these Vite variables only in the protected build environment; never commit `.env.local`, `.env.production`, or real values:

```text
VITE_FIREBASE_API_KEY=<web-api-key>
VITE_FIREBASE_AUTH_DOMAIN=<project>.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=<project-id>
VITE_FIREBASE_STORAGE_BUCKET=<project>.firebasestorage.app
VITE_FIREBASE_MESSAGING_SENDER_ID=<sender-id>
VITE_FIREBASE_APP_ID=<app-id>
VITE_API_BASE_URL=https://<cloud-run-url>
```

Then build and deploy explicitly to the school project:

```bash
cd frontend
npm ci
npm run build
cd ..
firebase deploy --only hosting --project <school-project-id>
```

Confirm the Hosting origin is an Authentication authorized domain and exactly matches Cloud Run CORS configuration.

## Acceptance checklist

Use approved test accounts and synthetic data where possible:

- Admin, teacher, student, and second-student login and role visibility.
- Room creation/editing, rules, timetable, deactivation/reactivation.
- Valid solo booking, approval, history, cancellation, and availability.
- Band creation, same-school membership, approval, and band booking.
- Strike issuance, warning/ban state, persistence, and audit record.
- Dashboard Current Rollcall and Today's Attendance for an active approved booking.
- Present/Absent persistence and attendance audit events.
- Role assignment and restoration by admin.
- Audit filters, newest-first ordering, and pagination.
- Mobile/responsive checks at 1440, 1200, 1024, 900, 768, 600, 390, and 320px.

## Maintenance and operations

```text
Developer -> fix/feature -> GitHub -> school IT reviews -> approved deployment
```

No CI/CD is required. School IT owns release approval, Firestore backups/exports and restore tests, Cloud Run/Hosting/Firestore monitoring, Authentication administration and recovery, staff offboarding, incident response, audit retention, IAM review, budgets, quotas, and Google Cloud billing. Keep at least two approved school administrators and document recovery procedures.

## Troubleshooting

- **Missing index:** deploy `firestore.indexes.json`, wait for Ready/Enabled, then retry. Distinguish an intentional empty database from a failed `FAILED_PRECONDITION` request in Network and Cloud Run logs.
- **Wrong frontend environment:** Vite embeds `VITE_*` values at build time. Remove stale local overrides, rebuild, and confirm the Firebase project and API URL in the build environment.
- **Wrong API URL:** `VITE_API_BASE_URL` must be the deployed Cloud Run URL, not localhost or rehearsal.
- **CORS mismatch:** set `CORS_ALLOWED_ORIGINS` to the exact Hosting origin, including scheme and custom-domain variants.
- **Auth domain failure:** add every approved Hosting/custom domain in Firebase Authentication authorized domains.
- **Cloud Run credentials:** verify the school-owned managed service account, Firestore IAM, APIs, and startup logs. Do not upload `serviceAccountKey.json`.
- **Empty versus failure:** empty rooms/bookings/bands/audit data can be valid after provisioning; a failed request or `FAILED_PRECONDITION` is different.

Run checks individually before release:

```bash
cd backend
npm test
npx tsc --noEmit
npm run build
cd ../frontend
npm run build
git diff --check
git status --short
```
