const { test } = require('node:test');
const assert = require('node:assert/strict');
const { spawn } = require('node:child_process');
const net = require('node:net');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');

test('LearnTrack authentication, lessons, quizzes and results', async () => {
    const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'learntrack-test-'));
    const databasePath = path.join(directory, 'test.db');

    const portServer = net.createServer();
    await new Promise(resolve => portServer.listen(0, '127.0.0.1', resolve));
    const port = portServer.address().port;
    await new Promise(resolve => portServer.close(resolve));

    const baseUrl = `http://127.0.0.1:${port}`;
    const server = spawn(process.execPath, ['src/server.js'], {
        cwd: process.cwd(),
        env: {
            ...process.env,
            DATABASE_PATH: databasePath,
            PORT: String(port),
            SESSION_SECRET: 'learntrack-integration-test-secret',
            NODE_ENV: 'test'
        },
        stdio: ['ignore', 'pipe', 'pipe']
    });

    let serverOutput = '';
    server.stdout.on('data', chunk => serverOutput += chunk);
    server.stderr.on('data', chunk => serverOutput += chunk);

    async function request(route, options = {}, cookie = '') {
        const headers = { ...(options.headers || {}) };
        if (options.body) headers['Content-Type'] = 'application/json';
        if (cookie) headers.Cookie = cookie;

        const response = await fetch(`${baseUrl}${route}`, {
            ...options,
            headers,
            redirect: 'manual'
        });

        const body = await response.json().catch(() => ({}));
        return { response, body };
    }

    async function register(name, email, role) {
        const result = await request('/api/auth/register', {
            method: 'POST',
            body: JSON.stringify({ name, email, password: 'TestPass123!', role })
        });
        assert.equal(result.response.status, 201, JSON.stringify(result.body));
        return result.body.user;
    }

    async function login(email) {
        const result = await request('/api/auth/login', {
            method: 'POST',
            body: JSON.stringify({ email, password: 'TestPass123!' })
        });

        assert.equal(result.response.status, 200, JSON.stringify(result.body));

        const cookies = result.response.headers.getSetCookie();
        assert.ok(cookies.length, 'Login should create a session cookie.');
        return cookies[0].split(';')[0];
    }

    try {
        let healthy = false;

        for (let attempt = 0; attempt < 60; attempt++) {
            if (server.exitCode !== null) {
                throw new Error(`Server exited early:\n${serverOutput}`);
            }

            try {
                const response = await fetch(`${baseUrl}/health`);
                if (response.ok) {
                    healthy = true;
                    break;
                }
            } catch {}

            await new Promise(resolve => setTimeout(resolve, 250));
        }

        assert.ok(healthy, `Server did not become ready:\n${serverOutput}`);

        const unauthenticated = await request('/api/courses/1/lessons');
        assert.equal(unauthenticated.response.status, 401);

        await register('Main Instructor', 'instructor@example.test', 'instructor');
        await register('Other Instructor', 'other@example.test', 'instructor');
        await register('Test Student', 'student@example.test', 'student');

        const instructorCookie = await login('instructor@example.test');
        const otherInstructorCookie = await login('other@example.test');
        const studentCookie = await login('student@example.test');

        const forbiddenCourse = await request('/api/courses', {
            method: 'POST',
            body: JSON.stringify({ title: 'Student Course' })
        }, studentCookie);
        assert.equal(forbiddenCourse.response.status, 403);

        const courseResult = await request('/api/courses', {
            method: 'POST',
            body: JSON.stringify({
                title: 'Integration Testing',
                description: 'Course used for automated testing.'
            })
        }, instructorCookie);

        assert.equal(courseResult.response.status, 201);
        const courseId = courseResult.body.course.id;

        const otherCourseResult = await request('/api/courses', {
            method: 'POST',
            body: JSON.stringify({ title: 'Another Instructor Course' })
        }, otherInstructorCookie);

        assert.equal(otherCourseResult.response.status, 201);
        const otherCourseId = otherCourseResult.body.course.id;

        const forbiddenLesson = await request(`/api/courses/${courseId}/lessons`, {
            method: 'POST',
            body: JSON.stringify({ title: 'Student Lesson', content: 'Not allowed.' })
        }, studentCookie);
        assert.equal(forbiddenLesson.response.status, 403);

        const wrongOwnerLesson = await request(`/api/courses/${otherCourseId}/lessons`, {
            method: 'POST',
            body: JSON.stringify({ title: 'Unauthorized Lesson', content: 'Not allowed.' })
        }, instructorCookie);
        assert.equal(wrongOwnerLesson.response.status, 404);

        const invalidLesson = await request(`/api/courses/${courseId}/lessons`, {
            method: 'POST',
            body: JSON.stringify({ title: 'AB', content: '' })
        }, instructorCookie);
        assert.equal(invalidLesson.response.status, 400);

        for (const [title, content] of [
            ['Introduction', 'Welcome to the course.'],
            ['Variables', 'Variables store values.']
        ]) {
            const lesson = await request(`/api/courses/${courseId}/lessons`, {
                method: 'POST',
                body: JSON.stringify({ title, content })
            }, instructorCookie);
            assert.equal(lesson.response.status, 201, JSON.stringify(lesson.body));
        }

        const instructorLessons = await request(
            `/api/courses/${courseId}/lessons/manage`, {}, instructorCookie
        );
        assert.equal(instructorLessons.response.status, 200);
        assert.deepEqual(
            instructorLessons.body.lessons.map(item => item.title),
            ['Introduction', 'Variables']
        );

        const studentLessons = await request(
            `/api/courses/${courseId}/lessons`, {}, studentCookie
        );
        assert.equal(studentLessons.response.status, 200);
        assert.equal(studentLessons.body.lessons.length, 2);
        assert.equal(studentLessons.body.lessons[0].content, 'Welcome to the course.');

        const instructorReadLessons = await request(
            `/api/courses/${courseId}/lessons`, {}, instructorCookie
        );
        assert.equal(instructorReadLessons.response.status, 403);

        const emptyQuiz = await request(`/api/courses/${courseId}/attempts`, {
            method: 'POST',
            body: JSON.stringify({ answers: [] })
        }, studentCookie);
        assert.equal(emptyQuiz.response.status, 400);

        const questionsToCreate = [
            {
                question: 'Which language runs in a browser?',
                choices: ['Python', 'JavaScript', 'C++'],
                correctIndex: 1
            },
            {
                question: 'Which one is a database?',
                choices: ['SQLite', 'HTML', 'CSS'],
                correctIndex: 0
            }
        ];

        for (const question of questionsToCreate) {
            const created = await request(`/api/courses/${courseId}/questions`, {
                method: 'POST',
                body: JSON.stringify(question)
            }, instructorCookie);
            assert.equal(created.response.status, 201, JSON.stringify(created.body));
        }

        const quiz = await request(
            `/api/courses/${courseId}/questions`, {}, studentCookie
        );
        assert.equal(quiz.response.status, 200);
        assert.equal(quiz.body.questions.length, 2);
        assert.ok(
            quiz.body.questions.every(question =>
                question.choices.every(choice => !('is_correct' in choice))
            ),
            'Correct answers must not be exposed to students.'
        );

        const [firstQuestion, secondQuestion] = quiz.body.questions;
        const correctChoice = firstQuestion.choices.find(
            choice => choice.choice_text === 'JavaScript'
        );
        const wrongChoice = secondQuestion.choices.find(
            choice => choice.choice_text === 'HTML'
        );

        const firstAttempt = await request(`/api/courses/${courseId}/attempts`, {
            method: 'POST',
            body: JSON.stringify({
                answers: [
                    { questionId: firstQuestion.id, choiceId: correctChoice.id },
                    { questionId: secondQuestion.id, choiceId: wrongChoice.id }
                ]
            })
        }, studentCookie);

        assert.equal(firstAttempt.response.status, 201);
        assert.equal(firstAttempt.body.attempt.score, 1);
        assert.equal(firstAttempt.body.attempt.total_questions, 2);
        assert.equal(firstAttempt.body.attempt.percentage, 50);

        const duplicateAnswers = await request(`/api/courses/${courseId}/attempts`, {
            method: 'POST',
            body: JSON.stringify({
                answers: [
                    { questionId: firstQuestion.id, choiceId: correctChoice.id },
                    { questionId: firstQuestion.id, choiceId: correctChoice.id }
                ]
            })
        }, studentCookie);
        assert.equal(duplicateAnswers.response.status, 400);

        const secondAttempt = await request(`/api/courses/${courseId}/attempts`, {
            method: 'POST',
            body: JSON.stringify({
                answers: [
                    { questionId: firstQuestion.id, choiceId: firstQuestion.choices[0].id },
                    { questionId: secondQuestion.id, choiceId: wrongChoice.id }
                ]
            })
        }, studentCookie);

        assert.equal(secondAttempt.response.status, 201);
        assert.equal(secondAttempt.body.attempt.score, 0);

        const history = await request(
            `/api/courses/${courseId}/attempts/mine`, {}, studentCookie
        );
        assert.equal(history.response.status, 200);
        assert.equal(history.body.attempts.length, 2);

        const summary = await request('/api/courses/student/summary', {}, studentCookie);
        assert.equal(summary.response.status, 200);
        assert.equal(summary.body.summary.totalAttempts, 2);

        const instructorHistory = await request(
            `/api/courses/${courseId}/attempts/mine`, {}, instructorCookie
        );
        assert.equal(instructorHistory.response.status, 403);

        console.log('Passed: authentication, role permissions, course ownership, lessons, quiz validation, server-side scoring, repeat attempts and result history.');
    } finally {
        server.kill('SIGTERM');
        await new Promise(resolve => {
            if (server.exitCode !== null) return resolve();
            server.once('exit', resolve);
            setTimeout(resolve, 3000).unref();
        });
        await fs.rm(directory, { recursive: true, force: true });
    }
});
