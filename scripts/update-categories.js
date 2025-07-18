const { Database } = require('../config/database.js');

async function updateCategories() {
  const db = new Database();
  
  try {
    console.log('🔄 Kategoriler güncelleniyor...');
    
    // Önce mevcut kategorileri temizle
    await db.query('DELETE FROM categories');
    console.log('✅ Eski kategoriler temizlendi');
    
    // Yeni basit kategorileri ekle
    const categories = [
      { name: 'Dudak Bakımı', slug: 'dudak-bakimi', description: 'SPF korumalı ve nemlendirici dudak ürünleri' },
      { name: 'Yüz Serumları', slug: 'yuz-serumlari', description: 'Vitamin C, Hyaluronic Acid, Bakuchiol ve diğer özel bakım serumları' },
      { name: 'Temizlik Ürünleri', slug: 'temizlik-urunleri', description: 'Yüz temizleme jelleri, tonikler ve gözenek bakım ürünleri' },
      { name: 'Güneş Koruma', slug: 'gunes-koruma', description: 'SPF içerikli koruyucu kremler ve güneş bakım ürünleri' },
      { name: 'Saç Bakımı', slug: 'sac-bakimi', description: 'Doğal saç toniği ve saç bakım ürünleri' },
      { name: 'Aksesuarlar', slug: 'aksesuarlar', description: 'Cilt bakım rutini için pratik aksesuarlar ve araçlar' }
    ];
    
    for (const category of categories) {
      await db.query('INSERT INTO categories (name, slug, description) VALUES (?, ?, ?)', 
        [category.name, category.slug, category.description]);
    }
    
    console.log('✅ Kategoriler başarıyla güncellendi!');
    console.log('📋 Yeni kategoriler:');
    
    const result = await db.query('SELECT * FROM categories ORDER BY id');
    result.forEach(cat => console.log(`- ID: ${cat.id}, Name: ${cat.name}`));
    
  } catch (error) {
    console.error('❌ Hata:', error);
  } finally {
    process.exit();
  }
}

updateCategories(); 

async function updateCategories() {
  const db = new Database();
  
  try {
    console.log('🔄 Kategoriler güncelleniyor...');
    
    // Önce mevcut kategorileri temizle
    await db.query('DELETE FROM categories');
    console.log('✅ Eski kategoriler temizlendi');
    
    // Yeni basit kategorileri ekle
    const categories = [
      { name: 'Dudak Bakımı', slug: 'dudak-bakimi', description: 'SPF korumalı ve nemlendirici dudak ürünleri' },
      { name: 'Yüz Serumları', slug: 'yuz-serumlari', description: 'Vitamin C, Hyaluronic Acid, Bakuchiol ve diğer özel bakım serumları' },
      { name: 'Temizlik Ürünleri', slug: 'temizlik-urunleri', description: 'Yüz temizleme jelleri, tonikler ve gözenek bakım ürünleri' },
      { name: 'Güneş Koruma', slug: 'gunes-koruma', description: 'SPF içerikli koruyucu kremler ve güneş bakım ürünleri' },
      { name: 'Saç Bakımı', slug: 'sac-bakimi', description: 'Doğal saç toniği ve saç bakım ürünleri' },
      { name: 'Aksesuarlar', slug: 'aksesuarlar', description: 'Cilt bakım rutini için pratik aksesuarlar ve araçlar' }
    ];
    
    for (const category of categories) {
      await db.query('INSERT INTO categories (name, slug, description) VALUES (?, ?, ?)', 
        [category.name, category.slug, category.description]);
    }
    
    console.log('✅ Kategoriler başarıyla güncellendi!');
    console.log('📋 Yeni kategoriler:');
    
    const result = await db.query('SELECT * FROM categories ORDER BY id');
    result.forEach(cat => console.log(`- ID: ${cat.id}, Name: ${cat.name}`));
    
  } catch (error) {
    console.error('❌ Hata:', error);
  } finally {
    process.exit();
  }
}

updateCategories(); 