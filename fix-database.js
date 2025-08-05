const mysql = require('mysql2/promise');

async function fixDatabase() {
  const connection = await mysql.createConnection({
    host: 'maglev.proxy.rlwy.net',
    port: 13251,
    user: 'root',
    password: 'yvRlDydaFsiVdGrXyoMQbOduVFkZCRzO',
    database: 'railway',
    ssl: false
  });

  try {
    console.log('🔧 Railway MySQL\'e bağlandı');
    
    // Custom slug kolonunu ekle
    await connection.execute('ALTER TABLE products ADD COLUMN custom_slug VARCHAR(255) UNIQUE');
    console.log('✅ Custom slug kolonu eklendi!');
    
    // Tablo yapısını kontrol et
    const [columns] = await connection.execute('DESCRIBE products');
    console.log('📋 Products tablosu kolonları:');
    columns.forEach(col => {
      console.log(`  - ${col.Field} (${col.Type})`);
    });
    
    // Örnek ürünleri kontrol et
    const [products] = await connection.execute('SELECT id, name, slug FROM products LIMIT 3');
    console.log('📦 Örnek ürünler:', products);
    
  } catch (error) {
    if (error.code === 'ER_DUP_FIELDNAME') {
      console.log('✅ Custom slug kolonu zaten mevcut');
    } else {
      console.error('❌ Hata:', error.message);
    }
  } finally {
    await connection.end();
    process.exit(0);
  }
}

fixDatabase(); 