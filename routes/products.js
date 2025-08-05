const express = require('express');
const { Database } = require('../config/database');

const router = express.Router();

// Test endpoint - ürünleri debug etmek için
router.get('/debug', async (req, res) => {
  try {
    console.log('🔍 Products debug endpoint çağrıldı');
    
    const db = new Database();
    
    // Database bağlantısını test et
    const connectionTest = await db.query('SELECT 1 as test');
    console.log('✅ Database bağlantısı:', connectionTest[0]);
    
    // Products tablosunu kontrol et
    const tableCheck = await db.query(`
      SELECT TABLE_NAME 
      FROM INFORMATION_SCHEMA.TABLES 
      WHERE TABLE_NAME = 'products'
    `);
    console.log('📋 Products tablosu mevcut mu:', tableCheck.length > 0);
    
    if (tableCheck.length > 0) {
      // Ürün sayısını kontrol et
      const countResult = await db.query('SELECT COUNT(*) as count FROM products');
      console.log('📊 Toplam ürün sayısı:', countResult[0].count);
      
      // İlk 5 ürünü listele
      const products = await db.query('SELECT id, name, price, is_active FROM products LIMIT 5');
      console.log('📦 İlk 5 ürün:', products);
      
      res.json({
        success: true,
        database_connection: connectionTest[0],
        table_exists: tableCheck.length > 0,
        total_products: countResult[0].count,
        sample_products: products
      });
    } else {
      res.json({
        success: false,
        error: 'Products tablosu bulunamadı'
      });
    }
    
  } catch (error) {
    console.error('❌ Debug endpoint error:', error);
    res.json({
      success: false,
      error: error.message
    });
  }
});

// ===========================================
// HELPER FUNCTIONS
// ===========================================

async function getProductsFromDatabase(filters = {}) {
  try {
    let query = `
      SELECT 
        id, name, price, image_url, gallery_images, stock, is_active, brand, category, 
        rating, reviews_count, trendyol_url, trendyol_rating, trendyol_review_count, trendyol_last_update,
        created_at, updated_at
      FROM products 
      WHERE is_active = TRUE
    `;
    const values = [];
    const searchConditions = [];
    
    if (filters.category) {
      query += ` AND brand = ?`;
      values.push(filters.category);
    }
    
    if (filters.search) {
      const searchTerm = `%${filters.search}%`;
      searchConditions.push(`name LIKE ?`);
      values.push(searchTerm);
    }
    
    if(searchConditions.length > 0) {
      query += ` AND (${searchConditions.join(' OR ')})`;
    }
    
    // Sorting
    query += ` ORDER BY name ASC`;
    
    // Pagination
    const limit = Math.max(1, parseInt(filters.limit) || 50);
    const offset = Math.max(0, parseInt(filters.offset) || 0);
    query += ` LIMIT ${limit} OFFSET ${offset}`;
    
    console.log('🔍 Products query:', query);
    console.log('🔍 Query values:', values);
    
    // Execute query
    const results = values.length > 0 ? await db.query(query, values) : await db.query(query);
    console.log('📦 Query results:', results.length);
    
    // Toplam ürün sayısı
    const totalResult = await db.query('SELECT COUNT(*) as total FROM products WHERE is_active = TRUE');
    const total = totalResult[0].total;
    
    // Her ürünün gallery_images alanını array olarak döndür
    const products = results.map(p => ({
      ...p,
      gallery_images: (() => {
        try {
          if (!p.gallery_images || p.gallery_images === 'null' || p.gallery_images === '') return [];
          return Array.isArray(p.gallery_images) ? p.gallery_images : JSON.parse(p.gallery_images);
        } catch (e) {
          console.warn('Gallery images parse error:', e);
          return [];
        }
      })()
    }));
    
    console.log('📦 Final products count:', products.length);
    return { products, total };
    
  } catch (error) {
    console.error('❌ Error getting products from database:', error);
    // Hata durumunda boş array döndür
    return { products: [], total: 0 };
  }
}

async function getProductById(id) {
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

    return {
        ...product,
        images: (() => {
            try {
                if (!product.images || product.images === 'null' || product.images === '') return [];
                return Array.isArray(product.images) ? product.images : JSON.parse(product.images);
            } catch (e) {
                return [];
            }
        })(),
        gallery_images: (() => {
            try {
                if (!product.gallery_images || product.gallery_images === 'null' || product.gallery_images === '') return [];
                return Array.isArray(product.gallery_images) ? product.gallery_images : JSON.parse(product.gallery_images);
            } catch (e) {
                return [];
            }
        })(),
        ingredients: (() => {
            try {
                if (!product.ingredients || product.ingredients === 'null' || product.ingredients === '') return [];
                return Array.isArray(product.ingredients) ? product.ingredients : JSON.parse(product.ingredients);
            } catch (e) {
                return [];
            }
        })(),
        skinType: (() => {
            try {
                if (!product.skinType || product.skinType === 'null' || product.skinType === '') return [];
                return Array.isArray(product.skinType) ? product.skinType : JSON.parse(product.skinType);
            } catch (e) {
                return [];
            }
        })(),
        discount: product.originalPrice ? Math.round(((product.originalPrice - product.price) / product.originalPrice) * 100) : 0,
    };
}

async function getRelatedProducts(productId, categoryId) {
    const sql = `
        SELECT id, name, slug, price, compare_price as originalPrice, featured_image as mainImage, rating
        FROM products 
        WHERE category_id = ? AND id != ? AND is_active = TRUE
        LIMIT 4
    `;
    return db.findMany(sql, [categoryId, productId]);
}

