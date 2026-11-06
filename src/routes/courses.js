const express = require('express');
const db = require('../database/db');
const { requireRole } = require('../middleware/auth');

const router = express.Router();

function requireEnrollment(req, res, next) {
    const courseId = Number(req.params.courseId);
    const enrollment = db.prepare(
        'SELECT id FROM enrollments WHERE student_id = ? AND course_id = ?'
    ).get(req.user.id, courseId);

    if (!enrollment) {
        return res.status(403).json({
            error: 'Enroll in this course before accessing its lessons or quizzes.'
        });
    }

    next();
}

// Public: list all courses.
router.get('/', (req, res) => {
    try {
        const courses = db.prepare(`
            SELECT
                courses.id,
                courses.title,
                courses.description,
                courses.created_at,
                users.name AS instructor
            FROM courses
            INNER JOIN users ON users.id = courses.instructor_id
            ORDER BY courses.created_at DESC
        `).all();

        res.json(courses);
    } catch (error) {
        console.error('Failed to retrieve courses:', error.message);
        res.status(500).json({
            error: 'Unable to retrieve courses.'
        });
    }
});

// Instructor only: create a course.
router.post('/', requireRole('instructor'), (req, res) => {
    try {
        const { title, description = '' } = req.body;

        if (typeof title !== 'string' || typeof description !== 'string') {
            return res.status(400).json({
                error: 'Invalid course details.'
            });
        }

        const cleanTitle = title.trim();
        const cleanDescription = description.trim();

        if (cleanTitle.length < 3 || cleanTitle.length > 120) {
            return res.status(400).json({
                error: 'Course title must be between 3 and 120 characters.'
            });
        }

        if (cleanDescription.length > 1000) {
            return res.status(400).json({
                error: 'Description must not exceed 1000 characters.'
            });
        }

        const result = db.prepare(`
            INSERT INTO courses (instructor_id, title, description)
            VALUES (?, ?, ?)
        `).run(req.user.id, cleanTitle, cleanDescription);

        const course = db.prepare(`
            SELECT
                courses.id,
                courses.title,
                courses.description,
                courses.created_at,
                users.name AS instructor
            FROM courses
            INNER JOIN users ON users.id = courses.instructor_id
            WHERE courses.id = ?
        `).get(result.lastInsertRowid);

        return res.status(201).json({
            message: 'Course created successfully.',
            course
        });
    } catch (error) {
        console.error('Failed to create course:', error.message);
        return res.status(500).json({
            error: 'Unable to create course.'
        });
    }
});


