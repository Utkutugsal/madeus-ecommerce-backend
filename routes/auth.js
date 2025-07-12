const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { body, validationResult } = require('express-validator');
const { Database } = require('../config/database');
const emailService = require('../utils/email');

const router = express.Router();

// Database instance'ını oluştur
const db = new Database();

// ===========================================
// MIDDLEWARE
// ===========================================

// JWT token verification
const authenticateToken = (req, res, next) => {
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
        const session = await db.findOne(
            'SELECT * FROM user_sessions WHERE user_id = ? AND token_hash = ? AND is_active = true',
            [user.userId, crypto.createHash('sha256').update(token).digest('hex')]
        );

        if (!session) {
            return res.status(403).json({ error: 'Token has been revoked' });
        }

        req.user = user;
        req.token = token;
        next();
    });
};

// ===========================================
// VALIDATION RULES
// ===========================================

const registerValidation = [
    body('name').trim().isLength({ min: 2, max: 50 }).withMessage('Name must be between 2-50 characters'),
    body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
    body('password')
        .isLength({ min: 8, max: 128 }).withMessage('Password must be between 8-128 characters')
        .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
        .withMessage('Password must contain at least: 1 lowercase letter, 1 uppercase letter, 1 number, and 1 special character (@$!%*?&)'),
    body('phone').optional().isMobilePhone('tr-TR').withMessage('Valid Turkish phone number required'),
    body('name').custom((value) => {
        // XSS protection - no HTML tags allowed
        if (/<[^>]*>/g.test(value)) {
            throw new Error('Name cannot contain HTML tags');
        }
        return true;
    })
];

const loginValidation = [
    body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
    body('password').notEmpty().withMessage('Password is required')
];

const forgotPasswordValidation = [
    body('email').isEmail().normalizeEmail().withMessage('Valid email is required')
];

const resetPasswordValidation = [
    body('token').notEmpty().withMessage('Reset token is required'),
    body('password')
        .isLength({ min: 8, max: 128 }).withMessage('Password must be between 8-128 characters')
        .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
        .withMessage('Password must contain at least: 1 lowercase letter, 1 uppercase letter, 1 number, and 1 special character (@$!%*?&)')
        .custom((value) => {
            // Check for common passwords
            const commonPasswords = ['12345678', 'password', 'Password1!', 'qwerty123', 'abc123456'];
            if (commonPasswords.includes(value)) {
                throw new Error('Password is too common. Please choose a more secure password.');
            }
            return true;
        })
];

// ===========================================
// AUTH ROUTES
// ===========================================

// Register new user
router.post('/register', registerValidation, async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                error: 'Validation failed',
                details: errors.array()
            });
        }

        const { name, email, password, phone, skin_type } = req.body;

        // Check if user already exists
        const existingUser = await db.findOne(
            'SELECT id, email, is_verified FROM users WHERE email = ?',
            [email]
        );

        if (existingUser) {
            if (existingUser.is_verified) {
                return res.status(409).json({
                    error: 'User already exists with this email'
                });
            } else {
                // User exists but not verified, update and resend verification
                const hashedPassword = await bcrypt.hash(password, parseInt(process.env.BCRYPT_ROUNDS) || 12);
                const verificationToken = crypto.randomBytes(32).toString('hex');
                const verificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

                await db.update(
                    'users',
                    {
                        name,
                        password: hashedPassword,
                        phone,
                        skin_type,
                        verification_token: verificationToken,
                        verification_expires: verificationExpires
                    },
                    'id = ?',
                    [existingUser.id]
                );

                // Send verification email
                await emailService.sendVerificationEmail(
                    { name, email },
                    verificationToken
                );

                return res.status(200).json({
                    message: 'Registration updated. Please check your email for verification.',
                    requires_verification: true
                });
            }
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(password, parseInt(process.env.BCRYPT_ROUNDS) || 12);

        // Generate verification token
        const verificationToken = crypto.randomBytes(32).toString('hex');
        const verificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

        // Create user
        const result = await db.insert('users', {
            name,
            email,
            password: hashedPassword,
            phone,
            skin_type,
            verification_token: verificationToken,
            verification_expires: verificationExpires,
            is_verified: false,
            role: 'customer'
        });

        // Send verification email
        await emailService.sendVerificationEmail(
            { name, email },
            verificationToken
        );

        res.status(201).json({
            message: 'User registered successfully. Please check your email for verification.',
            userId: result.insertId,
            requires_verification: true
        });

    } catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({ error: 'Registration failed' });
    }
});

