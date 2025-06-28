const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const responseTime = require('response-time');
const morgan = require('morgan');
const compression = require('compression');
require('dotenv').config();

const app = express();

// Trust proxy for Railway deployment
app.set('trust proxy', 1);

// ===========================================
// MIDDLEWARE CONFIGURATION
// ===========================================

// Security middleware
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'"],
            scriptSrc: ["'self'"],
            imgSrc: ["'self'", "data:", "https:"],
            connectSrc: ["'self'", "https://madeusskincare.com", "https://www.madeusskincare.com"],
            fontSrc: ["'self'"],
            objectSrc: ["'none'"],
            mediaSrc: ["'self'"],
            frameSrc: ["'none'"],
        },
    },
    crossOriginEmbedderPolicy: false
}));

// CORS configuration
app.use(cors({
    origin: [
        'http://localhost:3000',
        'http://localhost:5173', 
        'http://localhost:8081',
        'https://madeusskincare.com',
        'https://www.madeusskincare.com',
        process.env.FRONTEND_URL
    ].filter(Boolean),
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));

// Compression middleware
app.use(compression());

// Response time tracking
app.use(responseTime());

// Logging middleware
if (process.env.NODE_ENV === 'development') {
    app.use(morgan('dev'));
} else {
    app.use(morgan('combined'));
}

// Rate limiting
const generalLimiter = rateLimit({
    windowMs: (process.env.RATE_LIMIT_WINDOW || 15) * 60 * 1000, // 15 minutes
    max: process.env.RATE_LIMIT_MAX || 100,
    message: {
        error: 'Too many requests from this IP, please try again later.',
        retryAfter: Math.ceil((process.env.RATE_LIMIT_WINDOW || 15) * 60)
    },
    standardHeaders: true,
    legacyHeaders: false,
});
app.use(generalLimiter);

// Auth specific rate limiting
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: process.env.AUTH_RATE_LIMIT_MAX || 5,
    message: {
        error: 'Too many authentication attempts, please try again later.',
        retryAfter: 900 // 15 minutes in seconds
    },
    skipSuccessfulRequests: true
});

// Body parsing middleware
app.use(express.json({ 
    limit: '10mb',
    type: 'application/json'
}));
app.use(express.urlencoded({ 
    extended: true, 
    limit: '10mb' 
}));

// Static files (uploads)
app.use('/uploads', express.static('uploads'));

// ===========================================
// ROUTES
// ===========================================

// Health check endpoint
app.get('/api/health', (req, res) => {
    res.json({ 
        status: 'OK', 
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV,
        version: '1.0.0'
    });
});

// API root
app.get('/api', (req, res) => {
    res.json({
        message: 'Madeus E-commerce API',
        version: '1.0.0',
        endpoints: {
            auth: '/api/auth',
            products: '/api/products',
            orders: '/api/orders',
            users: '/api/users',
            admin: '/api/admin',
            seo: '/api/seo',
            setup: '/api/setup',
            health: '/api/health'
        }
    });
});

// Temporary setup routes (until route files are pushed)
app.get('/api/setup/test', (req, res) => {
    res.json({
        success: true,
        message: 'Setup route is working!',
        timestamp: new Date().toISOString()
    });
});

app.get('/api/setup/debug', async (req, res) => {
    try {
        const { db } = require('./config/database');
        
        // Show connection config (without password)
        const config = {
            host: process.env.DB_HOST || 'not set',
            port: process.env.DB_PORT || 'not set', 
            user: process.env.DB_USER || 'not set',
            database: process.env.DB_NAME || 'not set',
            hasPassword: !!process.env.DB_PASS,
            hasDatabaseUrl: !!process.env.DATABASE_URL,
            mysqlHost: process.env.MYSQLHOST || 'not set',
            mysqlPort: process.env.MYSQLPORT || 'not set',
            mysqlUser: process.env.MYSQLUSER || 'not set',
            mysqlDatabase: process.env.MYSQLDATABASE || 'not set',
            hasMysqlPassword: !!process.env.MYSQLPASSWORD
        };
        
        // Test basic query
        try {
            await db.query('SELECT 1 as test');
            config.connectionTest = 'SUCCESS';
        } catch (error) {
            config.connectionTest = `FAILED: ${error.message}`;
        }
        
        res.json({
            success: true,
            config: config,
            timestamp: new Date().toISOString()
        });
        
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message,
            timestamp: new Date().toISOString()
        });
    }
});

// Temporary products endpoint removed - now handled by routes/products.js

