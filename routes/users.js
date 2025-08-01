const express = require('express');
const router = express.Router();
const { Database } = require('../config/database');
const { authenticateToken } = require('../middleware/auth');

const db = new Database();

// Get user profile
router.get('/profile', authenticateToken, async (req, res) => {
    try {
        const user = await db.findOne(
            'SELECT id, name, email, phone, skin_type, role, created_at FROM users WHERE id = ?',
            [req.user.userId]
        );

        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        res.json({
            id: user.id,
            name: user.name,
            email: user.email,
            phone: user.phone,
            skin_type: user.skin_type,
            role: user.role,
            created_at: user.created_at
        });

    } catch (error) {
        console.error('Get profile error:', error);
        res.status(500).json({ error: 'Failed to get profile' });
    }
});

// Get user orders
router.get('/orders', authenticateToken, async (req, res) => {
    try {
        const { page = 1, limit = 10 } = req.query;
        const offset = (page - 1) * limit;
        
        console.log('🔍 Getting orders for user:', req.user.userId);
        console.log('🔍 Query params:', {
            userId: req.user.userId,
            limit: parseInt(limit),
            offset: parseInt(offset)
        });
        
        // Get user orders - Fix SQL parameter issue
        const orders = await db.query(`
            SELECT 
                o.id,
                o.order_number,
                o.total_amount,
                o.shipping_cost,
                o.status,
                o.cargo_company,
                o.cargo_tracking_number,
                o.created_at,
                o.updated_at,
                o.shipping_address
            FROM orders o
            WHERE o.user_id = ?
            ORDER BY o.created_at DESC
            LIMIT ${parseInt(limit)} OFFSET ${parseInt(offset)}
        `, [req.user.userId]);

        console.log('📦 Found orders:', orders.length);

        // Get items for each order
        const processedOrders = [];
        for (const order of orders) {
            const items = await db.query(`
                SELECT 
                    oi.product_id,
                    oi.product_name,
                    oi.quantity,
                    oi.price,
                    oi.total
                FROM order_items oi
                WHERE oi.order_id = ?
            `, [order.id]);

            processedOrders.push({
                ...order,
                items: items || [],
                shipping_address: (() => {
                    try {
                        if (!order.shipping_address) return null;
                        if (typeof order.shipping_address === 'string') {
                            return JSON.parse(order.shipping_address);
                        }
                        return order.shipping_address;
                    } catch (error) {
                        console.error('Error parsing shipping_address:', error);
                        return null;
                    }
                })()
            });
        }

        // Get total count
        const totalResult = await db.query(
            'SELECT COUNT(*) as total FROM orders WHERE user_id = ?',
            [req.user.userId]
        );
        const total = totalResult[0].total;

        console.log('📦 Processed orders:', processedOrders.length);

        res.json({
            success: true,
            data: {
                orders: processedOrders,
                pagination: {
                    page: parseInt(page),
                    limit: parseInt(limit),
                    total,
                    pages: Math.ceil(total / limit)
                }
            }
        });

    } catch (error) {
        console.error('Get user orders error:', error);
        res.status(500).json({ error: 'Failed to get orders', details: error.message });
    }
});

// Get single order details
router.get('/orders/:orderId', authenticateToken, async (req, res) => {
    try {
        const orderId = parseInt(req.params.orderId);
        
        // Get order details
        const order = await db.findOne(`
            SELECT 
                o.id,
                o.order_number,
                o.total_amount,
                o.shipping_cost,
                o.status,
                o.created_at,
                o.updated_at,
                o.shipping_address,
                o.user_name,
                o.user_email,
                o.user_phone
            FROM orders o
            WHERE o.id = ? AND o.user_id = ?
        `, [orderId, req.user.userId]);

        if (!order) {
            return res.status(404).json({ error: 'Order not found' });
        }

        // Get order items
        const items = await db.query(`
            SELECT 
                oi.id,
                oi.product_id,
                oi.product_name,
                oi.quantity,
                oi.price,
                oi.total
            FROM order_items oi
            WHERE oi.order_id = ?
        `, [orderId]);

        // Parse shipping address safely
        let shippingAddress = null;
        if (order.shipping_address) {
            try {
                if (typeof order.shipping_address === 'string') {
                    shippingAddress = JSON.parse(order.shipping_address);
                } else if (typeof order.shipping_address === 'object') {
                    shippingAddress = order.shipping_address;
                }
            } catch (e) {
                console.error('Error parsing shipping address:', e);
                shippingAddress = null;
            }
        }

        res.json({
            success: true,
            data: {
                ...order,
                items,
                shipping_address: shippingAddress
            }
        });

    } catch (error) {
        console.error('Get order details error:', error);
        res.status(500).json({ error: 'Failed to get order details' });
    }
});

