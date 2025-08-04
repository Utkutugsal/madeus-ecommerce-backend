require('dotenv').config();

console.log('🔍 Environment Variables Debug');
console.log('=============================');

// Check all PayTR related environment variables
const paytrVars = {
    'PAYTR_MERCHANT_ID': process.env.PAYTR_MERCHANT_ID,
    'PAYTR_MERCHANT_KEY': process.env.PAYTR_MERCHANT_KEY,
    'PAYTR_MERCHANT_SALT': process.env.PAYTR_MERCHANT_SALT,
    'PAYTR_TEST_MODE': process.env.PAYTR_TEST_MODE,
    'PAYTR_API_URL': process.env.PAYTR_API_URL,
    'FRONTEND_URL': process.env.FRONTEND_URL
};

console.log('\n📋 PayTR Environment Variables:');
Object.entries(paytrVars).forEach(([key, value]) => {
    const status = value ? '✅' : '❌';
    const displayValue = key.includes('KEY') || key.includes('SALT') ? 
        (value ? `${value.substring(0, 4)}...` : 'undefined') : 
        value || 'undefined';
    console.log(`${status} ${key}: ${displayValue}`);
});

// Test PayTR service initialization
console.log('\n🔧 Testing PayTR Service...');
const { paytrService } = require('./utils/payment.js');

console.log('PayTR Service Configuration:');
console.log('- Merchant ID:', paytrService.merchantId);
console.log('- Merchant Key:', paytrService.merchantKey ? `${paytrService.merchantKey.substring(0, 4)}...` : 'undefined');
console.log('- Merchant Salt:', paytrService.merchantSalt ? `${paytrService.merchantSalt.substring(0, 4)}...` : 'undefined');
console.log('- Test Mode:', paytrService.testMode);
console.log('- API URL:', paytrService.apiUrl);

// Check if credentials are valid
if (!paytrService.merchantId || !paytrService.merchantKey || !paytrService.merchantSalt) {
    console.log('\n❌ ERROR: PayTR credentials are missing!');
    console.log('Please check your environment variables.');
} else {
    console.log('\n✅ PayTR credentials are present');
    
    // Test hash creation
    try {
        const testData = {
            merchant_id: paytrService.merchantId,
            user_ip: '127.0.0.1',
            merchant_oid: 'TEST123',
            email: 'test@example.com',
            payment_amount: 100,
            payment_type: 'card',
            installment_count: 0,
            currency: 'TL',
            test_mode: paytrService.testMode
        };
        
        const hash = paytrService.createPaymentHash(testData);
        console.log('✅ Hash creation successful:', hash ? 'Yes' : 'No');
    } catch (error) {
        console.log('❌ Hash creation failed:', error.message);
    }
}

console.log('\n📝 Recommendations:');
console.log('1. Make sure all PayTR environment variables are set in Railway');
console.log('2. Check that the variable names match exactly');
console.log('3. Verify the values are correct (no extra spaces)');
console.log('4. Redeploy the application after updating environment variables'); 