app.post('/api/setup/create-tables', async (req, res) => {
    try {
        const { db } = require('./config/database');
        
        // Create users table
        await db.query(`
            CREATE TABLE IF NOT EXISTS users (
                id INT PRIMARY KEY AUTO_INCREMENT,
                name VARCHAR(255) NOT NULL,
                email VARCHAR(255) UNIQUE NOT NULL,
                password VARCHAR(255) NOT NULL,
                phone VARCHAR(20),
                skin_type VARCHAR(50),
                role ENUM('customer', 'admin') DEFAULT 'customer',
                is_verified BOOLEAN DEFAULT FALSE,
                is_active BOOLEAN DEFAULT TRUE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
            )
        `);

        // Create categories table
        await db.query(`
            CREATE TABLE IF NOT EXISTS categories (
                id INT PRIMARY KEY AUTO_INCREMENT,
                name VARCHAR(100) NOT NULL,
                slug VARCHAR(100) UNIQUE NOT NULL,
                description TEXT,
                is_active BOOLEAN DEFAULT TRUE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // Create products table
        await db.query(`
            CREATE TABLE IF NOT EXISTS products (
                id INT PRIMARY KEY AUTO_INCREMENT,
                name VARCHAR(255) NOT NULL,
                slug VARCHAR(255) UNIQUE NOT NULL,
                description TEXT,
                short_description VARCHAR(500),
                price DECIMAL(10,2) NOT NULL,
                compare_price DECIMAL(10,2),
                featured_image VARCHAR(255),
                sku VARCHAR(100) UNIQUE,
                category_id INT,
                brand VARCHAR(100),
                stock INT DEFAULT 0,
                rating DECIMAL(3,2) DEFAULT 0,
                reviews_count INT DEFAULT 0,
                is_active BOOLEAN DEFAULT TRUE,
                is_featured BOOLEAN DEFAULT FALSE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (category_id) REFERENCES categories(id)
            )
        `);

        // Create orders table
        await db.query(`
            CREATE TABLE IF NOT EXISTS orders (
                id INT PRIMARY KEY AUTO_INCREMENT,
                user_id INT,
                order_number VARCHAR(50) UNIQUE NOT NULL,
                subtotal DECIMAL(10,2) NOT NULL,
                total_amount DECIMAL(10,2) NOT NULL,
                status ENUM('pending', 'confirmed', 'shipped', 'delivered', 'cancelled') DEFAULT 'pending',
                payment_status ENUM('pending', 'paid', 'failed', 'refunded') DEFAULT 'pending',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id)
            )
        `);

        // Create order_items table
        await db.query(`
            CREATE TABLE IF NOT EXISTS order_items (
                id INT PRIMARY KEY AUTO_INCREMENT,
                order_id INT NOT NULL,
                product_id INT NOT NULL,
                quantity INT NOT NULL,
                unit_price DECIMAL(10,2) NOT NULL,
                total_price DECIMAL(10,2) NOT NULL,
                FOREIGN KEY (order_id) REFERENCES orders(id),
                FOREIGN KEY (product_id) REFERENCES products(id)
            )
        `);

        res.json({
            success: true,
            message: 'Database tables created successfully!',
            tables: ['users', 'categories', 'products', 'orders', 'order_items']
        });

    } catch (error) {
        console.error('Table creation error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to create tables',
            error: error.message
        });
    }
});

app.post('/api/setup/sample-data', async (req, res) => {
    try {
        const { db } = require('./config/database');
        
        // Insert categories
        await db.query(`
            INSERT IGNORE INTO categories (name, slug, description) VALUES
            ('Yüz Bakımı', 'yuz-bakimi', 'Yüz için özel bakım ürünleri'),
            ('Vücut Bakımı', 'vucut-bakimi', 'Vücut için nemlendirici ve bakım ürünleri'),
            ('Güneş Koruma', 'gunes-koruma', 'SPF korumalı güneş kremi ürünleri')
        `);

        // Insert sample products
        await db.query(`
            INSERT IGNORE INTO products (name, slug, description, short_description, price, compare_price, featured_image, sku, category_id, brand, stock, is_featured) VALUES
            ('Anti-Aging Serum', 'anti-aging-serum', 'Yaşlanma karşıtı yoğun bakım serumu', 'Kırışıklık ve yaşlanma belirtilerini azaltır', 299.90, 399.90, '/images/anti-aging-serum.jpg', 'MDS-001', 1, 'Madeus', 50, true),
            ('Hyaluronic Nemlendirici', 'hyaluronic-nemlendirici', 'Yoğun nemlendirici krem', 'Hyalüronik asit ile derin nemlendirme', 249.90, 329.90, '/images/hyaluronic-cream.jpg', 'MDS-002', 1, 'Madeus', 30, true),
            ('Vitamin C Serum', 'vitamin-c-serum', 'Aydınlatıcı vitamin C serumu', 'Cilt tonunu eşitler ve aydınlatır', 199.90, 259.90, '/images/vitamin-c-serum.jpg', 'MDS-003', 1, 'Madeus', 40, true),
            ('Güneş Kremi SPF 50', 'gunes-kremi-spf-50', 'Yüksek koruma güneş kremi', 'UVA/UVB koruması ile geniş spektrum', 149.90, 199.90, '/images/sunscreen-spf50.jpg', 'MDS-004', 3, 'Madeus', 60, false),
            ('Vücut Losyonu', 'vucut-losyonu', 'Günlük vücut nemlendirici', 'Tüm vücut için nemlendirici losyon', 89.90, 119.90, '/images/body-lotion.jpg', 'MDS-005', 2, 'Madeus', 25, false),
            ('Göz Çevresi Kremi', 'goz-cevresi-kremi', 'Göz çevresi özel bakım kremi', 'Göz altı morlukları ve kırışıklıklar için', 179.90, 229.90, '/images/eye-cream.jpg', 'MDS-006', 1, 'Madeus', 35, true)
        `);

        res.json({
            success: true,
            message: 'Sample data inserted successfully!',
            data: {
                categories: 3,
                products: 6
            }
        });

    } catch (error) {
        console.error('Sample data insertion error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to insert sample data',
            error: error.message
        });
    }
});

// Apply auth rate limiter to auth routes
app.use('/api/auth', authLimiter);

// Route imports - load existing routes individually
const fs = require('fs');
const path = require('path');

// Helper function to safely load routes
function loadRoute(routePath, mountPath) {
    try {
        if (fs.existsSync(path.join(__dirname, routePath))) {
            app.use(mountPath, require(routePath));
            console.log(`✅ Loaded route: ${mountPath}`);
        } else {
            console.log(`⚠️  Route file not found: ${routePath}`);
        }
    } catch (error) {
        console.error(`❌ Error loading route ${mountPath}:`, error.message);
    }
}

// Load existing routes
loadRoute('./routes/auth.js', '/api/auth');
loadRoute('./routes/products.js', '/api/products');
loadRoute('./routes/seo.js', '/api/seo');
loadRoute('./routes/setup.js', '/api/setup');

// ===================================
// TEMPORARY EMAIL ENDPOINTS (Direct)
// ===================================

// Email configuration check
app.get('/api/setup/email-config', (req, res) => {
    const config = {
        host: process.env.EMAIL_HOST || 'not set',
        port: process.env.EMAIL_PORT || 'not set',
        user: process.env.EMAIL_USER || 'not set',
        hasPassword: !!process.env.EMAIL_PASS,
        secure: process.env.EMAIL_SECURE || 'not set',
        from: process.env.EMAIL_FROM || 'not set',
        frontendUrl: process.env.FRONTEND_URL || 'not set'
    };
    
    console.log('📧 Email configuration check:', config);
    
    res.json({
        success: true,
        message: 'Email configuration retrieved',
        config: config,
        isConfigured: !!(config.host !== 'not set' && config.user !== 'not set' && config.hasPassword)
    });
});

// Email connection test
app.get('/api/setup/email-connection', async (req, res) => {
    try {
        console.log('🔍 Email connection test başlatılıyor...');
        
        const emailService = require('./utils/email');
        const result = await emailService.testConnection();
        
        console.log('✅ Email connection test result:', result);
        
        res.json({
            success: true,
            message: 'Email connection test completed successfully',
            result: result,
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

// Test email endpoint
app.post('/api/setup/test-email', async (req, res) => {
    try {
        const { email = 'test@example.com', type = 'welcome' } = req.body;
        
        console.log('🧪 Email test başlatılıyor:', { email, type });
        
        const emailService = require('./utils/email');
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
        
        console.log('📧 Email test result:', result);
        
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
            stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
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

// Routes to be created later
console.log('📝 Routes to be created: orders, users, admin, payment');

// 404 handler
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
            'GET /api/orders',
            'GET /api/users/profile'
        ]
    });
});

// ===========================================
// ERROR HANDLING
// ===========================================

// Global error handler
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

    // Determine error status
    const statusCode = err.statusCode || err.status || 500;
    
    // Prepare error response
    const errorResponse = {
        error: true,
        message: err.message || 'Internal Server Error',
        timestamp: new Date().toISOString()
    };

    // Add stack trace in development
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

// Graceful shutdown handler
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

// Start server
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

// Export app for testing
module.exports = app; 