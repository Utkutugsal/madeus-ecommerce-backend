const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { Database } = require('../config/database');

const router = express.Router();

// Admin credentials (in production, this should be in database)
const ADMIN_CREDENTIALS = {
    username: 'admin',
    password: '$2b$10$aiR7Lt6ejm0s/ra./bDXiOQsWwOXfy2g5TOFlWoubt7jt/Mp.dX0e' // "497D3212e" hashed
};

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
        
        let whereClause = '';
        let queryParams = [];
        
        if (category && category !== 'all' && category !== '') {
            whereClause = 'WHERE category = ?';
            queryParams.push(category);
        }
        
        if (search && search.trim() !== '') {
            whereClause = whereClause ? 
                `${whereClause} AND (name LIKE ? OR description LIKE ?)` :
                'WHERE (name LIKE ? OR description LIKE ?)';
            queryParams.push(`%${search}%`, `%${search}%`);
        }
        
        const products = await db.query(`
            SELECT 
                id, name, description, price, original_price, 
                category, stock, image_url, is_active, 
                created_at, updated_at
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

// Create new product
router.post('/products', adminAuth, async (req, res) => {
    try {
        const db = new Database();
        const { 
            name, description, price, original_price, 
            category, stock, image_url, is_active 
        } = req.body;
        
        if (!name || !price || !category) {
            return res.status(400).json({ 
                success: false, 
                message: 'Ürün adı, fiyat ve kategori gereklidir' 
            });
        }
        
        const result = await db.query(`
            INSERT INTO products (
                name, description, price, original_price, 
                category, stock, image_url, is_active, 
                created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
        `, [
            name, description, price, original_price || price, 
            category, stock || 0, image_url || '', is_active || 1
        ]);
        
        const newProduct = await db.query('SELECT * FROM products WHERE id = ?', [result.insertId]);
        
        res.json({
            success: true,
            message: 'Ürün başarıyla eklendi',
            data: newProduct[0]
        });
        
    } catch (error) {
        console.error('Admin product create error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Ürün eklenemedi',
            error: error.message 
        });
    }
});

// Update product
router.put('/products/:productId', adminAuth, async (req, res) => {
    try {
        const db = new Database();
        const { productId } = req.params;
        const { 
            name, description, price, original_price, 
            category, stock, image_url, is_active 
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
        
        if (is_active !== undefined) {
            updateFields.push('is_active = ?');
            updateValues.push(is_active);
        }
        
        if (updateFields.length === 0) {
            return res.status(400).json({ success: false, message: 'Güncellenecek alan bulunamadı' });
        }
        
        updateFields.push('updated_at = NOW()');
        updateValues.push(productId);
        
        await db.query(`
            UPDATE products 
            SET ${updateFields.join(', ')} 
            WHERE id = ?
        `, updateValues);
        
        const updatedProduct = await db.query('SELECT * FROM products WHERE id = ?', [productId]);
        
        res.json({
            success: true,
            message: 'Ürün başarıyla güncellendi',
            data: updatedProduct[0]
        });
        
    } catch (error) {
        console.error('Admin product update error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Ürün güncellenemedi',
            error: error.message 
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

module.exports = router; 