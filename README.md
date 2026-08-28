# School Room Booking System

A full-stack room booking and attendance management system designed around the practical requirements of a secondary-school environment.

## Overview

The School Room Booking System provides students with a structured way to find suitable school rooms, request bookings, and manage band-based reservations, while giving teachers and administrators tools for booking approval, attendance, room administration, discipline, and auditing.

The project was developed around a real-world school workflow without exposing the identity of the school or the people involved. Its design focuses on requirements-driven development, backend validation, role-based access control, school-level data isolation, and a responsive user experience.

The application has three user roles:

* **Students** can search for rooms, create solo or band bookings, manage bands, and view their strike status.
* **Teachers** can approve bookings and bands, manage student strikes, and record attendance.
* **Administrators** have teacher capabilities plus room administration, user role administration through the backend, and access to the audit viewer.

## Key Features

### Authentication & Access Control

* Firebase Authentication with email/password sign-in.
* Student, teacher, and administrator roles.
* Backend-authoritative role-based access control.
* Firebase ID token verification on protected API requests.
* School-level isolation for users, rooms, bookings, bands, strikes, and audit records.
* School assignment during student registration based on the configured email domain.

### Room Management

* Room creation and editing for authorised administrators.
* Configurable opening and closing hours.
* Allowed weekdays and year-level restrictions.
* Room-specific maximum booking duration.
* Room usage agreements shown during booking.
* Availability search based on requested time, room rules, year level, and existing bookings.
* Soft deactivation and reactivation.

Deactivation preserves the room document and historical booking references rather than physically deleting the room.

### Booking

* 30-minute start and end boundaries.
* Variable durations in 30-minute increments, including 30, 60, and 90 minutes.
* Room-specific maximum duration enforcement.
* Opening-hours and allowed-day validation.
* Server-side overlap detection during creation and approval.
* Room-specific approval requirements.
* Weekly student booking rules:

  * an eligible first solo booking may be automatically approved;
  * a second solo booking is waitlisted;
  * bookings beyond the weekly limit are rejected;
  * band bookings enter the staff approval workflow.
* Staff bookings are automatically approved.
* Staff approval and denial of pending and waitlisted bookings.
* Booking statuses: `approved`, `pending`, `waitlisted`, `denied`, and `cancelled`.

The current application does not provide a booking cancellation or rescheduling workflow.

### Bands

* Student band creation.
* Member selection and minimum membership validation.
* Same-school and student-role validation for members.
* Duplicate band name and duplicate member-set prevention.
* Staff approval and denial.
* Approved-band bookings.
* Band disbanding by authorised staff or the band creator.
* Leaving an approved band as a non-creator member.
* Band strikes applied as individual strike records to current members.

### Strikes & Temporary Bans

* Individual student strikes.
* Band strikes applied individually to members.
* Seven-day strike expiry.
* Student warning state for an active strike.
* Temporary booking bans when strikes overlap.
* Student-visible strike and ban status.
* Server-side prevention of new bookings while banned.

This is a rule-driven strike and ban workflow rather than a configurable disciplinary platform.

### Rollcall & Attendance

* **Current Rollcall** for currently active approved bookings.
* **Today's Attendance** for approved bookings that started today and remain within the editable attendance window.
* Present/Absent tracking.
* Independent attendance records for each booking/student combination.
* Same-day post-booking attendance updates.
* Attendance persistence in Firestore.
* Attendance marking and status-change audit events.

Attendance updates are restricted to authorised staff, approved bookings, associated students, the booking's calendar day, and times after the booking has started.

### Administration & Auditing

* Room administration, including deactivation and reactivation.
* Protected backend endpoint for user role administration.
* Append-only audit logging for important mutations.
* Admin-only audit viewer.
* Date, action, actor, and entity-type filters.
* Cursor-based audit pagination.

## Screenshots

Screenshots of the current application can be added here.

Suggested captures:

* Dashboard
* Room timetable
* Booking flow
* Bands view
* Today's Attendance
* Audit viewer
* Mobile navigation
* Mobile timetable

## Architecture

```text
Vue frontend
    |
    | Firebase ID token / Axios requests
    v
Express backend
    |
    | Authentication middleware
    | RBAC / server-side validation
    | Service layer
    v
Firebase Admin SDK
    |
    v
Firestore
```

The frontend uses Vue views and components with Vue Router for navigation, Pinia for authentication state, Axios for API requests, and Bootstrap for responsive layout and controls.

The backend uses Express route handlers, authentication middleware, RBAC helpers, and service modules for domain operations. Active API handlers are registered primarily in `backend/src/index.ts`; the project does not currently use a fully separated controller/router architecture.

Firebase Authentication handles user identity. The backend verifies Firebase ID tokens, loads the corresponding user profile, applies role and school checks, validates business rules, and persists data through the Firebase Admin SDK and Firestore.

## Technology Stack

### Frontend

* Vue 3
* TypeScript
* Vite
* Pinia
* Vue Router
* Bootstrap
* Axios
* Firebase client SDK

### Backend

* Node.js
* Express
* TypeScript
* Firebase Admin SDK
* Firestore
* `ts-node-dev`
* `dotenv`

## Security Design

The application uses the following security decisions:

* Firebase Authentication establishes user identity.
* Firebase ID tokens are sent with API requests and verified by the backend.
* Authorization is backend-authoritative; frontend visibility checks are not the security boundary.
* RBAC protects booking approval, room administration, student management, attendance, and audit operations.
* Server-side validation enforces room, booking, band, attendance, and strike rules.
* `schoolId` checks isolate school data and prevent cross-school operations.
* Administrative operations require the appropriate backend permission.
* Audit actor identity is derived from the authenticated backend request rather than accepted as a client-controlled field.
* Audit events are created as append-only Firestore records.
* Firebase service-account credentials are excluded from source control through `.gitignore`.

These controls describe the current application design. A production deployment would still require environment-specific hardening, monitoring, access management, and operational review.

## Domain Model

* **School** stores school identity, permitted email domains, and student sign-up configuration.
* **User** represents a Firebase-authenticated person with a role, school, and optional year level.
* **Room** belongs to a school and contains bookability settings and room-specific rules.
* **Booking** references a room and its creator, optionally references a band, and stores its time interval, status, and approval information.
* **Band** belongs to a school, contains student member IDs, and moves through pending, approved, denied, and disbanded states.
* **Strike** belongs to a student and school, records its issuer and reason, and expires after seven days. Band strikes also retain the originating band ID.
* **Attendance** is stored per booking/student and records the current status, recording user, and update timestamps.
* **AuditEvent** records important mutations with the authenticated actor, school, entity, action, timestamp, and optional metadata.

The principal relationships are school-scoped: students, rooms, bookings, bands, strikes, and audit events carry a school association; bookings reference rooms and users or bands; and attendance is keyed to a booking/student pair.

## Booking Workflow

1. A student selects a date, time, duration, and booking type.
2. The backend validates the interval, room rules, year-level access, school association, strike status, and overlap conditions.
3. An eligible first solo booking of the week may be automatically approved.
4. A second solo booking is waitlisted, while band bookings and rooms requiring approval enter the staff workflow.
5. Staff can approve or deny pending and waitlisted requests after the backend revalidates the interval and collision state.
6. Approved bookings appear in room availability, Rollcall, and attendance workflows according to their time and date.

Staff-created bookings bypass the student approval rules and are automatically approved.

## Local Development Setup

### Prerequisites

* Node.js and npm.
* A Firebase project with Firebase Authentication and Firestore enabled.
* A local Firebase Admin service-account credential for the backend.

Clone the repository and install dependencies separately for each application:

```bash
git clone <repository-url>
cd school-room-booking-system

cd backend
npm install

cd ../frontend
npm install
```

### Backend

The backend currently imports a local `serviceAccountKey.json` from `backend/src/config/firebase.ts`.

Supply that credential locally and do not commit it. The filename is excluded by `.gitignore`.

Start the backend development server:

```bash
cd backend
npm run dev
```

The frontend API client currently targets the local backend at:

```text
http://localhost:3000
```

### Frontend

The Firebase web configuration is currently present directly in `frontend/src/firebase.ts` rather than being loaded from `.env`.

Do not copy live project identifiers, credentials, or other environment-specific information into public documentation.

Start the frontend development server:

```bash
cd frontend
npm run dev
```

Create a production frontend build with:

```bash
npm run build
```

The build performs Vue/TypeScript validation through `vue-tsc` before invoking Vite.

## Testing

### Frontend

The frontend build performs the available Vue/TypeScript project validation:

```bash
cd frontend
npm run build
```

The current frontend production build completes successfully.

### Backend

The backend includes focused tests covering areas such as:

* band member validation;
* booking time boundaries and durations;
* booking date-range calculations;
* room availability and half-hour cells;
* strike warning and ban logic;
* booking interval overlap behaviour.

Run them with:

```bash
cd backend
npm test
```

### Current backend test configuration

The current backend test configuration prevents the native Node test runner from executing the test assertions successfully. The repository uses a CommonJS package configuration while several tests import TypeScript modules using ES-module syntax, producing module-loading errors before the assertions run. One existing `.mjs` test also expects an export that Node reports as unavailable.

There is currently no integration or end-to-end test suite.

This is known technical debt rather than an indication that the core application workflows are unimplemented.

## Project Status

The core application feature set is implemented, including:

* authentication;
* role-based access control;
* school isolation;
* room management;
* room availability;
* 30-minute booking workflows;
* booking approval and waitlisting;
* bands;
* strikes and temporary bans;
* Rollcall and attendance;
* responsive views;
* administration;
* append-only audit logging;
* audit review.

The frontend production build currently passes.

Remaining work is primarily test-runner configuration, broader automated coverage, production deployment hardening, and optional feature extensions rather than the original core workflow.

This project is not presented as a finished commercial SaaS product or as generally production-ready without further operational review.

## Known Limitations & Future Improvements

* Resolve the backend CommonJS/ESM test-runner configuration and restore executable assertions.
* Add integration and end-to-end tests.
* Add booking cancellation and rescheduling workflows.
* Add email or in-application notifications.
* Add an Admin frontend for role management.
* Improve concurrency protection around simultaneous booking conflicts.
* Add historical attendance and reporting views.
* Complete production deployment, monitoring, and operational hardening.
* Evaluate broader multi-school hosted deployment requirements.

These items are future improvements and do not prevent the current core application workflow from functioning.

## Project Context

This system was built as a practical full-stack software-engineering project around a secondary-school room-booking problem.

The work involved translating real workflow requirements into domain models, backend validation, authentication and authorization rules, school data isolation, responsive UI patterns, attendance persistence, and auditable administrative actions.

## License

No standalone repository `LICENSE` file is currently provided. The README does not assign a project license.