// Student only: retrieve course details and this student's learning activity.
router.get('/student/summary', requireRole('student'), (req, res) => {
    try {
        const courses = db.prepare(`
            SELECT
                courses.id,
                courses.title,
                courses.description,
                EXISTS (
                    SELECT 1 FROM enrollments
                    WHERE enrollments.course_id = courses.id
                      AND enrollments.student_id = ?
                ) AS is_enrolled,
                courses.created_at,
                users.name AS instructor,
                (
                    SELECT COUNT(*)
                    FROM questions
                    WHERE questions.course_id = courses.id
                ) AS question_count,
                (
                    SELECT COUNT(*)
                    FROM attempts
                    WHERE attempts.course_id = courses.id
                      AND attempts.student_id = ?
                ) AS attempt_count,
                (
                    SELECT score
                    FROM attempts
                    WHERE attempts.course_id = courses.id
                      AND attempts.student_id = ?
                    ORDER BY submitted_at DESC, id DESC
                    LIMIT 1
                ) AS last_score,
                (
                    SELECT total_questions
                    FROM attempts
                    WHERE attempts.course_id = courses.id
                      AND attempts.student_id = ?
                    ORDER BY submitted_at DESC, id DESC
                    LIMIT 1
                ) AS last_total_questions,
                (
                    SELECT ROUND(score * 100.0 / total_questions)
                    FROM attempts
                    WHERE attempts.course_id = courses.id
                      AND attempts.student_id = ?
                    ORDER BY submitted_at DESC, id DESC
                    LIMIT 1
                ) AS last_percentage,
                (
                    SELECT submitted_at
                    FROM attempts
                    WHERE attempts.course_id = courses.id
                      AND attempts.student_id = ?
                    ORDER BY submitted_at DESC, id DESC
                    LIMIT 1
                ) AS last_submitted_at
            FROM courses
            INNER JOIN users ON users.id = courses.instructor_id
            ORDER BY courses.created_at DESC
        `).all(
            req.user.id,
            req.user.id,
            req.user.id,
            req.user.id,
            req.user.id,
            req.user.id
        );

        const attempts = db.prepare(`
            SELECT
                attempts.id,
                attempts.course_id AS courseId,
                courses.title AS courseTitle,
                attempts.score,
                attempts.total_questions,
                ROUND(
                    attempts.score * 100.0 / attempts.total_questions
                ) AS percentage,
                attempts.submitted_at
            FROM attempts
            INNER JOIN courses ON courses.id = attempts.course_id
            WHERE attempts.student_id = ?
            ORDER BY attempts.submitted_at DESC, attempts.id DESC
        `).all(req.user.id);

        const summary = {
            availableCourses: courses.length,
            enrolledCourses: courses.filter(course => course.is_enrolled).length,
            attemptedCourses: courses.filter(course => course.attempt_count > 0).length,
            totalAttempts: attempts.length
        };

        res.json({
            courses,
            attempts,
            summary,
            latestAttempt: attempts[0] || null
        });
    } catch (error) {
        console.error('Failed to retrieve student summary:', error.message);
        res.status(500).json({
            error: 'Unable to retrieve your learning summary.'
        });
    }
});

// Instructor only: list courses owned by the signed-in instructor.
router.get('/mine', requireRole('instructor'), (req, res) => {
    try {
        const courses = db.prepare(`
            SELECT id, title, description
            FROM courses
            WHERE instructor_id = ?
            ORDER BY id DESC
        `).all(req.user.id);

        res.json({ courses });
    } catch (error) {
        console.error('Failed to retrieve instructor courses:', error.message);
        res.status(500).json({ error: 'Unable to retrieve your courses.' });
    }
});

// Student: enroll in a course before accessing its learning content.
router.post('/:courseId/enroll', requireRole('student'), (req, res) => {
    try {
        const courseId = Number(req.params.courseId);
        if (!Number.isSafeInteger(courseId) || courseId < 1) {
            return res.status(400).json({ error: 'Invalid course ID.' });
        }

        const course = db.prepare('SELECT id FROM courses WHERE id = ?').get(courseId);
        if (!course) {
            return res.status(404).json({ error: 'Course not found.' });
        }

        const result = db.prepare(
            'INSERT OR IGNORE INTO enrollments (student_id, course_id) VALUES (?, ?)'
        ).run(req.user.id, courseId);

        const enrollment = db.prepare(
            'SELECT id, student_id, course_id, enrolled_at FROM enrollments WHERE student_id = ? AND course_id = ?'
        ).get(req.user.id, courseId);

        return res.status(result.changes ? 201 : 200).json({
            message: result.changes ? 'Successfully enrolled in course.' : 'You are already enrolled in this course.',
            enrollment
        });
    } catch (error) {
        console.error('Failed to enroll student:', error.message);
        return res.status(500).json({ error: 'Unable to enroll in this course.' });
    }
});

