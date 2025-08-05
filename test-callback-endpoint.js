const axios = require('axios');

console.log('🧪 Testing PayTR Callback Endpoint');
console.log('===================================');

const callbackUrl = 'https://madeus-ecommerce-backend-production.up.railway.app/api/payment/callback';

console.log('📋 Test Details:');
console.log('- Callback URL:', callbackUrl);
console.log('- Method: POST');

// Test callback data (PayTR'den gelecek veri formatı)
const testCallbackData = {
    hash: 'test_hash',
    merchant_oid: 'MD' + Date.now(),
    status: 'success',
    total_amount: 3099,
    payment_amount: 3099,
    payment_type: 'card',
    currency: 'TL',
    callback_id: 'test_callback',
    merchant_id: '598536',
    test_mode: 1
};

console.log('\n📤 Sending test callback data:');
console.log('- Merchant OID:', testCallbackData.merchant_oid);
console.log('- Status:', testCallbackData.status);
console.log('- Total Amount:', testCallbackData.total_amount);

// Test callback endpoint
axios.post(callbackUrl, testCallbackData, {
    headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
    },
    timeout: 10000
})
.then(response => {
    console.log('\n✅ Callback Endpoint Response:');
    console.log('- Status:', response.status);
    console.log('- Status Text:', response.statusText);
    console.log('- Response Data:', response.data);
    
    if (response.status === 200) {
        console.log('\n🎉 Callback endpoint is working!');
        console.log('✅ PayTR can send notifications to your site');
    }
})
.catch(error => {
    console.log('\n💥 Callback Endpoint Error:');
    console.log('- Error Type:', error.name);
    console.log('- Error Message:', error.message);
    
    if (error.response) {
        console.log('- Response Status:', error.response.status);
        console.log('- Response Data:', error.response.data);
        
        if (error.response.status === 404) {
            console.log('\n❌ Callback endpoint not found!');
            console.log('Check if the route is properly deployed');
        } else if (error.response.status === 500) {
            console.log('\n❌ Callback endpoint has internal error!');
            console.log('Check the server logs for details');
        }
    } else if (error.code === 'ECONNREFUSED') {
        console.log('\n❌ Cannot connect to callback endpoint!');
        console.log('Check if the server is running and accessible');
    }
});

// Test callback test endpoint
console.log('\n🔍 Testing callback test endpoint...');
const testEndpointUrl = 'https://madeus-ecommerce-backend-production.up.railway.app/api/payment/callback-test';

axios.get(testEndpointUrl)
.then(response => {
    console.log('\n✅ Callback Test Endpoint Response:');
    console.log('- Status:', response.status);
    console.log('- Data:', response.data);
})
.catch(error => {
    console.log('\n❌ Callback Test Endpoint Error:');
    console.log('- Error:', error.message);
}); 