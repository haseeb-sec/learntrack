const instructorName = document.getElementById('instructor-name');
const logoutButton = document.getElementById('logout-button');

const courseForm = document.getElementById('course-form');
const coursePanel = document.getElementById('course-create-panel');
const courseMessage = document.getElementById('course-message');
const createCourseButton = document.getElementById('create-course-button');

const quizPanel = document.getElementById('quiz-create-panel');
const quizForm = document.getElementById('quiz-form');
const quizMessage = document.getElementById('quiz-message');
const quizCourse = document.getElementById('quiz-course');
const addQuestionButton = document.getElementById('add-question-button');

const courseList = document.getElementById('instructor-course-list');
const courseCount = document.getElementById('instructor-course-count');

let instructorCourses = [];
let requestedQuizCourseId = '';

function showCourseMessage(message, type = '') {
    courseMessage.textContent = message;
    courseMessage.className = `form-message ${type}`;
}

function showQuizMessage(message, type = '') {
    quizMessage.textContent = message;
    quizMessage.className = `form-message ${type}`;
}

function showView(viewName) {
    document.querySelectorAll('.student-view').forEach((view) => {
        const isActive = view.id === `${viewName}-view`;
        view.hidden = !isActive;
        view.classList.toggle('active', isActive);
    });

    document.querySelectorAll('[data-view]').forEach((button) => {
        button.classList.toggle('active', button.dataset.view === viewName);
    });

    if (viewName === 'library') {
        loadInstructorCourses();
    }

    if (viewName === 'quiz-builder') {
        loadInstructorCourses();
    }
}

document.querySelectorAll('[data-view]').forEach((button) => {
    button.addEventListener('click', () => showView(button.dataset.view));
});

function renderInstructorCourses() {
    courseList.replaceChildren();

    courseCount.textContent = `${instructorCourses.length} ${
        instructorCourses.length === 1 ? 'course' : 'courses'
    }`;

    if (instructorCourses.length === 0) {
        const message = document.createElement('p');
        message.className = 'course-message';
        message.textContent = 'Create your first course to start building quizzes for learners.';
        const createButton = document.createElement('button');
        createButton.type = 'button';
        createButton.className = 'primary-button';
        createButton.textContent = 'Create your first course';
        createButton.addEventListener('click', () => showView('create-course'));
        courseList.append(message, createButton);
        return;
    }

    instructorCourses.forEach((course, index) => {
        const card = document.createElement('article');
        card.className = 'course-card instructor-course-card';

        const number = document.createElement('span');
        number.className = 'eyebrow';
        number.textContent = `COURSE ${String(index + 1).padStart(2, '0')}`;

        const title = document.createElement('h2');
        title.textContent = course.title;

        const description = document.createElement('p');
        description.textContent = course.description || 'No course description provided.';

        const action = document.createElement('button');
        action.type = 'button';
        action.className = 'secondary-button';
        action.textContent = 'Add quiz question';
        action.addEventListener('click', () => {
            requestedQuizCourseId = String(course.id);
            showView('quiz-builder');
        });

        card.append(number, title, description, action);
        courseList.append(card);
    });
}

async function loadInstructorCourses() {
    courseList.replaceChildren();

    const loading = document.createElement('p');
    loading.className = 'course-message';
    loading.textContent = 'Loading your courses...';
    courseList.append(loading);

    try {
        const response = await fetch('/api/courses/mine');
        const result = await response.json();

        if (!response.ok) {
            throw new Error(result.error || 'Unable to load your courses.');
        }

        instructorCourses = result.courses || [];
        const selectedCourseId = requestedQuizCourseId || quizCourse.value;

        quizCourse.replaceChildren(new Option('Choose a course', ''));

        instructorCourses.forEach((course) => {
            quizCourse.add(new Option(course.title, course.id));
        });

        if (instructorCourses.some((course) => String(course.id) === selectedCourseId)) {
            quizCourse.value = selectedCourseId;
        }
        requestedQuizCourseId = '';

        renderInstructorCourses();

        if (instructorCourses.length === 0) {
            showQuizMessage('Start by creating a course. You can add its quiz questions here afterwards.');
            quizMessage.classList.add('instructor-dependency-message');
        } else {
            showQuizMessage();
        }
    } catch (error) {
        courseList.replaceChildren();
        const message = document.createElement('p');
        message.className = 'course-message';
        message.textContent = error.message;
        courseList.append(message);
        courseCount.textContent = 'Unavailable';
        showQuizMessage(error.message, 'error');
    }
}