// Public: retrieve quiz questions and choices without exposing correct answers.
router.get('/:courseId/questions', requireRole('student'), requireEnrollment, (req, res) => {
    try {
        const courseId = Number(req.params.courseId);

        if (!Number.isSafeInteger(courseId) || courseId < 1) {
            return res.status(400).json({ error: 'Invalid course ID.' });
        }

        const course = db.prepare(
            'SELECT id, title FROM courses WHERE id = ?'
        ).get(courseId);

        if (!course) {
            return res.status(404).json({ error: 'Course not found.' });
        }

        const questions = db.prepare(`
            SELECT id, question_text, position
            FROM questions
            WHERE course_id = ?
            ORDER BY position, id
        `).all(courseId);

        const getChoices = db.prepare(`
            SELECT id, choice_text
            FROM question_choices
            WHERE question_id = ?
            ORDER BY id
        `);

        res.json({
            course,
            questions: questions.map(question => ({
                ...question,
                choices: getChoices.all(question.id)
            }))
        });
    } catch (error) {
        console.error('Failed to retrieve quiz questions:', error.message);
        res.status(500).json({ error: 'Unable to retrieve quiz questions.' });
    }
});

// Instructor only: add a multiple-choice question to an owned course.
router.post('/:courseId/questions', requireRole('instructor'), (req, res) => {
    try {
        const courseId = Number(req.params.courseId);
        const { question, choices, correctIndex } = req.body;

        if (!Number.isSafeInteger(courseId) || courseId < 1) {
            return res.status(400).json({ error: 'Invalid course ID.' });
        }

        const course = db.prepare(`
            SELECT id FROM courses
            WHERE id = ? AND instructor_id = ?
        `).get(courseId, req.user.id);

        if (!course) {
            return res.status(404).json({
                error: 'Course not found or you do not own this course.'
            });
        }

        if (
            typeof question !== 'string' ||
            question.trim().length < 5 ||
            question.trim().length > 500
        ) {
            return res.status(400).json({
                error: 'Question must be between 5 and 500 characters.'
            });
        }

        if (
            !Array.isArray(choices) ||
            choices.length < 2 ||
            choices.length > 6 ||
            choices.some(choice =>
                typeof choice !== 'string' ||
                choice.trim().length < 1 ||
                choice.trim().length > 200
            )
        ) {
            return res.status(400).json({
                error: 'Provide between 2 and 6 valid answer choices.'
            });
        }

        if (
            !Number.isInteger(correctIndex) ||
            correctIndex < 0 ||
            correctIndex >= choices.length
        ) {
            return res.status(400).json({
                error: 'Select exactly one correct answer.'
            });
        }

        const cleanChoices = choices.map(choice => choice.trim());

        if (new Set(cleanChoices.map(choice => choice.toLowerCase())).size !== cleanChoices.length) {
            return res.status(400).json({
                error: 'Answer choices must be unique.'
            });
        }

        const createQuestion = db.transaction(() => {
            const position = db.prepare(`
                SELECT COALESCE(MAX(position), 0) + 1 AS nextPosition
                FROM questions WHERE course_id = ?
            `).get(courseId).nextPosition;

            const result = db.prepare(`
                INSERT INTO questions (course_id, question_text, position)
                VALUES (?, ?, ?)
            `).run(courseId, question.trim(), position);

            const insertChoice = db.prepare(`
                INSERT INTO question_choices
                    (question_id, choice_text, is_correct)
                VALUES (?, ?, ?)
            `);

            cleanChoices.forEach((choice, index) => {
                insertChoice.run(result.lastInsertRowid, choice, index === correctIndex ? 1 : 0);
            });

            return result.lastInsertRowid;
        });

        const questionId = createQuestion();

        res.status(201).json({
            message: 'Question created successfully.',
            questionId
        });
    } catch (error) {
        console.error('Failed to create quiz question:', error.message);
        res.status(500).json({ error: 'Unable to create quiz question.' });
    }
});


