const express = require('express');
const db = require('../database/db');
const { requireRole } = require('../middleware/auth');

const router = express.Router();

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

module.exports = router;
