require('dotenv').config();

const express = require('express');
const helmet = require('helmet');
const path = require('node:path');

// Initialize the database and schema.
require('./database/db');

const coursesRouter = require('./routes/courses');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(helmet());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../public')));

app.use('/api/courses', coursesRouter);

app.get('/health', (req, res) => {
    res.json({ status: 'ok', application: 'LearnTrack' });
});

app.listen(PORT, () => {
    console.log(`LearnTrack is running at http://localhost:${PORT}`);
});
