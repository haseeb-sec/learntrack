# LearnTrack — Entity Relationship Diagram

This diagram represents the database structure defined in `src/database/schema.sql`.

## Entity Relationship Diagram

```mermaid
erDiagram
    USERS ||--o{ COURSES : creates
    USERS ||--o{ ATTEMPTS : submits
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
    }


## Relationship Explanation

- One instructor can create multiple courses.
- One student can submit multiple quiz attempts.
- One course can contain multiple lessons and questions.
- One course can receive multiple student attempts.
- One question can have multiple answer choices.
- Each attempt records the student's selected answers.
- Each recorded answer references its question and selected choice.

## Database Constraints

- User email addresses must be unique.
- User roles are restricted to `instructor` and `student`.
- Each question can have only one correct choice, enforced by a partial unique index.
- A question cannot be answered more than once in the same attempt.
- Deleting a course cascades to its lessons and questions.
- Deleting a question cascades to its answer choices.

## Implementation Note

The application validates course ownership, student permissions, quiz submissions, and answer correctness on the server. The database stores the resulting scores and individual answers.
