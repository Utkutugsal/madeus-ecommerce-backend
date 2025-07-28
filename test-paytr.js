const { paytrService } = require('./utils/payment.js');

// Set PayTR credentials
paytrService.merchantId = '598536';
paytrService.merchantKey = 'Uw41HT9k4UtXWLDT';
paytrService.merchantSalt = '5F1Gm1fe6ffaFHpo';
paytrService.testMode = 1; // Test mode

console.log('🔧 Testing PayTR connection...');
console.log('Merchant ID:', paytrService.merchantId);
console.log('Test Mode:', paytrService.testMode);

// Test with proper merchant_oid format
const testData = {
    merchant_id: paytrService.merchantId,
    user_ip: '127.0.0.1',
    merchant_oid: 'TEST' + Date.now(), // Remove underscore
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
    lang: 'tr',
    no_installment: 0,
    max_installment: 0,
    timeout_limit: 30
};

// Create hash manually
const hashString = `${testData.merchant_id}${testData.user_ip}${testData.merchant_oid}${testData.email}${testData.payment_amount}${testData.payment_type}${testData.installment_count}${testData.currency}${testData.test_mode}${paytrService.merchantSalt}`;
const crypto = require('crypto');
testData.paytr_token = crypto.createHmac('sha256', paytrService.merchantKey).update(hashString).digest('base64');

console.log('Test merchant_oid:', testData.merchant_oid);
console.log('Hash string:', hashString);
console.log('Generated token:', testData.paytr_token);

paytrService.testConnection()
  .then(result => {
    console.log('✅ PayTR Test Result:', result);
    if (result.success) {
      console.log('🎉 PayTR connection successful!');
    } else {
      console.log('❌ PayTR connection failed:', result.error);
    }
  })
  .catch(error => {
    console.error('💥 PayTR test error:', error);
  }); 