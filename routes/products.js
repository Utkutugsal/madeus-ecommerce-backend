const express = require('express');
const { body, query, validationResult } = require('express-validator');
const db = require('../config/database');

const router = express.Router();

// ===========================================
// PRODUCT ROUTES
// ===========================================

// Get all products with filters
router.get('/', async (req, res) => {
    try {
        const {
            page = 1,
            limit = 12,
            category,
            brand,
            min_price,
            max_price,
            skin_type,
            sort = 'created_at',
            order = 'DESC',
            featured,
            search
        } = req.query;

        // Validate pagination
        const pageNum = Math.max(1, parseInt(page));
        const limitNum = Math.min(50, Math.max(1, parseInt(limit)));
        const offset = (pageNum - 1) * limitNum;

        // Build WHERE clause
        let whereClause = 'p.is_active = true';
        let params = [];

        if (category) {
            whereClause += ' AND c.slug = ?';
            params.push(category);
        }

        if (brand) {
            whereClause += ' AND p.brand = ?';
            params.push(brand);
        }

        if (min_price) {
            whereClause += ' AND p.price >= ?';
            params.push(parseFloat(min_price));
        }

        if (max_price) {
            whereClause += ' AND p.price <= ?';
            params.push(parseFloat(max_price));
        }

        if (skin_type) {
            whereClause += ' AND JSON_CONTAINS(p.skin_type, ?)';
            params.push(`"${skin_type}"`);
        }

        if (featured === 'true') {
            whereClause += ' AND p.is_featured = true';
        }

        if (search) {
            whereClause += ' AND (p.name LIKE ? OR p.description LIKE ? OR p.short_description LIKE ?)';
            const searchTerm = `%${search}%`;
            params.push(searchTerm, searchTerm, searchTerm);
        }

        // Build ORDER BY clause
        const allowedSortFields = ['created_at', 'name', 'price', 'rating', 'reviews_count'];
        const sortField = allowedSortFields.includes(sort) ? sort : 'created_at';
        const sortOrder = order.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

        // Get total count
        const countQuery = `
            SELECT COUNT(*) as total
            FROM products p
            LEFT JOIN categories c ON p.category_id = c.id
            WHERE ${whereClause}
        `;
        const countResult = await db.query(countQuery, params);
        const total = countResult[0].total;

        // Get products
        const productsQuery = `
            SELECT 
                p.*,
                c.name as category_name,
                c.slug as category_slug
            FROM products p
            LEFT JOIN categories c ON p.category_id = c.id
            WHERE ${whereClause}
            ORDER BY p.${sortField} ${sortOrder}
            LIMIT ? OFFSET ?
        `;

        const products = await db.query(productsQuery, [...params, limitNum, offset]);

        // Parse JSON fields
        const formattedProducts = products.map(product => ({
            ...product,
            ingredients: product.ingredients ? JSON.parse(product.ingredients) : [],
            skin_type: product.skin_type ? JSON.parse(product.skin_type) : [],
            gallery_images: product.gallery_images ? JSON.parse(product.gallery_images) : []
        }));

        // Pagination info
        const totalPages = Math.ceil(total / limitNum);
        const hasNext = pageNum < totalPages;
        const hasPrev = pageNum > 1;

        res.json({
            products: formattedProducts,
            pagination: {
                current_page: pageNum,
                total_pages: totalPages,
                total_items: total,
                items_per_page: limitNum,
                has_next: hasNext,
                has_prev: hasPrev
            }
        });

    } catch (error) {
        console.error('Get products error:', error);
        res.status(500).json({ error: 'Failed to fetch products' });
    }
});

