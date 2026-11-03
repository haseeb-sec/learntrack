const express = require('express');
const argon2 = require('argon2');
const db = require('../database/db');
const passport = require('../config/passport');

const router = express.Router();

router.post('/register', async (req, res) => {
    try {
        const { name, email, password, role } = req.body;

        if (
            typeof name !== 'string' ||
            typeof email !== 'string' ||
            typeof password !== 'string' ||
            typeof role !== 'string'
        ) {
            return res.status(400).json({
                error: 'All fields are required.'
            });
        }

        const cleanName = name.trim();
        const cleanEmail = email.trim().toLowerCase();

        if (cleanName.length < 2 || cleanName.length > 80) {
            return res.status(400).json({
                error: 'Name must be between 2 and 80 characters.'
            });
        }

        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
            return res.status(400).json({
                error: 'Enter a valid email address.'
            });
        }

        if (password.length < 8 || password.length > 128) {
            return res.status(400).json({
                error: 'Password must be between 8 and 128 characters.'
            });
        }

        if (!['instructor', 'student'].includes(role)) {
            return res.status(400).json({
                error: 'Role must be instructor or student.'
            });
        }

        const existingUser = db.prepare(
            'SELECT id FROM users WHERE email = ?'
        ).get(cleanEmail);

        if (existingUser) {
            return res.status(409).json({
                error: 'An account with this email already exists.'
            });
        }

        const passwordHash = await argon2.hash(password);

        const result = db.prepare(`
            INSERT INTO users (name, email, password_hash, role)
            VALUES (?, ?, ?, ?)
        `).run(cleanName, cleanEmail, passwordHash, role);

        const user = {
            id: Number(result.lastInsertRowid),
            name: cleanName,
            email: cleanEmail,
            role
        };

        return res.status(201).json({
            message: 'Account created successfully. Please sign in.',
            user
        });
    } catch (error) {
        console.error('Registration failed:', error.message);

        if (error.code === 'SQLITE_CONSTRAINT_UNIQUE') {
            return res.status(409).json({
                error: 'An account with this email already exists.'
            });
        }

        return res.status(500).json({
            error: 'Unable to create account.'
        });
    }
});

router.post('/login', (req, res, next) => {
    passport.authenticate('local', (error, user) => {
        if (error) {
            return next(error);
        }

        if (!user) {
            return res.status(401).json({
                error: 'Invalid email or password.'
            });
        }

        req.session.regenerate((sessionError) => {
            if (sessionError) {
                return next(sessionError);
            }

            req.login(user, (loginError) => {
                if (loginError) {
                    return next(loginError);
                }

                return res.json({
                    message: 'Login successful.',
                    user
                });
            });
        });
    })(req, res, next);
});

router.get('/me', (req, res) => {
    if (!req.isAuthenticated()) {
        return res.status(401).json({
            error: 'You are not logged in.'
        });
    }

    res.json({ user: req.user });
});

router.post('/logout', (req, res, next) => {
    req.logout((error) => {
        if (error) {
            return next(error);
        }

        req.session.destroy((sessionError) => {
            if (sessionError) {
                return next(sessionError);
            }

            res.clearCookie('connect.sid');
            return res.json({ message: 'Logout successful.' });
        });
    });
});

module.exports = router;
