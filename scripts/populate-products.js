const { Database } = require('../config/database');

// Mock ürün verileri (products.js'den alındı)
const products = [
  {
    id: 1,
    name: "Madeus Hydra Moisture Cream",
    price: 299.90,
    originalPrice: 399.90,
    discount: 25,
    image: "/lovable-uploads/55d08746-c441-44dc-a3aa-099dac9d5335.png",
    category: "Nemlendirici",
    brand: "Madeus",
    description: "Yoğun nemlendirme sağlayan, hassas ciltler için özel formül.",
    ingredients: ["Hyaluronic Acid", "Vitamin E", "Ceramides"],
    skinTypes: ["Kuru", "Hassas"],
    usage: "Günde 2 kez, temiz cilde uygulayın",
    stock: 50,
    isPopular: true,
    isBestSeller: true,
    rating: 4.8,
    reviewCount: 245
  },
  {
    id: 2,
    name: "Madeus Vitamin C Serum",
    price: 249.90,
    originalPrice: 329.90,
    discount: 24,
    image: "/lovable-uploads/6b2d5b35-28bf-4789-8623-f510c60e279d.png",
    category: "Serum",
    brand: "Madeus",
    description: "Güçlü antioksidan özelliği ile cildi aydınlatan vitamin C serumu.",
    ingredients: ["Vitamin C", "Niacinamide", "Hyaluronic Acid"],
    skinTypes: ["Normal", "Yağlı", "Karma"],
    usage: "Akşam temiz cilde uygulayın",
    stock: 30,
    isPopular: true,
    isBestSeller: false,
    rating: 4.6,
    reviewCount: 189
  },
  {
    id: 3,
    name: "%100 Doğal Sivrisinek, Sinek Ve Kene Kovucu Sprey",
    price: 89.90,
    originalPrice: 129.90,
    discount: 31,
    image: "/placeholder.svg",
    category: "Bebek Bakım",
    brand: "Trendyol",
    description: "Bebek ve çocuklar için %100 doğal, zararsız böcek kovucu sprey. Citronella ve Lavanta yağı ile formüle edilmiştir.",
    ingredients: ["Citronella Oil", "Lavender Oil", "Eucalyptus Oil", "Distilled Water"],
    skinTypes: ["Hassas", "Bebek"],
    usage: "Açık alanlarda kullanmadan önce cilde spreyleyin",
    stock: 2,
    isPopular: false,
    isBestSeller: false,
    rating: 4.3,
    reviewCount: 67
  },
  {
    id: 4,
    name: "Madeus Gentle Cleanser",
    price: 189.90,
    originalPrice: 249.90,
    discount: 24,
    image: "/placeholder.svg",
    category: "Temizleyici",
    brand: "Madeus",
    description: "Nazik formülü ile cildi kurutmadan derinlemesine temizleyen yüz temizleyicisi.",
    ingredients: ["Gentle Surfactants", "Aloe Vera", "Chamomile Extract"],
    skinTypes: ["Tüm Cilt Tipleri"],
    usage: "Islak cilde masaj yaparak uygulayın, bol suyla durulayın",
    stock: 45,
    isPopular: true,
    isBestSeller: false,
    rating: 4.7,
    reviewCount: 156
  },
  {
    id: 5,
    name: "Madeus Retinol Night Cream",
    price: 349.90,
    originalPrice: 449.90,
    discount: 22,
    image: "/placeholder.svg",
    category: "Gece Bakımı",
    brand: "Madeus",
    description: "Gece boyunca cildi yenileyen, yaşlanma karşıtı retinol içerikli krem.",
    ingredients: ["Retinol", "Peptides", "Squalane", "Vitamin E"],
    skinTypes: ["Normal", "Karma", "Olgun"],
    usage: "Akşam temiz cilde ince tabaka halinde uygulayın",
    stock: 25,
    isPopular: false,
    isBestSeller: true,
    rating: 4.9,
    reviewCount: 203
  },
  {
    id: 6,
    name: "Madeus Hydrating Toner",
    price: 199.90,
    originalPrice: 249.90,
    discount: 20,
    image: "/placeholder.svg",
    category: "Tonik",
    brand: "Madeus",
    description: "Cildin pH dengesini koruyarak nemlendiren, alkol içermeyen tonik.",
    ingredients: ["Rose Water", "Hyaluronic Acid", "Glycerin", "Panthenol"],
    skinTypes: ["Kuru", "Hassas", "Normal"],
    usage: "Temizlik sonrası pamuk ile cilde uygulayın",
    stock: 60,
    isPopular: true,
    isBestSeller: false,
    rating: 4.5,
    reviewCount: 134
  },
  {
    id: 7,
    name: "Madeus Eye Cream",
    price: 279.90,
    originalPrice: 349.90,
    discount: 20,
    image: "/placeholder.svg",
    category: "Göz Bakımı",
    brand: "Madeus",
    description: "Göz çevresi için özel formüle edilmiş, kırışıklık karşıtı göz kremi.",
    ingredients: ["Caffeine", "Peptides", "Vitamin K", "Hyaluronic Acid"],
    skinTypes: ["Tüm Cilt Tipleri"],
    usage: "Göz çevresine nazikçe yuvarlak hareketlerle uygulayın",
    stock: 35,
    isPopular: false,
    isBestSeller: false,
    rating: 4.4,
    reviewCount: 98
  }
];