// Get featured products
router.get('/featured', async (req, res) => {
    try {
        const { limit = 8 } = req.query;
        const limitNum = Math.min(20, Math.max(1, parseInt(limit)));

        const query = `
            SELECT 
                p.*,
                c.name as category_name,
                c.slug as category_slug
            FROM products p
            LEFT JOIN categories c ON p.category_id = c.id
            WHERE p.is_active = true AND p.is_featured = true
            ORDER BY p.rating DESC, p.reviews_count DESC
            LIMIT ?
        `;

        const products = await db.query(query, [limitNum]);

        const formattedProducts = products.map(product => ({
            ...product,
            ingredients: product.ingredients ? JSON.parse(product.ingredients) : [],
            skin_type: product.skin_type ? JSON.parse(product.skin_type) : [],
            gallery_images: product.gallery_images ? JSON.parse(product.gallery_images) : []
        }));

        res.json({ products: formattedProducts });

    } catch (error) {
        console.error('Get featured products error:', error);
        res.status(500).json({ error: 'Failed to fetch featured products' });
    }
});

// Get product by ID
router.get('/:id', async (req, res) => {
    try {
        const { id } = req.params;

        if (!id || isNaN(id)) {
            return res.status(400).json({ error: 'Invalid product ID' });
        }

        const query = `
            SELECT 
                p.*,
                c.name as category_name,
                c.slug as category_slug
            FROM products p
            LEFT JOIN categories c ON p.category_id = c.id
            WHERE p.id = ? AND p.is_active = true
        `;

        const product = await db.findOne(query, [id]);

        if (!product) {
            return res.status(404).json({ error: 'Product not found' });
        }

        // Parse JSON fields
        const formattedProduct = {
            ...product,
            ingredients: product.ingredients ? JSON.parse(product.ingredients) : [],
            skin_type: product.skin_type ? JSON.parse(product.skin_type) : [],
            gallery_images: product.gallery_images ? JSON.parse(product.gallery_images) : []
        };

        // Get related products (same category, excluding current product)
        const relatedQuery = `
            SELECT 
                p.*,
                c.name as category_name,
                c.slug as category_slug
            FROM products p
            LEFT JOIN categories c ON p.category_id = c.id
            WHERE p.category_id = ? AND p.id != ? AND p.is_active = true
            ORDER BY p.rating DESC
            LIMIT 4
        `;

        const relatedProducts = await db.query(relatedQuery, [product.category_id, id]);
        const formattedRelatedProducts = relatedProducts.map(prod => ({
            ...prod,
            ingredients: prod.ingredients ? JSON.parse(prod.ingredients) : [],
            skin_type: prod.skin_type ? JSON.parse(prod.skin_type) : [],
            gallery_images: prod.gallery_images ? JSON.parse(prod.gallery_images) : []
        }));

        res.json({
            product: formattedProduct,
            related_products: formattedRelatedProducts
        });

    } catch (error) {
        console.error('Get product error:', error);
        res.status(500).json({ error: 'Failed to fetch product' });
    }
});

// Get product by slug
router.get('/slug/:slug', async (req, res) => {
    try {
        const { slug } = req.params;

        if (!slug) {
            return res.status(400).json({ error: 'Product slug is required' });
        }

        const query = `
            SELECT 
                p.*,
                c.name as category_name,
                c.slug as category_slug
            FROM products p
            LEFT JOIN categories c ON p.category_id = c.id
            WHERE p.slug = ? AND p.is_active = true
        `;

        const product = await db.findOne(query, [slug]);

        if (!product) {
            return res.status(404).json({ error: 'Product not found' });
        }

        // Parse JSON fields
        const formattedProduct = {
            ...product,
            ingredients: product.ingredients ? JSON.parse(product.ingredients) : [],
            skin_type: product.skin_type ? JSON.parse(product.skin_type) : [],
            gallery_images: product.gallery_images ? JSON.parse(product.gallery_images) : []
        };

        res.json({ product: formattedProduct });

    } catch (error) {
        console.error('Get product by slug error:', error);
        res.status(500).json({ error: 'Failed to fetch product' });
    }
});

