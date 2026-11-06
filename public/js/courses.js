const studentName = document.getElementById('student-name');
const welcomeName = document.getElementById('welcome-name');

const courseList = document.getElementById('course-list');
const courseCount = document.getElementById('course-count');

const quizTitle = document.getElementById('quiz-title');
const quizDescription = document.getElementById('quiz-description');
const quizContent = document.getElementById('quiz-content');
const quizResult = document.getElementById('quiz-result');
const attemptHistory = document.getElementById('attempt-history');
const attemptHistoryList = document.getElementById('attempt-history-list');

const resultsContent = document.getElementById('results-content');
const overviewProgress = document.getElementById('overview-progress');
const overviewRecentActivity = document.getElementById('overview-recent-activity');
const signOutButton = document.getElementById('sign-out-button');

let activeCourseId = null;
let loadedCourses = [];
let quizRequestId = 0;
let courseRequestId = 0;
let resultsRequestId = 0;

async function readResponse(response) {
    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
        throw new Error(data.error || 'Something went wrong.');
    }

    return data;
}

function showMessage(container, message, className = 'course-message') {
    const paragraph = document.createElement('p');
    paragraph.className = className;
    paragraph.textContent = message;
    container.replaceChildren(paragraph);
}

function showView(viewName) {
    if (viewName !== 'quiz') {
        quizRequestId += 1;
    }

    if (viewName !== 'results') {
        resultsRequestId += 1;
    }

    document.querySelectorAll('.student-view').forEach(view => {
        view.hidden = view.id !== `${viewName}-view`;
    });

    document.querySelectorAll('[data-view]').forEach(button => {
        const active = button.dataset.view === viewName;
        button.classList.toggle('active', active);

        if (active) {
            button.setAttribute('aria-current', 'page');
        } else {
            button.removeAttribute('aria-current');
        }
    });

    if (viewName === 'courses') {
        loadCourses();
    }

    if (viewName === 'results') {
        loadResults();
    }
}

async function checkStudentAccess() {
    try {
        const response = await fetch('/api/auth/me');

        if (response.status === 401) {
            window.location.href = '/auth.html';
            return false;
        }

        const data = await readResponse(response);
        const user = data.user;

        if (!user || user.role !== 'student') {
            window.location.href = user?.role === 'instructor'
                ? '/instructor.html'
                : '/auth.html';
            return false;
        }

        const name = user.name || user.fullName || user.email || 'Student';

        studentName.textContent = name;
        welcomeName.textContent = name;

        return true;
    } catch (error) {
        console.error('Student access error:', error);
        window.location.href = '/auth.html';
        return false;
    }
}

function renderOverview(data) {
    const summary = data.summary || {};
    const stats = [
        ['COURSES AVAILABLE', summary.availableCourses ?? 0],
        ['COURSES ENROLLED', summary.enrolledCourses ?? 0],
        ['QUIZ ATTEMPTS', summary.totalAttempts ?? 0]
    ];

    overviewProgress.replaceChildren();

    stats.forEach(([labelText, value]) => {
        const card = document.createElement('div');
        card.className = 'overview-stat';

        const label = document.createElement('span');
        label.textContent = labelText;

        const number = document.createElement('strong');
        number.textContent = String(value);

        card.append(label, number);
        overviewProgress.appendChild(card);
    });

    const latest = data.latestAttempt;
    const course = latest
        ? data.courses.find(item => item.id === latest.courseId)
        : null;

    overviewRecentActivity.replaceChildren();

    if (!latest || !course) {
        overviewRecentActivity.hidden = true;
        return;
    }

    const details = document.createElement('div');
    details.className = 'overview-recent-details';

    const label = document.createElement('span');
    label.className = 'overview-recent-label';
    label.textContent = 'YOUR LATEST ACTIVITY';

    const title = document.createElement('strong');
    title.textContent = course.title;

    const score = document.createElement('span');
    score.textContent =
        `Last score: ${latest.score}/${latest.total_questions} (${latest.percentage}%)`;

    const date = document.createElement('span');
    date.textContent = new Date(
        `${latest.submitted_at.replace(' ', 'T')}Z`
    ).toLocaleString();

    details.append(label, title, score, date);

    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'primary-button';
    button.textContent = 'Practise again';
    button.addEventListener('click', () => openQuiz(course));

    overviewRecentActivity.append(details, button);
    overviewRecentActivity.hidden = false;
}

