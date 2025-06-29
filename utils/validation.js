const { body } = require('express-validator');

// Password Security Policy
const passwordPolicy = {
    minLength: 8,
    maxLength: 128,
    requireUppercase: true,
    requireLowercase: true,
    requireNumbers: true,
    requireSpecialChars: true,
    allowedSpecialChars: '@$!%*?&',
    maxLoginAttempts: 5,
    lockoutDuration: 15 * 60 * 1000, // 15 minutes
    tokenExpiry: 24 * 60 * 60 * 1000 // 24 hours
};

// Strong password validation
const strongPasswordValidation = body('password')
    .isLength({ min: passwordPolicy.minLength, max: passwordPolicy.maxLength })
    .withMessage(`Password must be between ${passwordPolicy.minLength}-${passwordPolicy.maxLength} characters`)
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]+$/)
    .withMessage('Password must contain at least: 1 lowercase letter, 1 uppercase letter, 1 number, and 1 special character (@$!%*?&)')
    .custom((value) => {
        // Additional security checks
        const commonPasswords = [
            '12345678', 'password', 'Password1!', 'qwerty123', 'abc123456',
            'password123', '123456789', 'welcome123', 'admin123', 'user123'
        ];
        
        if (commonPasswords.includes(value)) {
            throw new Error('Password is too common. Please choose a more secure password.');
        }
        
        // Check for repeated characters (more than 3 in a row)
        if (/(.)\1{3,}/.test(value)) {
            throw new Error('Password cannot contain more than 3 consecutive identical characters.');
        }
        
        return true;
    });

// Enhanced registration validation
const enhancedRegisterValidation = [
    body('name')
        .trim()
        .isLength({ min: 2, max: 50 })
        .withMessage('Name must be between 2-50 characters')
        .matches(/^[a-zA-ZüğıişöçÜĞIİŞÖÇ\s]+$/)
        .withMessage('Name can only contain letters and spaces')
        .custom((value) => {
            // XSS protection
            if (/<[^>]*>/g.test(value)) {
                throw new Error('Name cannot contain HTML tags');
            }
            return true;
        }),
    
    body('email')
        .isEmail()
        .normalizeEmail()
        .withMessage('Valid email is required')
        .isLength({ max: 255 })
        .withMessage('Email is too long')
        .custom((value) => {
            // Additional email security checks
            const disposableEmailDomains = [
                '10minutemail.com', 'tempmail.org', 'guerrillamail.com',
                'mailinator.com', 'yopmail.com'
            ];
            
            const domain = value.split('@')[1];
            if (disposableEmailDomains.includes(domain)) {
                throw new Error('Disposable email addresses are not allowed');
            }
            
            return true;
        }),
    
    strongPasswordValidation,
    
    body('phone')
        .optional()
        .isMobilePhone('tr-TR')
        .withMessage('Valid Turkish phone number required')
        .isLength({ min: 10, max: 15 })
        .withMessage('Phone number must be between 10-15 digits'),
    
    body('skin_type')
        .optional()
        .isIn(['Normal', 'Kuru', 'Yağlı', 'Karma', 'Hassas'])
        .withMessage('Invalid skin type')
];

// Enhanced login validation with brute force protection
const enhancedLoginValidation = [
    body('email')
        .isEmail()
        .normalizeEmail()
        .withMessage('Valid email is required'),
    
    body('password')
        .notEmpty()
        .withMessage('Password is required')
        .isLength({ min: 1, max: 128 })
        .withMessage('Invalid password length')
];

// Password reset validation
const passwordResetValidation = [
    body('token')
        .notEmpty()
        .withMessage('Reset token is required')
        .isLength({ min: 64, max: 64 })
        .withMessage('Invalid reset token format'),
    
    strongPasswordValidation
];

// Change password validation
const changePasswordValidation = [
    body('currentPassword')
        .notEmpty()
        .withMessage('Current password is required'),
    
    body('newPassword')
        .isLength({ min: passwordPolicy.minLength, max: passwordPolicy.maxLength })
        .withMessage(`New password must be between ${passwordPolicy.minLength}-${passwordPolicy.maxLength} characters`)
        .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]+$/)
        .withMessage('New password must contain at least: 1 lowercase letter, 1 uppercase letter, 1 number, and 1 special character')
        .custom((value, { req }) => {
            if (value === req.body.currentPassword) {
                throw new Error('New password must be different from current password');
            }
            return true;
        }),
    
    body('confirmPassword')
        .custom((value, { req }) => {
            if (value !== req.body.newPassword) {
                throw new Error('Password confirmation does not match');
            }
            return true;
        })
];