// Get products by category
router.get('/category/:categoryId', async (req, res) => {
    try {
        const { categoryId } = req.params;
        const {
            page = 1,
            limit = 12,
            sort = 'created_at',
            order = 'DESC'
        } = req.query;

        // Validate pagination
        const pageNum = Math.max(1, parseInt(page));
        const limitNum = Math.min(50, Math.max(1, parseInt(limit)));
        const offset = (pageNum - 1) * limitNum;

        // Validate sort
        const allowedSortFields = ['created_at', 'name', 'price', 'rating'];
        const sortField = allowedSortFields.includes(sort) ? sort : 'created_at';
        const sortOrder = order.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

        // Get category info
        const category = await db.findOne(
            'SELECT * FROM categories WHERE id = ? OR slug = ?',
            [categoryId, categoryId]
        );

        if (!category) {
            return res.status(404).json({ error: 'Category not found' });
        }

        // Get total count
        const countQuery = `
            SELECT COUNT(*) as total
            FROM products p
            WHERE p.category_id = ? AND p.is_active = true
        `;
        const countResult = await db.query(countQuery, [category.id]);
        const total = countResult[0].total;

        // Get products
        const productsQuery = `
            SELECT 
                p.*,
                c.name as category_name,
                c.slug as category_slug
            FROM products p
            LEFT JOIN categories c ON p.category_id = c.id
            WHERE p.category_id = ? AND p.is_active = true
            ORDER BY p.${sortField} ${sortOrder}
            LIMIT ? OFFSET ?
        `;

        const products = await db.query(productsQuery, [category.id, limitNum, offset]);

        const formattedProducts = products.map(product => ({
            ...product,
            ingredients: product.ingredients ? JSON.parse(product.ingredients) : [],
            skin_type: product.skin_type ? JSON.parse(product.skin_type) : [],
            gallery_images: product.gallery_images ? JSON.parse(product.gallery_images) : []
        }));

        // Pagination info
        const totalPages = Math.ceil(total / limitNum);

        res.json({
            category,
            products: formattedProducts,
            pagination: {
                current_page: pageNum,
                total_pages: totalPages,
                total_items: total,
                items_per_page: limitNum
            }
        });

    } catch (error) {
        console.error('Get products by category error:', error);
        res.status(500).json({ error: 'Failed to fetch products by category' });
    }
});

// Search products
router.post('/search', async (req, res) => {
    try {
        const { query: searchQuery, filters = {} } = req.body;
        const {
            page = 1,
            limit = 12,
            sort = 'relevance'
        } = req.query;

        if (!searchQuery || searchQuery.trim().length < 2) {
            return res.status(400).json({ error: 'Search query must be at least 2 characters' });
        }

        const pageNum = Math.max(1, parseInt(page));
        const limitNum = Math.min(50, Math.max(1, parseInt(limit)));
        const offset = (pageNum - 1) * limitNum;

        // Build search conditions
        let whereClause = 'p.is_active = true';
        let params = [];

        // Full text search
        const searchTerm = `%${searchQuery.trim()}%`;
        whereClause += ` AND (
            p.name LIKE ? OR 
            p.description LIKE ? OR 
            p.short_description LIKE ? OR
            p.brand LIKE ? OR
            JSON_SEARCH(p.ingredients, 'one', ?) IS NOT NULL
        )`;
        params.push(searchTerm, searchTerm, searchTerm, searchTerm, searchQuery.trim());

        // Apply filters
        if (filters.category) {
            whereClause += ' AND c.slug = ?';
            params.push(filters.category);
        }

        if (filters.brand) {
            whereClause += ' AND p.brand = ?';
            params.push(filters.brand);
        }

        if (filters.min_price) {
            whereClause += ' AND p.price >= ?';
            params.push(parseFloat(filters.min_price));
        }

        if (filters.max_price) {
            whereClause += ' AND p.price <= ?';
            params.push(parseFloat(filters.max_price));
        }

        if (filters.skin_type) {
            whereClause += ' AND JSON_CONTAINS(p.skin_type, ?)';
            params.push(`"${filters.skin_type}"`);
        }

        // Determine sort order
        let orderClause = 'p.rating DESC, p.reviews_count DESC';
        if (sort === 'price_low') {
            orderClause = 'p.price ASC';
        } else if (sort === 'price_high') {
            orderClause = 'p.price DESC';
        } else if (sort === 'newest') {
            orderClause = 'p.created_at DESC';
        } else if (sort === 'rating') {
            orderClause = 'p.rating DESC, p.reviews_count DESC';
        }

        // Get total count
        const countQuery = `
            SELECT COUNT(*) as total
            FROM products p
            LEFT JOIN categories c ON p.category_id = c.id
            WHERE ${whereClause}
        `;
        const countResult = await db.query(countQuery, params);
        const total = countResult[0].total;

        // Get products
        const productsQuery = `
            SELECT 
                p.*,
                c.name as category_name,
                c.slug as category_slug,
                CASE 
                    WHEN p.name LIKE ? THEN 3
                    WHEN p.brand LIKE ? THEN 2
                    ELSE 1
                END as relevance_score
            FROM products p
            LEFT JOIN categories c ON p.category_id = c.id
            WHERE ${whereClause}
            ORDER BY relevance_score DESC, ${orderClause}
            LIMIT ? OFFSET ?
        `;

        const products = await db.query(
            productsQuery, 
            [searchTerm, searchTerm, ...params, limitNum, offset]
        );

        const formattedProducts = products.map(product => ({
            ...product,
            ingredients: product.ingredients ? JSON.parse(product.ingredients) : [],
            skin_type: product.skin_type ? JSON.parse(product.skin_type) : [],
            gallery_images: product.gallery_images ? JSON.parse(product.gallery_images) : []
        }));

        res.json({
            query: searchQuery,
            products: formattedProducts,
            pagination: {
                current_page: pageNum,
                total_pages: Math.ceil(total / limitNum),
                total_items: total,
                items_per_page: limitNum
            }
        });

    } catch (error) {
        console.error('Search products error:', error);
        res.status(500).json({ error: 'Search failed' });
    }
});

