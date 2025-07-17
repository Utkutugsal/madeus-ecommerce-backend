const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { Database } = require('../config/database');
const multer = require('multer');
const path = require('path');

// Trendyol rating çekme sistemi
const axios = require('axios');
const cheerio = require('cheerio');

// Trendyol'dan rating çekme fonksiyonu
async function fetchTrendyolRating(url) {
    try {
        // User-Agent ve headers ekle (bot gibi görünmemek için)
        const response = await axios.get(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
                'Accept-Language': 'tr-TR,tr;q=0.9,en;q=0.8',
                'Accept-Encoding': 'gzip, deflate, br',
                'Connection': 'keep-alive',
                'Upgrade-Insecure-Requests': '1'
            },
            timeout: 10000 // 10 saniye timeout
        });

        const $ = cheerio.load(response.data);
        
        // Trendyol'daki rating elementlerini bul (CSS selector'ları güncellenmeli)
        let rating = 0;
        let reviewCount = 0;
        
        // Farklı rating selector'larını dene
        const ratingSelectors = [
            '.rating-score',
            '.average-rating',
            '.product-rating .rating',
            '[data-testid="rating-score"]',
            '.stars-wrapper .rating-score'
        ];
        
        const reviewSelectors = [
            '.rating-count',
            '.review-count',
            '.total-review-count',
            '[data-testid="review-count"]'
        ];
        
        // Rating'i bulmaya çalış
        for (const selector of ratingSelectors) {
            const ratingElement = $(selector).first();
            if (ratingElement.length) {
                const ratingText = ratingElement.text().trim();
                const parsedRating = parseFloat(ratingText.replace(',', '.'));
                if (!isNaN(parsedRating) && parsedRating > 0) {
                    rating = parsedRating;
                    break;
                }
            }
        }
        
        // Review sayısını bulmaya çalış
        for (const selector of reviewSelectors) {
            const reviewElement = $(selector).first();
            if (reviewElement.length) {
                const reviewText = reviewElement.text().trim();
                const parsedCount = parseInt(reviewText.replace(/[^\d]/g, ''));
                if (!isNaN(parsedCount) && parsedCount > 0) {
                    reviewCount = parsedCount;
                    break;
                }
            }
        }
        
        return {
            success: true,
            rating: rating,
            reviewCount: reviewCount,
            lastUpdated: new Date()
        };
        
    } catch (error) {
        console.error('Trendyol fetch error:', error.message);
        return {
            success: false,
            error: error.message
        };
    }
}

// Manuel Trendyol rating güncelleme endpoint'i
async function updateTrendyolRatings(productIds) {
    try {
        const db = new Database();
        
        // Trendyol URL'si olan ürünleri çek
        let sql = 'SELECT id, name, trendyol_url FROM products WHERE trendyol_url IS NOT NULL AND trendyol_url != ""';
        let params = [];
        
        if (productIds && productIds.length > 0) {
            sql += ' AND id IN (' + productIds.map(() => '?').join(',') + ')';
            params = productIds;
        }
        
        const products = await db.query(sql, params);
        
        if (products.length === 0) {
            console.log('Güncellenecek ürün bulunamadı');
            return {
                success: true,
                message: 'Güncellenecek ürün bulunamadı',
                updated: 0
            };
        }
        
        let updatedCount = 0;
        const results = [];
        
        // Her ürün için rating çek (5 saniye bekleyerek)
        for (const product of products) {
            try {
                console.log(`🔄 ${product.name} için Trendyol rating çekiliyor...`);
                
                const ratingData = await fetchTrendyolRating(product.trendyol_url);
                
                if (ratingData.success && ratingData.rating > 0) {
                    // Veritabanını güncelle
                    await db.query(`
                        UPDATE products 
                        SET rating = ?, reviews_count = ?, trendyol_last_update = NOW() 
                        WHERE id = ?
                    `, [ratingData.rating, ratingData.reviewCount, product.id]);
                    
                    updatedCount++;
                    results.push({
                        id: product.id,
                        name: product.name,
                        rating: ratingData.rating,
                        reviewCount: ratingData.reviewCount,
                        success: true
                    });
                    
                    console.log(`✅ ${product.name}: ${ratingData.rating} ⭐ (${ratingData.reviewCount} yorum)`);
                } else {
                    results.push({
                        id: product.id,
                        name: product.name,
                        success: false,
                        error: ratingData.error || 'Rating bulunamadı'
                    });
                    
                    console.log(`❌ ${product.name}: Rating çekilemedi`);
                }
                
                // 5 saniye bekle (rate limiting)
                if (products.indexOf(product) < products.length - 1) {
                    await new Promise(resolve => setTimeout(resolve, 5000));
                }
                
            } catch (error) {
                console.error(`❌ ${product.name} error:`, error);
                results.push({
                    id: product.id,
                    name: product.name,
                    success: false,
                    error: error.message
                });
            }
        }
        
        return {
            success: true,
            message: `${updatedCount}/${products.length} ürün güncellendi`,
            updated: updatedCount,
            total: products.length,
            results: results
        };
        
    } catch (error) {
        console.error('Trendyol update error:', error);
        return {
            success: false,
            message: 'Trendyol rating güncellemesi başarısız: ' + error.message
        };
    }
}