// Login user
router.post('/login', loginValidation, async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                error: 'Validation failed',
                details: errors.array()
            });
        }

        const { email, password } = req.body;
        const userIp = req.ip;

        // Get user
        const user = await db.findOne(
            'SELECT * FROM users WHERE email = ? AND is_active = true',
            [email]
        );

        if (!user) {
            return res.status(401).json({ error: 'Invalid email or password' });
        }

        // Check if account is locked
        if (user.locked_until && new Date() < new Date(user.locked_until)) {
            const lockTime = Math.ceil((new Date(user.locked_until) - new Date()) / 60000);
            return res.status(423).json({
                error: 'Account temporarily locked',
                minutes_remaining: lockTime
            });
        }

        // Verify password
        const isPasswordValid = await bcrypt.compare(password, user.password);

        if (!isPasswordValid) {
            // Increment login attempts
            const attempts = (user.login_attempts || 0) + 1;
            const maxAttempts = parseInt(process.env.MAX_LOGIN_ATTEMPTS) || 5;
            
            let updateData = { login_attempts: attempts };
            
            if (attempts >= maxAttempts) {
                const lockTime = parseInt(process.env.ACCOUNT_LOCK_TIME) || 30; // minutes
                updateData.locked_until = new Date(Date.now() + lockTime * 60 * 1000);
            }

            await db.update('users', updateData, 'id = ?', [user.id]);

            return res.status(401).json({
                error: 'Invalid email or password',
                attempts_remaining: Math.max(0, maxAttempts - attempts)
            });
        }

        // Check if email is verified
        if (!user.is_verified) {
            return res.status(401).json({
                error: 'Email not verified',
                requires_verification: true
            });
        }

        // Reset login attempts and update last login
        await db.update(
            'users',
            {
                login_attempts: 0,
                locked_until: null,
                last_login: new Date()
            },
            'id = ?',
            [user.id]
        );

        // Generate JWT token
        const tokenPayload = {
            userId: user.id,
            email: user.email,
            role: user.role
        };

        const token = jwt.sign(tokenPayload, process.env.JWT_SECRET, {
            expiresIn: process.env.JWT_EXPIRE || '24h'
        });

        // Store session
        const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
        const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

        await db.insert('user_sessions', {
            user_id: user.id,
            token_hash: tokenHash,
            device_info: req.get('User-Agent'),
            ip_address: userIp,
            expires_at: expiresAt
        });

        res.json({
            message: 'Login successful',
            token,
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                role: user.role,
                skin_type: user.skin_type
            }
        });

    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ error: 'Login failed' });
    }
});

// Email verification
router.post('/verify-email', async (req, res) => {
    try {
        const { token } = req.body;

        if (!token) {
            return res.status(400).json({ error: 'Verification token required' });
        }

        // Find user with this token
        const user = await db.findOne(
            'SELECT * FROM users WHERE verification_token = ? AND verification_expires > NOW()',
            [token]
        );

        if (!user) {
            return res.status(400).json({ error: 'Invalid or expired verification token' });
        }

        // Update user as verified
        await db.update(
            'users',
            {
                is_verified: true,
                verification_token: null,
                verification_expires: null
            },
            'id = ?',
            [user.id]
        );

        // Send welcome email
        await emailService.sendWelcomeEmail(user);

        res.json({ message: 'Email verified successfully' });

    } catch (error) {
        console.error('Email verification error:', error);
        res.status(500).json({ error: 'Email verification failed' });
    }
});

