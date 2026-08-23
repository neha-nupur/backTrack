# backTrack

### Interactive Contest Intermediary for College Coding Events

backTrack is a web-based coding event platform designed to act as an intermediary between participants, event administrators, and external coding platforms such as HackerRank.

The platform allows administrators to create and manage coding events, register participants, configure challenges, define hidden execution logic, provide hints and input constraints, and monitor participant activity.

Participants can log in using their registered college email and the event master password, access active events, execute challenge inputs against administrator-configured hidden logic, view execution results, access hints and constraints, and open the corresponding HackerRank problem in a separate tab.

The platform follows a **black-box execution model**: participants provide input, while the underlying challenge logic remains hidden on the server.

---

## Features

### Administrator

Administrators can:

- Log in through a protected administrator portal.
- Manage registered participants.
- Add, edit, disable, enable, and delete participants.
- Search and filter participants.
- Manage the event master password.
- Create and manage coding events.
- Configure event types:
  - Demo
  - Contest
- Activate or deactivate events.
- Optionally protect events with an event-specific password.
- Configure event schedules and lifecycle states.
- Create and manage coding challenges.
- Configure:
  - Challenge number
  - Input constraints
  - Hint
  - HackerRank URL
  - Hidden JavaScript execution logic
  - Challenge score
- Enable or disable challenges.
- Monitor participant executions and attempts.
- View execution input and output.
- View event statistics and participant activity.
- View result and performance statistics.
- Export event-related data as CSV.

---

### Participant

Participants can:

- Log in using their registered college email.
- Authenticate using the event master password.
- View available events.
- Filter events by type.
- Access active events.
- Enter event-specific passwords when required.
- Start an eligible event.
- View available challenges.
- See challenge numbers.
- View input constraints.
- View administrator-provided hints.
- Enter custom input.
- Execute the challenge.
- View the generated output.
- View execution errors when applicable.
- View their own execution history.
- Open the associated HackerRank problem in a new browser tab.

Participant-facing challenge information intentionally remains limited.

The participant does **not** receive:

- Challenge title
- Problem statement
- Problem description
- Hidden code
- Solution
- Expected algorithm
- Difficulty
- Score
- Rank
- Leaderboard
- Other participants' results
- Internal evaluation logic

---

## Black-Box Execution

The central concept of backTrack is controlled black-box execution.

The participant supplies only the input.

