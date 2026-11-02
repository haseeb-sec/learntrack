const express = require('express');
const db = require('../database/db');

const router = express.Router();

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
        res.status(500).json({ error: 'Unable to retrieve courses.' });
    }
});

module.exports = router;
