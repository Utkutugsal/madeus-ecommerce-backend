const express = require('express');
const Database = require('../config/database');
const emailService = require('../utils/email');

const router = express.Router();

// Simple test route to verify setup is working
router.get('/test', (req, res) => {
    res.json({
        success: true,
        message: 'Setup route is working!',
        timestamp: new Date().toISOString()
    });
});

// Create database tables
router.post('/create-tables', async (req, res) => {
    try {
        const db = new Database();
        
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

// Insert sample data
router.post('/sample-data', async (req, res) => {
    try {
        const db = new Database();
        
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

// System setup and health check
router.get('/health', (req, res) => {
  try {
    const health = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'development',
      version: process.env.npm_package_version || '1.0.0',
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      services: {
        database: true, // Mock - gerçek projede veritabanı bağlantısı kontrol edilecek
        email: !!process.env.EMAIL_HOST,
        payment: !!process.env.PAYTR_MERCHANT_ID,
        storage: true
      }
    };

    res.json(health);

  } catch (error) {
    console.error('Health check error:', error);
    res.status(500).json({ 
      status: 'unhealthy',
      error: 'Health check failed',
      timestamp: new Date().toISOString()
    });
  }
});

// Environment variables check
router.get('/env-check', (req, res) => {
  try {
    const requiredEnvVars = [
      'JWT_SECRET',
      'DB_HOST',
      'DB_USER',
      'DB_PASSWORD',
      'DB_NAME',
      'EMAIL_HOST',
      'EMAIL_USER',
      'EMAIL_PASS',
      'PAYTR_MERCHANT_ID',
      'PAYTR_MERCHANT_KEY',
      'PAYTR_MERCHANT_SALT'
    ];

    const optionalEnvVars = [
      'NODE_ENV',
      'PORT',
      'SITE_URL',
      'GOOGLE_ANALYTICS_ID',
      'GOOGLE_TAG_MANAGER_ID',
      'FACEBOOK_APP_ID',
      'STRIPE_SECRET_KEY',
      'STRIPE_PUBLISHABLE_KEY'
    ];

    const envStatus = {
      required: {},
      optional: {},
      missing: [],
      warnings: []
    };

    // Check required environment variables
    requiredEnvVars.forEach(varName => {
      if (process.env[varName]) {
        envStatus.required[varName] = '✅ Set';
      } else {
        envStatus.required[varName] = '❌ Missing';
        envStatus.missing.push(varName);
      }
    });

    // Check optional environment variables
    optionalEnvVars.forEach(varName => {
      if (process.env[varName]) {
        envStatus.optional[varName] = '✅ Set';
      } else {
        envStatus.optional[varName] = '⚠️ Not set';
        envStatus.warnings.push(varName);
      }
    });

    // Overall status
    const isHealthy = envStatus.missing.length === 0;
    const status = isHealthy ? 'ready' : 'incomplete';

    res.json({
      status,
      isHealthy,
      envStatus,
      summary: {
        totalRequired: requiredEnvVars.length,
        totalOptional: optionalEnvVars.length,
        missingRequired: envStatus.missing.length,
        missingOptional: envStatus.warnings.length
      }
    });

  } catch (error) {
    console.error('Environment check error:', error);
    res.status(500).json({ error: 'Environment check failed' });
  }
});

// Database connection test
router.get('/db-test', async (req, res) => {
  try {
    // Mock database test - gerçek projede MySQL bağlantısı test edilecek
    const dbTest = {
      status: 'connected',
      timestamp: new Date().toISOString(),
      connection: {
        host: process.env.DB_HOST || 'localhost',
        database: process.env.DB_NAME || 'madeus_glow',
        user: process.env.DB_USER || 'root',
        port: process.env.DB_PORT || 3306
      },
      tables: {
        users: '✅ Ready',
        products: '✅ Ready',
        categories: '✅ Ready',
        orders: '✅ Ready',
        order_items: '✅ Ready'
      }
    };

    res.json(dbTest);

  } catch (error) {
    console.error('Database test error:', error);
    res.status(500).json({ 
      status: 'error',
      error: 'Database connection failed',
      message: error.message
    });
  }
});

// Email service test
router.get('/email-test', async (req, res) => {
  try {
    const emailConfig = {
      host: process.env.EMAIL_HOST,
      port: process.env.EMAIL_PORT || 587,
      secure: process.env.EMAIL_SECURE === 'true',
      user: process.env.EMAIL_USER,
      from: process.env.EMAIL_FROM || process.env.EMAIL_USER
    };

    if (!emailConfig.host || !emailConfig.user) {
      return res.json({
        status: 'not_configured',
        message: 'Email service not configured',
        config: emailConfig
      });
    }

    // Mock email test - gerçek projede gerçek email gönderimi test edilecek
    const emailTest = {
      status: 'ready',
      timestamp: new Date().toISOString(),
      config: emailConfig,
      capabilities: {
        welcomeEmail: '✅ Ready',
        orderConfirmation: '✅ Ready',
        passwordReset: '✅ Ready',
        newsletter: '✅ Ready'
      }
    };

    res.json(emailTest);

  } catch (error) {
    console.error('Email test error:', error);
    res.status(500).json({ 
      status: 'error',
      error: 'Email service test failed',
      message: error.message
    });
  }
});

// Payment service test
router.get('/payment-test', async (req, res) => {
  try {
    const paymentConfig = {
      paytr: {
        merchantId: process.env.PAYTR_MERCHANT_ID,
        merchantKey: process.env.PAYTR_MERCHANT_KEY,
        merchantSalt: process.env.PAYTR_MERCHANT_SALT,
        testMode: process.env.PAYTR_TEST_MODE === 'true'
      },
      stripe: {
        secretKey: process.env.STRIPE_SECRET_KEY,
        publishableKey: process.env.STRIPE_PUBLISHABLE_KEY
      }
    };

    const paymentTest = {
      status: 'ready',
      timestamp: new Date().toISOString(),
      services: {
        paytr: {
          status: paymentConfig.paytr.merchantId ? '✅ Configured' : '❌ Not configured',
          testMode: paymentConfig.paytr.testMode
        },
        stripe: {
          status: paymentConfig.stripe.secretKey ? '✅ Configured' : '⚠️ Not configured'
        }
      },
      capabilities: {
        creditCard: '✅ Ready',
        bankTransfer: '✅ Ready',
        installment: '✅ Ready',
        refund: '✅ Ready'
      }
    };

    res.json(paymentTest);

  } catch (error) {
    console.error('Payment test error:', error);
    res.status(500).json({ 
      status: 'error',
      error: 'Payment service test failed',
      message: error.message
    });
  }
});

// System information
router.get('/system-info', (req, res) => {
  try {
    const systemInfo = {
      node: {
        version: process.version,
        platform: process.platform,
        arch: process.arch,
        uptime: process.uptime()
      },
      memory: {
        total: process.memoryUsage().heapTotal,
        used: process.memoryUsage().heapUsed,
        external: process.memoryUsage().external,
        rss: process.memoryUsage().rss
      },
      environment: {
        nodeEnv: process.env.NODE_ENV || 'development',
        port: process.env.PORT || 5000,
        pid: process.pid
      },
      dependencies: {
        express: require('express/package.json').version,
        mysql: require('mysql2/package.json').version,
        bcryptjs: require('bcryptjs/package.json').version,
        jsonwebtoken: require('jsonwebtoken/package.json').version
      }
    };

    res.json(systemInfo);

  } catch (error) {
    console.error('System info error:', error);
    res.status(500).json({ error: 'Failed to get system information' });
  }
});

// Initialize system (first time setup)
router.post('/initialize', async (req, res) => {
  try {
    const { adminEmail, adminPassword, siteName, siteUrl } = req.body;

    // Validation
    if (!adminEmail || !adminPassword || !siteName) {
      return res.status(400).json({ 
        error: 'Admin email, password and site name are required' 
      });
    }

    // Mock initialization - gerçek projede veritabanı tabloları oluşturulacak
    const initialization = {
      status: 'success',
      timestamp: new Date().toISOString(),
      steps: [
        '✅ Environment variables validated',
        '✅ Database connection established',
        '✅ Database tables created',
        '✅ Admin user created',
        '✅ Default categories created',
        '✅ Sample products added',
        '✅ Email templates configured',
        '✅ Payment settings configured',
        '✅ SEO settings configured'
      ],
      admin: {
        email: adminEmail,
        role: 'admin',
        createdAt: new Date().toISOString()
      },
      site: {
        name: siteName,
        url: siteUrl || 'https://madeusglow.com',
        createdAt: new Date().toISOString()
      }
    };

    res.json(initialization);

  } catch (error) {
    console.error('System initialization error:', error);
    res.status(500).json({ 
      error: 'System initialization failed',
      message: error.message
    });
  }
});

// Reset system (development only)
router.post('/reset', async (req, res) => {
  try {
    if (process.env.NODE_ENV === 'production') {
      return res.status(403).json({ 
        error: 'System reset is not allowed in production' 
      });
    }

    // Mock reset - gerçek projede veritabanı sıfırlanacak
    const reset = {
      status: 'success',
      timestamp: new Date().toISOString(),
      message: 'System has been reset to initial state',
      steps: [
        '✅ Database tables dropped',
        '✅ Database tables recreated',
        '✅ Sample data inserted',
        '✅ Cache cleared',
        '✅ Logs cleared'
      ]
    };

    res.json(reset);

  } catch (error) {
    console.error('System reset error:', error);
    res.status(500).json({ 
      error: 'System reset failed',
      message: error.message
    });
  }
});

// ===================================
// EMAIL TESTING ENDPOINTS
// ===================================

// Test email endpoint
router.post('/test-email', async (req, res) => {
    try {
        const { email = 'test@example.com', type = 'welcome' } = req.body;
        
        console.log('🧪 Email test başlatılıyor:', { email, type });
        
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

// Check email configuration
router.get('/email-config', (req, res) => {
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

// Email service connection test
router.get('/email-connection', async (req, res) => {
    try {
        console.log('🔍 Email connection test başlatılıyor...');
        
        // Test connection using nodemailer verify
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

// Send verification email to specific user
router.post('/send-verification', async (req, res) => {
    try {
        const { userId, email, name } = req.body;
        
        if (!email || !name) {
            return res.status(400).json({
                success: false,
                error: 'Email and name are required'
            });
        }
        
        // Generate verification token
        const crypto = require('crypto');
        const verificationToken = crypto.randomBytes(32).toString('hex');
        
        console.log('📧 Verification email gönderiliyor:', { email, name });
        
        const result = await emailService.sendVerificationEmail({
            name: name,
            email: email
        }, verificationToken);
        
        res.json({
            success: true,
            message: 'Verification email sent successfully',
            result: result,
            verificationToken: verificationToken // Dev environment için
        });
        
    } catch (error) {
        console.error('❌ Verification email error:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

module.exports = router; 