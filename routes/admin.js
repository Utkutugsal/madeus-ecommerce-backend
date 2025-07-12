const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { Database } = require('../config/database');

const router = express.Router();

// Admin authentication middleware
const authenticateAdmin = async (req, res, next) => {
    try {
        const token = req.header('Authorization')?.replace('Bearer ', '');
        
        if (!token) {
            return res.status(401).json({ error: 'Access denied. No token provided.' });
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        
        // Check if user is admin
        const db = new Database();
        const admin = await db.query('SELECT * FROM users WHERE id = ? AND role = "admin"', [decoded.id]);
        
        if (!admin || admin.length === 0) {
            return res.status(403).json({ error: 'Access denied. Admin privileges required.' });
        }

        req.admin = admin[0];
        next();
    } catch (error) {
        res.status(400).json({ error: 'Invalid token.' });
    }
};

// ===========================================
// ADMIN AUTHENTICATION
// ===========================================

// Admin login
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        
        if (!email || !password) {
            return res.status(400).json({ 
                success: false, 
                message: 'Email and password are required' 
            });
        }

        const db = new Database();
        
        // Check if admin exists
        const admin = await db.query('SELECT * FROM users WHERE email = ? AND role = "admin"', [email]);
        
        if (!admin || admin.length === 0) {
            return res.status(401).json({ 
                success: false, 
                message: 'Invalid admin credentials' 
            });
        }

        // Verify password
        const isValidPassword = await bcrypt.compare(password, admin[0].password);
        
        if (!isValidPassword) {
            return res.status(401).json({ 
                success: false, 
                message: 'Invalid admin credentials' 
            });
        }

        // Generate JWT token
        const token = jwt.sign(
            { id: admin[0].id, email: admin[0].email, role: 'admin' },
            process.env.JWT_SECRET,
            { expiresIn: '24h' }
        );

        res.json({
            success: true,
            message: 'Admin login successful',
            token,
            admin: {
                id: admin[0].id,
                name: admin[0].name,
                email: admin[0].email,
                role: admin[0].role
            }
        });

    } catch (error) {
        console.error('Admin login error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Server error during admin login' 
        });
    }
});

// Create first admin (setup endpoint)
router.post('/setup-admin', async (req, res) => {
    try {
        const { name, email, password } = req.body;
        
        if (!name || !email || !password) {
            return res.status(400).json({ 
                success: false, 
                message: 'Name, email and password are required' 
            });
        }

        const db = new Database();
        
        // Check if admin already exists
        const existingAdmin = await db.query('SELECT * FROM users WHERE role = "admin"');
        
        if (existingAdmin && existingAdmin.length > 0) {
            return res.status(400).json({ 
                success: false, 
                message: 'Admin already exists' 
            });
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10);
        
        // Create admin user
        await db.query(`
            INSERT INTO users (name, email, password, role, is_verified, is_active) 
            VALUES (?, ?, ?, 'admin', true, true)
        `, [name, email, hashedPassword]);

        res.json({
            success: true,
            message: 'Admin created successfully'
        });

    } catch (error) {
        console.error('Admin setup error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Server error during admin setup' 
        });
    }
});

// ===========================================
// DASHBOARD & STATISTICS
// ===========================================

// Admin dashboard stats
router.get('/dashboard', authenticateAdmin, async (req, res) => {
    try {
        const db = new Database();
        
        // Get dashboard statistics
        const stats = await Promise.all([
            db.query('SELECT COUNT(*) as total FROM orders'),
            db.query('SELECT COUNT(*) as total FROM orders WHERE status = "pending"'),
            db.query('SELECT COUNT(*) as total FROM orders WHERE DATE(created_at) = CURDATE()'),
            db.query('SELECT SUM(total_amount) as total FROM orders WHERE status = "completed"'),
            db.query('SELECT COUNT(*) as total FROM products WHERE is_active = true'),
            db.query('SELECT COUNT(*) as total FROM users WHERE role = "customer"')
        ]);

        const dashboard = {
            orders: {
                total: stats[0][0]?.total || 0,
                pending: stats[1][0]?.total || 0,
                today: stats[2][0]?.total || 0
            },
            revenue: {
                total: stats[3][0]?.total || 0
            },
            products: {
                active: stats[4][0]?.total || 0
            },
            customers: {
                total: stats[5][0]?.total || 0
            }
        };

        // Recent orders
        const recentOrders = await db.query(`
            SELECT o.*, u.name as customer_name, u.email as customer_email
            FROM orders o
            LEFT JOIN users u ON o.user_id = u.id
            ORDER BY o.created_at DESC
            LIMIT 10
        `);

        res.json({
            success: true,
            dashboard,
            recentOrders
        });

    } catch (error) {
        console.error('Dashboard error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Error fetching dashboard data' 
        });
    }
});

// ===========================================
// ORDER MANAGEMENT
// ===========================================

