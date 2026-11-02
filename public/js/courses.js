const courseList = document.getElementById('course-list');
const courseCount = document.getElementById('course-count');

async function loadCourses() {
    try {
        const response = await fetch('/api/courses');

        if (!response.ok) {
            throw new Error('Unable to load courses.');
        }

        const courses = await response.json();

        courseList.replaceChildren();
        courseList.setAttribute('aria-busy', 'false');

        if (courses.length === 0) {
            courseCount.textContent = '0 courses';
            courseList.innerHTML = `
                <p class="course-message">
                    No courses are available yet. Please check back later.
                </p>
            `;
            return;
        }

        courseCount.textContent =
            `${courses.length} ${courses.length === 1 ? 'course' : 'courses'}`;

        courses.forEach(course => {
            const card = document.createElement('article');
            card.className = 'course-card';

            const title = document.createElement('h3');
            title.textContent = course.title;

            const description = document.createElement('p');
            description.textContent = course.description;

            const instructor = document.createElement('p');
            instructor.className = 'course-instructor';
            instructor.textContent = `Instructor: ${course.instructor}`;

            card.append(title, description, instructor);
            courseList.appendChild(card);
        });
    } catch (error) {
        courseCount.textContent = 'Courses unavailable';
        courseList.setAttribute('aria-busy', 'false');
        courseList.innerHTML = `
            <p class="course-message">
                We couldn't load the courses. Please refresh the page and try again.
            </p>
        `;
        console.error('Course loading error:', error);
    }
}

loadCourses();
