// Security Configuration
const securityConfig = {
    password: {
        minLength: 8,
        maxLength: 128,
        requireUppercase: true,
        requireLowercase: true,
        requireNumbers: true,
        requireSpecialChars: true
    },
    
    auth: {
        maxLoginAttempts: 5,
        lockoutDuration: 15 * 60 * 1000, // 15 minutes
        requireEmailVerification: true,
        tokenExpiry: 24 * 60 * 60 * 1000 // 24 hours
    },
    
    rateLimit: {
        windowMs: 15 * 60 * 1000, // 15 minutes
        maxAttempts: 5,
        maxRegistrations: 3
    }
};

module.exports = securityConfig; 
const securityConfig = {
    password: {
        minLength: 8,
        maxLength: 128,
        requireUppercase: true,
        requireLowercase: true,
        requireNumbers: true,
        requireSpecialChars: true
    },
    
    auth: {
        maxLoginAttempts: 5,
        lockoutDuration: 15 * 60 * 1000, // 15 minutes
        requireEmailVerification: true,
        tokenExpiry: 24 * 60 * 60 * 1000 // 24 hours
    },
    
    rateLimit: {
        windowMs: 15 * 60 * 1000, // 15 minutes
        maxAttempts: 5,
        maxRegistrations: 3
    }
};

module.exports = securityConfig; 
 