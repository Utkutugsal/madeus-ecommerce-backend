const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const responseTime = require('response-time');
const morgan = require('morgan');
const compression = require('compression');
require('dotenv').config();

const { Database } = require('./config/database');
const emailService = require('./utils/email');
const addCargoFields = require('./scripts/railway-migration');

const app = express();

// Trust proxy for Railway
app.set('trust proxy', 1);

// ===========================================
// MIDDLEWARE SETUP
// ===========================================

// Security middleware
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com", "https://cdnjs.cloudflare.com"],
            fontSrc: ["'self'", "https://fonts.gstatic.com", "https://cdnjs.cloudflare.com"],
            imgSrc: ["'self'", "data:", "https:"],
            scriptSrc: ["'self'", "'unsafe-inline'"],
            scriptSrcAttr: ["'self'", "'unsafe-inline'"],
            connectSrc: ["'self'", "https://api.paytr.com"]
        }
    },
    crossOriginEmbedderPolicy: false
}));

// CORS configuration
const corsOptions = {
    origin: [
        'https://madeusskincare.com',
        'https://www.madeusskincare.com',
        'http://localhost:3000',
        'http://localhost:5173',
        'http://localhost:8080',
        'http://localhost:8081',
        'http://localhost:8082',
        'http://localhost:8083',
        'http://localhost:8084'
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
    max: 1000, // limit each IP to 1000 requests per windowMs (artırıldı)
    message: 'Too many requests from this IP, please try again later.',
    standardHeaders: true,
    legacyHeaders: false
});

app.use('/api/', limiter);

// Response time middleware
app.use(responseTime());

// Compression middleware
app.use(compression());

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Static file serving
app.use(express.static('public'));

// Admin panel route
app.get('/admin', async (req, res) => {
    const { username, password } = req.query;
    
    // Eğer URL'de username ve password varsa ve doğruysa, otomatik token oluştur
    if (username && password) {
        const bcrypt = require('bcrypt');
        const jwt = require('jsonwebtoken');
        
        const ADMIN_CREDENTIALS = {
            username: 'admin',
            password: '$2b$10$aiR7Lt6ejm0s/ra./bDXiOQsWwOXfy2g5TOFlWoubt7jt/Mp.dX0e' // "497D3212e" hashed
        };
        
        if (username === ADMIN_CREDENTIALS.username) {
            const isValid = await bcrypt.compare(password, ADMIN_CREDENTIALS.password);
            if (isValid) {
                const token = jwt.sign(
                    { username, role: 'admin' },
                    process.env.JWT_SECRET || 'your-secret-key',
                    { expiresIn: '24h' }
                );
                
                // Admin.html dosyasını oku ve token'ı localStorage'a set eden JavaScript kodu ekle
                const fs = require('fs');
                const path = require('path');
                const adminHtmlPath = path.join(__dirname, 'public', 'admin.html');
                let htmlContent = fs.readFileSync(adminHtmlPath, 'utf8');
                
                // Token'ı localStorage'a kaydeden JavaScript kodu ekle
                const autoLoginScript = `
                    <script>
                        localStorage.setItem('adminToken', '${token}');
                        window.location.href = '/admin';
                    </script>
                `;
                
                htmlContent = htmlContent.replace('</body>', autoLoginScript + '</body>');
                return res.send(htmlContent);
            }
        }
    }
    
    res.sendFile(__dirname + '/public/admin.html');
});

// Logging
if (process.env.NODE_ENV === 'production') {
    app.use(morgan('combined'));
} else {
    app.use(morgan('dev'));
}

// ===========================================
// DATABASE SETUP & MIGRATION
// ===========================================