async function populateProducts() {
  const db = new Database();
  
  try {
    console.log('Veritabanına bağlanılıyor...');
    
    // Bağlantıyı test et
    await db.testConnection();
    console.log('✅ Veritabanı bağlantısı başarılı');
    
    // Önce mevcut ürünleri sil
    await db.query('DELETE FROM products');
    console.log('✅ Mevcut ürünler silindi.');
    
    // Yeni ürünleri ekle
    for (const product of products) {
      await db.insert('products', {
        id: product.id,
        name: product.name,
        price: product.price,
        originalPrice: product.originalPrice,
        discount: product.discount,
        image: product.image,
        category: product.category,
        brand: product.brand,
        description: product.description,
        ingredients: JSON.stringify(product.ingredients),
        skinTypes: JSON.stringify(product.skinTypes),
        usage: product.usage,
        stock: product.stock,
        isPopular: product.isPopular ? 1 : 0,
        isBestSeller: product.isBestSeller ? 1 : 0,
        rating: product.rating,
        reviewCount: product.reviewCount
      });
      console.log(`✅ ${product.name} eklendi`);
    }
    
    console.log(`\n🎉 ${products.length} ürün başarıyla eklendi.`);
    
    // Kontrol et
    const countResult = await db.query('SELECT COUNT(*) as count FROM products');
    const count = countResult[0].count;
    console.log(`📊 Veritabanında toplam ${count} ürün var.`);
    
    // İlk birkaç ürünü göster
    const sampleProducts = await db.query('SELECT id, name, price, stock FROM products LIMIT 3');
    console.log('\n📋 Örnek ürünler:');
    sampleProducts.forEach(p => {
      console.log(`- ${p.name} (${p.price}₺, Stok: ${p.stock})`);
    });
    
    // Trendyol ürününü özel olarak kontrol et
    const trendyolProduct = await db.findOne("SELECT * FROM products WHERE brand = 'Trendyol'");
    if (trendyolProduct) {
      console.log('\n🔍 Trendyol ürünü bulundu:');
      console.log(`- ${trendyolProduct.name}`);
      console.log(`- Fiyat: ${trendyolProduct.price}₺ (Orijinal: ${trendyolProduct.originalPrice}₺)`);
      console.log(`- İndirim: %${trendyolProduct.discount}`);
      console.log(`- Stok: ${trendyolProduct.stock} adet`);
    }
    
  } catch (error) {
    console.error('❌ Hata:', error.message);
  } finally {
    await db.closeAll();
    console.log('\n🔚 Veritabanı bağlantısı kapatıldı.');
  }
}

// Script'i çalıştır
populateProducts(); 