```text
Participant
     |
     | Input
     v
backTrack API
     |
     v
Challenge
     |
     | Hidden JavaScript
     v
Controlled Executor
     |
     | Input
     v
Sandboxed Execution
     |
     v
Output
     |
     v
Participant
````

The hidden challenge logic is stored on the backend and is never sent to the participant's browser.

The execution subsystem uses:

* Node.js worker threads
* V8 VM contexts
* Restricted globals
* Execution timeouts
* Memory limits
* Output limits
* Forbidden-token validation
* Server-side validation

The executor also prevents sensitive implementation details from being included in participant API responses.

> The execution environment is designed for the college-event use case where challenge logic is administrator-authored. It is not intended to replace container or microVM isolation for arbitrary untrusted code execution at internet scale.

---

## Security

backTrack implements multiple security controls throughout the application.

### Authentication

* JWT-based authentication
* Separate administrator and participant authentication
* Session restoration
* Protected routes
* Token validation

### Authorization

Role-based access control separates:

```text
ADMIN
PARTICIPANT
```

Participant accounts cannot access administrator APIs.

Administrator-only functionality is protected using authentication and role authorization middleware.

### Password Security

Passwords are never stored as plaintext.

The application uses:

* bcrypt password hashing
* Environment-based configuration
* Database-backed master password storage
* Optional event-specific password protection

Sensitive credentials are kept outside the Git repository.

### Hidden Challenge Logic

Challenge `hiddenCode` is kept strictly on the backend.

It is not exposed through:

* Participant APIs
* Participant challenge responses
* Attempt history
* Result APIs
* Frontend bundles
* Execution responses

---

## Technology Stack

### Frontend

* React
* Vite
* React Router
* Tailwind CSS
* Axios
* JavaScript / JSX

### Backend

* Node.js
* Express.js
* Mongoose
* MongoDB
* JWT
* bcryptjs
* Helmet
* CORS
* express-rate-limit

### Execution

* Node.js `worker_threads`
* Node.js `vm`
* Controlled V8 execution context

### Database

* MongoDB
* Mongoose ODM

---

# Project Structure

```text
backTrack/
│
├── backend/
│   │
│   ├── src/
│   │   ├── config/
│   │   │   ├── database.js
│   │   │   └── env.js
│   │   │
│   │   ├── constants/
│   │   │   ├── roles.js
│   │   │   └── status.js
│   │   │
│   │   ├── controllers/
│   │   │   ├── adminMonitoringController.js
│   │   │   ├── adminResultController.js
│   │   │   ├── authController.js
│   │   │   ├── executionController.js
│   │   │   ├── healthController.js
│   │   │   ├── participantController.js
│   │   │   ├── resultController.js
│   │   │   └── settingsController.js
│   │   │
│   │   ├── middleware/
│   │   │   ├── authenticate.js
│   │   │   ├── authorize.js
│   │   │   ├── errorHandler.js
│   │   │   ├── notFoundHandler.js
│   │   │   └── security.js
│   │   │
│   │   ├── models/
│   │   │   ├── Admin.js
│   │   │   ├── Attempt.js
│   │   │   ├── Challenge.js
│   │   │   ├── Event.js
│   │   │   ├── Participant.js
│   │   │   └── SystemSetting.js
│   │   │
│   │   ├── routes/
│   │   │   ├── adminResultRoutes.js
│   │   │   ├── adminRoutes.js
│   │   │   ├── apiRouter.js
│   │   │   ├── authRoutes.js
│   │   │   └── eventRoutes.js
│   │   │
│   │   ├── services/
│   │   │   ├── adminBootstrap.js
│   │   │   ├── adminMonitoringService.js
│   │   │   ├── authService.js
│   │   │   ├── challengeService.js
│   │   │   ├── evaluationService.js
│   │   │   ├── executionService.js
│   │   │   ├── participantService.js
│   │   │   ├── resultService.js
│   │   │   ├── settingsService.js
│   │   │   │
│   │   │   └── codeExecutor/
│   │   │       ├── errors.js
│   │   │       ├── executor.js
│   │   │       ├── validator.js
│   │   │       └── worker.js
│   │   │
│   │   ├── utils/
│   │   │   ├── apiResponse.js
│   │   │   ├── appError.js
│   │   │   └── logger.js
│   │   │
│   │   ├── validators/
│   │   │   ├── authValidator.js
│   │   │   ├── challengeValidator.js
│   │   │   ├── eventValidator.js
│   │   │   ├── executionValidator.js
│   │   │   ├── participantValidator.js
│   │   │   └── resultValidator.js
│   │   │
│   │   ├── app.js
│   │   └── server.js
│   │
│   ├── tests/
│   │
│   ├── package.json
│   ├── package-lock.json
│   └── .env.example
│
├── frontend/
│   │
│   ├── src/
│   │   ├── components/
│   │   │   └── admin/
│   │   │       ├── ChallengeFormModal.jsx
│   │   │       ├── ConfirmDialog.jsx
│   │   │       ├── EventFormModal.jsx
│   │   │       └── ParticipantFormModal.jsx
│   │   │
│   │   ├── context/
│   │   │   └── AuthContext.jsx
│   │   │
│   │   ├── layouts/
│   │   │   └── AdminLayout.jsx
│   │   │
│   │   ├── pages/
│   │   │   ├── admin/
│   │   │   ├── participant/
│   │   │   ├── AdminDashboardShell.jsx
│   │   │   ├── AdminLoginPage.jsx
│   │   │   ├── LoginPage.jsx
│   │   │   ├── ParticipantDashboardShell.jsx
│   │   │   └── DevVerificationPage.jsx
│   │   │
│   │   ├── routes/
│   │   │   └── AppRoutes.jsx
│   │   │
│   │   ├── services/
│   │   │   ├── adminMonitoringService.js
│   │   │   ├── adminResultsService.js
│   │   │   ├── challengeService.js
│   │   │   ├── eventService.js
│   │   │   ├── participantService.js
│   │   │   ├── resultService.js
│   │   │   └── apiClient.js
│   │   │
│   │   ├── constants/
│   │   │   └── roles.js
│   │   │
│   │   ├── App.jsx
│   │   ├── index.css
│   │   └── main.jsx
│   │
│   ├── index.html
│   ├── package.json
│   ├── package-lock.json
│   └── .env.example
│
├── database-backup/
│   └── backtrack_db/
│
├── .gitignore
├── package.json
└── README.md
```

---

# Important Directories

## `backend/src/config/`

Contains application configuration and database connection logic.

```text
backend/src/config/
├── database.js
└── env.js
```

`database.js` manages the MongoDB connection.

`env.js` validates and exposes required environment variables.

---

## `backend/src/models/`

Contains Mongoose database schemas.

```text
backend/src/models/
├── Admin.js
├── Participant.js
├── Event.js
├── Challenge.js
├── Attempt.js
└── SystemSetting.js
```

These models represent the main entities used by the application.

---

## `backend/src/controllers/`

Contains HTTP request handlers.

Controllers receive requests from routes and delegate business logic to services.

---

## `backend/src/services/`

Contains the application's business logic.

Important services include:

* `authService.js` — authentication and JWT handling
* `participantService.js` — participant management
* `eventService.js` — event management and access
* `challengeService.js` — challenge management
* `executionService.js` — challenge execution workflow
* `resultService.js` — result and statistics processing
* `adminMonitoringService.js` — administrative monitoring
* `settingsService.js` — application settings and master password
* `adminBootstrap.js` — administrator initialization

---

## `backend/src/services/codeExecutor/`

Contains the controlled JavaScript execution subsystem.

```text
codeExecutor/
├── errors.js
├── executor.js
├── validator.js
└── worker.js
```

This directory is intentionally separated from the normal application services because execution is a sensitive subsystem.

---

## `backend/src/routes/`

Contains API route definitions.

Routes connect HTTP endpoints with the appropriate controllers and middleware.

---

## `backend/src/middleware/`

Contains application-wide middleware such as:

* Authentication
* Authorization
* Security headers
* Error handling
* 404 handling

---

## `backend/src/validators/`

Contains request validation logic for:

* Authentication
* Participants
* Events
* Challenges
* Code execution
* Results

---

# Frontend Structure

## `frontend/src/pages/`

Contains application pages.

### Administrator pages

```text
frontend/src/pages/admin/
```

Contains interfaces for:

* Dashboard
* Participants
* Events
* Challenges
* Attempts
* Results and statistics

### Participant pages

```text
frontend/src/pages/participant/
```

Contains the participant event and challenge workspace.

---

## `frontend/src/components/admin/`

Reusable administrator components such as:

* Event form
* Challenge form
* Participant form
* Confirmation dialog

---

## `frontend/src/services/`

Contains frontend API service modules.

Each service communicates with the corresponding backend API.

The centralized Axios configuration is located in:

```text
frontend/src/services/apiClient.js
```

---

## `frontend/src/context/`

Contains React application context.

The authentication state is managed through:

```text
frontend/src/context/AuthContext.jsx
```

---

## `frontend/src/routes/`

Contains frontend routing configuration.

```text
frontend/src/routes/AppRoutes.jsx
```

Protected routes ensure that administrator and participant pages can only be accessed by authenticated users with the appropriate role.

---

# Database

The application uses MongoDB with Mongoose.

The primary collections include:

```text
admins
participants
events
challenges
attempts
systemsettings
```

A database backup directory is also included in the repository:

```text
database-backup/backtrack_db/
```

The backup directory contains database-related backup data and should be handled carefully when making changes to the database.

---

# Environment Configuration

Environment-specific values are stored in `.env` files and are intentionally excluded from Git.

Example files are provided as:

```text
backend/.env.example
frontend/.env.example
```

Typical backend configuration includes:

```text
PORT
NODE_ENV
MONGODB_URI
JWT_SECRET
JWT_EXPIRES_IN
ADMIN_EMAIL
ADMIN_PASSWORD
MASTER_PASSWORD_HASH
FRONTEND_URL
EXECUTION_TIMEOUT_MS
EXECUTION_MAX_INPUT_LENGTH
EXECUTION_MAX_OUTPUT_LENGTH
```

Frontend configuration includes the API base URL.

Never commit real credentials, database connection strings, JWT secrets, password hashes, or other sensitive values to the repository.

---

# Running the Project Locally

## Prerequisites

Make sure the following are installed:

* Node.js
* npm
* MongoDB / MongoDB Atlas
* Git

---

## 1. Clone the repository

```bash
git clone https://github.com/neha-nupur/Black-Box-Coding-Event-Platform.git
cd Black-Box-Coding-Event-Platform
```

---

## 2. Install backend dependencies

```bash
cd backend
npm install
```

---

## 3. Configure backend environment

Create:

```text
backend/.env
```

using:

```text
backend/.env.example
```

and provide your local configuration.

---

## 4. Start the backend

Development mode:

```bash
npm run dev
```

The backend runs on:

```text
http://localhost:5000
```

---

## 5. Install frontend dependencies

Open another terminal:

```bash
cd frontend
npm install
```

---

## 6. Configure frontend environment

Create:

```text
frontend/.env
```

using:

```text
frontend/.env.example
```

---

## 7. Start the frontend

```bash
npm run dev
```

The frontend will normally be available at:

```text
http://localhost:5173
```

---

# Application Flow

```text
Administrator
     |
     v
