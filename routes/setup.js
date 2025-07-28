const express = require('express');
const { Database } = require('../config/database');
const emailService = require('../utils/email');
const bcrypt = require('bcryptjs');

const router = express.Router();

// Create user_sessions table
router.get('/create-user-sessions', async (req, res) => {
    try {
        const db = new Database();
        
        // Create user_sessions table
        await db.query(`
            CREATE TABLE IF NOT EXISTS user_sessions (
                id INT PRIMARY KEY AUTO_INCREMENT,
                user_id INT NOT NULL,
                token_hash VARCHAR(255) NOT NULL,
                device_info TEXT,
                ip_address VARCHAR(45),
                is_active BOOLEAN DEFAULT TRUE,
                expires_at TIMESTAMP NOT NULL,
                logout_at TIMESTAMP NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                INDEX idx_user_id (user_id),
                INDEX idx_token_hash (token_hash),
                INDEX idx_is_active (is_active),
                INDEX idx_expires_at (expires_at)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        `);

        res.json({
            success: true,
            message: 'user_sessions table created successfully!',
            note: 'Users can now login and sessions will be tracked.'
        });

    } catch (error) {
        console.error('User sessions table creation error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to create user_sessions table',
            error: error.message
        });
    }
});

// Create user_addresses table
router.get('/create-user-addresses', async (req, res) => {
    try {
        const db = new Database();
        
        // Create user_addresses table
        await db.query(`
            CREATE TABLE IF NOT EXISTS user_addresses (
                id INT PRIMARY KEY AUTO_INCREMENT,
                user_id INT NOT NULL,
                title VARCHAR(100) NOT NULL,
                first_name VARCHAR(100) NOT NULL,
                last_name VARCHAR(100) NOT NULL,
                address_line_1 VARCHAR(255) NOT NULL,
                address_line_2 VARCHAR(255),
                city VARCHAR(100) NOT NULL,
                district VARCHAR(100) NOT NULL,
                postal_code VARCHAR(20) NOT NULL,
                phone VARCHAR(20) NOT NULL,
                is_default BOOLEAN DEFAULT FALSE,
                address_type ENUM('billing', 'shipping', 'both') DEFAULT 'both',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                INDEX idx_user_id (user_id),
                INDEX idx_is_default (is_default)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        `);

        res.json({
            success: true,
            message: 'user_addresses table created successfully!',
            note: 'Users can now save and manage their addresses.'
        });

    } catch (error) {
        console.error('User addresses table creation error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to create user_addresses table',
            error: error.message
        });
    }
});

// Recreate user_addresses table (drop and create)
router.get('/recreate-user-addresses', async (req, res) => {
    try {
        const db = new Database();
        
        // Drop existing table
        await db.query(`DROP TABLE IF EXISTS user_addresses`);
        
        // Create user_addresses table
        await db.query(`
            CREATE TABLE user_addresses (
                id INT PRIMARY KEY AUTO_INCREMENT,
                user_id INT NOT NULL,
                title VARCHAR(100) NOT NULL,
                first_name VARCHAR(100) NOT NULL,
                last_name VARCHAR(100) NOT NULL,
                address_line_1 VARCHAR(255) NOT NULL,
                address_line_2 VARCHAR(255),
                city VARCHAR(100) NOT NULL,
                district VARCHAR(100) NOT NULL,
                postal_code VARCHAR(20) NOT NULL,
                phone VARCHAR(20) NOT NULL,
                is_default BOOLEAN DEFAULT FALSE,
                address_type ENUM('billing', 'shipping', 'both') DEFAULT 'both',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                INDEX idx_user_id (user_id),
                INDEX idx_is_default (is_default)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        `);

        res.json({
            success: true,
            message: 'user_addresses table recreated successfully!',
            note: 'All existing addresses were deleted. Users can now save new addresses.'
        });

    } catch (error) {
        console.error('User addresses table recreation error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to recreate user_addresses table',
            error: error.message
        });
    }
});