// Email verification helper
const requireEmailVerification = () => {
    return (req, res, next) => {
        // This will be implemented in auth middleware
        // For now, we'll enforce it in the auth routes
        next();
    };
};

// Security headers and input sanitization
const sanitizeInput = (req, res, next) => {
    // XSS protection for all string inputs
    const sanitizeString = (str) => {
        if (typeof str !== 'string') return str;
        
        return str
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#x27;')
            .replace(/\//g, '&#x2F;');
    };
    
    // Recursively sanitize object properties
    const sanitizeObject = (obj) => {
        if (typeof obj !== 'object' || obj === null) return obj;
        
        for (let key in obj) {
            if (typeof obj[key] === 'string') {
                obj[key] = sanitizeString(obj[key]);
            } else if (typeof obj[key] === 'object') {
                obj[key] = sanitizeObject(obj[key]);
            }
        }
        return obj;
    };
    
    // Sanitize request body
    if (req.body) {
        req.body = sanitizeObject({ ...req.body });
    }
    
    // Sanitize query parameters
    if (req.query) {
        req.query = sanitizeObject({ ...req.query });
    }
    
    next();
};

// IP-based rate limiting for sensitive operations
const createIPRateLimit = (windowMs = 15 * 60 * 1000, max = 5) => {
    const attempts = new Map();
    
    return (req, res, next) => {
        const ip = req.ip || req.connection.remoteAddress;
        const now = Date.now();
        const windowStart = now - windowMs;
        
        // Clean old attempts
        if (attempts.has(ip)) {
            const userAttempts = attempts.get(ip).filter(time => time > windowStart);
            attempts.set(ip, userAttempts);
        } else {
            attempts.set(ip, []);
        }
        
        const ipAttempts = attempts.get(ip);
        
        if (ipAttempts.length >= max) {
            return res.status(429).json({
                error: 'Too many attempts from this IP address',
                retry_after: Math.ceil((ipAttempts[0] + windowMs - now) / 1000),
                security_notice: 'Your IP has been temporarily blocked due to multiple failed attempts'
            });
        }
        
        ipAttempts.push(now);
        next();
    };
};

module.exports = {
    passwordPolicy,
    enhancedRegisterValidation,
    enhancedLoginValidation,
    passwordResetValidation,
    changePasswordValidation,
    strongPasswordValidation,
    requireEmailVerification,
    sanitizeInput,
    createIPRateLimit
}; 

// Password Security Policy
const passwordPolicy = {
    minLength: 8,
    maxLength: 128,
    requireUppercase: true,
    requireLowercase: true,
    requireNumbers: true,
    requireSpecialChars: true,
    allowedSpecialChars: '@$!%*?&',
    maxLoginAttempts: 5,
    lockoutDuration: 15 * 60 * 1000, // 15 minutes
    tokenExpiry: 24 * 60 * 60 * 1000 // 24 hours
};

// Strong password validation
const strongPasswordValidation = body('password')
    .isLength({ min: passwordPolicy.minLength, max: passwordPolicy.maxLength })
    .withMessage(`Password must be between ${passwordPolicy.minLength}-${passwordPolicy.maxLength} characters`)
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]+$/)
    .withMessage('Password must contain at least: 1 lowercase letter, 1 uppercase letter, 1 number, and 1 special character (@$!%*?&)')
    .custom((value) => {
        // Additional security checks
        const commonPasswords = [
            '12345678', 'password', 'Password1!', 'qwerty123', 'abc123456',
            'password123', '123456789', 'welcome123', 'admin123', 'user123'
        ];
        
        if (commonPasswords.includes(value)) {
            throw new Error('Password is too common. Please choose a more secure password.');
        }
        
        // Check for repeated characters (more than 3 in a row)
        if (/(.)\1{3,}/.test(value)) {
            throw new Error('Password cannot contain more than 3 consecutive identical characters.');
        }
        
        return true;
    });

// Enhanced registration validation
const enhancedRegisterValidation = [
    body('name')
        .trim()
        .isLength({ min: 2, max: 50 })
        .withMessage('Name must be between 2-50 characters')
        .matches(/^[a-zA-ZüğıişöçÜĞIİŞÖÇ\s]+$/)
        .withMessage('Name can only contain letters and spaces')
        .custom((value) => {
            // XSS protection
            if (/<[^>]*>/g.test(value)) {
                throw new Error('Name cannot contain HTML tags');
            }
            return true;
        }),
    
    body('email')
        .isEmail()
        .normalizeEmail()
        .withMessage('Valid email is required')
        .isLength({ max: 255 })
        .withMessage('Email is too long')
        .custom((value) => {
            // Additional email security checks
            const disposableEmailDomains = [
                '10minutemail.com', 'tempmail.org', 'guerrillamail.com',
                'mailinator.com', 'yopmail.com'
            ];
            
            const domain = value.split('@')[1];
            if (disposableEmailDomains.includes(domain)) {
                throw new Error('Disposable email addresses are not allowed');
            }
            
            return true;
        }),
    
    strongPasswordValidation,
    
    body('phone')
        .optional()
        .isMobilePhone('tr-TR')
        .withMessage('Valid Turkish phone number required')
        .isLength({ min: 10, max: 15 })
        .withMessage('Phone number must be between 10-15 digits'),
    
    body('skin_type')
        .optional()
        .isIn(['Normal', 'Kuru', 'Yağlı', 'Karma', 'Hassas'])
        .withMessage('Invalid skin type')
];

