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
        id, name, slug, description, short_description as shortDescription,
        price, compare_price as originalPrice, featured_image as mainImage,
        gallery_images as images, sku, brand, ingredients, skin_type as skinType,
        stock, rating, reviews_count as reviewCount, is_featured as isFeatured,
        created_at, updated_at
      FROM products 
      WHERE is_active = TRUE
    `;
    
    const values = [];
    const searchConditions = [];

    if (filters.category) {
      query += ` AND brand = ?`; // Assuming category is stored in brand column
      values.push(filters.category);
    }
    
    if (filters.skinType) {
        query += ` AND JSON_CONTAINS(skin_type, JSON_QUOTE(?))`;
        values.push(filters.skinType);
    }
    
    if (filters.minPrice) {
        query += ` AND price >= ?`;
        values.push(parseFloat(filters.minPrice));
    }

    if (filters.maxPrice) {
        query += ` AND price <= ?`;
        values.push(parseFloat(filters.maxPrice));
    }

    if (filters.featured === 'true') {
      query += ` AND is_featured = TRUE`;
    }
    
    if (filters.bestSeller === 'true') {
        query += ` AND rating >= 4.5`; // Best seller logic
    }
    
    if (filters.isNew === 'true') {
        query += ` AND created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)`; // New product logic
    }

    if (filters.search) {
        const searchTerm = `%${filters.search}%`;
        searchConditions.push(`name LIKE ?`);
        searchConditions.push(`description LIKE ?`);
        values.push(searchTerm, searchTerm);
    }

    if(searchConditions.length > 0) {
        query += ` AND (${searchConditions.join(' OR ')})`;
    }

    // Cloning query for total count before adding order and limit
    let countQuery = query;
    let countValues = [...values];

    // Sorting
    const sortBy = filters.sortBy || 'name';
    const order = filters.order === 'desc' ? 'DESC' : 'ASC';
    // Whitelist sortBy to prevent SQL injection
    const allowedSortBy = ['name', 'price', 'created_at', 'rating'];
    if (allowedSortBy.includes(sortBy)) {
        query += ` ORDER BY ${sortBy} ${order}`;
    } else {
        query += ` ORDER BY name ASC`; // Default sort
    }

    // Pagination
    const limit = Math.max(1, parseInt(filters.limit) || 10);
    const offset = Math.max(0, parseInt(filters.offset) || 0);
    query += ` LIMIT ${limit} OFFSET ${offset}`;

    // Execute both queries
    const countResultQuery = countQuery.replace(/SELECT .*? FROM/, 'SELECT COUNT(*) as total FROM');
    const [totalResult, results] = await Promise.all([
        db.query(countResultQuery, countValues),
        db.query(query, values)
    ]);
    
    const total = totalResult[0].total;
    
    // Parse JSON fields and format output
    const products = results.map(p => ({
      ...p,
      images: JSON.parse(p.images || '[]'),
      ingredients: JSON.parse(p.ingredients || '[]'),
      skinType: JSON.parse(p.skinType || '[]'),
      discount: p.originalPrice ? Math.round(((p.originalPrice - p.price) / p.originalPrice) * 100) : 0,
      isNew: (new Date(p.created_at) > new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)),
      isBestSeller: p.rating >= 4.5
    }));

    return { products, total };

  } catch (error) {
    console.error('❌ Error getting products from database:', error);
    throw error; // Re-throw to be caught by the route handler
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