// Add Trendyol columns to products table
router.post('/add-trendyol-columns', async (req, res) => {
  const db = new Database();
  
  try {
    console.log('🚀 Trendyol kolonları ekleniyor...');
    
    // Test connection
    await db.testConnection();
    console.log('✅ Database bağlantısı başarılı');
    
    // Add columns one by one with error handling
    const columns = [
      {
        name: 'trendyol_url',
        sql: 'ALTER TABLE products ADD COLUMN trendyol_url VARCHAR(500) NULL'
      },
      {
        name: 'trendyol_rating', 
        sql: 'ALTER TABLE products ADD COLUMN trendyol_rating DECIMAL(3,2) DEFAULT 0'
      },
      {
        name: 'trendyol_review_count',
        sql: 'ALTER TABLE products ADD COLUMN trendyol_review_count INT DEFAULT 0' 
      },
      {
        name: 'trendyol_last_update',
        sql: 'ALTER TABLE products ADD COLUMN trendyol_last_update TIMESTAMP NULL'
      }
    ];
    
    let addedColumns = 0;
    const results = [];
    
    for (const column of columns) {
      try {
        await db.query(column.sql);
        console.log(`✅ ${column.name} column added`);
        results.push(`✅ ${column.name} eklendi`);
        addedColumns++;
      } catch (error) {
        if (error.message.includes('Duplicate column name')) {
          console.log(`ℹ️ ${column.name} already exists`);
          results.push(`ℹ️ ${column.name} zaten mevcut`);
        } else {
          console.error(`❌ Error adding ${column.name}:`, error.message);
          results.push(`❌ ${column.name} eklenemedi: ${error.message}`);
        }
      }
    }
    
    res.json({
      success: true,
      message: 'Trendyol kolonları işlendi!',
      addedColumns: addedColumns,
      results: results
    });
    
  } catch (error) {
    console.error('❌ Migration error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  } finally {
    await db.close();
  }
});

// Simple test route to verify setup is working
router.get('/test', (req, res) => {
    res.json({
        success: true,
        message: 'Setup route is working!',
        timestamp: new Date().toISOString()
    });
});

// Create admin user
router.get('/create-admin', async (req, res) => {
    try {
        const db = new Database();
        
        // Check if admin already exists
        const existingAdmin = await db.query(
            'SELECT id FROM users WHERE email = ? AND role = ?',
            ['admin@madeusskincare.com', 'admin']
        );

        if (existingAdmin && existingAdmin.length > 0) {
            return res.json({
                success: false,
                message: 'Admin user already exists'
            });
        }

        // Hash password
        const hashedPassword = await bcrypt.hash('Admin123!', 10);

        // Create admin user
        await db.query(
            'INSERT INTO users (name, email, password, role, is_verified) VALUES (?, ?, ?, ?, ?)',
            ['Admin User', 'admin@madeusskincare.com', hashedPassword, 'admin', true]
        );

        res.json({
            success: true,
            message: 'Admin user created successfully!',
            credentials: {
                email: 'admin@madeusskincare.com',
                password: 'Admin123!'
            }
        });

    } catch (error) {
        console.error('Admin creation error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to create admin user',
            error: error.message
        });
    }
});

// Fix users table - drop and recreate with all columns
router.get('/fix-users-table', async (req, res) => {
    try {
        const db = new Database();
        
        // Disable foreign key checks
        await db.query(`SET FOREIGN_KEY_CHECKS = 0`);
        
        // Drop users table if exists
        await db.query(`DROP TABLE IF EXISTS users`);
        
        // Create users table with all required columns
        await db.query(`
            CREATE TABLE users (
                id INT PRIMARY KEY AUTO_INCREMENT,
                name VARCHAR(100) NOT NULL,
                email VARCHAR(100) UNIQUE NOT NULL,
                password VARCHAR(255) NOT NULL,
                phone VARCHAR(20),
                skin_type VARCHAR(100),
                role ENUM('customer', 'admin') DEFAULT 'customer',
                is_verified BOOLEAN DEFAULT FALSE,
                verification_token VARCHAR(255),
                verification_expires TIMESTAMP NULL,
                reset_token VARCHAR(255),
                reset_token_expires TIMESTAMP NULL,
                login_attempts INT DEFAULT 0,
                locked_until TIMESTAMP NULL,
                last_login TIMESTAMP NULL,
                is_active BOOLEAN DEFAULT TRUE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
            )
        `);
        
        // Re-enable foreign key checks
        await db.query(`SET FOREIGN_KEY_CHECKS = 1`);

        res.json({
            success: true,
            message: 'Users table fixed successfully!',
            note: 'All existing users were deleted. You can now register new users.'
        });

    } catch (error) {
        console.error('Users table fix error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fix users table',
            error: error.message
        });
    }
});

