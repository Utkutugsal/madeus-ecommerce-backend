const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const responseTime = require('response-time');
const morgan = require('morgan');
const compression = require('compression');
require('dotenv').config();

const Database = require('./config/database');
const emailService = require('./utils/email');

const app = express();

// ===========================================
// MIDDLEWARE SETUP
// ===========================================

// Security middleware
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
            fontSrc: ["'self'", "https://fonts.gstatic.com"],
            imgSrc: ["'self'", "data:", "https:"],
            scriptSrc: ["'self'"],
            connectSrc: ["'self'", "https://api.paytr.com"]
        }
    },
    crossOriginEmbedderPolicy: false
}));

// CORS configuration
const corsOptions = {
    origin: [
        'https://madeusskincare.com',
        'http://localhost:3000',
        'http://localhost:5173',
        'http://localhost:8080'
    ],
    credentials: true,
    optionsSuccessStatus: 200,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
};

app.use(cors(corsOptions));

// Rate limiting
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // limit each IP to 100 requests per windowMs
    message: 'Too many requests from this IP, please try again later.',
    standardHeaders: true,
    legacyHeaders: false
});

app.use('/api/', limiter);

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Performance monitoring
app.use(responseTime());

// Compression
app.use(compression());

// Logging
if (process.env.NODE_ENV === 'production') {
    app.use(morgan('combined'));
} else {
    app.use(morgan('dev'));
}

// ===========================================
// DATABASE CONNECTION
// ===========================================

const db = new Database();

// ===========================================
// BASIC ROUTES
// ===========================================

// Health check endpoint
app.get('/api/health', (req, res) => {
    res.json({
        status: 'OK', 
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV || 'development',
        version: '1.0.0'
    });
});

// Main API endpoint  
app.get('/api', (req, res) => {
    res.json({
        message: 'Madeus Skincare API v1.0',
        status: 'active',
        endpoints: {
            health: 'GET /api/health',
            auth: 'POST /api/auth/*',
            products: 'GET /api/products',
            setup: 'GET /api/setup/*'
        },
        timestamp: new Date().toISOString()
    });
});

// ===========================================
// EMAIL TEST ENDPOINTS
// ===========================================

// Email configuration check
app.get('/api/setup/email-config', (req, res) => {
    console.log('🚀 Email configuration check:', {
        host: process.env.EMAIL_HOST || 'not set',
        port: process.env.EMAIL_PORT || 'not set',
        user: process.env.EMAIL_USER || 'not set',
        hasPassword: !!process.env.EMAIL_PASS,
        secure: process.env.EMAIL_SECURE || 'not set',
        from: process.env.EMAIL_FROM || 'not set',
        frontendUrl: process.env.FRONTEND_URL || 'not set'
    });

    res.json({
        success: true,
        message: 'Email configuration retrieved',
        config: {
            host: process.env.EMAIL_HOST,
            port: process.env.EMAIL_PORT,
            user: process.env.EMAIL_USER,
            hasPassword: !!process.env.EMAIL_PASS,
            secure: process.env.EMAIL_SECURE,
            from: process.env.EMAIL_FROM,
            frontendUrl: process.env.FRONTEND_URL
        },
        isConfigured: !!(process.env.EMAIL_HOST && process.env.EMAIL_USER && process.env.EMAIL_PASS)
    });
});