const router = express.Router();

// Admin credentials (in production, this should be in database)
const ADMIN_CREDENTIALS = {
    username: 'admin',
    password: '$2b$10$aiR7Lt6ejm0s/ra./bDXiOQsWwOXfy2g5TOFlWoubt7jt/Mp.dX0e' // "497D3212e" hashed
};

// Multer storage ayarı
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, path.join(__dirname, '../public/lovable-uploads'));
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + '-' + file.originalname);
  }
});
const upload = multer({ storage: storage });

// Admin login
router.post('/login', async (req, res) => {
    try {
        const { username, password } = req.body;
        
        if (username !== ADMIN_CREDENTIALS.username) {
            return res.status(401).json({ success: false, message: 'Geçersiz kullanıcı adı' });
        }
        
        const isValid = await bcrypt.compare(password, ADMIN_CREDENTIALS.password);
        if (!isValid) {
            return res.status(401).json({ success: false, message: 'Geçersiz şifre' });
        }
        
        const token = jwt.sign(
            { username, role: 'admin' },
            process.env.JWT_SECRET || 'your-secret-key',
            { expiresIn: '24h' }
        );
        
        res.json({
            success: true,
            token,
            user: { username, role: 'admin' }
        });
        
    } catch (error) {
        console.error('Admin login error:', error);
        res.status(500).json({ success: false, message: 'Giriş hatası' });
    }
});

// Admin middleware
const adminAuth = (req, res, next) => {
    const token = req.headers.authorization?.split(' ')[1];
    
    if (!token) {
        return res.status(401).json({ success: false, message: 'Token gerekli' });
    }
    
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
        if (decoded.role !== 'admin') {
            return res.status(403).json({ success: false, message: 'Admin yetkisi gerekli' });
        }
        req.admin = decoded;
        next();
    } catch (error) {
        return res.status(401).json({ success: false, message: 'Geçersiz token' });
    }
};

