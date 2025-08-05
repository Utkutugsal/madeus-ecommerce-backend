const { paytrService } = require('./utils/payment.js');
const axios = require('axios');
const crypto = require('crypto');

console.log('🚀 PayTR Official Documentation Test');
console.log('===================================');

// PayTR resmi dokümantasyonuna göre test verisi
const merchant_id = paytrService.merchantId;
const user_ip = '127.0.0.1';
const merchant_oid = 'MD' + Date.now();
const email = 'test@madeusskincare.com';
const payment_amount = 3099; // 30.99 TL in kuruş
const user_basket = JSON.stringify([['Madeus Cleansing Foam', '30.99', 1]]);
const no_installment = 0;
const max_installment = 0;
const currency = 'TL';
const test_mode = paytrService.testMode;
const merchant_salt = paytrService.merchantSalt;
const merchant_key = paytrService.merchantKey;

console.log('📋 Test Configuration:');
console.log('- Merchant ID:', merchant_id);
console.log('- Test Mode:', test_mode);
console.log('- Payment Amount:', payment_amount);
console.log('- User Basket:', user_basket);

// PayTR resmi hash yöntemi
const hashSTR = `${merchant_id}${user_ip}${merchant_oid}${email}${payment_amount}${user_basket}${no_installment}${max_installment}${currency}${test_mode}`;
const paytr_token = hashSTR + merchant_salt;
const token = crypto.createHmac('sha256', merchant_key).update(paytr_token).digest('base64');

console.log('\n🔐 Hash Details (Official Method):');
console.log('- Hash String:', hashSTR);
console.log('- PayTR Token:', paytr_token);
console.log('- Final Token:', token);

// PayTR API'ye istek gönder
console.log('\n🌐 Sending request to PayTR API...');

const requestData = new URLSearchParams();
requestData.append('merchant_id', merchant_id);
requestData.append('user_ip', user_ip);
requestData.append('merchant_oid', merchant_oid);
requestData.append('email', email);
requestData.append('payment_amount', payment_amount);
requestData.append('user_basket', user_basket);
requestData.append('no_installment', no_installment);
requestData.append('max_installment', max_installment);
requestData.append('currency', currency);
requestData.append('test_mode', test_mode);
requestData.append('user_name', 'Test User');
requestData.append('user_phone', '5551234567');
requestData.append('user_address', 'Test Address');
requestData.append('user_city', 'Istanbul');
requestData.append('merchant_ok_url', 'https://madeusskincare.com/order-success');
requestData.append('merchant_fail_url', 'https://madeusskincare.com/order-failed');
requestData.append('timeout_limit', 30);
requestData.append('debug_on', test_mode);
requestData.append('lang', 'tr');
requestData.append('paytr_token', token);

axios.post('https://www.paytr.com/odeme/api/get-token', requestData, {
    headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
    },
    timeout: 30000
})
.then(response => {
    console.log('\n✅ PayTR API Response:');
    console.log('- Status:', response.status);
    console.log('- Status Text:', response.statusText);
    console.log('- Response Data:', response.data);
    
    if (response.data.status === 'success') {
        console.log('\n🎉 PayTR API call successful!');
        console.log('- Token:', response.data.token);
        console.log('- Payment URL:', `https://www.paytr.com/odeme/guvenli/${response.data.token}`);
        console.log('\n✅ Ödeme sistemi resmi dokümantasyona göre çalışıyor!');
    } else {
        console.log('\n❌ PayTR API call failed:');
        console.log('- Reason:', response.data.reason);
        console.log('- Error Code:', response.data.error_code);
    }
})
.catch(error => {
    console.log('\n💥 PayTR API Error:');
    console.log('- Error Type:', error.name);
    console.log('- Error Message:', error.message);
    
    if (error.response) {
        console.log('- Response Status:', error.response.status);
        console.log('- Response Data:', error.response.data);
        
        if (error.response.status === 401) {
            console.log('\n🔍 401 Error Analysis:');
            console.log('- Kimlik bilgileri kontrol edilmeli');
            console.log('- PayTR hesap durumu kontrol edilmeli');
            console.log('- Hash yöntemi doğru mu kontrol edilmeli');
        }
    }
});

console.log('\n📚 PayTR Official Documentation:');
console.log('- iFrame API: https://dev.paytr.com/iframe-api');
console.log('- Hash Method: https://dev.paytr.com/iframe-api/iframe-api-1-adim'); 