async function checkInstructorAccess() {
    try {
        const response = await fetch('/api/auth/me');

        if (response.status === 401) {
            window.location.replace('/auth.html');
            return false;
        }

        if (!response.ok) {
            throw new Error('Unable to verify your account.');
        }

        const result = await response.json();

        if (result.user.role !== 'instructor') {
            document.querySelector('.instructor-layout').innerHTML = `
                <section class="account-panel">
                    <h2>Instructor access required</h2>
                    <p class="account-subtitle">
                        This workspace is available to instructor accounts only.
                    </p>
                    <a class="primary-button" href="/courses.html">
                        Browse courses <span aria-hidden="true">→</span>
                    </a>
                </section>
            `;
            return false;
        }

        instructorName.textContent =
            result.user.name || result.user.fullName || result.user.email || 'Instructor';

        coursePanel.hidden = false;
        quizPanel.hidden = false;

        return true;
    } catch (error) {
        document.querySelector('.instructor-layout').innerHTML = `
            <section class="account-panel">
                <h2>Unable to verify instructor access</h2>
                <p class="account-subtitle">
                    Your account could not be verified. Check your connection and try again.
                </p>
                <button class="primary-button" type="button"
                        onclick="window.location.reload()">
                    Try again
                </button>
            </section>
        `;
        console.error('Instructor access check failed:', error);
        return false;
    }
}

courseForm.addEventListener('submit', async (event) => {
    event.preventDefault();

    showCourseMessage();
    createCourseButton.disabled = true;
    createCourseButton.textContent = 'Creating course...';

    const payload = {
        title: document.getElementById('course-title').value.trim(),
        description: document.getElementById('course-description').value.trim()
    };

    try {
        const response = await fetch('/api/courses', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        const result = await response.json();

        if (!response.ok) {
            throw new Error(result.error || 'Unable to create course.');
        }

        courseForm.reset();
        showCourseMessage(`"${result.course.title}" was created successfully.`, 'success');

        await loadInstructorCourses();
    } catch (error) {
        showCourseMessage(error.message, 'error');
    } finally {
        createCourseButton.disabled = false;
        createCourseButton.innerHTML = 'Create course <span aria-hidden="true">→</span>';
    }
});

quizForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    showQuizMessage();

    const choiceInputs = [1, 2, 3, 4].map((number) =>
        document.getElementById(`choice-${number}`)
    );

    const selectedValue = document.getElementById('correct-choice').value;

    if (!quizCourse.value) {
        showQuizMessage('Please select a course.', 'error');
        return;
    }

    if (selectedValue === '') {
        showQuizMessage('Please select the correct answer.', 'error');
        return;
    }

    const selectedOriginalIndex = Number(selectedValue);
    const selectedChoice = choiceInputs[selectedOriginalIndex];

    if (!selectedChoice || !selectedChoice.value.trim()) {
        showQuizMessage('The selected correct answer must have a value.', 'error');
        return;
    }

    const choices = choiceInputs
        .map((input, originalIndex) => ({
            text: input.value.trim(),
            originalIndex
        }))
        .filter((choice) => choice.text.length > 0);

    if (choices.length < 2) {
        showQuizMessage('Enter at least two answer choices.', 'error');
        return;
    }

    const correctIndex = choices.findIndex(
        (choice) => choice.originalIndex === selectedOriginalIndex
    );

    const payload = {
        question: document.getElementById('quiz-question').value.trim(),
        choices: choices.map((choice) => choice.text),
        correctIndex
    };

    addQuestionButton.disabled = true;
    addQuestionButton.textContent = 'Adding question...';

    try {
        const response = await fetch(`/api/courses/${quizCourse.value}/questions`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        const result = await response.json();

        if (!response.ok) {
            throw new Error(result.error || 'Unable to add question.');
        }

        const selectedCourseId = quizCourse.value;
        const selectedCourseTitle = quizCourse.selectedOptions[0].textContent;

        quizForm.reset();
        quizCourse.value = selectedCourseId;

        showQuizMessage(
            `Question added to "${selectedCourseTitle}". You can add another question.`,
            'success'
        );
    } catch (error) {
        showQuizMessage(error.message, 'error');
    } finally {
        addQuestionButton.disabled = false;
        addQuestionButton.innerHTML = 'Add question <span aria-hidden="true">→</span>';
    }
});

logoutButton.addEventListener('click', async () => {
    logoutButton.disabled = true;

    try {
        const response = await fetch('/api/auth/logout', { method: 'POST' });

        if (!response.ok) {
            throw new Error('Unable to sign out. Please try again.');
        }

        window.location.replace('/auth.html');
    } catch (error) {
        logoutButton.disabled = false;
        showCourseMessage(error.message, 'error');
    }
});

checkInstructorAccess().then(async (hasAccess) => {
    if (!hasAccess) return;

    showView('overview');
    await loadInstructorCourses();
});