// Enhanced login validation with brute force protection
const enhancedLoginValidation = [
    body('email')
        .isEmail()
        .normalizeEmail()
        .withMessage('Valid email is required'),
    
    body('password')
        .notEmpty()
        .withMessage('Password is required')
        .isLength({ min: 1, max: 128 })
        .withMessage('Invalid password length')
];

// Password reset validation
const passwordResetValidation = [
    body('token')
        .notEmpty()
        .withMessage('Reset token is required')
        .isLength({ min: 64, max: 64 })
        .withMessage('Invalid reset token format'),
    
    strongPasswordValidation
];

// Change password validation
const changePasswordValidation = [
    body('currentPassword')
        .notEmpty()
        .withMessage('Current password is required'),
    
    body('newPassword')
        .isLength({ min: passwordPolicy.minLength, max: passwordPolicy.maxLength })
        .withMessage(`New password must be between ${passwordPolicy.minLength}-${passwordPolicy.maxLength} characters`)
        .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]+$/)
        .withMessage('New password must contain at least: 1 lowercase letter, 1 uppercase letter, 1 number, and 1 special character')
        .custom((value, { req }) => {
            if (value === req.body.currentPassword) {
                throw new Error('New password must be different from current password');
            }
            return true;
        }),
    
    body('confirmPassword')
        .custom((value, { req }) => {
            if (value !== req.body.newPassword) {
                throw new Error('Password confirmation does not match');
            }
            return true;
        })
];

// Email verification helper
const requireEmailVerification = () => {
    return (req, res, next) => {
        // This will be implemented in auth middleware
        // For now, we'll enforce it in the auth routes
        next();
    };
};

// Security headers and input sanitization
const sanitizeInput = (req, res, next) => {
    // XSS protection for all string inputs
    const sanitizeString = (str) => {
        if (typeof str !== 'string') return str;
        
        return str
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#x27;')
            .replace(/\//g, '&#x2F;');
    };
    
    // Recursively sanitize object properties
    const sanitizeObject = (obj) => {
        if (typeof obj !== 'object' || obj === null) return obj;
        
        for (let key in obj) {
            if (typeof obj[key] === 'string') {
                obj[key] = sanitizeString(obj[key]);
            } else if (typeof obj[key] === 'object') {
                obj[key] = sanitizeObject(obj[key]);
            }
        }
        return obj;
    };
    
    // Sanitize request body
    if (req.body) {
        req.body = sanitizeObject({ ...req.body });
    }
    
    // Sanitize query parameters
    if (req.query) {
        req.query = sanitizeObject({ ...req.query });
    }
    
    next();
};

// IP-based rate limiting for sensitive operations
const createIPRateLimit = (windowMs = 15 * 60 * 1000, max = 5) => {
    const attempts = new Map();
    
    return (req, res, next) => {
        const ip = req.ip || req.connection.remoteAddress;
        const now = Date.now();
        const windowStart = now - windowMs;
        
        // Clean old attempts
        if (attempts.has(ip)) {
            const userAttempts = attempts.get(ip).filter(time => time > windowStart);
            attempts.set(ip, userAttempts);
        } else {
            attempts.set(ip, []);
        }
        
        const ipAttempts = attempts.get(ip);
        
        if (ipAttempts.length >= max) {
            return res.status(429).json({
                error: 'Too many attempts from this IP address',
                retry_after: Math.ceil((ipAttempts[0] + windowMs - now) / 1000),
                security_notice: 'Your IP has been temporarily blocked due to multiple failed attempts'
            });
        }
        
        ipAttempts.push(now);
        next();
    };
};

module.exports = {
    passwordPolicy,
    enhancedRegisterValidation,
    enhancedLoginValidation,
    passwordResetValidation,
    changePasswordValidation,
    strongPasswordValidation,
    requireEmailVerification,
    sanitizeInput,
    createIPRateLimit
}; 
 