// ===========================================
// PRODUCT ROUTES
// ===========================================

// GET /api/products - Get all products with filtering, sorting, and pagination
router.get('/', async (req, res, next) => {
  try {
    console.log('🌐 Ana site products API çağrıldı');
    
    const db = new Database();
    const { limit = 50, offset = 0 } = req.query;
    
    // Admin panel ile aynı query'yi kullan
    const products = await db.query(`
      SELECT 
        p.id, p.name, p.price, p.stock, p.image_url, p.is_active, p.created_at, p.updated_at, p.brand, p.category,
        p.description, p.original_price, p.gallery_images, p.show_in_homepage, p.show_in_popular, p.show_in_bestsellers, p.show_in_featured,
        p.rating, p.reviews_count
      FROM products p
      WHERE p.is_active = TRUE
      ORDER BY p.created_at DESC
      LIMIT ${limit} OFFSET ${offset}
    `);
    
    console.log('📦 Ana site products bulundu:', products.length);
    
    // Gallery images'ı parse et
    const processedProducts = products.map(product => {
      // Gallery images'ı parse et
      if (product.gallery_images) {
        try {
          if (typeof product.gallery_images === 'string') {
            const parsed = JSON.parse(product.gallery_images);
            if (Array.isArray(parsed)) {
              product.gallery_images = parsed;
            }
          }
        } catch (error) {
          console.warn('Gallery images parse error for product', product.id, ':', error);
          product.gallery_images = [];
        }
      } else {
        product.gallery_images = [];
      }
      
      return product;
    });
    
    console.log('📦 İşlenmiş ürünler:', processedProducts.length);
    
    // Frontend'in beklediği format: direkt products array'i
    res.json(processedProducts);
    
  } catch (error) {
    console.error('❌ Ana site products API error:', error);
    // Hata durumunda boş array döndür
    res.json([]);
  }
});

// GET /api/products/featured/list - Get featured products
router.get('/featured/list', async (req, res, next) => {
  try {
    const { limit = 8 } = req.query;
    const { products } = await getProductsFromDatabase({ featured: 'true', limit });
    res.json({ 
      success: true,
      count: products.length,
      products: products 
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/products/bestsellers/list - Get best-selling products
router.get('/bestsellers/list', async (req, res, next) => {
  try {
    const { limit = 8 } = req.query;
    const { products } = await getProductsFromDatabase({ bestSeller: 'true', limit });
    res.json({ 
      success: true,
      count: products.length,
      products: products 
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/products/categories/list - Get all unique categories
router.get('/categories/list', async (req, res, next) => {
  try {
    const results = await db.query("SELECT DISTINCT JSON_UNQUOTE(JSON_EXTRACT(p.value, '$')) as category FROM products, JSON_TABLE(products.skin_type, '$[*]' COLUMNS(value VARCHAR(255) PATH '$')) as p WHERE products.is_active = TRUE ORDER BY category");
    const categories = results.map(r => r.category);
    res.json({ success: true, categories });
  } catch (error) {
    next(error);
  }
});

// GET /api/products/brands/list - Get all unique brands
router.get('/brands/list', async (req, res, next) => {
  try {
    const results = await db.query('SELECT DISTINCT brand FROM products WHERE is_active = TRUE ORDER BY brand');
    const brands = results.map(r => r.brand);
    res.json({ success: true, brands });
  } catch (error) {
    next(error);
  }
});

// POST /api/products - Ürün ekle
router.post('/', async (req, res) => {
  try {
    const { name, price, gallery_images = [] } = req.body;
    if (!Array.isArray(gallery_images) || gallery_images.length > 6) {
      return res.status(400).json({ error: 'En fazla 6 görsel URL girilebilir.' });
    }
    const product = await db.query(
      `INSERT INTO products (name, price, gallery_images, created_at, updated_at) VALUES (?, ?, ?, NOW(), NOW())`,
      [name, price, JSON.stringify(gallery_images)]
    );
    res.json({ success: true, product });
  } catch (err) {
    res.status(500).json({ error: 'Ürün eklenirken hata oluştu.' });
  }
});

// PUT /api/products/:id - Ürün güncelle
router.put('/:id', async (req, res) => {
  try {
    const { name, price, gallery_images = [] } = req.body;
    if (!Array.isArray(gallery_images) || gallery_images.length > 6) {
      return res.status(400).json({ error: 'En fazla 6 görsel URL girilebilir.' });
    }
    await db.query(
      `UPDATE products SET name = ?, price = ?, gallery_images = ?, updated_at = NOW() WHERE id = ?`,
      [name, price, JSON.stringify(gallery_images), req.params.id]
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Ürün güncellenirken hata oluştu.' });
  }
});

// GET /api/products/:id - Tek ürün çek
router.get('/:id', async (req, res, next) => {
  try {
    const productId = parseInt(req.params.id);
    if (isNaN(productId)) {
      return res.status(400).json({ success: false, error: 'Invalid product ID' });
    }
    const sql = `SELECT * FROM products WHERE id = ? AND is_active = TRUE`;
    const result = await db.query(sql, [productId]);
    if (!result || result.length === 0) {
      return res.status(404).json({ success: false, error: 'Product not found' });
    }
    const product = result[0];
    product.gallery_images = (() => {
      try {
        if (!product.gallery_images || product.gallery_images === 'null' || product.gallery_images === '') return [];
        return Array.isArray(product.gallery_images) ? product.gallery_images : JSON.parse(product.gallery_images);
      } catch (e) {
        return [];
      }
    })();
    res.json({ success: true, product });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
