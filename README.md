# LearnTrack
## Student Learning & Quiz Management System

LearnTrack is a full-stack course and quiz management application built for the Stack & Scale Remote Internship Program — Week 02. It provides separate instructor and student workflows for publishing courses, managing lessons and quizzes, enrolling in courses, and tracking assessment results.

## Features

### Authentication and access control
- Student and instructor registration and sign-in.
- Password hashing with Argon2.
- Session-based authentication with Passport.js.
- Role-protected routes and instructor ownership checks.

### Instructor workspace
- Create, view, update, and delete owned courses.
- Add, edit, and delete text-based lessons.
- Create multiple-choice quiz questions with 2–6 choices and one correct answer.
- Review existing quiz questions and delete an entire quiz.
- Data-integrity safeguards prevent deleting courses or quiz content when saved attempts would be affected.

### Student workspace
- Browse all available courses and view course descriptions.
- Enroll in a course before opening its lessons or quiz.
- Read course lessons.
- Attempt multiple-choice quizzes.
- Receive scores calculated and stored by the server.
- Review previous attempts and remove an individual mistaken attempt from their own history.

### Security and data integrity
- SQLite database with foreign-key relationships.
- Server-side validation of quiz submissions and answer choices.
- Correct answers are not exposed by the student quiz endpoint.
- Students can access and delete only their own attempt history.
- Instructors can manage only courses they own.
- Automated integration tests cover authentication, permissions, course ownership, enrollment, lessons, quiz validation, scoring, and attempt management.

## Technology stack

| Area | Technologies |
|---|---|
| Runtime and server | Node.js 22+, Express 5 |
| Database | SQLite, better-sqlite3 |
| Authentication | Passport.js, passport-local, express-session |
| Password security | Argon2 |
| Security middleware | Helmet, express-rate-limit |
| Front end | HTML, CSS, vanilla JavaScript |
| Testing | Node.js built-in test runner |
| Version control and CI | Git, GitHub Actions |

## Project structure

```text
learntrack/
├── .github/
│   └── workflows/
│       └── test.yml
├── docs/
│   ├── data-model.md
│   ├── entity-relationship.md
│   └── user-flows.md
├── public/
│   ├── css/
│   ├── js/
│   ├── auth.html
│   ├── courses.html
│   ├── index.html
│   └── instructor.html
├── src/
│   ├── config/
│   ├── database/
│   │   ├── db.js
│   │   ├── schema.sql
│   │   └── seed.js
│   ├── middleware/
│   ├── routes/
│   │   ├── auth.js
│   │   └── courses.js
│   └── server.js
├── tests/
│   └── integration.test.js
├── .env.example
├── .gitignore
├── package-lock.json
└── package.json
```

## Requirements

- Node.js 22 or later
- npm

## Installation

Clone the repository and install dependencies:

```bash
git clone https://github.com/haseeb-sec/learntrack.git
cd learntrack
npm ci
```

Create a local environment file:

```bash
cp .env.example .env
```

Set a unique, private session secret in `.env`:

```env
SESSION_SECRET=replace-with-a-long-random-secret
```

Do not commit `.env` or share real passwords and secrets.

## Run the application

Start the development server:

```bash
npm run dev
```

Or run it without watch mode:

```bash
npm start
```

Open [http://localhost:3000](http://localhost:3000).

The application initializes the SQLite schema automatically. By default, the database is stored at `database/learntrack.db`. Database files, local environment files, and dependencies are excluded through `.gitignore`.

## Optional demo data

To create demo instructor and student accounts with a sample course, lessons, and quiz questions, set these local variables in `.env`:

```env
SEED_INSTRUCTOR_PASSWORD=use-a-private-demo-password
SEED_STUDENT_PASSWORD=use-another-private-demo-password
```

Use passwords of at least eight characters, then run:

```bash
npm run seed
```

Demo account emails:

| Role | Email |
|---|---|
| Instructor | instructor@learntrack.local |
| Student | student@learntrack.local |

Use the passwords configured locally. The seed script does not print passwords. It preserves existing demo content and adds missing sample content. For a clean demonstration, use a fresh local database. Never use real personal passwords for demo accounts.

## Tests

Run the automated integration suite:

```bash
npm test
```

The tests start the application against a temporary SQLite database and exercise the main authentication, authorization, enrollment, lesson, quiz, scoring, history, and instructor content-management workflows. GitHub Actions runs the test command on pushes to `main` and pull requests targeting `main`.

## API overview

All routes are served under `/api`.

### Authentication

| Method | Endpoint | Access | Purpose |
|---|---|---|---|
| POST | `/api/auth/register` | Public | Register a student or instructor |
| POST | `/api/auth/login` | Public | Sign in |
| GET | `/api/auth/me` | Signed in | Get the current account |
| POST | `/api/auth/logout` | Signed in | Sign out |

### Courses, lessons, and quizzes

| Method | Endpoint | Access | Purpose |
|---|---|---|---|
| GET | `/api/courses` | Public | Browse available courses |
| POST | `/api/courses` | Instructor | Create a course |
| GET | `/api/courses/mine` | Instructor | List owned courses |
| PUT | `/api/courses/:courseId` | Course owner | Update a course |
| DELETE | `/api/courses/:courseId` | Course owner | Delete a course when no attempts exist |
| POST | `/api/courses/:courseId/enroll` | Student | Enroll in a course |
| GET | `/api/courses/:courseId/lessons` | Enrolled student | Read course lessons |
| POST | `/api/courses/:courseId/lessons` | Course owner | Add a lesson |
| GET | `/api/courses/:courseId/lessons/manage` | Course owner | List lessons for management |
| PUT | `/api/courses/:courseId/lessons/:lessonId` | Course owner | Update a lesson |
| DELETE | `/api/courses/:courseId/lessons/:lessonId` | Course owner | Delete a lesson |
| GET | `/api/courses/:courseId/questions` | Enrolled student | Retrieve quiz questions without correct-answer flags |
| POST | `/api/courses/:courseId/questions` | Course owner | Add a quiz question |
| GET | `/api/courses/:courseId/questions/manage` | Course owner | List quiz questions for management |
| PUT | `/api/courses/:courseId/questions/:questionId` | Course owner | Update a question when no saved answer references it |
| DELETE | `/api/courses/:courseId/questions/:questionId` | Course owner | Delete a question when no saved answer references it |
| DELETE | `/api/courses/:courseId/questions` | Course owner | Delete the quiz when no attempts exist |
| POST | `/api/courses/:courseId/attempts` | Enrolled student | Submit a quiz and receive a server-calculated score |
| GET | `/api/courses/:courseId/attempts/mine` | Enrolled student | View own attempt history |
| DELETE | `/api/courses/:courseId/attempts/:attemptId` | Attempt owner | Remove an individual attempt |
| GET | `/api/courses/student/summary` | Student | View course and learning summary |

## Documentation

- [Data model](docs/data-model.md)
- [Entity relationship diagram](docs/entity-relationship.md)
- [User workflows](docs/user-flows.md)

## Scope and limitations

- Lessons contain text; video hosting is not included.
- Payments, certificates, course approvals, and advanced analytics are outside the current scope.
- The default Express session MemoryStore is intended for local demonstration, not production deployment. A persistent session store is required before production use.
- Production hosting, HTTPS configuration, and deployment automation are not included.

## Project context

Developed as the Stack & Scale Remote Internship Program — Week 02 full-stack project. The implementation and documentation use official package documentation and AI-assisted learning/debugging as supporting resources. The intern is responsible for understanding, testing, and demonstrating the submitted work.