// Forgot password
router.post('/forgot-password', forgotPasswordValidation, async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                error: 'Validation failed',
                details: errors.array()
            });
        }

        const { email } = req.body;

        // Find user
        const user = await db.findOne(
            'SELECT * FROM users WHERE email = ? AND is_active = true',
            [email]
        );

        if (!user) {
            // Don't reveal if email exists
            return res.json({ message: 'If the email exists, a reset link has been sent.' });
        }

        // Generate reset token
        const resetToken = crypto.randomBytes(32).toString('hex');
        const resetExpires = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

        // Save reset token
        await db.update(
            'users',
            {
                password_reset_token: resetToken,
                password_reset_expires: resetExpires
            },
            'id = ?',
            [user.id]
        );

        // Send reset email
        await emailService.sendPasswordResetEmail(user, resetToken);

        res.json({ message: 'If the email exists, a reset link has been sent.' });

    } catch (error) {
        console.error('Forgot password error:', error);
        res.status(500).json({ error: 'Password reset request failed' });
    }
});

// Reset password
router.post('/reset-password', resetPasswordValidation, async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                error: 'Validation failed',
                details: errors.array()
            });
        }

        const { token, password } = req.body;

        // Find user with valid reset token
        const user = await db.findOne(
            'SELECT * FROM users WHERE password_reset_token = ? AND password_reset_expires > NOW()',
            [token]
        );

        if (!user) {
            return res.status(400).json({ error: 'Invalid or expired reset token' });
        }

        // Hash new password
        const hashedPassword = await bcrypt.hash(password, parseInt(process.env.BCRYPT_ROUNDS) || 12);

        // Update password and clear reset token
        await db.update(
            'users',
            {
                password: hashedPassword,
                password_reset_token: null,
                password_reset_expires: null,
                login_attempts: 0,
                locked_until: null
            },
            'id = ?',
            [user.id]
        );

        // Invalidate all existing sessions
        await db.update(
            'user_sessions',
            { is_active: false, logout_at: new Date() },
            'user_id = ?',
            [user.id]
        );

        res.json({ message: 'Password reset successfully' });

    } catch (error) {
        console.error('Reset password error:', error);
        res.status(500).json({ error: 'Password reset failed' });
    }
});

// Logout
router.post('/logout', authenticateToken, async (req, res) => {
    try {
        const tokenHash = crypto.createHash('sha256').update(req.token).digest('hex');

        // Invalidate session
        await db.update(
            'user_sessions',
            { is_active: false, logout_at: new Date() },
            'user_id = ? AND token_hash = ?',
            [req.user.userId, tokenHash]
        );

        res.json({ message: 'Logged out successfully' });

    } catch (error) {
        console.error('Logout error:', error);
        res.status(500).json({ error: 'Logout failed' });
    }
});

// Get current user profile
router.get('/profile', authenticateToken, async (req, res) => {
    try {
        const user = await db.findOne(
            'SELECT id, name, email, phone, skin_type, birth_date, gender, newsletter_subscribed, created_at FROM users WHERE id = ?',
            [req.user.userId]
        );

        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        res.json({ user });

    } catch (error) {
        console.error('Get profile error:', error);
        res.status(500).json({ error: 'Failed to get profile' });
    }
});

// Refresh token
router.post('/refresh', authenticateToken, async (req, res) => {
    try {
        // Generate new token
        const tokenPayload = {
            userId: req.user.userId,
            email: req.user.email,
            role: req.user.role
        };

        const newToken = jwt.sign(tokenPayload, process.env.JWT_SECRET, {
            expiresIn: process.env.JWT_EXPIRE || '24h'
        });

        // Update session with new token
        const oldTokenHash = crypto.createHash('sha256').update(req.token).digest('hex');
        const newTokenHash = crypto.createHash('sha256').update(newToken).digest('hex');
        const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

        await db.update(
            'user_sessions',
            {
                token_hash: newTokenHash,
                expires_at: expiresAt
            },
            'user_id = ? AND token_hash = ?',
            [req.user.userId, oldTokenHash]
        );

        res.json({
            message: 'Token refreshed successfully',
            token: newToken
        });

    } catch (error) {
        console.error('Token refresh error:', error);
        res.status(500).json({ error: 'Token refresh failed' });
    }
});

module.exports = router; 