// Add Trendyol columns to database manually
router.post('/add-trendyol-columns', adminAuth, async (req, res) => {
  const db = new Database();
  
  try {
    console.log('🚀 Trendyol kolonları ekleniyor...');
    
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

// Get dashboard stats
router.get('/dashboard/stats', adminAuth, async (req, res) => {
    try {
        const db = new Database();
        
        // Get basic order statistics
        const orderStats = await db.query(`
            SELECT 
                COUNT(*) as total_orders,
                SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending_orders,
                SUM(CASE WHEN status = 'confirmed' THEN 1 ELSE 0 END) as confirmed_orders,
                SUM(CASE WHEN status = 'shipped' THEN 1 ELSE 0 END) as shipped_orders,
                SUM(CASE WHEN status = 'delivered' THEN 1 ELSE 0 END) as delivered_orders,
                SUM(CASE WHEN status = 'cancelled' THEN 1 ELSE 0 END) as cancelled_orders,
                COALESCE(SUM(total_amount), 0) as total_revenue,
                COALESCE(AVG(total_amount), 0) as avg_order_value
            FROM orders
            WHERE created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
        `);
        
        // Get recent orders
        const recentOrders = await db.query(`
            SELECT 
                o.id, 
                o.order_number, 
                o.user_name, 
                o.total_amount, 
                o.status, 
                o.created_at
            FROM orders o
            ORDER BY o.created_at DESC
            LIMIT 10
        `);
        
        // Add item counts to recent orders
        for (let order of recentOrders) {
            const itemCount = await db.query(`
                SELECT COUNT(*) as count 
                FROM order_items 
                WHERE order_id = ?
            `, [order.id]);
            order.item_count = itemCount[0].count || 0;
        }
        
        // Get top products
        const topProducts = await db.query(`
            SELECT 
                oi.product_name,
                SUM(oi.quantity) as total_sold,
                SUM(oi.total) as total_revenue
            FROM order_items oi
            JOIN orders o ON oi.order_id = o.id
            WHERE o.created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
            GROUP BY oi.product_name
            ORDER BY total_sold DESC
            LIMIT 5
        `);
        
        res.json({
            success: true,
            data: {
                stats: orderStats[0] || {
                    total_orders: 0,
                    pending_orders: 0,
                    confirmed_orders: 0,
                    shipped_orders: 0,
                    delivered_orders: 0,
                    cancelled_orders: 0,
                    total_revenue: 0,
                    avg_order_value: 0
                },
                recentOrders: recentOrders || [],
                topProducts: topProducts || []
            }
        });
        
    } catch (error) {
        console.error('Dashboard stats error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'İstatistikler yüklenemedi',
            error: error.message 
        });
    }
});

// Get all orders with pagination and filters
router.get('/orders', adminAuth, async (req, res) => {
    try {
        const db = new Database();
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        const offset = (page - 1) * limit;
        const status = req.query.status;
        const search = req.query.search;
        
        let whereClause = '';
        let queryParams = [];
        
        if (status && status !== 'all' && status !== '') {
            whereClause = 'WHERE o.status = ?';
            queryParams.push(status);
        }
        
        if (search && search.trim() !== '') {
            whereClause = whereClause ? 
                `${whereClause} AND (o.order_number LIKE ? OR o.user_name LIKE ? OR o.user_email LIKE ?)` :
                'WHERE (o.order_number LIKE ? OR o.user_name LIKE ? OR o.user_email LIKE ?)';
            queryParams.push(`%${search}%`, `%${search}%`, `%${search}%`);
        }
        
        // Simple query without complex GROUP_CONCAT
        const orders = await db.query(`
            SELECT 
                o.id, 
                o.order_number, 
                o.user_name, 
                o.user_email, 
                o.user_phone,
                o.total_amount, 
                o.status, 
                o.cargo_company, 
                o.cargo_tracking_number,
                o.created_at, 
                o.updated_at,
                o.shipping_address
            FROM orders o
            ${whereClause}
            ORDER BY o.created_at DESC
            LIMIT ${limit} OFFSET ${offset}
        `, queryParams);
        
        // Get item counts separately
        for (let order of orders) {
            const itemCount = await db.query(`
                SELECT COUNT(*) as count 
                FROM order_items 
                WHERE order_id = ?
            `, [order.id]);
            order.item_count = itemCount[0].count || 0;
        }
        
        const totalResult = await db.query(`
            SELECT COUNT(DISTINCT o.id) as total 
            FROM orders o
            ${whereClause}
        `, queryParams);
        
        res.json({
            success: true,
            data: {
                orders,
                pagination: {
                    page,
                    limit,
                    total: totalResult[0].total,
                    pages: Math.ceil(totalResult[0].total / limit)
                }
            }
        });
        
    } catch (error) {
        console.error('Admin orders fetch error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Siparişler yüklenemedi',
            error: error.message 
        });
    }
});

// Get order details
router.get('/orders/:orderId', adminAuth, async (req, res) => {
    try {
        const db = new Database();
        const { orderId } = req.params;
        
        // Get order info
        const order = await db.query(`
            SELECT * FROM orders WHERE id = ?
        `, [orderId]);
        
        if (!order || order.length === 0) {
            return res.status(404).json({ success: false, message: 'Sipariş bulunamadı' });
        }
        
        // Get order items separately
        const items = await db.query(`
            SELECT 
                id,
                product_id,
                product_name,
                quantity,
                price,
                total
            FROM order_items 
            WHERE order_id = ?
        `, [orderId]);
        
        const orderData = order[0];
        orderData.items = items;
        
        res.json({
            success: true,
            data: orderData
        });
        
    } catch (error) {
        console.error('Admin order details error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Sipariş detayları yüklenemedi',
            error: error.message 
        });
    }
});

