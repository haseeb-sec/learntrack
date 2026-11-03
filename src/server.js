require('dotenv').config();

const express = require('express');
const helmet = require('helmet');
const session = require('express-session');
const path = require('node:path');

// Initialize the database and schema.
require('./database/db');

const passport = require('./config/passport');
const authRouter = require('./routes/auth');
const coursesRouter = require('./routes/courses');
const authLimiter = require('./config/auth-limiter');
const { requireAuth } = require('./middleware/auth');

const app = express();
const PORT = process.env.PORT || 3000;

if (!process.env.SESSION_SECRET) {
    throw new Error('SESSION_SECRET is not configured.');
}

app.use(helmet());
app.use(express.json());

app.use(
    session({
        secret: process.env.SESSION_SECRET,
        resave: false,
        saveUninitialized: false,
        cookie: {
            httpOnly: true,
            sameSite: 'lax',
            secure: process.env.NODE_ENV === 'production',
            maxAge: 24 * 60 * 60 * 1000
        }
    })
);

app.use(passport.initialize());
app.use(passport.session());

// Protect the instructor dashboard before static files are served.
app.get('/instructor.html', (req, res, next) => {
    if (!req.isAuthenticated || !req.isAuthenticated()) {
        return res.redirect('/auth.html');
    }

    if (req.user.role !== 'instructor') {
        return res.redirect('/courses.html');
    }

    next();
}, (req, res) => {
    res.sendFile(path.join(__dirname, '../public/instructor.html'));
});

app.use(express.static(path.join(__dirname, '../public')));

app.use('/api/auth/register', authLimiter);
app.use('/api/auth/login', authLimiter);
app.use('/api/auth', authRouter);
app.use('/api/courses', coursesRouter);

app.get('/health', (req, res) => {
    res.json({ status: 'ok', application: 'LearnTrack' });
});

app.listen(PORT, () => {
    console.log(`LearnTrack is running at http://localhost:${PORT}`);
});
