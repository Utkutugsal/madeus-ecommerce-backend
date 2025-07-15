const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { Database } = require('../config/database');

const db = new Database();

// JWT token verification middleware
const authenticateToken = async (req, res, next) => {
    try {
        const authHeader = req.headers['authorization'];
        const token = authHeader && authHeader.split(' ')[1];

        if (!token) {
            return res.status(401).json({ error: 'Access token required' });
        }

        jwt.verify(token, process.env.JWT_SECRET, async (err, user) => {
            if (err) {
                return res.status(403).json({ error: 'Invalid or expired token' });
            }

            // Check if token is blacklisted
            const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
            const session = await db.findOne(
                'SELECT * FROM user_sessions WHERE user_id = ? AND token_hash = ? AND is_active = true AND expires_at > NOW()',
                [user.userId, tokenHash]
            );

            if (!session) {
                return res.status(403).json({ error: 'Token has been revoked or expired' });
            }

            // Check if user is still active
            const currentUser = await db.findOne(
                'SELECT id, email, role, is_active FROM users WHERE id = ?',
                [user.userId]
            );

            if (!currentUser || !currentUser.is_active) {
                return res.status(403).json({ error: 'User account is inactive' });
            }

            req.user = {
                ...user,
                role: currentUser.role // Use current role from database
            };
            req.token = token;
            next();
        });

    } catch (error) {
        console.error('Authentication error:', error);
        res.status(500).json({ error: 'Authentication failed' });
    }
};

// Optional authentication (doesn't fail if no token)
const optionalAuth = async (req, res, next) => {
    try {
        const authHeader = req.headers['authorization'];
        const token = authHeader && authHeader.split(' ')[1];

        if (!token) {
            req.user = null;
            return next();
        }

        jwt.verify(token, process.env.JWT_SECRET, async (err, user) => {
            if (err) {
                req.user = null;
                return next();
            }

            // Check if token is blacklisted
            const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
            const session = await db.findOne(
                'SELECT * FROM user_sessions WHERE user_id = ? AND token_hash = ? AND is_active = true AND expires_at > NOW()',
                [user.userId, tokenHash]
            );

            if (!session) {
                req.user = null;
                return next();
            }

            // Check if user is still active
            const currentUser = await db.findOne(
                'SELECT id, email, role, is_active FROM users WHERE id = ?',
                [user.userId]
            );

            if (!currentUser || !currentUser.is_active) {
                req.user = null;
                return next();
            }

            req.user = {
                ...user,
                role: currentUser.role
            };
            req.token = token;
            next();
        });

    } catch (error) {
        console.error('Optional authentication error:', error);
        req.user = null;
        next();
    }
};

// Role-based authorization middleware
const requireRole = (...roles) => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({ error: 'Authentication required' });
        }

        if (!roles.includes(req.user.role)) {
            return res.status(403).json({ 
                error: 'Insufficient permissions',
                required_roles: roles,
                user_role: req.user.role
            });
        }

        next();
    };
};

// Admin authorization
const requireAdmin = requireRole('admin', 'super_admin');

// Super admin authorization
const requireSuperAdmin = requireRole('super_admin');

// Verified email middleware
const requireVerifiedEmail = async (req, res, next) => {
    try {
        if (!req.user) {
            return res.status(401).json({ error: 'Authentication required' });
        }

        const user = await db.findOne(
            'SELECT is_verified FROM users WHERE id = ?',
            [req.user.userId]
        );

        if (!user || !user.is_verified) {
            return res.status(403).json({ 
                error: 'Email verification required',
                requires_verification: true
            });
        }

        next();

    } catch (error) {
        console.error('Email verification check error:', error);
        res.status(500).json({ error: 'Verification check failed' });
    }
};

// Rate limiting per user
const userRateLimit = (maxRequests = 100, windowMs = 15 * 60 * 1000) => {
    const userRequests = new Map();

    return (req, res, next) => {
        if (!req.user) {
            return next();
        }

        const userId = req.user.userId;
        const now = Date.now();
        const windowStart = now - windowMs;

        // Clean old entries
        if (userRequests.has(userId)) {
            const requests = userRequests.get(userId).filter(time => time > windowStart);
            userRequests.set(userId, requests);
        } else {
            userRequests.set(userId, []);
        }

        const userRequestList = userRequests.get(userId);

        if (userRequestList.length >= maxRequests) {
            return res.status(429).json({
                error: 'Too many requests',
                retry_after: Math.ceil((userRequestList[0] + windowMs - now) / 1000)
            });
        }

        userRequestList.push(now);
        next();
    };
};

// Check user ownership of resource
const requireOwnership = (resourceTable, resourceIdParam = 'id', userIdField = 'user_id') => {
    return async (req, res, next) => {
        try {
            if (!req.user) {
                return res.status(401).json({ error: 'Authentication required' });
            }

            // Super admin can access everything
            if (req.user.role === 'super_admin') {
                return next();
            }

            const resourceId = req.params[resourceIdParam];
            if (!resourceId) {
                return res.status(400).json({ error: 'Resource ID required' });
            }

            const resource = await db.findOne(
                `SELECT ${userIdField} FROM ${resourceTable} WHERE id = ?`,
                [resourceId]
            );

            if (!resource) {
                return res.status(404).json({ error: 'Resource not found' });
            }

            if (resource[userIdField] !== req.user.userId) {
                return res.status(403).json({ error: 'Access denied' });
            }

            next();

        } catch (error) {
            console.error('Ownership check error:', error);
            res.status(500).json({ error: 'Authorization check failed' });
        }
    };
};

// Log admin actions
const logAdminAction = (action, entityType = null) => {
    return async (req, res, next) => {
        try {
            // Only log for admin users
            if (!req.user || !['admin', 'super_admin'].includes(req.user.role)) {
                return next();
            }

            const originalSend = res.send;
            res.send = function(data) {
                // Log the action after successful response
                if (res.statusCode < 400) {
                    setImmediate(async () => {
                        try {
                            await db.insert('admin_logs', {
                                admin_id: req.user.userId,
                                action: action,
                                entity_type: entityType,
                                entity_id: req.params.id || null,
                                details: JSON.stringify({
                                    method: req.method,
                                    url: req.originalUrl,
                                    body: req.body,
                                    params: req.params,
                                    query: req.query
                                }),
                                ip_address: req.ip,
                                user_agent: req.get('User-Agent')
                            });
                        } catch (error) {
                            console.error('Failed to log admin action:', error);
                        }
                    });
                }

                originalSend.call(this, data);
            };

            next();

        } catch (error) {
            console.error('Admin logging middleware error:', error);
            next();
        }
    };
};

module.exports = {
    authenticateToken,
    optionalAuth,
    requireRole,
    requireAdmin,
    requireSuperAdmin,
    requireVerifiedEmail,
    userRateLimit,
    requireOwnership,
    logAdminAction
}; 