// Update order
router.put('/orders/:orderId', adminAuth, async (req, res) => {
    try {
        const db = new Database();
        const { orderId } = req.params;
        const { status, cargo_company, cargo_tracking_number } = req.body;
        
        const validStatuses = ['pending', 'confirmed', 'shipped', 'delivered', 'cancelled'];
        if (status && !validStatuses.includes(status)) {
            return res.status(400).json({ success: false, message: 'Geçersiz sipariş durumu' });
        }
        
        const updateFields = [];
        const updateValues = [];
        
        if (status) {
            updateFields.push('status = ?');
            updateValues.push(status);
        }
        
        if (cargo_company !== undefined) {
            updateFields.push('cargo_company = ?');
            updateValues.push(cargo_company);
        }
        
        if (cargo_tracking_number !== undefined) {
            updateFields.push('cargo_tracking_number = ?');
            updateValues.push(cargo_tracking_number);
        }
        
        if (updateFields.length === 0) {
            return res.status(400).json({ success: false, message: 'Güncellenecek alan bulunamadı' });
        }
        
        updateFields.push('updated_at = NOW()');
        updateValues.push(orderId);
        
        await db.query(`
            UPDATE orders 
            SET ${updateFields.join(', ')} 
            WHERE id = ?
        `, updateValues);
        
        const updatedOrder = await db.query('SELECT * FROM orders WHERE id = ?', [orderId]);
        
        res.json({
            success: true,
            message: 'Sipariş başarıyla güncellendi',
            data: updatedOrder[0]
        });
        
    } catch (error) {
        console.error('Admin order update error:', error);
        res.status(500).json({ success: false, message: 'Sipariş güncellenemedi' });
    }
});

// ===========================================
// PRODUCTS MANAGEMENT
// ===========================================

// Get all products
router.get('/products', adminAuth, async (req, res) => {
    try {
        const db = new Database();
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        const offset = (page - 1) * limit;
        const category = req.query.category;
        const search = req.query.search;
        
        console.log('Admin products request:', { page, limit, category, search });
        
        // First check if products table exists
        try {
            const tableCheck = await db.query(`
                SELECT TABLE_NAME 
                FROM INFORMATION_SCHEMA.TABLES 
                WHERE TABLE_NAME = 'products'
            `);
            
            if (tableCheck.length === 0) {
                console.log('Products table does not exist, creating...');
                await db.query(`
                    CREATE TABLE products (
                        id INT AUTO_INCREMENT PRIMARY KEY,
                        name VARCHAR(255) NOT NULL,
                        price DECIMAL(10,2) NOT NULL,
                        category VARCHAR(50) NOT NULL,
                        stock INT DEFAULT 0,
                        image_url TEXT,
                        is_active BOOLEAN DEFAULT TRUE,
                        brand VARCHAR(255),
                        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
                    )
                `);
                // Add sample products
                await db.query(`
                    INSERT INTO products (name, price, category, stock, image_url, is_active, brand) VALUES
                    ('Vitamin C Serum', 299.99, 'serum', 50, '/placeholder.svg', 1, 'Madeus'),
                    ('Hyaluronic Acid Serum', 249.99, 'serum', 30, '/placeholder.svg', 1, 'Madeus'),
                    ('Anti-Aging Cream', 399.99, 'cream', 25, '/placeholder.svg', 1, 'Madeus'),
                    ('Gentle Cleanser', 199.99, 'cleanser', 40, '/placeholder.svg', 1, 'Madeus'),
                    ('Hydrating Mask', 159.99, 'mask', 35, '/placeholder.svg', 1, 'Madeus')
                `);
                console.log('Products table created and sample data inserted');
            }
        } catch (tableError) {
            console.error('Table check/creation error:', tableError);
            return res.status(500).json({ 
                success: false, 
                message: 'Veritabanı tablosu hatası',
                error: tableError.message 
            });
        }
        
        let whereClause = '';
        let queryParams = [];
        
        if (category && category !== 'all' && category !== '') {
            whereClause = 'WHERE category = ?';
            queryParams.push(category);
        }
        
        if (search && search.trim() !== '') {
            whereClause = whereClause ? 
                `${whereClause} AND (name LIKE ?)` :
                'WHERE (name LIKE ?)';
            queryParams.push(`%${search}%`);
        }
        
        // Sadece gerekli alanları çekiyoruz
        const products = await db.query(`
            SELECT 
                id, name, price, stock, image_url, is_active, created_at, updated_at, brand, category
            FROM products
            ${whereClause}
            ORDER BY created_at DESC
            LIMIT ${limit} OFFSET ${offset}
        `, queryParams);
        
        const totalResult = await db.query(`
            SELECT COUNT(*) as total 
            FROM products
            ${whereClause}
        `, queryParams);
        
        console.log('Products found:', products.length);
        
        res.json({
            success: true,
            data: {
                products,
                pagination: {
                    page,
                    limit,
                    total: totalResult[0].total,
                    pages: Math.ceil(totalResult[0].total / limit)
                }
            }
        });
        
    } catch (error) {
        console.error('Admin products fetch error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Ürünler yüklenemedi',
            error: error.message 
        });
    }
});

