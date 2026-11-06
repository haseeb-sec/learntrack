# LearnTrack
## Student Learning & Quiz Management System

LearnTrack is a full-stack learning platform for small learning centers. It provides separate instructor and student experiences for publishing courses, reading lessons, taking multiple-choice quizzes, and reviewing saved results.

## Features

### Accounts and access
- Student and instructor registration and sign-in.
- Password hashing with Argon2.
- Session-based authentication using Passport.js.
- Role-protected instructor and student actions.

### Instructor
- Create and manage courses.
- Add text-based lessons to owned courses.
- Create multiple-choice questions with one correct answer per question.

### Student
- Browse available courses.
- Read course lessons.
- Attempt quizzes and submit answers.
- View automatically calculated scores and previous attempts.

### Data and security
- SQLite database with foreign-key relationships.
- Server-side answer validation and score calculation.
- Correct answers are not included in the student quiz response.
- Automated integration tests for authentication, permissions, lessons, quizzes, scoring, and attempt history.

## Technology

- Node.js and Express
- SQLite and better-sqlite3
- Passport.js and passport-local
- Argon2
- HTML, CSS, and vanilla JavaScript
- Node.js built-in test runner

## Requirements

- Node.js 22 or later
- npm

## Installation

Clone the repository and install dependencies:

```bash
git clone https://github.com/haseeb-sec/learntrack.git
cd learntrack
npm install
```

Create your local environment file:

```bash
cp .env.example .env
```

Edit `.env` and set a unique, long, private session secret:

```env
SESSION_SECRET=replace-with-a-long-random-secret
```

Do not commit `.env` or share real passwords and secrets.

## Run the application

Start the development server:

```bash
npm run dev
```

Or start it normally:

```bash
npm start
```

Open [http://localhost:3000](http://localhost:3000).

The application initializes the SQLite schema automatically. The default database file is `database/learntrack.db`.

## Demo data

To create a demo instructor, student, course, lessons, and quiz questions, add these variables to your local `.env` file:

```env
SEED_INSTRUCTOR_PASSWORD=your-private-instructor-password
SEED_STUDENT_PASSWORD=your-private-student-password
```

Use passwords of at least eight characters. Then run:

```bash
npm run seed
```

Demo accounts:

| Role | Email |
|---|---|
| Instructor | instructor@learntrack.local |
| Student | student@learntrack.local |

Sign in using the passwords you configured locally. The seed script does not print passwords. It preserves existing demo content and adds missing sample lessons and questions.

For a clean demo, run the seed command against a fresh database. Do not use real personal passwords for demo accounts.

## Tests

Run the automated integration tests:

```bash
npm test
```

The integration suite uses a temporary database and checks authentication, role restrictions, course ownership, lesson workflows, quiz validation, server-side scoring, repeat attempts, and result history.

## Main project structure

```text
learntrack/
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
│   │   ├── schema.sql
│   │   ├── db.js
│   │   └── seed.js
│   ├── middleware/
│   ├── routes/
│   └── server.js
├── tests/
│   └── integration.test.js
├── .env.example
└── package.json
```

## API overview

| Method | Endpoint | Access | Purpose |
|---|---|---|---|
| POST | /api/auth/register | Public | Register an account |
| POST | /api/auth/login | Public | Sign in |
| GET | /api/auth/me | Signed in | Current account |
| POST | /api/auth/logout | Signed in | Sign out |
| GET | /api/courses | Public | Browse courses |
| POST | /api/courses | Instructor | Create a course |
| GET | /api/courses/mine | Instructor | List owned courses |
| POST | /api/courses/:courseId/lessons | Instructor | Add a lesson |
| GET | /api/courses/:courseId/lessons/manage | Instructor | Manage owned course lessons |
| GET | /api/courses/:courseId/lessons | Student | Read course lessons |
| POST | /api/courses/:courseId/questions | Instructor | Add a quiz question |
| GET | /api/courses/:courseId/questions | Student | Retrieve quiz questions |
| POST | /api/courses/:courseId/attempts | Student | Submit a quiz |
| GET | /api/courses/:courseId/attempts/mine | Student | View own attempt history |
| GET | /api/courses/student/summary | Student | View learning summary |

All quiz scores are calculated by the server. Student endpoints return only the signed-in student's results.

## Documentation

- [Data model](docs/data-model.md)
- [Entity relationships](docs/entity-relationship.md)
- [User workflows](docs/user-flows.md)

## Known limitations

- Lessons are text-based; video hosting is not included.
- There are no payments, certificates, course approvals, or advanced analytics.
- The application uses the Express session MemoryStore by default. It is suitable for local demonstration, not production deployment. A persistent session store should be configured before production use.
- HTTPS and production deployment configuration are not included in this learning project.

## Credits and learning resources

Built as the Stack & Scale Remote Internship Week 02 full-stack development project. Documentation and implementation were developed with assistance from official package documentation and AI-assisted learning/debugging. The intern is responsible for understanding and demonstrating the submitted implementation.