// Student only: submit a quiz. The server validates answers and calculates the score.
router.post('/:courseId/attempts', requireRole('student'), requireEnrollment, (req, res) => {
    try {
        const courseId = Number(req.params.courseId);
        const { answers } = req.body;

        if (!Number.isSafeInteger(courseId) || courseId < 1) {
            return res.status(400).json({ error: 'Invalid course ID.' });
        }

        const course = db.prepare(
            'SELECT id FROM courses WHERE id = ?'
        ).get(courseId);

        if (!course) {
            return res.status(404).json({ error: 'Course not found.' });
        }

        const questions = db.prepare(`
            SELECT id FROM questions
            WHERE course_id = ?
            ORDER BY position, id
        `).all(courseId);

        if (questions.length === 0) {
            return res.status(400).json({
                error: 'This course does not have a quiz yet.'
            });
        }

        if (!Array.isArray(answers) || answers.length !== questions.length) {
            return res.status(400).json({
                error: 'Submit one answer for every quiz question.'
            });
        }

        const questionIds = new Set(questions.map(question => question.id));
        const submittedQuestionIds = new Set();

        for (const answer of answers) {
            if (
                !answer ||
                !Number.isSafeInteger(answer.questionId) ||
                !Number.isSafeInteger(answer.choiceId) ||
                !questionIds.has(answer.questionId) ||
                submittedQuestionIds.has(answer.questionId)
            ) {
                return res.status(400).json({
                    error: 'Invalid or duplicate quiz answers.'
                });
            }

            submittedQuestionIds.add(answer.questionId);

            const choice = db.prepare(`
                SELECT id FROM question_choices
                WHERE id = ? AND question_id = ?
            `).get(answer.choiceId, answer.questionId);

            if (!choice) {
                return res.status(400).json({
                    error: 'An answer choice does not belong to its question.'
                });
            }
        }

        const getCorrectness = db.prepare(`
            SELECT is_correct
            FROM question_choices
            WHERE id = ? AND question_id = ?
        `);

        const scoredAnswers = answers.map(answer => ({
            ...answer,
            isCorrect: getCorrectness.get(
                answer.choiceId,
                answer.questionId
            ).is_correct === 1
        }));

        const score = scoredAnswers.filter(answer => answer.isCorrect).length;

        const saveAttempt = db.transaction(() => {
            const result = db.prepare(`
                INSERT INTO attempts (student_id, course_id, score, total_questions)
                VALUES (?, ?, ?, ?)
            `).run(req.user.id, courseId, score, questions.length);

            const insertAnswer = db.prepare(`
                INSERT INTO attempt_answers
                    (attempt_id, question_id, selected_choice_id, is_correct)
                VALUES (?, ?, ?, ?)
            `);

            scoredAnswers.forEach(answer => {
                insertAnswer.run(
                    result.lastInsertRowid,
                    answer.questionId,
                    answer.choiceId,
                    answer.isCorrect ? 1 : 0
                );
            });

            return result.lastInsertRowid;
        });

        const attemptId = saveAttempt();
        const attempt = db.prepare(`
            SELECT id, score, total_questions, submitted_at
            FROM attempts
            WHERE id = ? AND student_id = ?
        `).get(attemptId, req.user.id);

        res.status(201).json({
            message: 'Quiz submitted successfully.',
            attempt: {
                ...attempt,
                percentage: Math.round((score / questions.length) * 100)
            }
        });
    } catch (error) {
        console.error('Failed to submit quiz:', error.message);
        res.status(500).json({ error: 'Unable to submit quiz.' });
    }
});

// Student only: retrieve this student's attempts for a course.
router.get('/:courseId/attempts/mine', requireRole('student'), requireEnrollment, (req, res) => {
    try {
        const courseId = Number(req.params.courseId);

        if (!Number.isSafeInteger(courseId) || courseId < 1) {
            return res.status(400).json({ error: 'Invalid course ID.' });
        }

        const course = db.prepare(
            'SELECT id FROM courses WHERE id = ?'
        ).get(courseId);

        if (!course) {
            return res.status(404).json({ error: 'Course not found.' });
        }

        const attempts = db.prepare(`
            SELECT
                id,
                score,
                total_questions,
                ROUND(score * 100.0 / total_questions) AS percentage,
                submitted_at
            FROM attempts
            WHERE course_id = ? AND student_id = ?
            ORDER BY submitted_at DESC, id DESC
        `).all(courseId, req.user.id);

        res.json({ attempts });
    } catch (error) {
        console.error('Failed to retrieve quiz attempts:', error.message);
        res.status(500).json({ error: 'Unable to retrieve your attempts.' });
    }
});


