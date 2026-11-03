const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;
const argon2 = require('argon2');
const db = require('../database/db');

passport.use(
    new LocalStrategy(
        {
            usernameField: 'email',
            passwordField: 'password'
        },
        async (email, password, done) => {
            try {
                const user = db.prepare(`
                    SELECT id, name, email, password_hash, role
                    FROM users
                    WHERE email = ?
                `).get(email.trim().toLowerCase());

                if (!user) {
                    return done(null, false, {
                        message: 'Invalid email or password.'
                    });
                }

                const passwordMatches = await argon2.verify(
                    user.password_hash,
                    password
                );

                if (!passwordMatches) {
                    return done(null, false, {
                        message: 'Invalid email or password.'
                    });
                }

                return done(null, {
                    id: user.id,
                    name: user.name,
                    email: user.email,
                    role: user.role
                });
            } catch (error) {
                return done(error);
            }
        }
    )
);

passport.serializeUser((user, done) => {
    done(null, user.id);
});

passport.deserializeUser((id, done) => {
    try {
        const user = db.prepare(`
            SELECT id, name, email, role
            FROM users
            WHERE id = ?
        `).get(id);

        done(null, user || false);
    } catch (error) {
        done(error);
    }
});

module.exports = passport;
