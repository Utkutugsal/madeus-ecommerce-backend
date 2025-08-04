const { paytrService } = require('./utils/payment.js');
const axios = require('axios');

console.log('🚀 PayTR Production Test');
console.log('=======================');

// Production modunda çalıştır
paytrService.testMode = 0; // Production mode

console.log('📋 Production Configuration:');
console.log('- Merchant ID:', paytrService.merchantId);
console.log('- Test Mode:', paytrService.testMode);
console.log('- API URL:', paytrService.apiUrl);

// Gerçek sipariş verisi
const testOrderData = {
    orderNumber: 'MD' + Date.now(),
    total: 30.99,
    email: 'tufanaydin2204@gmail.com',
    userName: 'Tufan Aydın',
    userPhone: '5551234567',
    userAddress: 'Test Address, Istanbul',
    userCity: 'Istanbul',
    items: [
        {
            name: 'Madeus Cleansing Foam',
            price: 30.99,
            quantity: 1
        }
    ]
};

console.log('\n🧪 Test Order Data:');
console.log('- Order Number:', testOrderData.orderNumber);
console.log('- Total Amount:', testOrderData.total);
console.log('- Email:', testOrderData.email);

// PayTR payment data hazırla
const userIp = '127.0.0.1';
const paymentData = paytrService.preparePaymentData(testOrderData, userIp);

console.log('\n📦 PayTR Payment Data:');
console.log('- Merchant ID:', paymentData.merchant_id);
console.log('- User IP:', paymentData.user_ip);
console.log('- Merchant OID:', paymentData.merchant_oid);
console.log('- Email:', paymentData.email);
console.log('- Payment Amount:', paymentData.payment_amount);
console.log('- Test Mode:', paymentData.test_mode);
console.log('- User Basket:', paymentData.user_basket);

// Hash doğrulama
const hashString = `${paymentData.merchant_id}${paymentData.user_ip}${paymentData.merchant_oid}${paymentData.email}${paymentData.payment_amount}${paymentData.payment_type}${paymentData.installment_count}${paymentData.currency}${paymentData.test_mode}${paytrService.merchantSalt}`;

console.log('\n🔐 Hash Verification:');
console.log('- Hash String Length:', hashString.length);
console.log('- PayTR Token:', paymentData.paytr_token ? `${paymentData.paytr_token.substring(0, 20)}...` : 'undefined');

// PayTR API'ye istek gönder
console.log('\n🌐 Sending production request to PayTR...');

const requestData = new URLSearchParams();
Object.keys(paymentData).forEach(key => {
    requestData.append(key, paymentData[key]);
});

axios.post(paytrService.apiUrl, requestData, {
    headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
    },
    timeout: 30000
})
.then(response => {
    console.log('\n✅ PayTR Production Response:');
    console.log('- Status:', response.status);
    console.log('- Status Text:', response.statusText);
    console.log('- Response Data:', response.data);
    
    if (response.data.status === 'success') {
        console.log('\n🎉 PayTR production call successful!');
        console.log('- Token:', response.data.token);
        console.log('- Payment URL:', `https://www.paytr.com/odeme/guvenli/${response.data.token}`);
        console.log('\n✅ Ödeme sistemi tam çalışır durumda!');
    } else {
        console.log('\n❌ PayTR production call failed:');
        console.log('- Reason:', response.data.reason);
        console.log('- Error Code:', response.data.error_code);
    }
})
.catch(error => {
    console.log('\n💥 PayTR Production Error:');
    console.log('- Error Type:', error.name);
    console.log('- Error Message:', error.message);
    
    if (error.response) {
        console.log('- Response Status:', error.response.status);
        console.log('- Response Data:', error.response.data);
        
        if (error.response.status === 401) {
            console.log('\n🔍 401 Error Analysis:');
            console.log('- Kimlik bilgileri yanlış olabilir');
            console.log('- Merchant ID, Key veya Salt kontrol edilmeli');
            console.log('- PayTR hesabı aktif mi kontrol edilmeli');
        }
    }
}); 