// Get user addresses
router.get('/addresses', authenticateToken, async (req, res) => {
    try {
        const addresses = await db.query(
            'SELECT * FROM user_addresses WHERE user_id = ? ORDER BY is_default DESC, created_at DESC',
            [req.user.userId]
        );

        res.json(addresses || []);

    } catch (error) {
        console.error('Get addresses error:', error);
        res.status(500).json({ error: 'Failed to get addresses' });
    }
});

// Add address
router.post('/addresses', authenticateToken, async (req, res) => {
    try {
        console.log('📍 Add address request received (users route)');
        console.log('📍 User ID:', req.user.userId);
        console.log('📍 Request body:', req.body);
        
        const { title, first_name, last_name, address_line_1, address_line_2, city, district, postal_code, phone, is_default } = req.body;
        
        console.log('📍 Extracted data:', {
            title, first_name, last_name, address_line_1, address_line_2, 
            city, district, postal_code, phone, is_default
        });
        
        // If this is default address, make others non-default
        if (is_default) {
            console.log('📍 Making other addresses non-default');
            await db.query(
                'UPDATE user_addresses SET is_default = FALSE WHERE user_id = ?',
                [req.user.userId]
            );
        }

        // Insert new address with direct SQL
        const sql = `
            INSERT INTO user_addresses 
            (user_id, title, first_name, last_name, address_line_1, address_line_2, city, district, postal_code, phone, is_default) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;
        
        const params = [
            req.user.userId,
            title,
            first_name,
            last_name,
            address_line_1,
            address_line_2 || null,
            city,
            district,
            postal_code,
            phone,
            is_default ? 1 : 0
        ];
        
        console.log('📍 SQL:', sql);
        console.log('📍 Params:', params);

        const result = await db.query(sql, params);
        
        console.log('📍 Insert result:', result);

        res.json({ 
            message: 'Address added successfully',
            addressId: result.insertId 
        });

    } catch (error) {
        console.error('❌ Add address error:', error);
        console.error('❌ Error stack:', error.stack);
        res.status(500).json({ error: 'Failed to add address' });
    }
});

// Update address
router.put('/addresses/:id', authenticateToken, async (req, res) => {
    try {
        const addressId = parseInt(req.params.id);
        const { title, first_name, last_name, address_line_1, address_line_2, city, district, postal_code, phone, is_default } = req.body;
        
        // If this is default address, make others non-default
        if (is_default) {
            await db.query(
                'UPDATE user_addresses SET is_default = FALSE WHERE user_id = ?',
                [req.user.userId]
            );
        }

        const sql = `
            UPDATE user_addresses 
            SET title = ?, first_name = ?, last_name = ?, address_line_1 = ?, address_line_2 = ?, 
                city = ?, district = ?, postal_code = ?, phone = ?, is_default = ?
            WHERE id = ? AND user_id = ?
        `;
        
        const params = [
            title, first_name, last_name, address_line_1, address_line_2 || null,
            city, district, postal_code, phone, is_default ? 1 : 0,
            addressId, req.user.userId
        ];

        await db.query(sql, params);

        res.json({ message: 'Address updated successfully' });

    } catch (error) {
        console.error('Update address error:', error);
        res.status(500).json({ error: 'Failed to update address' });
    }
});

// Delete address
router.delete('/addresses/:id', authenticateToken, async (req, res) => {
    try {
        const addressId = parseInt(req.params.id);
        
        await db.query(
            'DELETE FROM user_addresses WHERE id = ? AND user_id = ?',
            [addressId, req.user.userId]
        );

        res.json({ message: 'Address deleted successfully' });

    } catch (error) {
        console.error('Delete address error:', error);
        res.status(500).json({ error: 'Failed to delete address' });
    }
});

module.exports = router; 