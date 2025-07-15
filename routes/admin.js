const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { Database } = require('../config/database');

const router = express.Router();

// Admin credentials (in production, this should be in database)
const ADMIN_CREDENTIALS = {
    username: 'admin',
    password: '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi' // "password" hashed
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
        
        // Get order statistics
        const orderStats = await db.query(`
            SELECT 
                COUNT(*) as total_orders,
                SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending_orders,
                SUM(CASE WHEN status = 'confirmed' THEN 1 ELSE 0 END) as confirmed_orders,
                SUM(CASE WHEN status = 'shipped' THEN 1 ELSE 0 END) as shipped_orders,
                SUM(CASE WHEN status = 'delivered' THEN 1 ELSE 0 END) as delivered_orders,
                SUM(CASE WHEN status = 'cancelled' THEN 1 ELSE 0 END) as cancelled_orders,
                SUM(total_amount) as total_revenue,
                AVG(total_amount) as avg_order_value
            FROM orders
            WHERE created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
        `);
        
        // Get recent orders
        const recentOrders = await db.query(`
            SELECT 
                o.id, o.order_number, o.user_name, o.total_amount, 
                o.status, o.created_at,
                COUNT(oi.id) as item_count
            FROM orders o
            LEFT JOIN order_items oi ON o.id = oi.order_id
            GROUP BY o.id
            ORDER BY o.created_at DESC
            LIMIT 10
        `);
        
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
                stats: orderStats[0],
                recentOrders,
                topProducts
            }
        });
        
    } catch (error) {
        console.error('Dashboard stats error:', error);
        res.status(500).json({ success: false, message: 'İstatistikler yüklenemedi' });
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
        
        if (status && status !== 'all') {
            whereClause = 'WHERE o.status = ?';
            queryParams.push(status);
        }
        
        if (search) {
            whereClause = whereClause ? 
                `${whereClause} AND (o.order_number LIKE ? OR o.user_name LIKE ? OR o.user_email LIKE ?)` :
                'WHERE (o.order_number LIKE ? OR o.user_name LIKE ? OR o.user_email LIKE ?)';
            queryParams.push(`%${search}%`, `%${search}%`, `%${search}%`);
        }
        
        const orders = await db.query(`
            SELECT 
                o.id, o.order_number, o.user_name, o.user_email, o.user_phone,
                o.total_amount, o.status, o.cargo_company, o.cargo_tracking_number,
                o.created_at, o.updated_at,
                COUNT(oi.id) as item_count
            FROM orders o
            LEFT JOIN order_items oi ON o.id = oi.order_id
            ${whereClause}
            GROUP BY o.id
            ORDER BY o.created_at DESC
            LIMIT ? OFFSET ?
        `, [...queryParams, limit, offset]);
        
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
        res.status(500).json({ success: false, message: 'Siparişler yüklenemedi' });
    }
});

// Get order details
router.get('/orders/:orderId', adminAuth, async (req, res) => {
    try {
        const db = new Database();
        const { orderId } = req.params;
        
        const order = await db.query(`
            SELECT o.*, 
                   GROUP_CONCAT(
                       JSON_OBJECT(
                           'id', oi.id,
                           'product_id', oi.product_id,
                           'product_name', oi.product_name,
                           'quantity', oi.quantity,
                           'price', oi.price,
                           'total', oi.total
                       )
                   ) as items
            FROM orders o
            LEFT JOIN order_items oi ON o.id = oi.order_id
            WHERE o.id = ?
            GROUP BY o.id
        `, [orderId]);
        
        if (!order || order.length === 0) {
            return res.status(404).json({ success: false, message: 'Sipariş bulunamadı' });
        }
        
        const orderData = order[0];
        if (orderData.items) {
            try {
                const itemsArray = orderData.items.split(',').map(item => JSON.parse(item));
                orderData.items = itemsArray;
            } catch (e) {
                orderData.items = [];
            }
        } else {
            orderData.items = [];
        }
        
        res.json({
            success: true,
            data: orderData
        });
        
    } catch (error) {
        console.error('Admin order details error:', error);
        res.status(500).json({ success: false, message: 'Sipariş detayları yüklenemedi' });
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

module.exports = router; 