// Initialize database and run migrations
async function initializeDatabase() {
    const db = new Database();
    
    try {
        // Check and add cargo fields if they don't exist
        console.log('🔧 Checking cargo fields...');
        
        // Check if cargo_company field exists
        try {
            const checkCompany = await db.query(`
                SELECT COLUMN_NAME 
                FROM INFORMATION_SCHEMA.COLUMNS 
                WHERE TABLE_NAME = 'orders' 
                AND COLUMN_NAME = 'cargo_company'
            `);
            
            if (checkCompany.length === 0) {
                await db.query(`
                    ALTER TABLE orders 
                    ADD COLUMN cargo_company VARCHAR(100) DEFAULT NULL
                `);
                console.log('✅ cargo_company field added');
            } else {
                console.log('✅ cargo_company field exists');
            }
        } catch (error) {
            console.log('⚠️ cargo_company field check failed:', error.message);
        }
        
        // Check if cargo_tracking_number field exists
        try {
            const checkTracking = await db.query(`
                SELECT COLUMN_NAME 
                FROM INFORMATION_SCHEMA.COLUMNS 
                WHERE TABLE_NAME = 'orders' 
                AND COLUMN_NAME = 'cargo_tracking_number'
            `);
            
            if (checkTracking.length === 0) {
                await db.query(`
                    ALTER TABLE orders 
                    ADD COLUMN cargo_tracking_number VARCHAR(100) DEFAULT NULL
                `);
                console.log('✅ cargo_tracking_number field added');
            } else {
                console.log('✅ cargo_tracking_number field exists');
            }
        } catch (error) {
            console.log('⚠️ cargo_tracking_number field check failed:', error.message);
        }
        
        // Check if products table exists, if not create it
        console.log('🔧 Checking products table...');
        try {
            const checkProductsTable = await db.query(`
                SELECT TABLE_NAME 
                FROM INFORMATION_SCHEMA.TABLES 
                WHERE TABLE_NAME = 'products'
            `);
            
            if (checkProductsTable.length === 0) {
                await db.query(`
                    CREATE TABLE products (
                        id INT AUTO_INCREMENT PRIMARY KEY,
                        name VARCHAR(255) NOT NULL,
                        description TEXT,
                        price DECIMAL(10,2) NOT NULL,
                        original_price DECIMAL(10,2),
                        category VARCHAR(50) NOT NULL,
                        stock INT DEFAULT 0,
                        image_url TEXT,
                        is_active BOOLEAN DEFAULT TRUE,
                        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
                    )
                `);
                console.log('✅ Products table created');
                
                // Add some sample products
                await db.query(`
                    INSERT INTO products (name, description, price, original_price, category, stock, image_url, is_active) VALUES
                    ('Vitamin C Serum', 'Güçlü antioksidan serum', 299.99, 399.99, 'serum', 50, '/placeholder.svg', 1),
                    ('Hyaluronic Acid Serum', 'Yoğun nemlendirici serum', 249.99, 299.99, 'serum', 30, '/placeholder.svg', 1),
                    ('Anti-Aging Cream', 'Yaşlanma karşıtı gece kremi', 399.99, 499.99, 'cream', 25, '/placeholder.svg', 1),
                    ('Gentle Cleanser', 'Nazik temizlik jeli', 199.99, 249.99, 'cleanser', 40, '/placeholder.svg', 1),
                    ('Hydrating Mask', 'Nemlendirici yüz maskesi', 159.99, 199.99, 'mask', 35, '/placeholder.svg', 1)
                `);
                console.log('✅ Sample products added');
            } else {
                console.log('✅ Products table exists');
                
                // Check if original_price column exists
                try {
                    const checkOriginalPrice = await db.query(`
                        SELECT COLUMN_NAME 
                        FROM INFORMATION_SCHEMA.COLUMNS 
                        WHERE TABLE_NAME = 'products' 
                        AND COLUMN_NAME = 'original_price'
                    `);
                    
                    if (checkOriginalPrice.length === 0) {
                        await db.query(`
                            ALTER TABLE products 
                            ADD COLUMN original_price DECIMAL(10,2) DEFAULT NULL
                        `);
                        console.log('✅ original_price column added to products table');
                    } else {
                        console.log('✅ original_price column exists');
                    }
                } catch (error) {
                    console.log('⚠️ original_price column check failed:', error.message);
                }

                // Check if category column exists
                try {
                    const checkCategory = await db.query(`
                        SELECT COLUMN_NAME 
                        FROM INFORMATION_SCHEMA.COLUMNS 
                        WHERE TABLE_NAME = 'products' 
                        AND COLUMN_NAME = 'category'
                    `);
                    
                    if (checkCategory.length === 0) {
                        await db.query(`
                            ALTER TABLE products 
                            ADD COLUMN category VARCHAR(50) DEFAULT 'serum'
                        `);
                        console.log('✅ category column added to products table');
                    } else {
                        console.log('✅ category column exists');
                    }
                } catch (error) {
                    console.log('⚠️ category column check failed:', error.message);
                }

                // Check if stock column exists
                try {
                    const checkStock = await db.query(`
                        SELECT COLUMN_NAME 
                        FROM INFORMATION_SCHEMA.COLUMNS 
                        WHERE TABLE_NAME = 'products' 
                        AND COLUMN_NAME = 'stock'
                    `);
                    
                    if (checkStock.length === 0) {
                        await db.query(`
                            ALTER TABLE products 
                            ADD COLUMN stock INT DEFAULT 0
                        `);
                        console.log('✅ stock column added to products table');
                    } else {
                        console.log('✅ stock column exists');
                    }
                } catch (error) {
                    console.log('⚠️ stock column check failed:', error.message);
                }

                // Check if image_url column exists
                try {
                    const checkImageUrl = await db.query(`
                        SELECT COLUMN_NAME 
                        FROM INFORMATION_SCHEMA.COLUMNS 
                        WHERE TABLE_NAME = 'products' 
                        AND COLUMN_NAME = 'image_url'
                    `);
                    
                    if (checkImageUrl.length === 0) {
                        await db.query(`
                            ALTER TABLE products 
                            ADD COLUMN image_url TEXT DEFAULT NULL
                        `);
                        console.log('✅ image_url column added to products table');
                    } else {
                        console.log('✅ image_url column exists');
                    }
                } catch (error) {
                    console.log('⚠️ image_url column check failed:', error.message);
                }

                // Check if is_active column exists
                try {
                    const checkIsActive = await db.query(`
                        SELECT COLUMN_NAME 
                        FROM INFORMATION_SCHEMA.COLUMNS 
                        WHERE TABLE_NAME = 'products' 
                        AND COLUMN_NAME = 'is_active'
                    `);
                    
                    if (checkIsActive.length === 0) {
                        await db.query(`
                            ALTER TABLE products 
                            ADD COLUMN is_active BOOLEAN DEFAULT TRUE
                        `);
                        console.log('✅ is_active column added to products table');
                    } else {
                        console.log('✅ is_active column exists');
                    }
                } catch (error) {
                    console.log('⚠️ is_active column check failed:', error.message);
                }

                // Check if gallery_images column exists
                try {
                    const galleryImagesCheck = await db.query(`
                        SELECT COLUMN_NAME 
                        FROM INFORMATION_SCHEMA.COLUMNS 
                        WHERE TABLE_SCHEMA = DATABASE() 
                        AND TABLE_NAME = 'products' 
                        AND COLUMN_NAME = 'gallery_images'
                    `);
                    
                    if (galleryImagesCheck.length === 0) {
                        await db.query(`
                            ALTER TABLE products 
                            ADD COLUMN gallery_images TEXT DEFAULT NULL
                        `);
                        console.log('✅ gallery_images column added to products table');
                    } else {
                        console.log('✅ gallery_images column exists');
                    }
                } catch (error) {
                    console.log('⚠️ gallery_images column check failed:', error.message);
                }

                // Check if brand column exists
                try {
                    const brandCheck = await db.query(`
                        SELECT COLUMN_NAME 
                        FROM INFORMATION_SCHEMA.COLUMNS 
                        WHERE TABLE_SCHEMA = DATABASE() 
                        AND TABLE_NAME = 'products' 
                        AND COLUMN_NAME = 'brand'
                    `);
                    
                    if (brandCheck.length === 0) {
                        await db.query(`
                            ALTER TABLE products 
                            ADD COLUMN brand VARCHAR(100) DEFAULT 'MADEUS'
                        `);
                        console.log('✅ brand column added to products table');
                    } else {
                        console.log('✅ brand column exists');
                    }
                } catch (error) {
                    console.log('⚠️ brand column check failed:', error.message);
                }

                // Check if page control columns exist
                try {
                    const pageControlCheck = await db.query(`
                        SELECT COLUMN_NAME 
                        FROM INFORMATION_SCHEMA.COLUMNS 
                        WHERE TABLE_SCHEMA = DATABASE() 
                        AND TABLE_NAME = 'products' 
                        AND COLUMN_NAME IN ('show_in_homepage', 'show_in_popular', 'show_in_bestsellers', 'show_in_featured')
                    `);
                    
                    const existingColumns = pageControlCheck.map(row => row.COLUMN_NAME);
                    
                    if (!existingColumns.includes('show_in_homepage')) {
                        await db.query(`
                            ALTER TABLE products 
                            ADD COLUMN show_in_homepage BOOLEAN DEFAULT TRUE
                        `);
                        console.log('✅ show_in_homepage column added to products table');
                    }
                    
                    if (!existingColumns.includes('show_in_popular')) {
                        await db.query(`
                            ALTER TABLE products 
                            ADD COLUMN show_in_popular BOOLEAN DEFAULT FALSE
                        `);
                        console.log('✅ show_in_popular column added to products table');
                    }
                    
                    if (!existingColumns.includes('show_in_bestsellers')) {
                        await db.query(`
                            ALTER TABLE products 
                            ADD COLUMN show_in_bestsellers BOOLEAN DEFAULT FALSE
                        `);
                        console.log('✅ show_in_bestsellers column added to products table');
                    }
                    
                    if (!existingColumns.includes('show_in_featured')) {
                        await db.query(`
                            ALTER TABLE products 
                            ADD COLUMN show_in_featured BOOLEAN DEFAULT FALSE
                        `);
                        console.log('✅ show_in_featured column added to products table');
                    }
                    
                    console.log('✅ Page control columns exist');
                } catch (error) {
                    console.log('⚠️ Page control columns check failed:', error.message);
                }

                // Her deployda image_url alanını TEXT olarak güncelle
                try {
                    await db.query(`ALTER TABLE products MODIFY COLUMN image_url TEXT`);
                    console.log('✅ image_url column type set to TEXT');
                } catch (error) {
                    console.log('⚠️ image_url column type set failed:', error.message);
                }
            }
        } catch (error) {
            console.log('⚠️ Products table check failed:', error.message);
        }
        
        console.log('✅ Database initialization complete');
        
    } catch (error) {
        console.error('❌ Database initialization error:', error);
    }
}

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

