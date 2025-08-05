const Database = require('./config/database');

async function testProducts() {
    try {
        console.log('🔍 Database bağlantısı test ediliyor...');
        const db = new Database();
        
        console.log('📊 Aktif ürün sayısını kontrol ediyorum...');
        const result = await db.query('SELECT COUNT(*) as total FROM products WHERE is_active = TRUE');
        console.log('✅ Aktif ürün sayısı:', result[0].total);
        
        if (result[0].total > 0) {
            console.log('📦 İlk 3 ürünü listeliyorum...');
            const products = await db.query('SELECT id, name, price, is_active FROM products WHERE is_active = TRUE LIMIT 3');
            products.forEach(product => {
                console.log(`- ID: ${product.id}, İsim: ${product.name}, Fiyat: ${product.price}, Aktif: ${product.is_active}`);
            });
        } else {
            console.log('⚠️ Hiç aktif ürün bulunamadı!');
        }
        
        console.log('✅ Test tamamlandı');
        process.exit(0);
    } catch (error) {
        console.error('❌ Test hatası:', error);
        process.exit(1);
    }
}

testProducts(); 