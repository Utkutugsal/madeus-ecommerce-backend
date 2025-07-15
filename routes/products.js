const express = require('express');
const { body, query, validationResult } = require('express-validator');
const { Database } = require('../config/database');
const emailService = require('../utils/email');

const router = express.Router();

// Database instance'ını oluştur
const db = new Database();

// ===========================================
// DATABASE FUNCTIONS
// ===========================================

// Database'den ürünleri getirme fonksiyonu
async function getProductsFromDatabase(filters = {}) {
  try {
    let query = `
      SELECT 
        p.id, p.name, p.name as slug, p.description, p.description as shortDescription,
        p.price, p.original_price as originalPrice, p.image_url as mainImage,
        p.image_url as images, p.id as sku, 'Madeus' as brand, p.description as ingredients, 
        'all' as skinType, p.stock, 5.0 as rating, 0 as reviewCount, 
        (p.price < p.original_price) as isFeatured, p.created_at, p.updated_at, 
        p.category as categoryName
      FROM products p
      WHERE p.is_active = TRUE
    `;
    
    const values = [];

    // Filtreleme
    if (filters.category) {
      query += ` AND p.category = ?`;
      values.push(filters.category);
    }
    
    if (filters.search) {
        const searchTerm = `%${filters.search}%`;
        query += ` AND (p.name LIKE ? OR p.description LIKE ?)`;
        values.push(searchTerm, searchTerm);
    }

    if (filters.featured) {
      query += ` AND p.price < p.original_price`;
    }

    if (filters.isNew) {
      // Son 30 gün içinde eklenen ürünleri getir
      query += ` AND p.created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)`;
    }

    if (filters.bestSeller) {
      query += ` AND p.rating >= 4.5`; // Best seller mantığı
    }

    if (filters.minPrice) {
        query += ` AND p.price >= ?`;
        values.push(parseFloat(filters.minPrice));
    }

    if (filters.maxPrice) {
        query += ` AND p.price <= ?`;
        values.push(parseFloat(filters.maxPrice));
    }
    
    if (filters.skinType) {
        // Bu daha karmaşık bir sorgu gerektirir, JSON alanı içinde arama
        // Şimdilik basit bir LIKE ile arayalım
        query += ` AND p.skin_type LIKE ?`;
        values.push(`%${filters.skinType}%`);
    }

    // Toplam ürün sayısı için sorgu (LIMIT/OFFSET olmadan)
    const countQuery = query.replace(/SELECT .*? FROM/, 'SELECT COUNT(*) as total FROM');
    // Count query için aynı values array'inin kopyasını kullan
    const countValues = [...values];
    const countResult = await db.query(countQuery, countValues);
    const total = countResult && countResult.length > 0 ? countResult[0].total : 0;

    // Sıralama
    const sortBy = filters.sortBy || 'created_at';
    const order = filters.order === 'desc' ? 'DESC' : 'ASC';
    query += ` ORDER BY p.${sortBy} ${order}`;

    // Sayfalama - LIMIT ve OFFSET'i doğrudan query'ye ekle
    const limit = Math.max(1, parseInt(filters.limit) || 10);
    const offset = Math.max(0, parseInt(filters.offset) || 0);
    query += ` LIMIT ${limit} OFFSET ${offset}`;
    
    // Products query için sadece values array'ini kullan
    console.log('🔍 Products query:', query);
    console.log('🔍 Products params:', values);
    
    const results = await db.query(query, values);
    
    // JSON alanlarını parse et
    const products = results.map(product => {
      // Güvenli JSON parsing fonksiyonu
      const safeJsonParse = (jsonString, defaultValue = []) => {
        try {
          if (!jsonString || jsonString === 'null' || jsonString === '') {
            return defaultValue;
          }
          return JSON.parse(jsonString);
        } catch (error) {
          console.log(`⚠️ JSON parse hatası: ${error.message}, değer: ${jsonString}`);
          return defaultValue;
        }
      };

      return {
        ...product,
        images: safeJsonParse(product.images),
        ingredients: safeJsonParse(product.ingredients),
        skinType: safeJsonParse(product.skinType),
        discount: product.originalPrice ? 
          Math.round(((product.originalPrice - product.price) / product.originalPrice) * 100) : 0,
        tags: [], // Tags veritabanında ayrı bir tabloda olabilir, şimdilik boş
        benefits: [],
        features: [],
        isBestSeller: product.rating >= 4.5,
        isNew: new Date(product.created_at) > new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) // Son 30 gün
      };
    });

    return {
        products,
        total,
        limit,
        offset,
        hasMore: (offset + limit) < total
    };

  } catch (error) {
    console.error('❌ Database\'den ürün getirme hatası:', error);
    return { products: [], total: 0, limit: 10, offset: 0, hasMore: false };
  }
}

