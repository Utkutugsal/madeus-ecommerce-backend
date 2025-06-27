const crypto = require('crypto');
const axios = require('axios');
require('dotenv').config();

class PayTRService {
    constructor() {
        this.merchantId = process.env.PAYTR_MERCHANT_ID;
        this.merchantKey = process.env.PAYTR_MERCHANT_KEY;
        this.merchantSalt = process.env.PAYTR_MERCHANT_SALT;
        this.apiUrl = process.env.PAYTR_API_URL || 'https://www.paytr.com/odeme/api/get-token';
        this.callbackUrl = process.env.PAYTR_CALLBACK_URL || `${process.env.FRONTEND_URL}/api/payment/callback`;
        this.testMode = process.env.NODE_ENV === 'development' ? 1 : 0;
    }

    // Create payment hash for security
    createPaymentHash(data) {
        const hashString = `${data.merchant_id}${data.user_ip}${data.merchant_oid}${data.email}${data.payment_amount}${data.payment_type}${data.installment_count}${data.currency}${data.test_mode}${this.merchantSalt}`;
        return crypto.createHmac('sha256', this.merchantKey).update(hashString).digest('base64');
    }

    // Prepare payment data for PayTR
    preparePaymentData(orderData, userIp) {
        // Convert items to PayTR format
        const userBasket = orderData.items.map(item => [
            item.name,
            item.price.toFixed(2),
            item.quantity
        ]);

        const paymentData = {
            merchant_id: this.merchantId,
            user_ip: userIp,
            merchant_oid: orderData.orderNumber,
            email: orderData.email,
            payment_amount: Math.round(orderData.total * 100), // Convert to kuruş (cents)
            payment_type: 'card',
            installment_count: 0,
            currency: 'TL',
            test_mode: this.testMode,
            
            // User information
            user_name: orderData.userName,
            user_phone: orderData.userPhone,
            user_address: orderData.userAddress,
            user_city: orderData.userCity,
            
            // URLs
            merchant_ok_url: `${process.env.FRONTEND_URL}/order-success`,
            merchant_fail_url: `${process.env.FRONTEND_URL}/order-failed`,
            
            // Basket items
            user_basket: JSON.stringify(userBasket),
            
            // Optional fields
            debug_on: this.testMode,
            lang: 'tr',
            no_installment: 0,
            max_installment: 0,
            timeout_limit: 30
        };

        // Generate security hash
        paymentData.paytr_token = this.createPaymentHash(paymentData);
        
        return paymentData;
    }

