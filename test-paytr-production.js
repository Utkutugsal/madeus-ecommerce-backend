const { paytrService } = require('./utils/payment.js');

// Test PayTR production configuration
console.log('🔧 Testing PayTR Production Configuration...');
console.log('Merchant ID:', paytrService.merchantId);
console.log('Test Mode:', paytrService.testMode);
console.log('API URL:', paytrService.apiUrl);

// Test with production credentials
const testData = {
    merchant_id: paytrService.merchantId,
    user_ip: '127.0.0.1',
    merchant_oid: 'TEST' + Date.now(),
    email: 'test@madeusskincare.com',
    payment_amount: 100, // 1 TL in kuruş
    payment_type: 'card',
    installment_count: 0,
    currency: 'TL',
    test_mode: paytrService.testMode,
    user_name: 'Test User',
    user_phone: '5551234567',
    user_address: 'Test Address',
    user_city: 'Istanbul',
    merchant_ok_url: 'https://madeusskincare.com/order-success',
    merchant_fail_url: 'https://madeusskincare.com/order-failed',
    user_basket: JSON.stringify([['Test Product', '1.00', 1]]),
    debug_on: paytrService.testMode,
    lang: 'tr',
    no_installment: 0,
    max_installment: 0,
    timeout_limit: 30
};

// Create hash manually to verify
const hashString = `${testData.merchant_id}${testData.user_ip}${testData.merchant_oid}${testData.email}${testData.payment_amount}${testData.payment_type}${testData.installment_count}${testData.currency}${testData.test_mode}${paytrService.merchantSalt}`;
const crypto = require('crypto');
testData.paytr_token = crypto.createHmac('sha256', paytrService.merchantKey).update(hashString).digest('base64');

console.log('Test merchant_oid:', testData.merchant_oid);
console.log('Hash string:', hashString);
console.log('Generated token:', testData.paytr_token);

// Test the connection
paytrService.testConnection()
  .then(result => {
    console.log('✅ PayTR Production Test Result:', result);
    if (result.success) {
      console.log('🎉 PayTR production connection successful!');
    } else {
      console.log('❌ PayTR production connection failed:', result.error);
    }
  })
  .catch(error => {
    console.error('💥 PayTR production test error:', error);
  }); 