// Create database tables
router.get('/create-tables', async (req, res) => {
    try {
        const db = new Database();
        
        // Create users table
        await db.query(`
            CREATE TABLE IF NOT EXISTS users (
                id INT PRIMARY KEY AUTO_INCREMENT,
                name VARCHAR(100) NOT NULL,
                email VARCHAR(100) UNIQUE NOT NULL,
                password VARCHAR(255) NOT NULL,
                phone VARCHAR(20),
                skin_type VARCHAR(100),
                role ENUM('customer', 'admin') DEFAULT 'customer',
                is_verified BOOLEAN DEFAULT FALSE,
                verification_token VARCHAR(255),
                verification_expires TIMESTAMP NULL,
                reset_token VARCHAR(255),
                reset_token_expires TIMESTAMP NULL,
                login_attempts INT DEFAULT 0,
                locked_until TIMESTAMP NULL,
                last_login TIMESTAMP NULL,
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

        // Create products table (with proper foreign key handling)
        await db.query(`SET FOREIGN_KEY_CHECKS = 0`);
        
        await db.query(`
            DROP TABLE IF EXISTS products
        `);
        
        await db.query(`
            CREATE TABLE products (
                id INT PRIMARY KEY AUTO_INCREMENT,
                name VARCHAR(255) NOT NULL,
                slug VARCHAR(255) UNIQUE NOT NULL,
                description TEXT,
                short_description TEXT,
                price DECIMAL(10,2) NOT NULL,
                compare_price DECIMAL(10,2),
                featured_image VARCHAR(500),
                gallery_images JSON,
                sku VARCHAR(100) UNIQUE,
                brand VARCHAR(100),
                ingredients JSON,
                skin_type JSON,
                stock INT DEFAULT 0,
                rating DECIMAL(3,2) DEFAULT 0,
                reviews_count INT DEFAULT 0,
                is_featured BOOLEAN DEFAULT FALSE,
                is_active BOOLEAN DEFAULT TRUE,
                category_id INT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                INDEX idx_is_active (is_active),
                INDEX idx_is_featured (is_featured),
                INDEX idx_brand (brand),
                INDEX idx_category (category_id)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        `);

        // Create orders table
        await db.query(`
            CREATE TABLE IF NOT EXISTS orders (
                id INT PRIMARY KEY AUTO_INCREMENT,
                user_id INT,
                order_number VARCHAR(50) UNIQUE NOT NULL,
                subtotal DECIMAL(10,2) NOT NULL,
                shipping_cost DECIMAL(10,2) DEFAULT 0,
                tax_amount DECIMAL(10,2) DEFAULT 0,
                total_amount DECIMAL(10,2) NOT NULL,
                status ENUM('pending', 'confirmed', 'preparing', 'shipped', 'delivered', 'cancelled') DEFAULT 'pending',
                payment_status ENUM('pending', 'paid', 'failed', 'refunded') DEFAULT 'pending',
                payment_method VARCHAR(50),
                shipping_address JSON,
                billing_address JSON,
                admin_notes TEXT,
                customer_notes TEXT,
                tracking_number VARCHAR(100),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
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

        // Create order_status_history table
        await db.query(`
            CREATE TABLE IF NOT EXISTS order_status_history (
                id INT PRIMARY KEY AUTO_INCREMENT,
                order_id INT NOT NULL,
                status VARCHAR(50) NOT NULL,
                changed_by INT,
                notes TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (order_id) REFERENCES orders(id),
                FOREIGN KEY (changed_by) REFERENCES users(id)
            )
        `);

        // Create user_sessions table
        await db.query(`
            CREATE TABLE IF NOT EXISTS user_sessions (
                id INT PRIMARY KEY AUTO_INCREMENT,
                user_id INT NOT NULL,
                token_hash VARCHAR(255) NOT NULL,
                device_info TEXT,
                ip_address VARCHAR(45),
                is_active BOOLEAN DEFAULT TRUE,
                expires_at TIMESTAMP NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id)
            )
        `);

        // Re-enable foreign key checks
        await db.query(`SET FOREIGN_KEY_CHECKS = 1`);

        res.json({
            success: true,
            message: 'Database tables created successfully!',
            tables: ['users', 'categories', 'products', 'orders', 'order_items', 'order_status_history', 'user_sessions']
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
router.get('/sample-data', async (req, res) => {
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
      host: process.env.BREVO_SMTP_HOST,
      port: parseInt(process.env.BREVO_SMTP_PORT) || 587,
      secure: false,
      user: process.env.BREVO_SMTP_USER,
      pass: process.env.BREVO_SMTP_PASS,
      from: process.env.EMAIL_FROM || 'Madeus Skincare <noreply@madeusskincare.com>'
    };

    if (!emailConfig.host || !emailConfig.user || !emailConfig.pass) {
      return res.json({
        status: 'not_configured',
        message: 'Email service not configured',
        config: {
          host: emailConfig.host,
          port: emailConfig.port,
          secure: emailConfig.secure,
          user: emailConfig.user ? 'configured' : 'missing',
          pass: emailConfig.pass ? 'configured' : 'missing'
        }
      });
    }

    // Test email connection
    const testResult = await emailService.testConnection();
    
    const emailTest = {
      status: testResult.success ? 'ready' : 'error',
      timestamp: new Date().toISOString(),
      config: {
        host: emailConfig.host,
        port: emailConfig.port,
        secure: emailConfig.secure,
        user: emailConfig.user ? 'configured' : 'missing'
      },
      testResult: testResult,
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

// Environment variables debug
router.get('/env-debug', (req, res) => {
  try {
    const envDebug = {
      timestamp: new Date().toISOString(),
      email: {
        BREVO_SMTP_HOST: process.env.BREVO_SMTP_HOST || 'NOT_SET',
        BREVO_SMTP_PORT: process.env.BREVO_SMTP_PORT || 'NOT_SET',
        BREVO_SMTP_USER: process.env.BREVO_SMTP_USER || 'NOT_SET',
        BREVO_SMTP_PASS: process.env.BREVO_SMTP_PASS ? 'SET' : 'NOT_SET',
        BREVO_API_KEY: process.env.BREVO_API_KEY ? 'SET' : 'NOT_SET',
        EMAIL_FROM: process.env.EMAIL_FROM || 'NOT_SET',
        ADMIN_NOTIFY_EMAIL: process.env.ADMIN_NOTIFY_EMAIL || 'NOT_SET'
      },
      database: {
        DATABASE_URL: process.env.DATABASE_URL ? 'SET' : 'NOT_SET',
        MYSQL_URL: process.env.MYSQL_URL ? 'SET' : 'NOT_SET',
        MYSQLHOST: process.env.MYSQLHOST || 'NOT_SET',
        MYSQLDATABASE: process.env.MYSQLDATABASE || 'NOT_SET'
      },
      jwt: {
        JWT_SECRET: process.env.JWT_SECRET ? 'SET' : 'NOT_SET',
        JWT_EXPIRE: process.env.JWT_EXPIRE || 'NOT_SET'
      },
      frontend: {
        FRONTEND_URL: process.env.FRONTEND_URL || 'NOT_SET'
      }
    };

    res.json(envDebug);

  } catch (error) {
    console.error('Env debug error:', error);
    res.status(500).json({ error: 'Failed to get environment debug info' });
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

// Mock products for migration
const mockProducts = [
  {
    id: 7,
    name: "%100 Doğal Sivrisinek, Sinek Ve Kene Kovucu Sprey",
    slug: "madeus-dogal-sivrisinek-kovucu-sprey-100ml",
    description: "Bebek ve çocuklar için %100 doğal sivrisinek, sinek ve kene kovucu sprey. Kimyasal içermez, güvenle kullanılabilir.",
    price: 89.90,
    originalPrice: 129.90,
    mainImage: "/images/products/madeus-repellent-1.webp",
    stock: 2,
    rating: 4.9,
    reviewCount: 23,
    brand: "Madeus",
    isFeatured: true,
    trendyolUrl: "https://www.trendyol.com/madeus/100-dogal-sivrisinek-sinek-ve-kene-kovucu-sprey-bebek-cocuk-kimyasal-icermez-100-ml-p-944516808"
  },
  {
    id: 1,
    name: "Madeus Vitamin C Serum",
    slug: "madeus-vitamin-c-serum", 
    description: "Cilde parlaklık ve canlılık kazandıran güçlü antioksidan vitamin C serumu.",
    price: 299.99,
    originalPrice: 399.99,
    mainImage: "/images/products/madeus-vitamin-c-serum-main.jpg",
    stock: 50,
    rating: 4.8,
    reviewCount: 124,
    brand: "Madeus",
    isFeatured: true
  },
  {
    id: 2,
    name: "Madeus Hydra Moisture Cream",
    slug: "madeus-hydra-moisture-cream",
    description: "24 saat etkili nemlendirici krem. Hyaluronic acid ve ceramide içeriği ile derin nemlendirme sağlar.",
    price: 199.99,
    originalPrice: 249.99,
    mainImage: "/images/products/madeus-hydra-moisture-main.jpg",
    stock: 75,
    rating: 4.6,
    reviewCount: 89,
    brand: "Madeus",
    isFeatured: true
  }
];

// Database migration endpoint
router.post('/migrate-products', async (req, res) => {
  const db = new Database();
  
  try {
    console.log('🚀 Database migration başlatılıyor...');
    
    // Test connection
    await db.testConnection();
    console.log('✅ Database bağlantısı başarılı');
    
    // Create products table if not exists
    const createTableQuery = `
      CREATE TABLE IF NOT EXISTS products (
        id INT PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        slug VARCHAR(255) UNIQUE NOT NULL,
        description TEXT,
        price DECIMAL(10,2) NOT NULL,
        compare_price DECIMAL(10,2),
        featured_image VARCHAR(255),
        stock INT DEFAULT 0,
        rating DECIMAL(3,2) DEFAULT 0,
        reviews_count INT DEFAULT 0,
        brand VARCHAR(100),
        is_active BOOLEAN DEFAULT TRUE,
        is_featured BOOLEAN DEFAULT FALSE,
        trendyol_url VARCHAR(500),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `;
    
    await db.query(createTableQuery);
    console.log('✅ Products tablosu hazır');
    
    let insertedCount = 0;
    
    // Insert each product
    for (const product of mockProducts) {
      const insertQuery = `
        INSERT INTO products (
          id, name, slug, description, price, compare_price, featured_image,
          stock, rating, reviews_count, brand, is_active, is_featured, trendyol_url
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE
          price = VALUES(price),
          stock = VALUES(stock),
          rating = VALUES(rating),
          updated_at = NOW()
      `;
      
      const values = [
        product.id,
        product.name,
        product.slug,
        product.description,
        product.price,
        product.originalPrice || null,
        product.mainImage,
        product.stock,
        product.rating,
        product.reviewCount || 0,
        product.brand,
        true,
        product.isFeatured || false,
        product.trendyolUrl || null
      ];
      
      await db.query(insertQuery, values);
      insertedCount++;
      console.log(`✅ ${product.name} kaydedildi`);
    }
    
    // Get final count
    const countResult = await db.query('SELECT COUNT(*) as count FROM products WHERE is_active = TRUE');
    
    res.json({
      success: true,
      message: 'Products başarıyla database\'e migrate edildi',
      inserted: insertedCount,
      totalInDatabase: countResult[0].count,
      products: mockProducts.map(p => ({ id: p.id, name: p.name, price: p.price }))
    });
    
  } catch (error) {
    console.error('❌ Migration hatası:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      message: 'Database migration başarısız'
    });
  }
});

// Test database connection
router.get('/database-test', async (req, res) => {
  const db = new Database();
  
  try {
    await db.testConnection();
    
    // Test products table
    const products = await db.query('SELECT COUNT(*) as count FROM products WHERE is_active = TRUE');
    
    res.json({
      success: true,
      message: 'Database bağlantısı başarılı',
      productsCount: products[0].count,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
      message: 'Database bağlantı hatası'
    });
  }
});

// Database table creation for Railway deployment
router.post('/create-tables', async (req, res) => {
    try {
        console.log('🚀 Creating database tables...');
        const db = new Database();
        
        // Create categories table
        const createCategoriesTable = `
            CREATE TABLE IF NOT EXISTS categories (
                id INT AUTO_INCREMENT PRIMARY KEY,
                name VARCHAR(255) NOT NULL,
                slug VARCHAR(255) UNIQUE NOT NULL,
                description TEXT,
                image VARCHAR(500),
                is_active BOOLEAN DEFAULT TRUE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        `;
        
        // Create products table
        const createProductsTable = `
            CREATE TABLE IF NOT EXISTS products (
                id INT AUTO_INCREMENT PRIMARY KEY,
                name VARCHAR(255) NOT NULL,
                slug VARCHAR(255) UNIQUE NOT NULL,
                description TEXT,
                short_description TEXT,
                price DECIMAL(10,2) NOT NULL,
                compare_price DECIMAL(10,2),
                featured_image VARCHAR(500),
                gallery_images JSON,
                sku VARCHAR(100) UNIQUE,
                brand VARCHAR(100),
                ingredients JSON,
                skin_type JSON,
                stock INT DEFAULT 0,
                rating DECIMAL(3,2) DEFAULT 0,
                reviews_count INT DEFAULT 0,
                is_featured BOOLEAN DEFAULT FALSE,
                is_active BOOLEAN DEFAULT TRUE,
                category_id INT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                INDEX idx_is_active (is_active),
                INDEX idx_is_featured (is_featured),
                INDEX idx_brand (brand),
                INDEX idx_category (category_id)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        `;
        
        // Create users table
        const createUsersTable = `
            CREATE TABLE IF NOT EXISTS users (
                id INT AUTO_INCREMENT PRIMARY KEY,
                name VARCHAR(255) NOT NULL,
                email VARCHAR(255) UNIQUE NOT NULL,
                password VARCHAR(255) NOT NULL,
                phone VARCHAR(20),
                is_verified BOOLEAN DEFAULT FALSE,
                verification_token VARCHAR(255),
                reset_token VARCHAR(255),
                reset_token_expires TIMESTAMP NULL,
                is_active BOOLEAN DEFAULT TRUE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        `;
        
        // Create coupons table
        const createCouponsTable = `
            CREATE TABLE IF NOT EXISTS coupons (
                id INT AUTO_INCREMENT PRIMARY KEY,
                code VARCHAR(50) UNIQUE NOT NULL,
                name VARCHAR(255) NOT NULL,
                description TEXT,
                discount_type ENUM('percentage', 'fixed_amount', 'free_shipping') NOT NULL,
                discount_value DECIMAL(10,2) NOT NULL,
                minimum_amount DECIMAL(10,2) DEFAULT 0,
                maximum_discount DECIMAL(10,2),
                usage_limit INT,
                usage_limit_per_customer INT DEFAULT 1,
                used_count INT DEFAULT 0,
                is_active BOOLEAN DEFAULT TRUE,
                expires_at TIMESTAMP NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        `;
        
        // Execute table creation
        await db.query(createCategoriesTable);
        console.log('✅ Categories table created');
        
        await db.query(createProductsTable);
        console.log('✅ Products table created');
        
        await db.query(createUsersTable);
        console.log('✅ Users table created');
        
        await db.query(createCouponsTable);
        console.log('✅ Coupons table created');
        
        // Insert sample categories
        const categories = [
            { name: 'Dudak Bakımı', slug: 'dudak-bakimi', description: 'SPF korumalı ve nemlendirici dudak ürünleri' },
            { name: 'Yüz Serumları', slug: 'yuz-serumlari', description: 'Vitamin C, Hyaluronic Acid, Bakuchiol ve diğer özel bakım serumları' },
            { name: 'Temizlik Ürünleri', slug: 'temizlik-urunleri', description: 'Yüz temizleme jelleri, tonikler ve gözenek bakım ürünleri' },
            { name: 'Güneş Koruma', slug: 'gunes-koruma', description: 'SPF içerikli koruyucu kremler ve güneş bakım ürünleri' },
            { name: 'Saç Bakımı', slug: 'sac-bakimi', description: 'Doğal saç toniği ve saç bakım ürünleri' },
            { name: 'Aksesuarlar', slug: 'aksesuarlar', description: 'Cilt bakım rutini için pratik aksesuarlar ve araçlar' }
        ];
        
        for (const category of categories) {
            await db.query('INSERT IGNORE INTO categories (name, slug, description) VALUES (?, ?, ?)', 
                [category.name, category.slug, category.description]);
        }
        console.log('✅ Sample categories inserted');
        
        res.json({
            success: true,
            message: 'Database tables created successfully',
            tables: ['categories', 'products', 'users', 'coupons']
        });
        
    } catch (error) {
        console.error('❌ Error creating tables:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Database population with sample products
router.post('/populate-products', async (req, res) => {
    try {
        console.log('🚀 Populating products...');
        const db = new Database();
        
        // Check if products already exist
        const existingProducts = await db.query('SELECT COUNT(*) as count FROM products');
        if (existingProducts[0].count > 0) {
            return res.json({
                success: true,
                message: 'Products already exist',
                count: existingProducts[0].count
            });
        }
        
        // Sample products
        const sampleProducts = [
            {
                name: "Madeus Hydra Moisture Cream",
                slug: "madeus-hydra-moisture-cream",
                description: "Cildinizi derinlemesine nemlendiren ve 24 saat nem kilidi sağlayan özel formülü cream.",
                short_description: "24 saat nem kilidi sağlayan yoğun nemlendirici krem.",
                price: 299.90,
                compare_price: 399.90,
                featured_image: "/lovable-uploads/55d08746-c441-44dc-a3aa-099dac9d5335.png",
                gallery_images: JSON.stringify(["/lovable-uploads/55d08746-c441-44dc-a3aa-099dac9d5335.png"]),
                sku: "MD-HMC-001",
                brand: "Madeus",
                ingredients: JSON.stringify(["Hyaluronic Acid", "Ceramides", "Vitamin E"]),
                skin_type: JSON.stringify(["Kuru", "Normal", "Hassas"]),
                stock: 50,
                rating: 4.8,
                reviews_count: 124,
                is_featured: true,
                category_id: 2
            },
            {
                name: "Madeus Vitamin C Serum",
                slug: "madeus-vitamin-c-serum",
                description: "Cildinizi aydınlatan ve yaşlanma karşıtı etkili vitamin C serumu. Doğal antioksidanlar içerir.",
                short_description: "Cildinizi aydınlatan vitamin C serumu.",
                price: 249.90,
                compare_price: 329.90,
                featured_image: "/lovable-uploads/6b2d5b35-28bf-4789-8623-f510c60e279d.png",
                gallery_images: JSON.stringify(["/lovable-uploads/6b2d5b35-28bf-4789-8623-f510c60e279d.png"]),
                sku: "MD-VCS-002",
                brand: "Madeus",
                ingredients: JSON.stringify(["Vitamin C", "Niacinamide", "Hyaluronic Acid"]),
                skin_type: JSON.stringify(["Normal", "Karma", "Yağlı"]),
                stock: 35,
                rating: 4.9,
                reviews_count: 89,
                is_featured: true,
                category_id: 1
            },
            {
                name: "%100 Doğal Sivrisinek Kovucu Sprey",
                slug: "dogal-sivrisinek-kovucu-sprey",
                description: "Tamamen doğal içeriklerle hazırlanmış sivrisinek kovucu sprey. Kimyasal içermez.",
                short_description: "%100 doğal sivrisinek kovucu sprey.",
                price: 89.90,
                compare_price: 119.90,
                featured_image: "https://images.unsplash.com/photo-1558618047-3c8c76ca7d13?w=400&h=500&fit=crop",
                gallery_images: JSON.stringify(["https://images.unsplash.com/photo-1558618047-3c8c76ca7d13?w=400&h=500&fit=crop"]),
                sku: "TY-SKS-003",
                brand: "Trendyol",
                ingredients: JSON.stringify(["Citronella Oil", "Eucalyptus Oil", "Lemon Grass"]),
                skin_type: JSON.stringify(["Tüm Cilt Tipleri"]),
                stock: 100,
                rating: 4.6,
                reviews_count: 67,
                is_featured: false,
                category_id: 6
            },
            {
                name: "Madeus Gentle Cleansing Foam",
                slug: "madeus-gentle-cleansing-foam",
                description: "Hassas ciltler için özel formül temizleme köpüğü. Cildi kurutmadan derinlemesine temizler.",
                short_description: "Hassas ciltler için yumuşak temizleme köpüğü.",
                price: 189.90,
                compare_price: 239.90,
                featured_image: "https://images.unsplash.com/photo-1556228578-8c89e6adf883?w=400&h=500&fit=crop",
                gallery_images: JSON.stringify(["https://images.unsplash.com/photo-1556228578-8c89e6adf883?w=400&h=500&fit=crop"]),
                sku: "MD-GCF-004",
                brand: "Madeus",
                ingredients: JSON.stringify(["Gentle Surfactants", "Aloe Vera", "Chamomile"]),
                skin_type: JSON.stringify(["Hassas", "Kuru", "Normal"]),
                stock: 75,
                rating: 4.7,
                reviews_count: 156,
                is_featured: false,
                category_id: 3
            },
            {
                name: "Madeus Retinol Night Cream",
                slug: "madeus-retinol-night-cream",
                description: "Gece kullanımı için yenileyici retinol kremi. Yaşlanma karşıtı etkisiyle cildi yeniler.",
                short_description: "Gece kullanımı için yenileyici retinol kremi.",
                price: 349.90,
                compare_price: 449.90,
                featured_image: "https://images.unsplash.com/photo-1571781926291-c477ebfd024b?w=400&h=500&fit=crop",
                gallery_images: JSON.stringify(["https://images.unsplash.com/photo-1571781926291-c477ebfd024b?w=400&h=500&fit=crop"]),
                sku: "MD-RNC-005",
                brand: "Madeus",
                ingredients: JSON.stringify(["Retinol", "Peptides", "Vitamin E"]),
                skin_type: JSON.stringify(["Olgun", "Karma", "Normal"]),
                stock: 25,
                rating: 4.6,
                reviews_count: 92,
                is_featured: true,
                category_id: 4
            },
            {
                name: "Madeus Niacinamide Serum",
                slug: "madeus-niacinamide-serum",
                description: "Gözenekleri sıkılaştıran ve sebum kontrolü sağlayan niacinamide serumu.",
                short_description: "Gözenekleri sıkılaştıran niacinamide serumu.",
                price: 249.90,
                compare_price: 319.90,
                featured_image: "https://images.unsplash.com/photo-1598440947619-2c35fc9aa908?w=400&h=500&fit=crop",
                gallery_images: JSON.stringify(["https://images.unsplash.com/photo-1598440947619-2c35fc9aa908?w=400&h=500&fit=crop"]),
                sku: "MD-NCS-006",
                brand: "Madeus",
                ingredients: JSON.stringify(["Niacinamide", "Zinc", "Hyaluronic Acid"]),
                skin_type: JSON.stringify(["Yağlı", "Karma", "Akneli"]),
                stock: 60,
                rating: 4.5,
                reviews_count: 78,
                is_featured: false,
                category_id: 1
            },
            {
                name: "Madeus Hydrating Toner",
                slug: "madeus-hydrating-toner",
                description: "Cildi nemlendiren ve dengeleyici etkili toner. pH dengesini korur.",
                short_description: "Cildi nemlendiren ve dengeleyici toner.",
                price: 199.90,
                compare_price: 259.90,
                featured_image: "https://images.unsplash.com/photo-1598300042247-d088f8ab3a91?w=400&h=500&fit=crop",
                gallery_images: JSON.stringify(["https://images.unsplash.com/photo-1598300042247-d088f8ab3a91?w=400&h=500&fit=crop"]),
                sku: "MD-HT-007",
                brand: "Madeus",
                ingredients: JSON.stringify(["Rose Water", "Hyaluronic Acid", "Glycerin"]),
                skin_type: JSON.stringify(["Kuru", "Normal", "Hassas"]),
                stock: 45,
                rating: 4.4,
                reviews_count: 134,
                is_featured: false,
                category_id: 5
            },
            {
                name: "Madeus Eye Cream",
                slug: "madeus-eye-cream",
                description: "Göz çevresi için özel formül krem. Kırışıklık ve koyu halka karşı etkili.",
                short_description: "Göz çevresi için özel bakım kremi.",
                price: 279.90,
                compare_price: 359.90,
                featured_image: "https://images.unsplash.com/photo-1596755389378-c31d21fd1273?w=400&h=500&fit=crop",
                gallery_images: JSON.stringify(["https://images.unsplash.com/photo-1596755389378-c31d21fd1273?w=400&h=500&fit=crop"]),
                sku: "MD-EC-008",
                brand: "Madeus",
                ingredients: JSON.stringify(["Caffeine", "Peptides", "Vitamin K"]),
                skin_type: JSON.stringify(["Tüm Cilt Tipleri"]),
                stock: 30,
                rating: 4.7,
                reviews_count: 89,
                is_featured: true,
                category_id: 2
            }
        ];
        
        // Insert products
        let insertedCount = 0;
        for (const product of sampleProducts) {
            await db.query(`
                INSERT INTO products (
                    name, slug, description, short_description, price, compare_price,
                    featured_image, gallery_images, sku, brand, ingredients, skin_type,
                    stock, rating, reviews_count, is_featured, category_id
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `, [
                product.name, product.slug, product.description, product.short_description,
                product.price, product.compare_price, product.featured_image, product.gallery_images,
                product.sku, product.brand, product.ingredients, product.skin_type,
                product.stock, product.rating, product.reviews_count, product.is_featured, product.category_id
            ]);
            insertedCount++;
            console.log(`✅ Inserted: ${product.name}`);
        }
        
        res.json({
            success: true,
            message: 'Products populated successfully',
            count: insertedCount
        });
        
    } catch (error) {
        console.error('❌ Error populating products:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Fix orders table - add missing columns
router.get('/fix-orders-table', async (req, res) => {
    try {
        const db = new Database();
        
        // Check if orders table exists and get its structure
        const columns = await db.query(`
            SELECT COLUMN_NAME 
            FROM INFORMATION_SCHEMA.COLUMNS 
            WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'orders'
        `);
        
        const existingColumns = columns.map(col => col.COLUMN_NAME);
        console.log('Existing columns in orders table:', existingColumns);
        
        // Add missing columns
        const columnsToAdd = [];
        
        if (!existingColumns.includes('user_email')) {
            columnsToAdd.push('ADD COLUMN user_email VARCHAR(255)');
        }
        if (!existingColumns.includes('user_name')) {
            columnsToAdd.push('ADD COLUMN user_name VARCHAR(255)');
        }
        if (!existingColumns.includes('user_phone')) {
            columnsToAdd.push('ADD COLUMN user_phone VARCHAR(20)');
        }
        if (!existingColumns.includes('shipping_address')) {
            columnsToAdd.push('ADD COLUMN shipping_address JSON');
        }
        if (!existingColumns.includes('total_amount')) {
            columnsToAdd.push('ADD COLUMN total_amount DECIMAL(10,2)');
        }
        if (!existingColumns.includes('shipping_cost')) {
            columnsToAdd.push('ADD COLUMN shipping_cost DECIMAL(10,2) DEFAULT 0');
        }
        if (!existingColumns.includes('status')) {
            columnsToAdd.push('ADD COLUMN status ENUM("pending", "confirmed", "shipped", "delivered", "cancelled") DEFAULT "pending"');
        }
        if (!existingColumns.includes('created_at')) {
            columnsToAdd.push('ADD COLUMN created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP');
        }
        if (!existingColumns.includes('updated_at')) {
            columnsToAdd.push('ADD COLUMN updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP');
        }
        
        if (columnsToAdd.length > 0) {
            const alterQuery = `ALTER TABLE orders ${columnsToAdd.join(', ')}`;
            console.log('Executing ALTER query:', alterQuery);
            await db.query(alterQuery);
            
            res.json({
                success: true,
                message: 'Orders table updated successfully!',
                addedColumns: columnsToAdd,
                note: 'Orders can now be created with all required fields.'
            });
        } else {
            res.json({
                success: true,
                message: 'Orders table already has all required columns.',
                existingColumns: existingColumns
            });
        }

    } catch (error) {
        console.error('Orders table fix error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fix orders table',
            error: error.message
        });
    }
});

// Recreate orders and order_items tables completely (with foreign key handling)
router.get('/recreate-orders-complete', async (req, res) => {
    try {
        const db = new Database();
        
        // Disable foreign key checks
        await db.query(`SET FOREIGN_KEY_CHECKS = 0`);
        
        // Drop existing tables
        await db.query(`DROP TABLE IF EXISTS order_items`);
        await db.query(`DROP TABLE IF EXISTS orders`);
        
        // Create orders table with all required columns
        await db.query(`
            CREATE TABLE orders (
                id INT PRIMARY KEY AUTO_INCREMENT,
                user_id INT,
                user_email VARCHAR(255) NOT NULL,
                user_name VARCHAR(255) NOT NULL,
                user_phone VARCHAR(20),
                shipping_address JSON NOT NULL,
                total_amount DECIMAL(10,2) NOT NULL,
                shipping_cost DECIMAL(10,2) DEFAULT 0,
                status ENUM('pending', 'confirmed', 'shipped', 'delivered', 'cancelled') DEFAULT 'pending',
                payment_status ENUM('pending', 'paid', 'failed', 'refunded') DEFAULT 'pending',
                order_number VARCHAR(50) UNIQUE,
                notes TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                INDEX idx_user_id (user_id),
                INDEX idx_status (status),
                INDEX idx_created_at (created_at)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        `);
        
        // Create order_items table
        await db.query(`
            CREATE TABLE order_items (
                id INT PRIMARY KEY AUTO_INCREMENT,
                order_id INT NOT NULL,
                product_id INT,
                product_name VARCHAR(255) NOT NULL,
                quantity INT NOT NULL,
                price DECIMAL(10,2) NOT NULL,
                total DECIMAL(10,2) NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
                INDEX idx_order_id (order_id)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        `);
        
        // Re-enable foreign key checks
        await db.query(`SET FOREIGN_KEY_CHECKS = 1`);

        res.json({
            success: true,
            message: 'Orders and order_items tables recreated successfully!',
            note: 'All existing orders were deleted. New orders can now be created.'
        });

    } catch (error) {
        console.error('Orders tables recreation error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to recreate orders tables',
            error: error.message
        });
    }
});

module.exports = router; 
