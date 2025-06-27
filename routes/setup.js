const express = require('express');
const Database = require('../config/database');

const router = express.Router();

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

module.exports = router; 