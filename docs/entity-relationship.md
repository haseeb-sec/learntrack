# LearnTrack — Entity Relationship Diagram

This diagram reflects the database schema in `src/database/schema.sql`.

## Entity relationship diagram

```mermaid
erDiagram
    USERS ||--o{ COURSES : creates
    USERS ||--o{ ENROLLMENTS : joins
    USERS ||--o{ ATTEMPTS : submits
    COURSES ||--o{ ENROLLMENTS : has
    COURSES ||--o{ LESSONS : contains
    COURSES ||--o{ QUESTIONS : contains
    COURSES ||--o{ ATTEMPTS : receives
    QUESTIONS ||--o{ QUESTION_CHOICES : has
    ATTEMPTS ||--o{ ATTEMPT_ANSWERS : records
    QUESTIONS ||--o{ ATTEMPT_ANSWERS : answered_in
    QUESTION_CHOICES ||--o{ ATTEMPT_ANSWERS : selected_as

    USERS {
        int id PK
        string name
        string email UK
        string password_hash
        string role
        datetime created_at
    }

    COURSES {
        int id PK
        int instructor_id FK
        string title
        string description
        datetime created_at
    }

    ENROLLMENTS {
        int id PK
        int student_id FK
        int course_id FK
        datetime enrolled_at
    }

    LESSONS {
        int id PK
        int course_id FK
        string title
        string content
        int position
    }

    QUESTIONS {
        int id PK
        int course_id FK
        string question_text
        int position
    }

    QUESTION_CHOICES {
        int id PK
        int question_id FK
        string choice_text
        boolean is_correct
    }

    ATTEMPTS {
        int id PK
        int student_id FK
        int course_id FK
        int score
        int total_questions
        datetime submitted_at
    }

    ATTEMPT_ANSWERS {
        int id PK
        int attempt_id FK
        int question_id FK
        int selected_choice_id FK
        boolean is_correct
    }
```

## Relationship explanation

- One instructor can create multiple courses.
- Students can enroll in multiple courses, and each course can have multiple enrolled students.
- One course can contain multiple lessons and quiz questions.
- One question can have multiple answer choices.
- One student can submit multiple attempts.
- Each attempt belongs to one student and one course.
- Each attempt can contain multiple submitted answers.
- Each answer references the question and selected choice.

## Database constraints and application rules

- User email addresses are unique.
- User roles are restricted to `instructor` and `student`.
- A student can enroll only once in a given course.
- Each question can have only one correct choice, enforced by a partial unique index.
- A question can be answered only once per attempt.
- Course deletion cascades to its lessons, questions, and enrollments.
- Question deletion cascades to its answer choices.
- Attempt-answer rows cascade when their parent attempt is deleted.
- The application prevents changes to questions referenced by saved answers and prevents deleting a quiz or course while attempts exist.

## Implementation note

The database enforces core relationships and uniqueness constraints. The Express routes enforce authentication, role permissions, course ownership, enrollment requirements, quiz validation, and server-side score calculation.
