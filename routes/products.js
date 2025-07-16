const express = require('express');
const { db } = require('../config/database');

const router = express.Router();

// ===========================================
// HELPER FUNCTIONS
// ===========================================

async function getProductsFromDatabase(filters = {}) {
  try {
    let query = `
      SELECT 
        id, name, price, image_url, stock, is_active, brand, category, created_at, updated_at
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
    const limit = Math.max(1, parseInt(filters.limit) || 10);
    const offset = Math.max(0, parseInt(filters.offset) || 0);
    query += ` LIMIT ${limit} OFFSET ${offset}`;
    // Execute query
    const results = values.length > 0 ? await db.query(query, values) : await db.query(query);
    // Toplam ürün sayısı
    const totalResult = await db.query('SELECT COUNT(*) as total FROM products WHERE is_active = TRUE');
    const total = totalResult[0].total;
    return { products: results, total };
  } catch (error) {
    console.error('❌ Error getting products from database:', error);
    throw error;
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
        images: JSON.parse(product.images || '[]'),
        ingredients: JSON.parse(product.ingredients || '[]'),
        skinType: JSON.parse(product.skinType || '[]'),
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
    const { limit = 10, offset = 0 } = req.query;
    const { products, total } = await getProductsFromDatabase(req.query);
    res.json({
      success: true,
      data: {
        products,
        total,
        limit: parseInt(limit),
        offset: parseInt(offset),
        hasMore: (parseInt(offset) + parseInt(limit)) < total
      }
    });
  } catch (error) {
    next(error);
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

// GET /api/products/:id - Get a single product by ID
router.get('/:id', async (req, res, next) => {
  try {
    const productId = parseInt(req.params.id);
    if (isNaN(productId)) {
        return res.status(400).json({ success: false, error: 'Invalid product ID' });
    }

    const product = await getProductById(productId);
    if (!product) {
      return res.status(404).json({ success: false, error: 'Product not found' });
    }

    const relatedProducts = await getRelatedProducts(product.id, product.category_id);
    res.json({ success: true, product, relatedProducts });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