async function loadCourses() {
    const requestId = ++courseRequestId;
    courseList.setAttribute('aria-busy', 'true');

    try {
        const response = await fetch('/api/courses/student/summary');
        const data = await readResponse(response);

        if (requestId !== courseRequestId) {
            return;
        }

        loadedCourses = data.courses || [];
        renderOverview(data);

        courseList.replaceChildren();
        courseList.setAttribute('aria-busy', 'false');

        courseCount.textContent =
            `${loadedCourses.length} ${loadedCourses.length === 1 ? 'course' : 'courses'}`;

        if (loadedCourses.length === 0) {
            showMessage(courseList, 'No courses are available yet. Please check back later.');
            return;
        }

        loadedCourses.forEach(course => {
            const card = document.createElement('article');
            card.className = 'course-card';

            const label = document.createElement('span');
            label.className = 'course-label';
            label.textContent = course.is_enrolled ? 'ENROLLED COURSE' : 'AVAILABLE COURSE';

            const title = document.createElement('h3');
            title.textContent = course.title;

            const description = document.createElement('p');
            description.className = 'course-description';
            description.textContent = course.description || 'No course description provided.';

            const instructor = document.createElement('p');
            instructor.className = 'course-instructor';
            instructor.textContent = `Instructor: ${course.instructor || 'LearnTrack instructor'}`;

            const metadata = document.createElement('div');
            metadata.className = 'course-card-meta';
            const questionCount = Number(course.question_count) || 0;
            const questionInfo = document.createElement('span');
            questionInfo.textContent = `${questionCount} ${questionCount === 1 ? 'quiz question' : 'quiz questions'}`;
            metadata.appendChild(questionInfo);

            const actions = document.createElement('div');
            actions.className = 'course-card-actions';

            if (!course.is_enrolled) {
                const enrollButton = document.createElement('button');
                enrollButton.type = 'button';
                enrollButton.className = 'primary-button';
                enrollButton.textContent = 'Enroll in course';
                enrollButton.addEventListener('click', () => enrollInCourse(course, enrollButton));
                actions.appendChild(enrollButton);
            } else {
                const lessonsButton = document.createElement('button');
                lessonsButton.type = 'button';
                lessonsButton.className = 'secondary-button';
                lessonsButton.textContent = 'View course lessons';
                lessonsButton.addEventListener('click', () => openLessons(course));
                actions.appendChild(lessonsButton);

                const quizButton = document.createElement('button');
                quizButton.type = 'button';
                quizButton.className = 'primary-button';
                quizButton.textContent = questionCount > 0 ? 'Take course quiz' : 'Quiz not available yet';
                quizButton.disabled = questionCount === 0;
                if (questionCount > 0) {
                    quizButton.addEventListener('click', () => openQuiz(course));
                }
                actions.appendChild(quizButton);

                const attemptCount = Number(course.attempt_count) || 0;
                const attemptInfo = document.createElement('span');
                attemptInfo.textContent = attemptCount === 0
                    ? 'No quiz attempts yet'
                    : `${attemptCount} attempt(s) · Latest ${course.last_score}/${course.last_total_questions} (${course.last_percentage}%)`;
                metadata.appendChild(attemptInfo);
            }

            card.append(label, title, description, instructor, metadata, actions);
            courseList.appendChild(card);
        });;
    } catch (error) {
        if (requestId !== courseRequestId) {
            return;
        }

        courseCount.textContent = 'Courses unavailable';
        courseList.setAttribute('aria-busy', 'false');
        showMessage(courseList, error.message);
    }
}

async function enrollInCourse(course, button) {
    button.disabled = true;
    button.textContent = 'Enrolling...';

    try {
        const response = await fetch(`/api/courses/${course.id}/enroll`, {
            method: 'POST'
        });
        await readResponse(response);
        await loadCourses();
    } catch (error) {
        button.disabled = false;
        button.textContent = 'Enroll in course';
        alert(error.message);
    }
}

async function openLessons(course) {
    const requestId = ++quizRequestId;
    activeCourseId = course.id;

    showView('lessons');

    document.getElementById('lesson-title').textContent = course.title;
    document.getElementById('lesson-description').textContent =
        'Read the lessons prepared by your instructor.';
    const lessonContent = document.getElementById('lesson-content');
    showMessage(lessonContent, 'Loading lessons...');

    try {
        const response = await fetch(`/api/courses/${course.id}/lessons`);
        const data = await readResponse(response);

        if (requestId !== quizRequestId || activeCourseId !== course.id) return;

        lessonContent.replaceChildren();

        if (!data.lessons || data.lessons.length === 0) {
            showMessage(lessonContent, 'No lessons have been added to this course yet.');
            return;
        }

        data.lessons.forEach((lesson, index) => {
            const article = document.createElement('article');
            article.className = 'course-card';

            const label = document.createElement('span');
            label.className = 'course-label';
            label.textContent = `LESSON ${String(index + 1).padStart(2, '0')}`;

            const heading = document.createElement('h2');
            heading.textContent = lesson.title;

            const content = document.createElement('p');
            content.textContent = lesson.content;
            content.style.whiteSpace = 'pre-wrap';

            article.append(label, heading, content);
            lessonContent.append(article);
        });
    } catch (error) {
        if (requestId === quizRequestId && activeCourseId === course.id) {
            showMessage(lessonContent, error.message);
        }
    }
}