async function getProductById(id) {
    try {
        const sql = `
            SELECT 
                id, name, slug, description, short_description as shortDescription,
                price, compare_price as originalPrice, featured_image as mainImage,
                gallery_images as images, sku, brand, ingredients, skin_type as skinType,
                stock, rating, reviews_count as reviewCount, is_featured as isFeatured,
                created_at, updated_at, category_id
            FROM products 
            WHERE id = ? AND is_active = TRUE
        `;
        const product = await db.findOne(sql, [id]);

        if (!product) return null;

        // Güvenli JSON parsing fonksiyonu
        const safeJsonParse = (jsonString, defaultValue = []) => {
            try {
                if (!jsonString || jsonString === 'null' || jsonString === '') {
                    return defaultValue;
                }
                return JSON.parse(jsonString);
            } catch (error) {
                console.log(`⚠️ JSON parse hatası: ${error.message}, değer: ${jsonString}`);
                return defaultValue;
            }
        };

        // Parse JSON fields
        return {
            ...product,
            images: safeJsonParse(product.images),
            ingredients: safeJsonParse(product.ingredients),
            skinType: safeJsonParse(product.skinType),
            discount: product.originalPrice ? 
                Math.round(((product.originalPrice - product.price) / product.originalPrice) * 100) : 0,
            tags: [],
            benefits: [],
            features: [],
            isBestSeller: product.rating >= 4.5,
            isNew: new Date(product.created_at) > new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
        };
    } catch (error) {
        console.error(`Error fetching product ${id}:`, error);
        return null;
    }
}

async function getRelatedProducts(productId, categoryId) {
    try {
        const sql = `
            SELECT 
                id, name, slug, price, compare_price as originalPrice, featured_image as mainImage
            FROM products 
            WHERE category_id = ? AND id != ? AND is_active = TRUE
            LIMIT 4
        `;
        const products = await db.findMany(sql, [categoryId, productId]);
        return products;
    } catch (error) {
        console.error(`Error fetching related products for ${productId}:`, error);
        return [];
    }
}

// ===========================================
// PRODUCT ROUTES
// ===========================================

// GET /api/products - Tüm ürünleri getir
router.get('/', async (req, res) => {
  try {
    const data = await getProductsFromDatabase(req.query);
    
    res.json({
      success: true,
      data
    });

  } catch (error) {
    console.error('Ürünler getirilirken hata:', error);
    res.status(500).json({
      success: false,
      message: 'Ürünler getirilirken hata oluştu',
      error: error.message
    });
  }
});

