const { paytrService } = require('./utils/payment.js');

console.log('🧪 Testing PayTR Connection...');
console.log('=============================');

// Check if credentials are loaded
if (!paytrService.merchantId || !paytrService.merchantKey || !paytrService.merchantSalt) {
    console.log('❌ ERROR: PayTR credentials not found!');
    console.log('Please check your environment variables.');
    console.log('');
    console.log('Expected variables:');
    console.log('- PAYTR_MERCHANT_ID');
    console.log('- PAYTR_MERCHANT_KEY');
    console.log('- PAYTR_MERCHANT_SALT');
    process.exit(1);
}

console.log('✅ PayTR credentials loaded successfully');
console.log('Merchant ID:', paytrService.merchantId);
console.log('Test Mode:', paytrService.testMode ? 'Yes' : 'No');

// Test PayTR API connection
console.log('\n🔗 Testing PayTR API connection...');

paytrService.testConnection()
    .then(result => {
        console.log('\n📊 Test Result:');
        console.log('- Success:', result.success);
        console.log('- Message:', result.message);
        
        if (result.success) {
            console.log('\n🎉 PayTR connection successful!');
            console.log('✅ Your payment system is ready to use.');
        } else {
            console.log('\n❌ PayTR connection failed');
            console.log('Error:', result.error);
            console.log('\n💡 Troubleshooting:');
            console.log('1. Check if credentials are correct');
            console.log('2. Verify internet connection');
            console.log('3. Contact PayTR support if needed');
        }
    })
    .catch(error => {
        console.log('\n💥 Test failed with error:');
        console.log(error.message);
    }); 