async function openQuiz(course) {
    activeCourseId = course.id;
    const requestId = ++quizRequestId;

    showView('quiz');

    quizTitle.textContent = course.title;
    quizDescription.textContent = 'Answer every question and submit your attempt.';
    quizResult.hidden = true;
    attemptHistory.hidden = true;

    showMessage(quizContent, 'Loading quiz...');

    try {
        const response = await fetch(`/api/courses/${course.id}/questions`);
        const data = await readResponse(response);

        if (requestId !== quizRequestId || activeCourseId !== course.id) {
            return;
        }

        renderQuiz(data.questions, course.id, requestId);
        await loadAttemptHistory(course.id, requestId);
    } catch (error) {
        if (requestId === quizRequestId && activeCourseId === course.id) {
            showMessage(quizContent, error.message);
        }
    }
}

function renderQuiz(questions, courseId, requestId) {
    quizContent.replaceChildren();

    if (!questions || questions.length === 0) {
        showMessage(quizContent, 'This course does not have a quiz yet.');
        return;
    }

    const form = document.createElement('form');
    form.id = 'student-quiz-form';

    questions.forEach((question, index) => {
        const fieldset = document.createElement('fieldset');
        fieldset.className = 'quiz-question';

        const legend = document.createElement('legend');
        legend.textContent = `${index + 1}. ${question.question_text}`;
        fieldset.appendChild(legend);

        question.choices.forEach(choice => {
            const label = document.createElement('label');
            label.className = 'quiz-choice';

            const radio = document.createElement('input');
            radio.type = 'radio';
            radio.name = `question-${question.id}`;
            radio.value = choice.id;
            radio.required = true;

            const text = document.createElement('span');
            text.textContent = choice.choice_text;

            label.append(radio, text);
            fieldset.appendChild(label);
        });

        form.appendChild(fieldset);
    });

    const submit = document.createElement('button');
    submit.type = 'submit';
    submit.className = 'primary-button';
    submit.textContent = 'Submit quiz';

    form.appendChild(submit);

    form.addEventListener('submit', event => {
        submitQuiz(event, questions, submit, courseId, requestId);
    });

    quizContent.appendChild(form);
}

async function submitQuiz(event, questions, submitButton, courseId, requestId) {
    event.preventDefault();

    const form = event.currentTarget;
    const answers = [];

    for (const question of questions) {
        const selected = form.querySelector(
            `input[name="question-${question.id}"]:checked`
        );

        if (!selected) {
            quizResult.hidden = false;
            quizResult.textContent = 'Please answer every question before submitting.';
            return;
        }

        answers.push({
            questionId: question.id,
            choiceId: Number(selected.value)
        });
    }

    submitButton.disabled = true;
    submitButton.textContent = 'Submitting...';
    quizResult.hidden = true;

    try {
        const response = await fetch(`/api/courses/${courseId}/attempts`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ answers })
        });

        const data = await readResponse(response);
        const result = data.attempt;

        if (activeCourseId === courseId && requestId === quizRequestId) {
            quizResult.hidden = false;
            quizResult.textContent =
                `Result: ${result.score} out of ${result.total_questions} correct (${result.percentage}%). Your attempt has been saved.`;

            form.querySelectorAll('input').forEach(input => {
                input.disabled = true;
            });

            submitButton.textContent = 'Attempt submitted';
            await loadAttemptHistory(courseId, requestId);

            try {
                const summaryResponse = await fetch('/api/courses/student/summary');
                const summaryData = await readResponse(summaryResponse);

                if (activeCourseId === courseId && requestId === quizRequestId) {
                    loadedCourses = summaryData.courses || [];
                    renderOverview(summaryData);
                }
            } catch (summaryError) {
                console.error('Could not refresh student overview:', summaryError);
            }
        }
    } catch (error) {
        if (activeCourseId === courseId && requestId === quizRequestId) {
            quizResult.hidden = false;
            quizResult.textContent = error.message;

            submitButton.disabled = false;
            submitButton.textContent = 'Submit quiz';
        }
    }
}