// Get product by ID
router.get('/products/:productId', adminAuth, async (req, res) => {
    try {
        const db = new Database();
        const { productId } = req.params;
        
        const product = await db.query(`
            SELECT * FROM products WHERE id = ?
        `, [productId]);
        
        if (!product || product.length === 0) {
            return res.status(404).json({ success: false, message: 'Ürün bulunamadı' });
        }
        
        res.json({
            success: true,
            data: product[0]
        });
        
    } catch (error) {
        console.error('Admin product details error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Ürün detayları yüklenemedi',
            error: error.message 
        });
    }
});

// Add new product
router.post('/products', adminAuth, async (req, res) => {
    try {
        const db = new Database();
        const { 
            name, description, price, original_price, 
            category, stock, image_url, gallery_images, brand, is_active
        } = req.body;

        // gallery_images her zaman string olarak kaydedilmeli
        let galleryImagesStr = '[]';
        if (Array.isArray(gallery_images)) {
            galleryImagesStr = JSON.stringify(gallery_images);
        } else if (typeof gallery_images === 'string' && gallery_images.startsWith('[')) {
            galleryImagesStr = gallery_images;
        }

        // Slug oluştur (Türkçe karakterleri değiştir ve URL-friendly yap)
        const createSlug = (text) => {
            return text
                .toLowerCase()
                .replace(/ğ/g, 'g')
                .replace(/ü/g, 'u')
                .replace(/ş/g, 's')
                .replace(/ı/g, 'i')
                .replace(/ö/g, 'o')
                .replace(/ç/g, 'c')
                .replace(/[^a-z0-9]/g, '-')
                .replace(/-+/g, '-')
                .replace(/^-|-$/g, '');
        };

        const slug = createSlug(name || 'urun') + '-' + Date.now();

        // Slug alanını da ekle
        const sql = `
            INSERT INTO products (
                name, slug, description, price, original_price, 
                category, stock, image_url, gallery_images, brand, is_active,
                created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
        `;

        const result = await db.query(sql, [
            name || 'Ürün Adı',
            slug,
            description || '',
            price || 0,
            original_price || null,
            category || 'serum',
            stock || 0,
            image_url || '',
            galleryImagesStr,
            brand || 'MADEUS',
            is_active ? 1 : 0
        ]);

        res.json({
            success: true,
            message: 'Ürün başarıyla eklendi',
            product_id: result.insertId
        });
    } catch (error) {
        console.error('❌ Add product error:', error);
        res.status(500).json({
            success: false,
            message: 'Ürün eklenirken hata oluştu: ' + error.message
        });
    }
});

