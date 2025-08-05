const { db } = require('./config/database');

async function addCustomSlugColumn() {

  
  try {
    console.log('🔧 Custom slug kolonu ekleniyor...');
    
    // Kolonu ekle
    await db.query('ALTER TABLE products ADD COLUMN custom_slug VARCHAR(255) UNIQUE');
    
    console.log('✅ Custom slug kolonu başarıyla eklendi!');
    
    // Mevcut ürünleri kontrol et
    const products = await db.query('SELECT id, name, slug FROM products LIMIT 5');
    console.log('📋 Örnek ürünler:', products);
    
  } catch (error) {
    if (error.code === 'ER_DUP_FIELDNAME') {
      console.log('✅ Custom slug kolonu zaten mevcut');
    } else {
      console.error('❌ Hata:', error.message);
    }
  } finally {
    process.exit(0);
  }
}

addCustomSlugColumn(); 