    // Create payment request to PayTR
    async createPayment(orderData, userIp) {
        try {
            const paymentData = this.preparePaymentData(orderData, userIp);
            
            console.log('Creating PayTR payment request:', {
                merchant_oid: paymentData.merchant_oid,
                amount: paymentData.payment_amount,
                email: paymentData.email
            });

            const response = await axios.post(this.apiUrl, paymentData, {
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded'
                },
                timeout: 30000
            });

            const result = response.data;

            if (result.status === 'success') {
                return {
                    success: true,
                    token: result.token,
                    paymentUrl: `https://www.paytr.com/odeme/guvenli/${result.token}`,
                    data: paymentData
                };
            } else {
                console.error('PayTR payment creation failed:', result);
                return {
                    success: false,
                    error: result.reason || 'Payment creation failed',
                    code: result.error_code
                };
            }

        } catch (error) {
            console.error('PayTR API error:', error.message);
            return {
                success: false,
                error: 'Payment service temporarily unavailable',
                details: error.message
            };
        }
    }

    // Verify PayTR callback
    verifyCallback(postData) {
        try {
            const {
                merchant_oid,
                status,
                total_amount,
                hash,
                failed_reason_code,
                failed_reason_msg,
                test_mode,
                payment_type,
                currency,
                payment_amount
            } = postData;

            // Create verification hash
            const hashString = `${merchant_oid}${this.merchantSalt}${status}${total_amount}`;
            const calculatedHash = crypto.createHmac('sha256', this.merchantKey)
                .update(hashString)
                .digest('base64');

            const isValid = calculatedHash === hash;

            return {
                isValid,
                orderNumber: merchant_oid,
                status: status === 'success' ? 'paid' : 'failed',
                amount: parseFloat(total_amount),
                paymentType: payment_type,
                currency,
                testMode: test_mode,
                failureReason: status === 'failed' ? {
                    code: failed_reason_code,
                    message: failed_reason_msg
                } : null,
                rawData: postData
            };

        } catch (error) {
            console.error('Callback verification error:', error);
            return {
                isValid: false,
                error: error.message
            };
        }
    }

    // Create refund request
    async createRefund(orderNumber, amount, reason = 'Customer request') {
        try {
            const refundData = {
                merchant_id: this.merchantId,
                merchant_oid: orderNumber,
                return_amount: Math.round(amount * 100), // Convert to kuruş
                reason: reason
            };

            // Create refund hash
            const hashString = `${refundData.merchant_id}${refundData.merchant_oid}${refundData.return_amount}${this.merchantSalt}`;
            refundData.hash = crypto.createHmac('sha256', this.merchantKey)
                .update(hashString)
                .digest('base64');

            const response = await axios.post('https://www.paytr.com/odeme/iade', refundData, {
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded'
                },
                timeout: 30000
            });

            const result = response.data;

            return {
                success: result.status === 'success',
                message: result.message || result.reason,
                refundId: result.return_id,
                data: result
            };

        } catch (error) {
            console.error('Refund request error:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    // Validate payment amount
    validatePaymentAmount(amount) {
        const minAmount = 1.00; // Minimum 1 TL
        const maxAmount = 10000.00; // Maximum 10,000 TL
        
        if (amount < minAmount) {
            return {
                valid: false,
                error: `Minimum payment amount is ₺${minAmount}`
            };
        }
        
        if (amount > maxAmount) {
            return {
                valid: false,
                error: `Maximum payment amount is ₺${maxAmount}`
            };
        }
        
        return { valid: true };
    }

    // Test PayTR connection
    async testConnection() {
        try {
            // Create a test payment data
            const testData = {
                merchant_id: this.merchantId,
                user_ip: '127.0.0.1',
                merchant_oid: 'TEST_' + Date.now(),
                email: 'test@example.com',
                payment_amount: 100, // 1 TL in kuruş
                payment_type: 'card',
                installment_count: 0,
                currency: 'TL',
                test_mode: 1,
                user_name: 'Test User',
                user_phone: '5551234567',
                user_address: 'Test Address',
                user_city: 'Istanbul',
                merchant_ok_url: 'https://example.com/success',
                merchant_fail_url: 'https://example.com/fail',
                user_basket: JSON.stringify([['Test Product', '1.00', 1]]),
                debug_on: 1,
                lang: 'tr'
            };

            testData.paytr_token = this.createPaymentHash(testData);

            const response = await axios.post(this.apiUrl, testData, {
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded'
                },
                timeout: 10000
            });

            console.log('PayTR connection test result:', response.data);
            
            return {
                success: response.data.status === 'success' || response.data.status === 'error',
                message: response.data.reason || 'Connection successful',
                data: response.data
            };

        } catch (error) {
            console.error('PayTR connection test failed:', error.message);
            return {
                success: false,
                error: error.message
            };
        }
    }

    // Format order data for PayTR
    formatOrderForPayment(order, user, orderItems, shippingAddress) {
        return {
            orderNumber: order.order_number,
            total: order.total_amount,
            email: user.email,
            userName: user.name,
            userPhone: user.phone || '5551234567',
            userAddress: shippingAddress ? 
                `${shippingAddress.address_line_1}, ${shippingAddress.district}` : 
                'Default Address',
            userCity: shippingAddress ? shippingAddress.city : 'Istanbul',
            items: orderItems.map(item => ({
                name: item.product_name,
                price: item.unit_price,
                quantity: item.quantity
            }))
        };
    }
}

// Utility functions
const paytrUtils = {
    // Generate unique order number
    generateOrderNumber() {
        const timestamp = Date.now();
        const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
        return `MD${timestamp}${random}`;
    },

    // Calculate installment options
    calculateInstallments(amount) {
        const installmentOptions = [];
        const minInstallmentAmount = 100; // Minimum 100 TL for installments
        
        if (amount >= minInstallmentAmount) {
            for (let i = 2; i <= 12; i++) {
                const installmentAmount = amount / i;
                if (installmentAmount >= minInstallmentAmount / 2) {
                    installmentOptions.push({
                        count: i,
                        amount: parseFloat(installmentAmount.toFixed(2)),
                        total: amount
                    });
                }
            }
        }
        
        return installmentOptions;
    },

    // Format Turkish Lira
    formatCurrency(amount) {
        return new Intl.NumberFormat('tr-TR', {
            style: 'currency',
            currency: 'TRY'
        }).format(amount);
    }
};

// Create singleton instance
const paytrService = new PayTRService();

module.exports = { 
    paytrService, 
    paytrUtils,
    PayTRService 
}; 