// Update product
router.put('/products/:id', adminAuth, async (req, res) => {
    try {
        const db = new Database();
        const { id } = req.params;
        const { 
            name, description, price, original_price, 
            category, stock, image_url, gallery_images, brand, is_active,
            show_in_homepage, show_in_popular, show_in_bestsellers, show_in_featured
        } = req.body;

        const updateFields = [];
        const updateValues = [];

        if (name !== undefined) {
            updateFields.push('name = ?');
            updateValues.push(name);
        }
        if (description !== undefined) {
            updateFields.push('description = ?');
            updateValues.push(description);
        }
        if (price !== undefined) {
            updateFields.push('price = ?');
            updateValues.push(price);
        }
        if (original_price !== undefined) {
            updateFields.push('original_price = ?');
            updateValues.push(original_price);
        }
        if (category !== undefined) {
            updateFields.push('category = ?');
            updateValues.push(category);
        }
        if (stock !== undefined) {
            updateFields.push('stock = ?');
            updateValues.push(stock);
        }
        if (image_url !== undefined) {
            updateFields.push('image_url = ?');
            updateValues.push(image_url);
        }
        if (gallery_images !== undefined) {
            let galleryImagesStr = '[]';
            if (Array.isArray(gallery_images)) {
                galleryImagesStr = JSON.stringify(gallery_images);
            } else if (typeof gallery_images === 'string' && gallery_images.startsWith('[')) {
                galleryImagesStr = gallery_images;
            }
            updateFields.push('gallery_images = ?');
            updateValues.push(galleryImagesStr);
        }
        if (brand !== undefined) {
            updateFields.push('brand = ?');
            updateValues.push(brand);
        }
        if (is_active !== undefined) {
            updateFields.push('is_active = ?');
            updateValues.push(is_active ? 1 : 0);
        }
        if (show_in_homepage !== undefined) {
            updateFields.push('show_in_homepage = ?');
            updateValues.push(show_in_homepage ? 1 : 0);
        }
        if (show_in_popular !== undefined) {
            updateFields.push('show_in_popular = ?');
            updateValues.push(show_in_popular ? 1 : 0);
        }
        if (show_in_bestsellers !== undefined) {
            updateFields.push('show_in_bestsellers = ?');
            updateValues.push(show_in_bestsellers ? 1 : 0);
        }
        if (show_in_featured !== undefined) {
            updateFields.push('show_in_featured = ?');
            updateValues.push(show_in_featured ? 1 : 0);
        }

        updateFields.push('updated_at = NOW()');
        updateValues.push(id);

        const sql = `UPDATE products SET ${updateFields.join(', ')} WHERE id = ?`;
        await db.query(sql, updateValues);

        res.json({
            success: true,
            message: 'Ürün başarıyla güncellendi'
        });
    } catch (error) {
        console.error('❌ Update product error:', error);
        res.status(500).json({
            success: false,
            message: 'Ürün güncellenirken hata oluştu'
        });
    }
});

// Delete product
router.delete('/products/:productId', adminAuth, async (req, res) => {
    try {
        const db = new Database();
        const { productId } = req.params;
        
        // Check if product exists
        const product = await db.query('SELECT * FROM products WHERE id = ?', [productId]);
        if (!product || product.length === 0) {
            return res.status(404).json({ success: false, message: 'Ürün bulunamadı' });
        }
        
        // Delete product
        await db.query('DELETE FROM products WHERE id = ?', [productId]);
        
        res.json({
            success: true,
            message: 'Ürün başarıyla silindi'
        });
        
    } catch (error) {
        console.error('Admin product delete error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Ürün silinemedi',
            error: error.message 
        });
    }
});

// Basit fotoğraf yükleme endpoint'i
router.post('/upload', adminAuth, upload.single('image'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ success: false, message: 'Dosya yüklenemedi' });
  }
  const filePath = '/lovable-uploads/' + req.file.filename;
  res.json({ success: true, filePath });
});

// Site ayarları için endpoint'ler ekle
// GET /api/admin/site-settings - Site ayarlarını çek
router.get('/site-settings', adminAuth, async (req, res) => {
    try {
        const db = new Database();
        
        // Site ayarları tablosu var mı kontrol et
        const tableCheck = await db.query(`SHOW TABLES LIKE 'site_settings'`);
        
        if (tableCheck.length === 0) {
            // Tablo yoksa oluştur
            await db.query(`
                CREATE TABLE site_settings (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    setting_key VARCHAR(100) UNIQUE NOT NULL,
                    setting_value TEXT,
                    setting_type ENUM('text', 'image', 'json') DEFAULT 'text',
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
                )
            `);
            
            // Varsayılan ayarları ekle
            await db.query(`
                INSERT INTO site_settings (setting_key, setting_value, setting_type) VALUES
                ('hero_image_1', '', 'image'),
                ('hero_image_2', '', 'image'),
                ('hero_image_3', '', 'image'),
                ('campaign_image_1', '', 'image'),
                ('campaign_image_2', '', 'image'),
                ('brand_logo', '', 'image'),
                ('hero_title', 'Doğal Cilt Bakımının Gücü', 'text'),
                ('hero_subtitle', 'Premium kalitede, doğal içerikli cilt bakım ürünleri ile cildinize en iyi bakımı sağlayın.', 'text')
            `);
        }
        
        const settings = await db.query('SELECT * FROM site_settings ORDER BY setting_key');
        
        // Ayarları key-value formatında dönüştür
        const settingsObj = {};
        settings.forEach(setting => {
            settingsObj[setting.setting_key] = setting.setting_value;
        });
        
        res.json({
            success: true,
            data: settingsObj
        });
        
    } catch (error) {
        console.error('Site settings fetch error:', error);
        res.status(500).json({
            success: false,
            message: 'Site ayarları yüklenemedi: ' + error.message
        });
    }
});

