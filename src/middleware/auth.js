function requireAuth(req, res, next) {
    if (!req.isAuthenticated || !req.isAuthenticated()) {
        return res.status(401).json({
            error: 'Authentication required.'
        });
    }

    next();
}

function requireRole(role) {
    return (req, res, next) => {
        if (!req.isAuthenticated || !req.isAuthenticated()) {
            return res.status(401).json({
                error: 'Authentication required.'
            });
        }

        if (req.user.role !== role) {
            return res.status(403).json({
                error: 'You do not have permission to perform this action.'
            });
        }

        next();
    };
}

module.exports = { requireAuth, requireRole };
