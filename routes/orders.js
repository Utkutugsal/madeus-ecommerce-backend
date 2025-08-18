const express = require('express');
const { Database } = require('../config/database');
const emailService = require('../utils/email');
const { paytrService, paytrUtils } = require('../utils/payment');

const router = express.Router();

// Generate order number
function generateOrderNumber() {
    const timestamp = Date.now().toString();
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    return `MD${timestamp.slice(-6)}${random}`;
}

// Admin: Get all orders
router.get('/admin/all', async (req, res) => {
    try {
        const db = new Database();
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        const offset = (page - 1) * limit;

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
                COUNT(oi.id) as item_count
            FROM orders o
            LEFT JOIN order_items oi ON o.id = oi.order_id
            GROUP BY o.id
            ORDER BY o.created_at DESC
            LIMIT ? OFFSET ?
        `, [limit, offset]);

        const totalCount = await db.query(`SELECT COUNT(*) as total FROM orders`);
        
        res.json({
            success: true,
            data: {
                orders,
                pagination: {
                    page,
                    limit,
                    total: totalCount[0].total,
                    pages: Math.ceil(totalCount[0].total / limit)
                }
            }
        });
    } catch (error) {
        console.error('Admin orders fetch error:', error);
        res.status(500).json({ success: false, message: 'Siparişler yüklenemedi' });
    }
});

// Admin: Update order status and cargo info
router.put('/admin/:orderId/update', async (req, res) => {
    try {
        const db = new Database();
        const { orderId } = req.params;
        const { status, cargo_company, cargo_tracking_number } = req.body;

        // Validate status
        const validStatuses = ['pending', 'confirmed', 'shipped', 'delivered', 'cancelled'];
        if (status && !validStatuses.includes(status)) {
            return res.status(400).json({ 
                success: false, 
                message: 'Geçersiz sipariş durumu' 
            });
        }

        // Build update query dynamically
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
            return res.status(400).json({ 
                success: false, 
                message: 'Güncellenecek alan bulunamadı' 
            });
        }

        updateFields.push('updated_at = NOW()');
        updateValues.push(orderId);

        const updateQuery = `
            UPDATE orders 
            SET ${updateFields.join(', ')} 
            WHERE id = ?
        `;

        await db.query(updateQuery, updateValues);

        // Get updated order
        const updatedOrder = await db.query(`
            SELECT * FROM orders WHERE id = ?
        `, [orderId]);

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

// Admin: Get order details
router.get('/admin/:orderId', async (req, res) => {
    try {
        const db = new Database();
        const { orderId } = req.params;

        // Get order details
        const order = await db.query(`
            SELECT 
                o.*,
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
            return res.status(404).json({ 
                success: false, 
                message: 'Sipariş bulunamadı' 
            });
        }

        // Parse items
        const orderData = order[0];
        if (orderData.items) {
            try {
                const itemsArray = orderData.items.split(',').map(item => JSON.parse(item));
                orderData.items = itemsArray;
            } catch (e) {
                console.error('Error parsing order items:', e);
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
        console.log('Items length:', items.length);
        
        if (items.length > 0) {
            items.forEach((item, index) => {
                console.log(`Item ${index}:`, {
                    product: item.product,
                    quantity: item.quantity,
                    productId: item.product?.id,
                    productName: item.product?.name,
                    productPrice: item.product?.price
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

        // Debug user_id
        console.log('🔍 User ID from request:', user_id);
        console.log('🔍 User email from request:', user_email);
        console.log('🔍 User name from request:', user_name);

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
                user_id,
                user_email,
                user_name,
                user_phone || '',
                JSON.stringify(shipping_address),
                total_amount,
                shipping_cost || 0
            ]
        );

        const orderId = orderResult.insertId;

        console.log('✅ Order created with ID:', orderId, 'Number:', orderNumber, 'User ID:', user_id);

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

        // Send email notification to admin (asynchronously - don't wait)
        const adminEmailPromise = (async () => {
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
        })();

        // Send confirmation email to customer (asynchronously - don't wait)
        const customerEmailPromise = (async () => {
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
        })();

        // Don't wait for emails - return response immediately
        console.log('📧 Email sending started in background...');

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

// PayTR Payment Route
router.post('/create-payment', async (req, res) => {
    try {
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

        // Generate order number
        const orderNumber = paytrUtils.generateOrderNumber();

        // Create order first
        const db = new Database();
        const orderResult = await db.query(
            `INSERT INTO orders (
                order_number, user_id, user_email, user_name, user_phone,
                shipping_address, total_amount, shipping_cost,
                status, payment_status, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pending', 'pending', NOW())`,
            [
                orderNumber,
                user_id,
                user_email || '',
                user_name || '',
                user_phone || '',
                shipping_address ? JSON.stringify(shipping_address) : null,
                total_amount || 0,
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

        // Prepare payment data for PayTR
        const orderData = paytrService.formatOrderForPayment(
            { order_number: orderNumber, total_amount },
            { email: user_email, name: user_name, phone: user_phone },
            items,
            shipping_address
        );

        // Get user IP
        const userIp = req.ip || req.connection.remoteAddress || '127.0.0.1';

        // Create PayTR payment
        const paymentResult = await paytrService.createPayment(orderData, userIp);

        if (paymentResult.success) {
            res.json({
                success: true,
                message: 'Ödeme başlatıldı',
                orderId,
                orderNumber,
                paymentUrl: paymentResult.paymentUrl,
                token: paymentResult.token
            });
        } else {
            // If payment creation fails, update order status
            await db.query(
                `UPDATE orders SET status = 'cancelled', payment_status = 'failed' WHERE id = ?`,
                [orderId]
            );

            res.status(400).json({
                success: false,
                message: 'Ödeme başlatılamadı: ' + paymentResult.error,
                error: paymentResult.error
            });
        }

    } catch (error) {
        console.error('Payment creation error:', error);
        res.status(500).json({
            success: false,
            message: 'Ödeme oluşturulurken hata oluştu',
            error: error.message
        });
    }
});

// PayTR Callback Route
router.post('/payment-callback', async (req, res) => {
    try {
        const callbackData = req.body;
        console.log('PayTR Callback received:', callbackData);

        // Verify callback
        const verification = paytrService.verifyCallback(callbackData);

        if (!verification.isValid) {
            console.error('Invalid PayTR callback:', callbackData);
            return res.status(400).send('INVALID_CALLBACK');
        }

        const db = new Database();

        // Update order status
        const updateData = {
            payment_status: verification.status,
            status: verification.status === 'paid' ? 'confirmed' : 'cancelled',
            updated_at: new Date()
        };

        await db.query(
            `UPDATE orders SET 
                payment_status = ?, 
                status = ?, 
                updated_at = NOW() 
             WHERE order_number = ?`,
            [updateData.payment_status, updateData.status, verification.orderNumber]
        );

        // Get order details for email
        const order = await db.query(
            `SELECT * FROM orders WHERE order_number = ?`,
            [verification.orderNumber]
        );

        if (order.length > 0 && verification.status === 'paid') {
            // Send success email
            const orderDetails = {
                orderId: order[0].id,
                orderNumber: verification.orderNumber,
                customerName: order[0].user_name,
                customerEmail: order[0].user_email,
                totalAmount: verification.amount
            };

            // Send emails asynchronously
            emailService.sendOrderNotification(orderDetails).catch(console.error);
            emailService.sendOrderConfirmationEmail(order[0].user_email, orderDetails).catch(console.error);
        }

        res.send('OK');

    } catch (error) {
        console.error('Payment callback error:', error);
        res.status(500).send('ERROR');
    }
});

// Test PayTR connection
router.get('/test-payment', async (req, res) => {
    try {
        const testResult = await paytrService.testConnection();
        res.json({
            success: true,
            data: testResult
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Guest checkout - Create order without user account
router.post('/guest-checkout', async (req, res) => {
    try {
        const db = new Database();
        const {
            customerInfo,
            shippingAddress,
            items,
            total_amount,
            shipping_cost
        } = req.body;

        // Validate required fields
        if (!customerInfo || !shippingAddress || !items || !total_amount) {
            return res.status(400).json({
                success: false,
                message: 'Eksik bilgi gönderildi'
            });
        }

        // Generate unique order number
        const orderNumber = generateOrderNumber();

        // Create order
        const orderResult = await db.query(`
            INSERT INTO orders (
                order_number,
                user_id,
                user_name,
                user_email,
                user_phone,
                shipping_address,
                total_amount,
                shipping_cost,
                status,
                payment_status,
                created_at,
                updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
        `, [
            orderNumber,
            null, // user_id is null for guest orders
            customerInfo.name,
            customerInfo.email,
            customerInfo.phone,
            JSON.stringify(shippingAddress),
            total_amount,
            shipping_cost || 0,
            'pending',
            'pending'
        ]);

        const orderId = orderResult.insertId;

        // Add order items
        for (const item of items) {
            await db.query(`
                INSERT INTO order_items (
                    order_id,
                    product_id,
                    product_name,
                    quantity,
                    price,
                    total
                ) VALUES (?, ?, ?, ?, ?, ?)
            `, [
                orderId,
                item.product_id || null,
                item.name || '',
                item.quantity || 1,
                item.price || 0,
                item.total || 0
            ]);
        }

        // Send confirmation email via Brevo
        try {
            await emailService.sendGuestOrderConfirmation({
                email: customerInfo.email,
                orderNumber: orderNumber,
                customerName: customerInfo.name,
                totalAmount: total_amount,
                items: items,
                shippingAddress: shippingAddress
            });
        } catch (emailError) {
            console.error('Guest order email error:', emailError);
            // Don't fail the order if email fails
        }

        res.json({
            success: true,
            message: 'Sipariş başarıyla oluşturuldu',
            data: {
                orderId: orderId,
                orderNumber: orderNumber,
                customerEmail: customerInfo.email,
                customerName: customerInfo.name,
                customerPhone: customerInfo.phone,
                totalAmount: total_amount
            }
        });

    } catch (error) {
        console.error('Guest checkout error:', error);
        res.status(500).json({
            success: false,
            message: 'Sipariş oluşturulurken hata oluştu'
        });
    }
});

// Guest order tracking - Get order by email and order number
router.post('/guest-track', async (req, res) => {
    try {
        const db = new Database();
        const { email, orderNumber } = req.body;

        if (!email || !orderNumber) {
            return res.status(400).json({
                success: false,
                message: 'Email ve sipariş numarası gerekli'
            });
        }

        // Get order details
        const order = await db.query(`
            SELECT 
                o.id,
                o.order_number,
                o.user_name,
                o.user_email,
                o.user_phone,
                o.shipping_address,
                o.total_amount,
                o.shipping_cost,
                o.status,
                o.payment_status,
                o.cargo_company,
                o.cargo_tracking_number,
                o.created_at,
                o.updated_at
            FROM orders o
            WHERE o.order_number = ? AND o.user_email = ?
        `, [orderNumber, email]);

        if (order.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Sipariş bulunamadı'
            });
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
        `, [order[0].id]);

        // Parse shipping address
        let shippingAddress = null;
        if (order[0].shipping_address) {
            try {
                shippingAddress = JSON.parse(order[0].shipping_address);
            } catch (e) {
                console.error('Error parsing shipping address:', e);
            }
        }

        res.json({
            success: true,
            data: {
                ...order[0],
                items: items,
                shipping_address: shippingAddress
            }
        });

    } catch (error) {
        console.error('Guest order tracking error:', error);
        res.status(500).json({
            success: false,
            message: 'Sipariş bilgileri alınamadı'
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