// Railway healthcheck endpoint (without /api prefix)
app.get('/health', (req, res) => {
    res.json({
        status: 'OK',
        message: 'Madeus Skincare API is healthy',
        timestamp: new Date().toISOString(),
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
        host: process.env.BREVO_SMTP_HOST || 'not set',
        port: process.env.BREVO_SMTP_PORT || 'not set',
        user: process.env.BREVO_SMTP_USER || 'not set',
        hasPassword: !!process.env.BREVO_SMTP_PASS,
        hasApiKey: !!process.env.BREVO_API_KEY,
        from: process.env.EMAIL_FROM || 'not set',
        frontendUrl: process.env.FRONTEND_URL || 'not set'
    });

    res.json({
        success: true,
        message: 'Email configuration retrieved',
        config: {
            host: process.env.BREVO_SMTP_HOST,
            port: process.env.BREVO_SMTP_PORT,
            user: process.env.BREVO_SMTP_USER,
            hasPassword: !!process.env.BREVO_SMTP_PASS,
            hasApiKey: !!process.env.BREVO_API_KEY,
            from: process.env.EMAIL_FROM,
            frontendUrl: process.env.FRONTEND_URL
        },
        isConfigured: !!(process.env.BREVO_SMTP_HOST && process.env.BREVO_SMTP_USER && process.env.BREVO_SMTP_PASS)
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
            result = await emailService.sendWelcomeEmail(
                email,
                'Test Kullanici'
            );
        } else if (type === 'verification') {
            result = await emailService.sendVerificationEmail(
                email,
                'test-verification-token-123456'
            );
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
        
        console.log('🚀 Direct nodemailer test baslatiliyor...');
        
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
        
        console.log('🚀 Testing connection...');
        const verified = await transporter.verify();
        console.log('✅ Connection verified:', verified);
        
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
            // Clear require cache for this route
            delete require.cache[require.resolve(routePath)];
            
            const route = require(routePath);
            
            // Validate that route is actually a router
            if (typeof route !== 'function' && typeof route.use !== 'function') {
                throw new Error(`Route ${routePath} does not export a valid router`);
            }
            
            app.use(mountPath, route);
            console.log(`✅ Loaded route: ${mountPath}`);
        } else {
            console.log(`⚠️ Route file not found: ${routePath}`);
        }
    } catch (error) {
        console.error(`❌ Error loading route ${mountPath}:`, error.message);
        console.error(`❌ Stack trace:`, error.stack);
    }
}

// Load routes
loadRoute('./routes/auth.js', '/api/auth');
loadRoute('./routes/users.js', '/api/users');
loadRoute('./routes/products.js', '/api/products'); // ACTIVATED - Using fixed version
// loadRoute('./routes/products-db.js', '/api/products'); // DEACTIVATED - Old version with bugs
loadRoute('./routes/orders.js', '/api/orders');
loadRoute('./routes/seo.js', '/api/seo');
loadRoute('./routes/setup.js', '/api/setup');
loadRoute('./routes/admin.js', '/api/admin');
loadRoute('./routes/payment.js', '/api/payment'); // PayTR callback route

console.log('🚀 Routes loaded: auth, users, products, orders, seo, setup, admin, payment');

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

const server = app.listen(PORT, async () => {
    console.log('🚀 Madeus E-commerce Backend Server Started');
    console.log('==========================================');
    console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`🚪 Port: ${PORT}`);
    console.log(`📡 API URL: http://localhost:${PORT}/api`);
    console.log(`❤️  Health Check: http://localhost:${PORT}/api/health`);
    console.log(`🔗 Frontend URL: ${process.env.FRONTEND_URL || 'http://localhost:3000'}`);
    console.log('==========================================');
    
    // Initialize database and run migrations
    await initializeDatabase();
    
    // Run migration for cargo fields (legacy)
    if (process.env.RAILWAY_ENVIRONMENT) {
        try {
            console.log('🔧 Running cargo fields migration...');
            const addCargoFields = require('./scripts/railway-migration');
            await addCargoFields();
        } catch (error) {
            console.error('⚠️ Migration failed, but server will continue:', error.message);
        }
    }
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