// Students can read published text lessons for an available course.
router.get('/:courseId/lessons', requireRole('student'), requireEnrollment, (req, res) => {
    try {
        const courseId = Number(req.params.courseId);
        if (!Number.isSafeInteger(courseId) || courseId < 1) {
            return res.status(400).json({ error: 'Invalid course ID.' });
        }

        const course = db.prepare('SELECT id FROM courses WHERE id = ?').get(courseId);
        if (!course) {
            return res.status(404).json({ error: 'Course not found.' });
        }

        const lessons = db.prepare(`
            SELECT id, title, content, position
            FROM lessons
            WHERE course_id = ?
            ORDER BY position ASC, id ASC
        `).all(courseId);

        res.json({ lessons });
    } catch (error) {
        console.error('Failed to retrieve lessons:', error.message);
        res.status(500).json({ error: 'Unable to retrieve course lessons.' });
    }
});

// Instructors can retrieve lessons only for courses they own.
router.get('/:courseId/lessons/manage', requireRole('instructor'), (req, res) => {
    try {
        const courseId = Number(req.params.courseId);
        if (!Number.isSafeInteger(courseId) || courseId < 1) {
            return res.status(400).json({ error: 'Invalid course ID.' });
        }

        const course = db.prepare(
            'SELECT id FROM courses WHERE id = ? AND instructor_id = ?'
        ).get(courseId, req.user.id);

        if (!course) {
            return res.status(404).json({ error: 'Course not found.' });
        }

        const lessons = db.prepare(`
            SELECT id, title, content, position
            FROM lessons
            WHERE course_id = ?
            ORDER BY position ASC, id ASC
        `).all(courseId);

        res.json({ lessons });
    } catch (error) {
        console.error('Failed to retrieve instructor lessons:', error.message);
        res.status(500).json({ error: 'Unable to retrieve course lessons.' });
    }
});

// Instructors can add text lessons only to their own courses.
router.post('/:courseId/lessons', requireRole('instructor'), (req, res) => {
    try {
        const courseId = Number(req.params.courseId);
        const title = typeof req.body.title === 'string' ? req.body.title.trim() : '';
        const content = typeof req.body.content === 'string' ? req.body.content.trim() : '';

        if (!Number.isSafeInteger(courseId) || courseId < 1) {
            return res.status(400).json({ error: 'Invalid course ID.' });
        }
        if (title.length < 3 || title.length > 120) {
            return res.status(400).json({ error: 'Lesson title must be between 3 and 120 characters.' });
        }
        if (!content || content.length > 20000) {
            return res.status(400).json({ error: 'Lesson content is required and must not exceed 20,000 characters.' });
        }

        const course = db.prepare(
            'SELECT id FROM courses WHERE id = ? AND instructor_id = ?'
        ).get(courseId, req.user.id);

        if (!course) {
            return res.status(404).json({ error: 'Course not found.' });
        }

        const nextPosition = db.prepare(
            'SELECT COALESCE(MAX(position), 0) + 1 AS position FROM lessons WHERE course_id = ?'
        ).get(courseId).position;

        const result = db.prepare(`
            INSERT INTO lessons (course_id, title, content, position)
            VALUES (?, ?, ?, ?)
        `).run(courseId, title, content, nextPosition);

        const lesson = db.prepare(`
            SELECT id, title, content, position
            FROM lessons
            WHERE id = ?
        `).get(result.lastInsertRowid);

        res.status(201).json({ message: 'Lesson added successfully.', lesson });
    } catch (error) {
        console.error('Failed to create lesson:', error.message);
        res.status(500).json({ error: 'Unable to add lesson.' });
    }
});

module.exports = router;