// Email connection test
app.get('/api/setup/email-connection', async (req, res) => {
    try {
        console.log('🚀 Testing email connection...');
        const result = await emailService.testConnection();
        
        res.json({
            success: result.success,
            message: result.message,
            verified: result.verified,
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        console.error('❌ Email connection test error:', error);
        res.status(500).json({
            success: false,
            error: error.message,
            message: 'Email connection test failed',
            timestamp: new Date().toISOString()
        });
    }
});

// Send test email
app.post('/api/setup/test-email', async (req, res) => {
    try {
        const { email, type = 'welcome' } = req.body;
        
        if (!email) {
            return res.status(400).json({
                success: false,
                error: 'Email address is required'
            });
        }

        console.log(`🚀 Sending ${type} test email to: ${email}`);

        let result;
        if (type === 'welcome') {
            result = await emailService.sendWelcomeEmail({
                name: 'Test Kullanıcı',
                email: email
            });
        } else if (type === 'verification') {
            result = await emailService.sendVerificationEmail({
                name: 'Test Kullanıcı',
                email: email
            }, 'test-verification-token-123456');
        } else {
            return res.status(400).json({
                success: false,
                error: 'Invalid email type. Use "welcome" or "verification"'
            });
        }
        
        console.log('✅ Email test result:', result);
        
        res.json({
            success: true,
            message: `Test ${type} email sent successfully to ${email}`,
            result: result,
            emailConfig: {
                host: process.env.EMAIL_HOST,
                port: process.env.EMAIL_PORT,
                user: process.env.EMAIL_USER,
                hasPassword: !!process.env.EMAIL_PASS,
                from: process.env.EMAIL_FROM,
                secure: process.env.EMAIL_SECURE
            }
        });
        
    } catch (error) {
        console.error('❌ Test email error:', error);
        res.status(500).json({
            success: false,
            error: error.message,
            emailConfig: {
                host: process.env.EMAIL_HOST || 'not set',
                port: process.env.EMAIL_PORT || 'not set',
                user: process.env.EMAIL_USER || 'not set',
                hasPassword: !!process.env.EMAIL_PASS,
                from: process.env.EMAIL_FROM || 'not set',
                secure: process.env.EMAIL_SECURE || 'not set'
            }
        });
    }
});

// Direct nodemailer test endpoint
app.post('/api/setup/direct-email-test', async (req, res) => {
    try {
        const { email = 'test@example.com' } = req.body;
        const nodemailer = require('nodemailer');
        
        console.log('🚀 Direct nodemailer test başlatılıyor...');
        
        // Create transporter directly (FIXED: createTransport)
        const transporter = nodemailer.createTransport({
            host: process.env.EMAIL_HOST,
            port: parseInt(process.env.EMAIL_PORT),
            secure: process.env.EMAIL_SECURE === 'true',
            auth: {
                user: process.env.EMAIL_USER,
                pass: process.env.EMAIL_PASS
            },
            tls: {
                rejectUnauthorized: false
            }
        });
        
        // Test connection
        console.log('🚀 Testing connection...');
        const verified = await transporter.verify();
        console.log('✅ Connection verified:', verified);
        
        // Send test email
        console.log('🚀 Sending test email...');
        const info = await transporter.sendMail({
            from: process.env.EMAIL_FROM,
            to: email,
            subject: '🚀 Direct Test Email - Madeus Skincare',
            html: '<h1>Test Email</h1><p>Bu direkt nodemailer test emailidir.</p>'
        });
        
        console.log('✅ Email sent:', info.messageId);
        
        res.json({
            success: true,
            message: 'Direct email test successful',
            verified: verified,
            messageId: info.messageId,
            config: {
                host: process.env.EMAIL_HOST,
                port: process.env.EMAIL_PORT,
                user: process.env.EMAIL_USER,
                secure: process.env.EMAIL_SECURE
            }
        });
        
    } catch (error) {
        console.error('❌ Direct email test failed:', error);
        res.status(500).json({
            success: false,
            error: error.message,
            stack: error.stack
        });
    }
});

// ===========================================
// DYNAMIC ROUTE LOADING
// ===========================================

const fs = require('fs');
const path = require('path');

function loadRoute(routePath, mountPath) {
    try {
        if (fs.existsSync(routePath)) {
            const route = require(routePath);
            app.use(mountPath, route);
            console.log(`✅ Loaded route: ${mountPath}`);
        } else {
            console.log(`⚠️ Route file not found: ${routePath}`);
        }
    } catch (error) {
        console.error(`❌ Error loading route ${mountPath}:`, error.message);
    }
}

// Load routes
loadRoute('./routes/auth.js', '/api/auth');
loadRoute('./routes/products.js', '/api/products');  
loadRoute('./routes/seo.js', '/api/seo');
loadRoute('./routes/setup.js', '/api/setup');

// ===========================================
// 404 HANDLER
// ===========================================

app.use('*', (req, res) => {
    res.status(404).json({
        error: 'Endpoint not found',
        message: `${req.method} ${req.originalUrl} is not a valid route`,
        availableEndpoints: [
            'GET /api',
            'GET /api/health',
            'POST /api/auth/login',
            'POST /api/auth/register',
            'GET /api/products',
            'GET /api/setup/email-config'
        ]
    });
});

// ===========================================
// ERROR HANDLING
// ===========================================

app.use((err, req, res, next) => {
    console.error('Error occurred:', {
        message: err.message,
        stack: err.stack,
        url: req.url,
        method: req.method,
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        timestamp: new Date().toISOString()
    });

    const statusCode = err.statusCode || err.status || 500;
    
    const errorResponse = {
        error: true,
        message: err.message || 'Internal Server Error',
        timestamp: new Date().toISOString()
    };

    if (process.env.NODE_ENV === 'development') {
        errorResponse.stack = err.stack;
        errorResponse.details = err;
    }

    res.status(statusCode).json(errorResponse);
});

// ===========================================
// SERVER STARTUP
// ===========================================

const PORT = process.env.PORT || 5002;

const server = app.listen(PORT, () => {
    console.log('🚀 Madeus E-commerce Backend Server Started');
    console.log('==========================================');
    console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`🚪 Port: ${PORT}`);
    console.log(`📡 API URL: http://localhost:${PORT}/api`);
    console.log(`❤️  Health Check: http://localhost:${PORT}/api/health`);
    console.log(`🔗 Frontend URL: ${process.env.FRONTEND_URL || 'http://localhost:3000'}`);
    console.log('==========================================');
});

// Graceful shutdown
process.on('SIGTERM', () => {
    console.log('SIGTERM received, shutting down gracefully');
    server.close(() => {
        console.log('Process terminated');
        process.exit(0);
    });
});

process.on('SIGINT', () => {
    console.log('SIGINT received, shutting down gracefully');
    server.close(() => {
        console.log('Process terminated');
        process.exit(0);
    });
});

module.exports = app; 