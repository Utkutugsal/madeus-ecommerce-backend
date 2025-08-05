const axios = require('axios');

async function testAPIConnection() {
    try {
        console.log('🔍 API bağlantısı test ediliyor...');
        
        const apiUrl = 'https://madeus-ecommerce-backend-production.up.railway.app/api';
        
        // 1. Health check
        console.log('📡 Health check...');
        const healthResponse = await axios.get(`${apiUrl.replace('/api', '')}/health`);
        console.log('✅ Health check başarılı:', healthResponse.status);
        
        // 2. Products API test
        console.log('📦 Products API test...');
        const productsResponse = await axios.get(`${apiUrl}/products?limit=5`);
        console.log('✅ Products API başarılı:', productsResponse.status);
        console.log('📊 Ürün sayısı:', productsResponse.data?.data?.products?.length || 0);
        
        if (productsResponse.data?.data?.products?.length > 0) {
            const firstProduct = productsResponse.data.data.products[0];
            console.log('📝 İlk ürün:', {
                id: firstProduct.id,
                name: firstProduct.name,
                description: firstProduct.description ? 'Var' : 'Yok',
                price: firstProduct.price
            });
        }
        
        // 3. Rate limiting test
        console.log('⚡ Rate limiting test...');
        for (let i = 0; i < 5; i++) {
            try {
                await axios.get(`${apiUrl}/products?limit=1`);
                console.log(`✅ Request ${i + 1} başarılı`);
            } catch (error) {
                console.log(`❌ Request ${i + 1} başarısız:`, error.response?.status);
            }
        }
        
        console.log('✅ API test tamamlandı');
        
    } catch (error) {
        console.error('❌ API test hatası:', error.message);
        if (error.response) {
            console.error('📡 Response status:', error.response.status);
            console.error('📡 Response data:', error.response.data);
        }
    }
}

testAPIConnection(); 