Admin Login
     |
     v
Admin Dashboard
     |
     +------------------+
     |                  |
     v                  v
Participants          Events
                        |
                        v
                    Challenges
                        |
                        v
                 Hidden JS Logic
                        |
                        v
                Controlled Executor
                        |
                        v
                    Attempts
                        |
                        v
             Results & Statistics
```

Participant flow:

```text
Participant
     |
     v
Participant Login
     |
     v
Available Events
     |
     v
Start Event
     |
     v
Challenge Workspace
     |
     +----------+-----------+
     |          |           |
     v          v           v
   Hint     Constraints  HackerRank
     |
     v
Input
     |
     v
Run Challenge
     |
     v
Black-Box Executor
     |
     v
Output
```

---

# API Structure

The backend API is organized under:

```text
/api
```

Major API areas include:

```text
/api/auth
/api/admin
/api/events
```

Authentication endpoints handle login and session management.

Administrator endpoints handle participants, events, challenges, monitoring, results, and settings.

Participant endpoints handle event access, challenge retrieval, challenge execution, and attempt history.

---

# Security Principles

backTrack follows these core principles:

1. Authentication is required for protected resources.
2. Administrator and participant permissions are separated.
3. Passwords are hashed before storage.
4. Sensitive environment variables are not committed to Git.
5. Challenge hidden logic remains server-side.
6. Participant responses are sanitized.
7. Participants cannot access other participants' attempt history.
8. Event access is validated server-side.
9. Challenge execution is performed in a controlled environment.
10. Execution time and output are limited.
11. API errors are handled through centralized middleware.
12. Server-side time is used for event eligibility.

---

# Development Notes

The project follows a layered backend architecture:

```text
Routes
  ↓
Middleware
  ↓
Controllers
  ↓
Services
  ↓
Models
  ↓
MongoDB
```

The frontend follows a component and service-based architecture:

```text
Pages
  ↓
Components
  ↓
Services
  ↓
Axios API Client
  ↓
Backend API
```

This separation keeps UI logic, API communication, business logic, and database operations independent and easier to maintain.

---

# Repository

GitHub:

[https://github.com/neha-nupur/Black-Box-Coding-Event-Platform](https://github.com/neha-nupur/Black-Box-Coding-Event-Platform)

````