// PUT /api/admin/site-settings - Site ayarlarını güncelle
router.put('/site-settings', adminAuth, async (req, res) => {
    try {
        const db = new Database();
        const settings = req.body;
        
        for (const [key, value] of Object.entries(settings)) {
            await db.query(`
                INSERT INTO site_settings (setting_key, setting_value) 
                VALUES (?, ?)
                ON DUPLICATE KEY UPDATE 
                setting_value = ?, updated_at = NOW()
            `, [key, value, value]);
        }
        
        res.json({
            success: true,
            message: 'Site ayarları güncellendi'
        });
        
    } catch (error) {
        console.error('Site settings update error:', error);
        res.status(500).json({
            success: false,
            message: 'Site ayarları güncellenemedi: ' + error.message
        });
    }
});

// Trendyol rating çekme sistemi
router.post('/update-trendyol-ratings', adminAuth, async (req, res) => {
    try {
        const db = new Database();
        const { productIds } = req.body; // Hangi ürünlerin güncelleneceği
        
        // Trendyol URL'si olan ürünleri çek
        let sql = 'SELECT id, name, trendyol_url FROM products WHERE trendyol_url IS NOT NULL AND trendyol_url != ""';
        let params = [];
        
        if (productIds && productIds.length > 0) {
            sql += ' AND id IN (' + productIds.map(() => '?').join(',') + ')';
            params = productIds;
        }
        
        const products = await db.query(sql, params);
        
        if (products.length === 0) {
            return res.json({
                success: true,
                message: 'Güncellenecek ürün bulunamadı',
                updated: 0
            });
        }
        
        let updatedCount = 0;
        const results = [];
        
        // Her ürün için rating çek (5 saniye bekleyerek)
        for (const product of products) {
            try {
                console.log(`🔄 ${product.name} için Trendyol rating çekiliyor...`);
                
                const ratingData = await fetchTrendyolRating(product.trendyol_url);
                
                if (ratingData.success && ratingData.rating > 0) {
                    // Veritabanını güncelle
                    await db.query(`
                        UPDATE products 
                        SET rating = ?, reviews_count = ?, trendyol_last_update = NOW() 
                        WHERE id = ?
                    `, [ratingData.rating, ratingData.reviewCount, product.id]);
                    
                    updatedCount++;
                    results.push({
                        id: product.id,
                        name: product.name,
                        rating: ratingData.rating,
                        reviewCount: ratingData.reviewCount,
                        success: true
                    });
                    
                    console.log(`✅ ${product.name}: ${ratingData.rating} ⭐ (${ratingData.reviewCount} yorum)`);
                } else {
                    results.push({
                        id: product.id,
                        name: product.name,
                        success: false,
                        error: ratingData.error || 'Rating bulunamadı'
                    });
                    
                    console.log(`❌ ${product.name}: Rating çekilemedi`);
                }
                
                // 5 saniye bekle (rate limiting)
                if (products.indexOf(product) < products.length - 1) {
                    await new Promise(resolve => setTimeout(resolve, 5000));
                }
                
            } catch (error) {
                console.error(`❌ ${product.name} error:`, error);
                results.push({
                    id: product.id,
                    name: product.name,
                    success: false,
                    error: error.message
                });
            }
        }
        
        res.json({
            success: true,
            message: `${updatedCount}/${products.length} ürün güncellendi`,
            updated: updatedCount,
            total: products.length,
            results: results
        });
        
    } catch (error) {
        console.error('Trendyol update error:', error);
        res.status(500).json({
            success: false,
            message: 'Trendyol rating güncellemesi başarısız: ' + error.message
        });
    }
});

module.exports = router; 