// Get product stock status
router.get('/:id/stock', async (req, res) => {
    try {
        const { id } = req.params;

        const product = await db.findOne(
            'SELECT id, name, stock, low_stock_threshold, track_inventory, allow_backorder FROM products WHERE id = ? AND is_active = true',
            [id]
        );

        if (!product) {
            return res.status(404).json({ error: 'Product not found' });
        }

        const stockStatus = {
            id: product.id,
            name: product.name,
            stock: product.stock,
            in_stock: product.stock > 0,
            low_stock: product.stock <= product.low_stock_threshold,
            allow_backorder: product.allow_backorder,
            stock_status: product.stock > 0 ? 'in_stock' : 
                         product.allow_backorder ? 'backorder' : 'out_of_stock'
        };

        res.json(stockStatus);

    } catch (error) {
        console.error('Get stock status error:', error);
        res.status(500).json({ error: 'Failed to get stock status' });
    }
});

// Get categories
router.get('/categories/all', async (req, res) => {
    try {
        const query = `
            SELECT 
                c.*,
                COUNT(p.id) as product_count
            FROM categories c
            LEFT JOIN products p ON c.id = p.category_id AND p.is_active = true
            WHERE c.is_active = true
            GROUP BY c.id
            ORDER BY c.sort_order ASC, c.name ASC
        `;

        const categories = await db.query(query);

        res.json({ categories });

    } catch (error) {
        console.error('Get categories error:', error);
        res.status(500).json({ error: 'Failed to fetch categories' });
    }
});

// Get brands
router.get('/brands/all', async (req, res) => {
    try {
        const query = `
            SELECT 
                brand,
                COUNT(*) as product_count,
                MIN(price) as min_price,
                MAX(price) as max_price
            FROM products 
            WHERE is_active = true AND brand IS NOT NULL
            GROUP BY brand
            ORDER BY brand ASC
        `;

        const brands = await db.query(query);

        res.json({ brands });

    } catch (error) {
        console.error('Get brands error:', error);
        res.status(500).json({ error: 'Failed to fetch brands' });
    }
});

module.exports = router; 