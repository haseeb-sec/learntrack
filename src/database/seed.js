require('dotenv').config();
const argon2 = require('argon2');
const db = require('./db');

async function seed() {
    const existingCourse = db.prepare(
        'SELECT id FROM courses WHERE title = ?'
    ).get('Introduction to Web Development');

    if (existingCourse) {
        console.log('Sample course already exists. Nothing to seed.');
        return;
    }

    let instructor = db.prepare(
        'SELECT id FROM users WHERE email = ?'
    ).get('instructor@learntrack.local');

    if (!instructor) {
        const seedPassword = process.env.SEED_INSTRUCTOR_PASSWORD;
        if (!seedPassword) {
            throw new Error('Set SEED_INSTRUCTOR_PASSWORD before seeding.');
        }
        const passwordHash = await argon2.hash(seedPassword);

        const result = db.prepare(`
            INSERT INTO users (name, email, password_hash, role)
            VALUES (?, ?, ?, ?)
        `).run(
            'Haseeb Ullah Shah',
            'instructor@learntrack.local',
            passwordHash,
            'instructor'
        );

        instructor = { id: result.lastInsertRowid };
    }

    db.prepare(`
        INSERT INTO courses (instructor_id, title, description)
        VALUES (?, ?, ?)
    `).run(
        instructor.id,
        'Introduction to Web Development',
        'Learn the foundations of HTML, CSS, and JavaScript.'
    );

    console.log('Sample instructor and course created.');
}

seed()
    .catch(error => {
        console.error('Seeding failed:', error.message);
        process.exitCode = 1;
    })
    .finally(() => {
        db.close();
    });