// Get all orders
router.get('/orders', authenticateAdmin, async (req, res) => {
    try {
        const { page = 1, limit = 20, status, search } = req.query;
        const offset = (page - 1) * limit;
        
        const db = new Database();
        
        let whereClause = '';
        let params = [];
        
        if (status && status !== 'all') {
            whereClause += ' WHERE o.status = ?';
            params.push(status);
        }
        
        if (search) {
            whereClause += whereClause ? ' AND' : ' WHERE';
            whereClause += ' (o.order_number LIKE ? OR u.name LIKE ? OR u.email LIKE ?)';
            params.push(`%${search}%`, `%${search}%`, `%${search}%`);
        }
        
        const orders = await db.query(`
            SELECT 
                o.*,
                u.name as customer_name,
                u.email as customer_email,
                u.phone as customer_phone,
                COUNT(oi.id) as item_count
            FROM orders o
            LEFT JOIN users u ON o.user_id = u.id
            LEFT JOIN order_items oi ON o.id = oi.order_id
            ${whereClause}
            GROUP BY o.id
            ORDER BY o.created_at DESC
            LIMIT ? OFFSET ?
        `, [...params, parseInt(limit), parseInt(offset)]);

        // Get total count
        const totalResult = await db.query(`
            SELECT COUNT(DISTINCT o.id) as total
            FROM orders o
            LEFT JOIN users u ON o.user_id = u.id
            ${whereClause}
        `, params);

        res.json({
            success: true,
            orders,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total: totalResult[0]?.total || 0,
                pages: Math.ceil((totalResult[0]?.total || 0) / limit)
            }
        });

    } catch (error) {
        console.error('Orders fetch error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Error fetching orders' 
        });
    }
});

// Get order details
router.get('/orders/:id', authenticateAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        const db = new Database();
        
        // Get order with customer info
        const order = await db.query(`
            SELECT 
                o.*,
                u.name as customer_name,
                u.email as customer_email,
                u.phone as customer_phone
            FROM orders o
            LEFT JOIN users u ON o.user_id = u.id
            WHERE o.id = ?
        `, [id]);

        if (!order || order.length === 0) {
            return res.status(404).json({ 
                success: false, 
                message: 'Order not found' 
            });
        }

        // Get order items
        const items = await db.query(`
            SELECT 
                oi.*,
                p.name as product_name,
                p.featured_image as product_image,
                p.sku as product_sku
            FROM order_items oi
            LEFT JOIN products p ON oi.product_id = p.id
            WHERE oi.order_id = ?
        `, [id]);

        res.json({
            success: true,
            order: {
                ...order[0],
                items
            }
        });

    } catch (error) {
        console.error('Order details error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Error fetching order details' 
        });
    }
});

// Update order status
router.put('/orders/:id/status', authenticateAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        const { status, notes } = req.body;
        
        const validStatuses = ['pending', 'confirmed', 'preparing', 'shipped', 'delivered', 'cancelled'];
        
        if (!validStatuses.includes(status)) {
            return res.status(400).json({ 
                success: false, 
                message: 'Invalid status' 
            });
        }

        const db = new Database();
        
        // Update order status
        await db.query(`
            UPDATE orders 
            SET status = ?, admin_notes = ?, updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
        `, [status, notes || null, id]);

        // Log status change
        await db.query(`
            INSERT INTO order_status_history (order_id, status, changed_by, notes, created_at)
            VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)
        `, [id, status, req.admin.id, notes || null]);

        res.json({
            success: true,
            message: 'Order status updated successfully'
        });

    } catch (error) {
        console.error('Order status update error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Error updating order status' 
        });
    }
});

// ===========================================
// PRODUCT MANAGEMENT
// ===========================================

// Get all products for admin
router.get('/products', authenticateAdmin, async (req, res) => {
    try {
        const { page = 1, limit = 20, search, category, status } = req.query;
        const offset = (page - 1) * limit;
        
        const db = new Database();
        
        let whereClause = '';
        let params = [];
        
        if (status && status !== 'all') {
            whereClause += ' WHERE p.is_active = ?';
            params.push(status === 'active');
        }
        
        if (search) {
            whereClause += whereClause ? ' AND' : ' WHERE';
            whereClause += ' (p.name LIKE ? OR p.sku LIKE ? OR p.brand LIKE ?)';
            params.push(`%${search}%`, `%${search}%`, `%${search}%`);
        }
        
        if (category && category !== 'all') {
            whereClause += whereClause ? ' AND' : ' WHERE';
            whereClause += ' p.category_id = ?';
            params.push(category);
        }
        
        const products = await db.query(`
            SELECT 
                p.*,
                c.name as category_name
            FROM products p
            LEFT JOIN categories c ON p.category_id = c.id
            ${whereClause}
            ORDER BY p.created_at DESC
            LIMIT ? OFFSET ?
        `, [...params, parseInt(limit), parseInt(offset)]);

        // Get total count
        const totalResult = await db.query(`
            SELECT COUNT(*) as total
            FROM products p
            ${whereClause}
        `, params);

        res.json({
            success: true,
            products,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total: totalResult[0]?.total || 0,
                pages: Math.ceil((totalResult[0]?.total || 0) / limit)
            }
        });

    } catch (error) {
        console.error('Products fetch error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Error fetching products' 
        });
    }
});

// Update product
router.put('/products/:id', authenticateAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        const { name, description, price, stock, is_active, is_featured } = req.body;
        
        const db = new Database();
        
        await db.query(`
            UPDATE products 
            SET name = ?, description = ?, price = ?, stock = ?, 
                is_active = ?, is_featured = ?, updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
        `, [name, description, price, stock, is_active, is_featured, id]);

        res.json({
            success: true,
            message: 'Product updated successfully'
        });

    } catch (error) {
        console.error('Product update error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Error updating product' 
        });
    }
});

module.exports = router; 