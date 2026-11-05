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

const lessonForm = document.getElementById('lesson-form');
const lessonCourse = document.getElementById('lesson-course');
const lessonMessage = document.getElementById('lesson-message');
const addLessonButton = document.getElementById('add-lesson-button');
const lessonList = document.getElementById('lesson-list');
const lessonListCourseLabel = document.getElementById('lesson-list-course-label');

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
        lessonCourse.replaceChildren(new Option('Choose a course', ''));

        instructorCourses.forEach((course) => {
            quizCourse.add(new Option(course.title, course.id));
            lessonCourse.add(new Option(course.title, course.id));
        });

        if (instructorCourses.some((course) => String(course.id) === selectedCourseId)) {
            quizCourse.value = selectedCourseId;
        }
        requestedQuizCourseId = '';

        renderInstructorCourses();

        const selectedLessonCourseId = lessonCourse.value;
        if (selectedLessonCourseId && instructorCourses.some(
            course => String(course.id) === selectedLessonCourseId
        )) {
            lessonCourse.value = selectedLessonCourseId;
            await loadLessons(selectedLessonCourseId);
        } else if (instructorCourses.length > 0) {
            lessonCourse.value = String(instructorCourses[0].id);
            await loadLessons(lessonCourse.value);
        } else {
            lessonList.replaceChildren();
            lessonListCourseLabel.textContent = 'No courses yet';
            showLessonMessage('Create a course before adding lessons.');
        }

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


function showLessonMessage(message, type = '') {
    lessonMessage.textContent = message;
    lessonMessage.className = `form-message ${type}`;
}

async function loadLessons(courseId) {
    lessonList.replaceChildren();
    const loading = document.createElement('p');
    loading.className = 'course-message';
    loading.textContent = 'Loading lessons...';
    lessonList.append(loading);

    const course = instructorCourses.find(item => String(item.id) === String(courseId));
    lessonListCourseLabel.textContent = course ? course.title : 'Course lessons';

    try {
        const response = await fetch(`/api/courses/${courseId}/lessons/manage`);
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || 'Unable to load lessons.');

        lessonList.replaceChildren();
        if (!result.lessons.length) {
            const empty = document.createElement('p');
            empty.className = 'course-message';
            empty.textContent = 'No lessons have been added to this course yet.';
            lessonList.append(empty);
            return;
        }

        result.lessons.forEach((lesson, index) => {
            const card = document.createElement('article');
            card.className = 'course-card';
            const label = document.createElement('span');
            label.className = 'course-label';
            label.textContent = `LESSON ${String(index + 1).padStart(2, '0')}`;
            const title = document.createElement('h3');
            title.textContent = lesson.title;
            const content = document.createElement('p');
            content.textContent = lesson.content;
            card.append(label, title, content);
            lessonList.append(card);
        });
    } catch (error) {
        showLessonMessage(error.message, 'error');
        lessonList.replaceChildren();
    }
}

lessonCourse.addEventListener('change', () => {
    if (lessonCourse.value) loadLessons(lessonCourse.value);
});

lessonForm.addEventListener('submit', async event => {
    event.preventDefault();
    if (!lessonCourse.value) {
        showLessonMessage('Please select a course.', 'error');
        return;
    }

    addLessonButton.disabled = true;
    addLessonButton.textContent = 'Adding lesson...';
    showLessonMessage();

    try {
        const response = await fetch(`/api/courses/${lessonCourse.value}/lessons`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                title: document.getElementById('lesson-title').value.trim(),
                content: document.getElementById('lesson-content').value.trim()
            })
        });
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || 'Unable to add lesson.');

        const selectedCourseId = lessonCourse.value;
        lessonForm.reset();
        lessonCourse.value = selectedCourseId;
        showLessonMessage('Lesson added successfully.', 'success');
        await loadLessons(selectedCourseId);
    } catch (error) {
        showLessonMessage(error.message, 'error');
    } finally {
        addLessonButton.disabled = false;
        addLessonButton.innerHTML = 'Add lesson <span aria-hidden="true">→</span>';
    }
});

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
        document.getElementById('lesson-create-panel').hidden = false;

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
