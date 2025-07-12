const express = require('express');
const { Database } = require('../config/database');
const emailService = require('../utils/email');

const router = express.Router();

// Create order endpoint
router.post('/create', async (req, res) => {
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

// Get order by ID
router.get('/:id', async (req, res) => {
    try {
        const db = new Database();
        const orderId = req.params.id;

        const order = await db.query(
            `SELECT * FROM orders WHERE id = ?`,
            [orderId]
        );

        if (!order || order.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Sipariş bulunamadı'
            });
        }

        const orderItems = await db.query(
            `SELECT * FROM order_items WHERE order_id = ?`,
            [orderId]
        );

        res.json({
            success: true,
            data: {
                order: order[0],
                items: orderItems
            }
        });

    } catch (error) {
        console.error('Order fetch error:', error);
        res.status(500).json({
            success: false,
            message: 'Sipariş getirilirken hata oluştu',
            error: error.message
        });
    }
});

module.exports = router; 