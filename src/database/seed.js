require('dotenv').config();

const argon2 = require('argon2');
const db = require('./db');

async function getOrCreateUser({ name, email, role, password }) {
    let user = db.prepare(
        'SELECT id, role FROM users WHERE email = ?'
    ).get(email);

    if (user) {
        if (user.role !== role) {
            throw new Error(`Account ${email} exists with the wrong role.`);
        }
        return user;
    }

    if (!password || password.length < 8) {
        throw new Error(
            `Set ${role === 'instructor' ? 'SEED_INSTRUCTOR_PASSWORD' : 'SEED_STUDENT_PASSWORD'} to a password of at least 8 characters.`
        );
    }

    const passwordHash = await argon2.hash(password);

    const result = db.prepare(`
        INSERT INTO users (name, email, password_hash, role)
        VALUES (?, ?, ?, ?)
    `).run(name, email, passwordHash, role);

    return { id: Number(result.lastInsertRowid) };
}

async function seed() {
    const instructor = await getOrCreateUser({
        name: 'Demo Instructor',
        email: process.env.SEED_INSTRUCTOR_EMAIL || 'instructor@learntrack.local',
        role: 'instructor',
        password: process.env.SEED_INSTRUCTOR_PASSWORD
    });

    await getOrCreateUser({
        name: 'Demo Student',
        email: process.env.SEED_STUDENT_EMAIL || 'student@learntrack.local',
        role: 'student',
        password: process.env.SEED_STUDENT_PASSWORD
    });

    let course = db.prepare(`
        SELECT id FROM courses
        WHERE instructor_id = ? AND title = ?
    `).get(instructor.id, 'Introduction to Web Development');

    if (!course) {
        const result = db.prepare(`
            INSERT INTO courses (instructor_id, title, description)
            VALUES (?, ?, ?)
        `).run(
            instructor.id,
            'Introduction to Web Development',
            'Learn the foundations of HTML, CSS, and JavaScript.'
        );

        course = { id: Number(result.lastInsertRowid) };
    }

    const addDemoContent = db.transaction(() => {
        const lessonCount = db.prepare(
            'SELECT COUNT(*) AS count FROM lessons WHERE course_id = ?'
        ).get(course.id).count;

        if (lessonCount === 0) {
            const insertLesson = db.prepare(`
                INSERT INTO lessons (course_id, title, content, position)
                VALUES (?, ?, ?, ?)
            `);

            insertLesson.run(
                course.id,
                'Introduction to HTML',
                'HTML stands for HyperText Markup Language. It provides the structure of a web page using elements such as headings, paragraphs, links, and images.',
                1
            );

            insertLesson.run(
                course.id,
                'Introduction to CSS',
                'CSS stands for Cascading Style Sheets. It controls the presentation of web pages, including colors, spacing, typography, and layout.',
                2
            );
        }

        const questionCount = db.prepare(
            'SELECT COUNT(*) AS count FROM questions WHERE course_id = ?'
        ).get(course.id).count;

        if (questionCount === 0) {
            const insertQuestion = db.prepare(`
                INSERT INTO questions (course_id, question_text, position)
                VALUES (?, ?, ?)
            `);

            const insertChoice = db.prepare(`
                INSERT INTO question_choices
                    (question_id, choice_text, is_correct)
                VALUES (?, ?, ?)
            `);

            const questions = [
                {
                    text: 'What does HTML stand for?',
                    choices: [
                        'HyperText Markup Language',
                        'HighText Machine Language',
                        'HyperTransfer Markup Link',
                        'Home Tool Markup Language'
                    ],
                    correctIndex: 0
                },
                {
                    text: 'Which technology is primarily used to style web pages?',
                    choices: ['HTML', 'CSS', 'SQL', 'Python'],
                    correctIndex: 1
                },
                {
                    text: 'Which HTML element is commonly used for the largest heading?',
                    choices: ['<p>', '<head>', '<h1>', '<title>'],
                    correctIndex: 2
                }
            ];

            questions.forEach((question, index) => {
                const result = insertQuestion.run(
                    course.id,
                    question.text,
                    index + 1
                );

                question.choices.forEach((choice, choiceIndex) => {
                    insertChoice.run(
                        result.lastInsertRowid,
                        choice,
                        choiceIndex === question.correctIndex ? 1 : 0
                    );
                });
            });
        }
    });

    addDemoContent();

    console.log('Demo data is ready.');
    console.log(`Instructor: ${process.env.SEED_INSTRUCTOR_EMAIL || 'instructor@learntrack.local'}`);
    console.log(`Student: ${process.env.SEED_STUDENT_EMAIL || 'student@learntrack.local'}`);
    console.log('Course: Introduction to Web Development');
    console.log('Demo lessons and quiz questions are available.');
}

seed()
    .catch(error => {
        console.error('Seeding failed:', error.message);
        process.exitCode = 1;
    })
    .finally(() => {
        db.close();
    });
