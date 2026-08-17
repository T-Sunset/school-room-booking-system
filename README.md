# School Room Booking System

A full-stack room booking management system designed for secondary schools, providing students and staff with a structured way to manage room availability, bookings, approvals and room-specific access rules.

The system is designed around the needs of schools where rooms may have different availability requirements, year-level restrictions, booking limits and usage agreements.

## Overview

The School Room Booking System allows students to find and request suitable rooms based on their chosen date and time, while providing teachers and administrators with the tools needed to manage bookings, rooms and access rules.

The application was designed with a multi-school architecture in mind. Data and user interactions are compartmentalised using unique `schoolId` values, preventing users belonging to different schools from interacting with one another.

The project uses a Vue.js frontend backed by a Node.js/Express API and Firebase services.

## Key Features

### Student Booking

Students can:

* Search for available rooms by date and time.
* See rooms that are available and meet the relevant booking criteria.
* Make solo room bookings.
* View rooms and their availability.
* View their existing and upcoming bookings.
* Invite other students to form bands.
* Accept room-specific rules agreements before applying for bookings.

The booking system automatically accepts a student's first solo booking of each week. Additional solo bookings and band bookings are placed into a staff approval workflow.

### Room Rules

Rooms can have individual booking requirements, including:

* Maximum booking duration.
* Opening hours.
* Available days.
* Permitted year levels.
* Written rules and usage agreements.

Students must accept the relevant room agreement before they can apply for a booking.

### Staff Management

Teachers are designed to have access to:

* Pending room booking requests.
* Band registration requests.
* Tools for accepting or denying requests.
* A list of students currently permitted to be in the building.
* Room rule management.
* Student disciplinary controls.

Teacher bookings are automatically accepted, allowing staff to reserve rooms without going through the student approval process.

### Administration

Administrators can:

* Add rooms.
* Remove rooms.
* Manage school-specific room configurations.

Teachers can edit the rules and restrictions associated with existing rooms.

### Booking Rules & Approval Workflow

The backend implements booking logic to determine whether a booking can be automatically accepted or requires staff approval.

The intended workflow is:

```text
Student requests booking
        │
        ▼
Check room availability
        │
        ▼
Check room requirements
        │
        ▼
Check student's booking history
        │
        ├── First solo booking this week
        │          │
        │          ▼
        │      Auto-accepted
        │
        └── Additional / band booking
                   │
                   ▼
             Staff approval queue
                   │
              ┌────┴────┐
              ▼         ▼
           Accept      Deny
```

Teacher bookings bypass the student approval process and are automatically accepted.

## Multi-School Architecture

The application has been designed with potential multi-school expansion in mind.

Users, rooms and bookings are associated with a unique `schoolId`. Access is restricted so that administrators, teachers and students belonging to one school cannot interact with data belonging to another school.

This provides a foundation for eventually supporting multiple schools from the same application while maintaining logical separation between their data.

## Engineering Highlights

### Role-Based Access Control

The system distinguishes between:

* Students
* Teachers
* Administrators

Different roles are permitted to perform different actions throughout the application. Role-based checks are implemented within the backend rather than relying solely on frontend restrictions.

### Layered Backend Architecture

The backend is organised into separate layers for responsibilities including:

* Routes
* Controllers
* Services
* Models
* Middleware
* Role-based access control
* Configuration
* Shared types

This separation helps keep business logic independent from HTTP request handling and presentation concerns.

### Rule-Driven Availability

Room availability is not determined solely by whether another booking exists.

The booking process also considers room-specific constraints such as:

* Date and time availability
* Maximum booking duration
* Opening hours
* Permitted days
* Year-level restrictions
* Existing bookings
* User booking history

This allows different rooms to have different policies without requiring separate booking implementations for each room.

### Backend Validation

Booking and administrative operations are validated on the backend, providing a second layer of protection beyond frontend validation.

This is particularly important for operations involving permissions, booking rules and administrative functionality.

## Technology Stack

### Frontend

* Vue.js
* TypeScript
* Pinia
* Bootstrap

### Backend

* Node.js
* Express
* TypeScript

### Services

* Firebase Authentication
* Cloud Firestore

## Project Structure

```text
school-room-booking-system/
│
├── backend/
│   └── src/
│       ├── config/
│       ├── controllers/
│       ├── middleware/
│       ├── models/
│       ├── rbac/
│       ├── routes/
│       ├── services/
│       ├── types/
│       └── index.ts
│
└── frontend/
    └── ...
```

The frontend and backend are separated into independent applications, with the Express API responsible for server-side business logic and Firestore persistence.

## Project Status

The core room discovery, booking and backend business logic is implemented.

Several features are currently implemented at the backend level but do not yet have completed frontend interfaces. Other functionality remains planned for future development.

### Implemented

* User authentication
* Role-based access control
* Room management
* Room availability rules
* Room-specific agreements
* Student room discovery
* Solo bookings
* Weekly automatic acceptance for eligible solo bookings
* Backend approval workflow
* Teacher booking approval/denial logic
* Band registration backend functionality
* Multi-school `schoolId` separation
* Backend booking validation

### In Development

* Student band management interface
* Teacher booking approval interface
* Teacher band approval interface
* Student dashboard
* Staff "students currently in the building" view

### Planned

* Student strike system
* Temporary booking bans
* Teacher cancellation and modification of bookings
* Teacher ability to move existing bookings
* Completed band booking workflow throughout the frontend

## Future Development

Potential future improvements include:

* Expanding the system into a fully multi-school hosted service.
* Improving the staff dashboard and administrative tooling.
* Adding automated tests for booking rules and permissions.
* Expanding the notification and approval system.
* Improving booking conflict visualisation.
* Introducing more granular administrative permissions.
* Adding audit logging for important administrative actions.

## Running Locally

### Prerequisites

* Node.js
* npm
* A Firebase project
* Firebase Authentication configured
* Cloud Firestore configured

### Backend

```bash
cd backend
npm install
npm run dev
```

The backend requires local Firebase credentials. **Service-account credentials are intentionally excluded from this repository and must never be committed to Git.**

### Frontend

```bash
cd frontend
npm install
npm run dev
```

Configure the required Firebase/frontend environment variables using a local `.env` file.

## Security

The application uses Firebase Authentication and backend role-based access controls to restrict access to protected operations.

Sensitive Firebase service-account credentials are excluded from version control.

The backend performs its own authorisation and validation rather than relying solely on client-side restrictions.

## Screenshots

Screenshots and additional visual documentation will be added as the project is prepared for portfolio presentation.

## Project Context

This project was developed as a practical full-stack software engineering project focused on applying software architecture, authentication, authorisation, database design and business-rule modelling to a real-world booking problem.

The architecture was designed with future expansion beyond a single school in mind.
