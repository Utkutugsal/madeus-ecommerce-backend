const express = require('express');
const { Database } = require('../config/database');
const emailService = require('../utils/email');

const router = express.Router();

// Generate order number
function generateOrderNumber() {
    const timestamp = Date.now().toString();
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    return `MD${timestamp.slice(-6)}${random}`;
}

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

        // Debug logging
        console.log('=== ORDER CREATION DEBUG ===');
        console.log('Items received:', JSON.stringify(items, null, 2));
        console.log('Items length:', items ? items.length : 'undefined');
        
        if (items && items.length > 0) {
            items.forEach((item, index) => {
                console.log(`Item ${index}:`, {
                    id: item.id,
                    name: item.name,
                    quantity: item.quantity,
                    price: item.price,
                    total: item.quantity * item.price
                });
            });
        }

        // Validate required fields
        if (!user_email || !user_name || !items || !total_amount) {
            return res.status(400).json({
                success: false,
                message: 'Eksik bilgiler: email, isim, ürünler ve toplam tutar gerekli'
            });
        }

        // Generate order number
        const orderNumber = generateOrderNumber();

        // Create order
        const orderResult = await db.query(
            `INSERT INTO orders (
                order_number, user_id, user_email, user_name, user_phone,
                shipping_address, total_amount, shipping_cost,
                status, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pending', NOW())`,
            [
                orderNumber,
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

        console.log('✅ Order created with ID:', orderId, 'Number:', orderNumber);

        // Add order items
        for (const item of items) {
            try {
                await db.query(
                    `INSERT INTO order_items (order_id, product_id, product_name, quantity, price, total) 
                     VALUES (?, ?, ?, ?, ?, ?)`,
                    [orderId, item.id, item.name, item.quantity, item.price, item.quantity * item.price]
                );
                console.log('✅ Order item added:', item.name);
            } catch (itemError) {
                console.error('❌ Order item error:', itemError);
                throw itemError;
            }
        }

        // Send email notification to admin
        try {
            const orderDetails = {
                orderId,
                orderNumber,
                customerName: user_name,
                customerEmail: user_email,
                customerPhone: user_phone,
                items,
                totalAmount: total_amount,
                shippingCost: shipping_cost,
                shippingAddress: shipping_address
            };

            await emailService.sendOrderNotification(orderDetails);
            console.log('✅ Order notification email sent to admin');
        } catch (emailError) {
            console.error('❌ Admin email notification error:', emailError);
            // Don't fail the order if email fails
        }

        // Send confirmation email to customer
        try {
            const orderDetails = {
                orderNumber,
                orderId,
                customerName: user_name,
                customerEmail: user_email,
                customerPhone: user_phone,
                items,
                total: `${total_amount.toFixed(2)} TL`,
                shippingCost: shipping_cost,
                shippingAddress: shipping_address
            };

            await emailService.sendOrderConfirmationEmail(user_email, orderDetails);
            console.log('✅ Order confirmation email sent to customer');
        } catch (emailError) {
            console.error('❌ Customer email confirmation error:', emailError);
            // Don't fail the order if email fails
        }

        res.json({
            success: true,
            message: 'Sipariş başarıyla oluşturuldu',
            orderId,
            orderNumber,
            data: {
                orderId,
                orderNumber,
                status: 'pending',
                total: total_amount
            }
        });

    } catch (error) {
        console.error('❌ Order creation error:', error);
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