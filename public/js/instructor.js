const instructorName = document.getElementById('instructor-name');
const courseForm = document.getElementById('course-form');
const coursePanel = document.getElementById('course-create-panel');
const courseMessage = document.getElementById('course-message');
const createCourseButton = document.getElementById('create-course-button');
const logoutButton = document.getElementById('logout-button');

function showMessage(message, type) {
    courseMessage.textContent = message;
    courseMessage.className = `form-message ${type}`;
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

        instructorName.textContent = result.user.name;
        coursePanel.hidden = false;
        return true;
    } catch (error) {
        coursePanel.hidden = false;
        showMessage(error.message, 'error');
        courseForm.hidden = true;
        return false;
    }
}

courseForm.addEventListener('submit', async (event) => {
    event.preventDefault();

    showMessage('', '');
    createCourseButton.disabled = true;
    createCourseButton.textContent = 'Creating course...';

    const payload = {
        title: document.getElementById('course-title').value.trim(),
        description: document.getElementById('course-description').value.trim()
    };

    try {
        const response = await fetch('/api/courses', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
        });

        const result = await response.json();

        if (!response.ok) {
            throw new Error(result.error || 'Unable to create course.');
        }

        courseForm.reset();
        showMessage(
            `"${result.course.title}" was created successfully.`,
            'success'
        );
    } catch (error) {
        showMessage(error.message, 'error');
    } finally {
        createCourseButton.disabled = false;
        createCourseButton.innerHTML =
            'Create course <span aria-hidden="true">→</span>';
    }
});

logoutButton.addEventListener('click', async () => {
    logoutButton.disabled = true;

    try {
        const response = await fetch('/api/auth/logout', {
            method: 'POST'
        });

        if (!response.ok) {
            throw new Error('Unable to sign out. Please try again.');
        }

        window.location.replace('/auth.html');
    } catch (error) {
        logoutButton.disabled = false;
        showMessage(error.message, 'error');
    }
});

checkInstructorAccess();
