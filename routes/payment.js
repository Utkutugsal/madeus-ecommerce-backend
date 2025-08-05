const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const Database = require('../config/database');

// PayTR callback route
router.post('/callback', async (req, res) => {
    try {
        console.log('🔔 PayTR Callback Received:', req.body);
        
        const callback = req.body;
        
        // PayTR'den gelen verileri doğrula
        const merchant_salt = process.env.PAYTR_MERCHANT_SALT;
        const merchant_key = process.env.PAYTR_MERCHANT_KEY;
        
        // Hash doğrulama (PayTR resmi yöntemi)
        const token = callback.merchant_oid + merchant_salt + callback.status + callback.total_amount;
        const paytr_token = crypto.createHmac('sha256', merchant_key).update(token).digest('base64');
        
        // Hash kontrolü
        if (paytr_token !== callback.hash) {
            console.error('❌ PayTR callback hash verification failed');
            return res.status(400).send('Hash verification failed');
        }
        
        console.log('✅ PayTR callback hash verified successfully');
        
        // Callback verilerini logla
        console.log('📋 Callback Data:');
        console.log('- Merchant OID:', callback.merchant_oid);
        console.log('- Status:', callback.status);
        console.log('- Total Amount:', callback.total_amount);
        console.log('- Payment Amount:', callback.payment_amount);
        console.log('- Payment Type:', callback.payment_type);
        console.log('- Currency:', callback.currency);
        console.log('- Test Mode:', callback.test_mode);
        
        // Sipariş durumunu güncelle
        const db = new Database();
        
        if (callback.status === 'success') {
            // Başarılı ödeme
            await db.query(
                `UPDATE orders SET 
                 status = 'paid', 
                 payment_status = 'completed',
                 payment_amount = ?,
                 payment_type = ?,
                 updated_at = NOW()
                 WHERE order_number = ?`,
                [
                    callback.total_amount / 100, // Kuruş'tan TL'ye çevir
                    callback.payment_type,
                    callback.merchant_oid
                ]
            );
            
            console.log('✅ Order payment completed successfully');
            
        } else {
            // Başarısız ödeme
            await db.query(
                `UPDATE orders SET 
                 status = 'cancelled', 
                 payment_status = 'failed',
                 updated_at = NOW()
                 WHERE order_number = ?`,
                [callback.merchant_oid]
            );
            
            console.log('❌ Order payment failed');
        }
        
        // PayTR'ye OK yanıtı gönder (zorunlu)
        res.send('OK');
        
    } catch (error) {
        console.error('💥 PayTR callback error:', error);
        res.status(500).send('Internal server error');
    }
});

// PayTR callback test route
router.get('/callback-test', (req, res) => {
    res.json({
        message: 'PayTR callback endpoint is working',
        endpoint: '/api/payment/callback',
        method: 'POST'
    });
});

module.exports = router; 