async function loadAttemptHistory(courseId, requestId = quizRequestId) {
    try {
        const response = await fetch(`/api/courses/${courseId}/attempts/mine`);
        const data = await readResponse(response);

        if (requestId !== quizRequestId || activeCourseId !== courseId) {
            return;
        }

        attemptHistoryList.replaceChildren();
        attemptHistory.hidden = false;

        if (!data.attempts || data.attempts.length === 0) {
            showMessage(attemptHistoryList, 'You have not attempted this quiz yet.');
            return;
        }

        data.attempts.forEach((attempt, index) => {
            const item = document.createElement('p');
            const date = new Date(`${attempt.submitted_at.replace(' ', 'T')}Z`);

            item.textContent =
                `Attempt ${data.attempts.length - index}: ${attempt.score}/${attempt.total_questions} correct — ${date.toLocaleString()}`;

            attemptHistoryList.appendChild(item);
        });
    } catch (error) {
        if (requestId === quizRequestId && activeCourseId === courseId) {
            attemptHistory.hidden = true;
            console.error('Attempt history error:', error);
        }
    }
}

async function loadResults() {
    const requestId = ++resultsRequestId;
    resultsContent.setAttribute('aria-busy', 'true');
    showMessage(resultsContent, 'Loading your results...');

    try {
        const response = await fetch('/api/courses/student/summary');
        const data = await readResponse(response);

        if (requestId !== resultsRequestId) {
            return;
        }

        loadedCourses = data.courses || [];
        renderOverview(data);

        const attempts = data.attempts || [];

        resultsContent.replaceChildren();
        resultsContent.setAttribute('aria-busy', 'false');

        if (attempts.length === 0) {
            const emptyState = document.createElement('div');
            emptyState.className = 'results-empty-state';

            const message = document.createElement('p');
            message.textContent =
                'You have not submitted a quiz yet. Browse the available courses and complete your first attempt.';

            const browseButton = document.createElement('button');
            browseButton.type = 'button';
            browseButton.className = 'primary-button';
            browseButton.textContent = 'Browse available courses';
            browseButton.addEventListener('click', () => showView('courses'));

            emptyState.append(message, browseButton);
            resultsContent.appendChild(emptyState);
            return;
        }

        const courseAttemptTotals = new Map();

        attempts.forEach(attempt => {
            courseAttemptTotals.set(
                attempt.courseId,
                (courseAttemptTotals.get(attempt.courseId) || 0) + 1
            );
        });

        const courseAttemptNumbers = new Map(courseAttemptTotals);

        const summaryElement = document.createElement('div');
        summaryElement.className = 'results-summary';

        const totalLabel = document.createElement('span');
        totalLabel.textContent = 'TOTAL QUIZ ATTEMPTS';

        const totalValue = document.createElement('strong');
        totalValue.textContent = String(attempts.length);

        summaryElement.append(totalLabel, totalValue);

        const heading = document.createElement('h3');
        heading.textContent = 'Your attempt history';

        const list = document.createElement('div');
        list.className = 'results-list';

        attempts.forEach(attempt => {
            const attemptNumber = courseAttemptNumbers.get(attempt.courseId);
            courseAttemptNumbers.set(attempt.courseId, attemptNumber - 1);

            const item = document.createElement('article');
            item.className = 'result-item';

            const details = document.createElement('div');
            details.className = 'result-details';

            const course = document.createElement('strong');
            course.textContent = attempt.courseTitle;

            const date = document.createElement('span');
            date.textContent = new Date(
                `${attempt.submitted_at.replace(' ', 'T')}Z`
            ).toLocaleString();

            const score = document.createElement('div');
            score.className = 'result-score';
            score.textContent =
                `${attempt.score}/${attempt.total_questions} (${attempt.percentage}%)`;

            const attemptLabel = document.createElement('span');
            attemptLabel.className = 'result-attempt-label';
            attemptLabel.textContent = `Attempt ${attemptNumber}`;

            details.append(course, date);
            item.append(details, score, attemptLabel);
            list.appendChild(item);
        });

        resultsContent.append(summaryElement, heading, list);
    } catch (error) {
        if (requestId !== resultsRequestId) {
            return;
        }

        resultsContent.setAttribute('aria-busy', 'false');
        showMessage(resultsContent, error.message);
    }
}

document.querySelectorAll('[data-view]').forEach(button => {
    button.addEventListener('click', () => {
        showView(button.dataset.view);
    });
});

document.getElementById('back-from-lessons')?.addEventListener('click', () => {
    showView('courses');
});

document.getElementById('back-to-courses')?.addEventListener('click', () => {
    showView('courses');
});

signOutButton.addEventListener('click', async () => {
    signOutButton.disabled = true;
    signOutButton.textContent = 'Signing out...';

    try {
        const response = await fetch('/api/auth/logout', {
            method: 'POST'
        });

        await readResponse(response);
        window.location.href = '/auth.html';
    } catch (error) {
        signOutButton.disabled = false;
        signOutButton.textContent = 'Sign out';
        alert(error.message);
    }
});

async function initializeStudentDashboard() {
    const allowed = await checkStudentAccess();

    if (!allowed) {
        return;
    }

    showView('overview');
    await loadCourses();
}

initializeStudentDashboard();