// Get featured products (MUST be before /:id route)
router.get('/featured/list', async (req, res) => {
  try {
    const { limit = 8 } = req.query;
    const { products } = await getProductsFromDatabase({ featured: 'true', limit });
    
    res.json({ 
      success: true,
      count: products.length,
      products: products 
    });
  } catch (error) {
    console.error('Featured products error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get best sellers (MUST be before /:id route)
router.get('/bestsellers/list', async (req, res) => {
  try {
    const { limit = 8 } = req.query;
    const { products } = await getProductsFromDatabase({ bestSeller: 'true', limit });
    
    res.json({ 
      success: true,
      count: products.length,
      products: products 
    });
  } catch (error) {
    console.error('Best sellers error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get categories
router.get('/categories/list', async (req, res) => {
  try {
    const results = await db.query('SELECT DISTINCT brand as category FROM products WHERE is_active = TRUE ORDER BY brand');
    const categories = results.map(r => r.category);
    res.json({ categories });
  } catch (error) {
    console.error('Categories error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get brands
router.get('/brands/list', async (req, res) => {
  try {
    const results = await db.query('SELECT DISTINCT brand FROM products WHERE is_active = TRUE ORDER BY brand');
    const brands = results.map(r => r.brand);
    res.json({ brands });
  } catch (error) {
    console.error('Brands error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get product by ID
router.get('/:id', async (req, res) => {
  try {
    const productId = parseInt(req.params.id);
    if (isNaN(productId)) {
        return res.status(400).json({ error: 'Invalid product ID' });
    }

    const product = await getProductById(productId);

    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    // Get related products (same category)
    const relatedProducts = await getRelatedProducts(product.id, product.category_id);

    res.json({
      success: true,
      product,
      relatedProducts
    });

  } catch (error) {
    console.error('Product fetch error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get products by category
router.get('/category/:category', async (req, res) => {
  try {
    const { category } = req.params;
    const { limit = 8 } = req.query;

    const { products } = await getProductsFromDatabase({ category, limit });

    res.json({ success: true, products });
  } catch (error) {
    console.error('Category products error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Search products
router.get('/search/:query', async (req, res) => {
  try {
    const { query } = req.params;
    const { products } = await getProductsFromDatabase({ search: query });
    res.json({ success: true, products: products });
  } catch (error) {
    console.error('Search error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create order endpoint
router.post('/orders', async (req, res) => {
    try {
        const db = new Database();
        const { 
            user_id, 
            user_email, 
            user_name, 
            user_phone,
            shipping_address,
            items, 
            total_amount,
            shipping_cost 
        } = req.body;

        // Validate required fields
        if (!user_email || !user_name || !items || !total_amount) {
            return res.status(400).json({
                success: false,
                message: 'Eksik bilgiler: email, isim, ürünler ve toplam tutar gerekli'
            });
        }

        // Create order
        const orderResult = await db.query(
            `INSERT INTO orders (
                user_id, user_email, user_name, user_phone,
                shipping_address, total_amount, shipping_cost,
                status, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, 'pending', NOW())`,
            [
                user_id || null,
                user_email,
                user_name,
                user_phone || '',
                JSON.stringify(shipping_address),
                total_amount,
                shipping_cost || 0
            ]
        );

        const orderId = orderResult.insertId;

        // Add order items
        for (const item of items) {
            await db.query(
                `INSERT INTO order_items (order_id, product_id, product_name, quantity, price, total) 
                 VALUES (?, ?, ?, ?, ?, ?)`,
                [orderId, item.id, item.name, item.quantity, item.price, item.quantity * item.price]
            );
        }

        // Send email notification to admin
        const orderDetails = {
            orderId,
            customerName: user_name,
            customerEmail: user_email,
            customerPhone: user_phone,
            items,
            totalAmount: total_amount,
            shippingCost: shipping_cost,
            shippingAddress: shipping_address
        };

        await emailService.sendOrderNotification(orderDetails);

        res.json({
            success: true,
            message: 'Sipariş başarıyla oluşturuldu',
            orderId,
            data: {
                orderId,
                status: 'pending',
                total: total_amount
            }
        });

    } catch (error) {
        console.error('Order creation error:', error);
        res.status(500).json({
            success: false,
            message: 'Sipariş oluşturulurken hata oluştu',
            error: error.message
        });
    }
});

module.exports = router; 
