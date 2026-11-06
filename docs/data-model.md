# LearnTrack — Data Model

## Entities

- User: name, email, password_hash, role (instructor/student).
- Course: instructor_id, title, description.
- Lesson: course_id, title, content, position.
- Question: course_id, question_text, position.
- QuestionChoice: question_id, choice_text, is_correct.
- Attempt: student_id, course_id, score, total_questions, submitted_at.
- Enrollment: student_id, course_id, enrolled_at.
- AttemptAnswer: attempt_id, question_id, selected_choice_id, is_correct.

## Relationships

- One instructor can create many courses.
- A student can enroll in many courses, and each course can have many enrolled students.
- One course can contain many lessons.
- One course can contain many quiz questions.
- One question can have many answer choices.
- One student can make many attempts.
- One attempt belongs to one student and one course.
- One attempt can contain many submitted answers.

## Important rules

- Each user has either the instructor or student role.
- Each course belongs to its creating instructor.
- Students must enroll before reading course lessons, opening quizzes, or viewing course attempt history.
- Existing students with saved attempts are enrolled automatically during schema initialization.
- Correct answers are evaluated on the server.
- Scores are stored with their corresponding attempts.
