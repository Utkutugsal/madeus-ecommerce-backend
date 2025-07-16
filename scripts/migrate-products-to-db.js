const { Database } = require('../config/database');

// Mock products data (same as in routes/products.js)
const mockProducts = [
  {
    id: 7,
    name: "%100 Doğal Sivrisinek, Sinek Ve Kene Kovucu Sprey",
    slug: "madeus-dogal-sivrisinek-kovucu-sprey-100ml",
    description: "Bebek ve çocuklar için %100 doğal sivrisinek, sinek ve kene kovucu sprey. Kimyasal içermez, güvenle kullanılabilir.",
    longDescription: "%100 doğal sivrisinek, sinek ve kene kovucu sprey. Bebek ve çocuklar için güvenle kullanılabilir. Doğal aktif bileşenlerle formüle edilmiş bu sprey, zararlı kimyasallar içermeden etkili koruma sağlar.",
    price: 89.90,
    originalPrice: 129.90,
    discount: 31,
    category: "Baby & Child Care",
    brand: "Madeus",
    stock: 2,
    rating: 4.9,
    reviewCount: 23,
    mainImage: "/images/products/madeus-repellent-1.webp",
    images: [
      "/images/products/madeus-repellent-1.webp",
      "/images/products/madeus-repellent-2.webp",
      "/images/products/madeus-repellent-3.webp",
      "/images/products/madeus-repellent-4.webp",
      "/images/products/madeus-repellent-5.webp",
      "/images/products/madeus-repellent-6.webp",
      "/images/products/madeus-repellent-7.webp"
    ],
    ingredients: ["Doğal Esansiyel Yağlar", "Sitronella", "Lavanta Yağı", "Neem Yağı", "Aloe Vera"],
    skinType: ["Bebek Cildi", "Çocuk Cildi", "Hassas Cilt"],
    benefits: ["Sivrisinek Kovucu", "Sinek Kovucu", "Kene Kovucu", "Doğal Koruma", "Kimyasal Free"],
    usage: "Ciltten 15-20 cm uzaklıktan spreyleyin. 2-3 saatte bir tekrarlayın. Göz çevresinden kaçının.",
    features: ["100% Doğal", "Kimyasal İçermez", "Bebek Güvenli", "PETA Onaylı", "Vegan"],
    volume: "100ml",
    tags: ["doğal", "bebek", "çocuk", "sivrisinek-kovucu", "kimyasal-free", "repellent"],
    isNew: true,
    isBestSeller: false,
    isFeatured: true,
    trendyolUrl: "https://www.trendyol.com/madeus/100-dogal-sivrisinek-sinek-ve-kene-kovucu-sprey-bebek-cocuk-kimyasal-icermez-100-ml-p-944516808"
  },
  {
    id: 1,
    name: "Madeus Vitamin C Serum",
    slug: "madeus-vitamin-c-serum",
    description: "Cilde parlaklık ve canlılık kazandıran güçlü antioksidan vitamin C serumu. Yaşlanma karşıtı etkileriyle cildi gençleştirir.",
    longDescription: "Madeus Vitamin C Serum, %20 L-Askorbik Asit içeriği ile cildinizi güneş hasarına karşı korur ve yaşlanma belirtilerini azaltır. Düzenli kullanımda cilt tonu eşitlenir, lekeler açılır ve cilt daha parlak görünür.",
    price: 299.99,
    originalPrice: 399.99,
    discount: 25,
    category: "Serums",
    brand: "Madeus",
    stock: 50,
    rating: 4.8,
    reviewCount: 124,
    mainImage: "/images/products/madeus-vitamin-c-serum-main.jpg",
    images: [
      "/images/products/madeus-vitamin-c-serum-main.jpg",
      "/images/products/madeus-vitamin-c-serum-2.jpg",
      "/images/products/madeus-vitamin-c-serum-3.jpg",
      "/images/products/madeus-vitamin-c-serum-ingredients.jpg"
    ],
    ingredients: ["Vitamin C (L-Askorbik Asit)", "Hyaluronic Acid", "Vitamin E", "Ferulic Acid"],
    skinType: ["Normal", "Karma", "Yağlı"],
    benefits: ["Yaşlanma karşıtı", "Parlaklık", "Leke açıcı", "Antioksidan"],
    usage: "Temizlenmiş cilde akşam uygulanır. Güneş kremi kullanımı zorunludur.",
    features: ["Paraben free", "Cruelty free", "Vegan", "Dermatologically tested"],
    volume: "30ml",
    tags: ["vitamin-c", "anti-aging", "brightening", "serum"],
    isNew: false,
    isBestSeller: true,
    isFeatured: true,
    trendyolUrl: "https://www.trendyol.com/madeus/vitamin-c-serum-p-12345"
  },
  {
    id: 2,
    name: "Madeus Hydra Moisture Cream",
    slug: "madeus-hydra-moisture-cream",
    description: "24 saat etkili nemlendirici krem. Hyaluronic acid ve ceramide içeriği ile derin nemlendirme sağlar.",
    longDescription: "Madeus Hydra Moisture Cream, düşük ve yüksek moleküler ağırlıklı hyaluronic acid kombinasyonu ile cildinizi derinlemesine nemlendirir. Ceramide içeriği ile cilt bariyerini güçlendirir.",
    price: 199.99,
    originalPrice: 249.99,
    discount: 20,
    category: "Moisturizers",
    brand: "Madeus",
    stock: 75,
    rating: 4.6,
    reviewCount: 89,
    mainImage: "/images/products/madeus-hydra-moisture-main.jpg",
    images: [
      "/images/products/madeus-hydra-moisture-main.jpg",
      "/images/products/madeus-hydra-moisture-2.jpg",
      "/images/products/madeus-hydra-moisture-texture.jpg",
      "/images/products/madeus-hydra-moisture-lifestyle.jpg"
    ],
    ingredients: ["Hyaluronic Acid", "Ceramide", "Glycerin", "Squalane", "Niacinamide"],
    skinType: ["Kuru", "Normal", "Hassas"],
    benefits: ["24 saat nemlendirme", "Cilt bariyeri onarımı", "Yumuşatıcı", "Yatıştırıcı"],
    usage: "Sabah ve akşam temizlenmiş cilde nazikçe uygulayın.",
    features: ["Fragrance free", "Hypoallergenic", "Non-comedogenic", "Dermatologically tested"],
    volume: "50ml",
    tags: ["moisturizer", "hydrating", "hyaluronic-acid", "ceramide"],
    isNew: false,
    isBestSeller: true,
    isFeatured: true,
    trendyolUrl: "https://www.trendyol.com/madeus/hydra-moisture-cream-p-12346"
  },
  {
    id: 3,
    name: "Madeus Retinol Night Cream",
    slug: "madeus-retinol-night-cream",
    description: "Gece kullanımı için geliştirilmiş retinol içerikli yaşlanma karşıtı krem. Kırışıklıkları azaltır ve cilt dokusunu iyileştirir.",
    longDescription: "Madeus Retinol Night Cream, %0.5 retinol içeriği ile gece boyunca cildi yeniler. Kırışıklık görünümünü azaltır, cilt dokusunu düzeltir ve por görünümünü iyileştirir.",
    price: 399.99,
    originalPrice: 499.99,
    discount: 20,
    category: "Night Care",
    brand: "Madeus",
    stock: 30,
    rating: 4.9,
    reviewCount: 67,
    mainImage: "/images/products/madeus-retinol-night-main.jpg",
    images: [
      "/images/products/madeus-retinol-night-main.jpg",
      "/images/products/madeus-retinol-night-2.jpg",
      "/images/products/madeus-retinol-night-packaging.jpg",
      "/images/products/madeus-retinol-night-before-after.jpg"
    ],
    ingredients: ["Retinol", "Squalane", "Vitamin E", "Bakuchiol", "Peptides"],
    skinType: ["Normal", "Karma", "Olgun"],
    benefits: ["Kırışıklık azaltıcı", "Cilt yenileme", "Por sıkılaştırıcı", "Yaşlanma karşıtı"],
    usage: "Yalnızca gece kullanın. Temizlenmiş cilde ince tabaka halinde uygulayın. Güneş kremi kullanımı zorunludur.",
    features: ["Gradual release", "Stabilized retinol", "Dermatologically tested", "Cruelty free"],
    volume: "30ml",
    tags: ["retinol", "anti-aging", "night-cream", "wrinkle-reducer"],
    isNew: true,
    isBestSeller: false,
    isFeatured: true,
    trendyolUrl: "https://www.trendyol.com/madeus/retinol-night-cream-p-12347"
  },
  {
    id: 4,
    name: "Madeus Gentle Cleansing Foam",
    slug: "madeus-gentle-cleansing-foam",
    description: "Tüm cilt tiplerinde kullanılabilen nazik temizleyici köpük. Cildi kurutmadan derinlemesine temizler.",
    longDescription: "Madeus Gentle Cleansing Foam, amino asit bazlı temizleyici içeriği ile cildinizi tahriş etmeden temizler. pH dengesi korunmuş formülü ile cilt bariyerini destekler.",
    price: 149.99,
    originalPrice: 179.99,
    discount: 17,
    category: "Cleansers",
    brand: "Madeus",
    stock: 100,
    rating: 4.7,
    reviewCount: 156,
    mainImage: "/images/products/madeus-cleansing-foam-main.jpg",
    images: [
      "/images/products/madeus-cleansing-foam-main.jpg",
      "/images/products/madeus-cleansing-foam-foam.jpg",
      "/images/products/madeus-cleansing-foam-usage.jpg",
      "/images/products/madeus-cleansing-foam-ingredients.jpg"
    ],
    ingredients: ["Amino Acid Surfactants", "Glycerin", "Panthenol", "Allantoin"],
    skinType: ["Tüm cilt tipleri", "Hassas"],
    benefits: ["Nazik temizlik", "Nem koruması", "pH dengeli", "Yatıştırıcı"],
    usage: "Islak cilde uygulayın, köpürtün ve bol suyla durulayın. Sabah ve akşam kullanabilirsiniz.",
    features: ["Sulfate free", "Soap free", "pH balanced", "Hypoallergenic"],
    volume: "150ml",
    tags: ["cleanser", "foam", "gentle", "daily-use"],
    isNew: false,
    isBestSeller: true,
    isFeatured: false,
    trendyolUrl: "https://www.trendyol.com/madeus/gentle-cleansing-foam-p-12348"
  },
  {
    id: 5,
    name: "Madeus Niacinamide Serum",
    slug: "madeus-niacinamide-serum",
    description: "%10 Niacinamide içeren por sıkılaştırıcı serum. Yağ dengesini düzenler ve cilt dokusunu iyileştirir.",
    longDescription: "Madeus Niacinamide Serum, %10 Niacinamide ve %1 Zinc içeriği ile por görünümünü azaltır, yağ üretimini dengeler ve cilt tonunu eşitler. Karma ve yağlı ciltler için idealdir.",
    price: 249.99,
    originalPrice: 299.99,
    discount: 17,
    category: "Serums",
    brand: "Madeus",
    stock: 60,
    rating: 4.5,
    reviewCount: 98,
    mainImage: "/images/products/madeus-niacinamide-main.jpg",
    images: [
      "/images/products/madeus-niacinamide-main.jpg",
      "/images/products/madeus-niacinamide-dropper.jpg",
      "/images/products/madeus-niacinamide-texture.jpg",
      "/images/products/madeus-niacinamide-results.jpg"
    ],
    ingredients: ["Niacinamide", "Zinc PCA", "Hyaluronic Acid", "Tamarind Extract"],
    skinType: ["Yağlı", "Karma", "Akneye eğilimli"],
    benefits: ["Por sıkılaştırıcı", "Yağ dengesi", "Mat görünüm", "Cilt tonu eşitleme"],
    usage: "Sabah ve akşam temizlenmiş cilde uygulayın. Güneş kremi kullanımı önerilir.",
    features: ["Alcohol free", "Fragrance free", "Non-comedogenic", "Dermatologically tested"],
    volume: "30ml",
    tags: ["niacinamide", "pore-minimizer", "oil-control", "serum"],
    isNew: false,
    isBestSeller: false,
    isFeatured: false,
    trendyolUrl: "https://www.trendyol.com/madeus/niacinamide-serum-p-12349"
  },
  {
    id: 6,
    name: "Madeus Sunscreen SPF 50+",
    slug: "madeus-sunscreen-spf50",
    description: "Geniş spektrum korumalı SPF 50+ güneş kremi. Fiziksel ve kimyasal filtre kombinasyonu ile üstün koruma.",
    longDescription: "Madeus Sunscreen SPF 50+, UVA ve UVB ışınlarına karşı geniş spektrum koruma sağlar. Su geçirmez formülü ile plaj, havuz ve spor aktiviteleri için idealdir. Hafif dokusu sayesinde ciltte beyaz iz bırakmaz.",
    price: 179.99,
    originalPrice: 219.99,
    discount: 18,
    category: "Sun Care",
    brand: "Madeus",
    stock: 45,
    rating: 4.7,
    reviewCount: 134,
    mainImage: "/images/products/madeus-sunscreen-main.jpg",
    images: [
      "/images/products/madeus-sunscreen-main.jpg",
      "/images/products/madeus-sunscreen-application.jpg",
      "/images/products/madeus-sunscreen-beach.jpg",
      "/images/products/madeus-sunscreen-ingredients.jpg"
    ],
    ingredients: ["Zinc Oxide", "Titanium Dioxide", "Octinoxate", "Avobenzone", "Vitamin E"],
    skinType: ["Tüm cilt tipleri", "Hassas"],
    benefits: ["SPF 50+ koruma", "Su geçirmez", "UVA/UVB blok", "Antioksidan"],
    usage: "Güneşe çıkmadan 15 dakika önce cilde uygulayın. 2 saatte bir tekrarlayın.",
    features: ["Broad spectrum", "Water resistant", "Non-greasy", "Dermatologically tested"],
    volume: "50ml",
    tags: ["sunscreen", "spf50", "protection", "waterproof"],
    isNew: false,
    isBestSeller: false,
    isFeatured: false,
    trendyolUrl: "https://www.trendyol.com/madeus/sunscreen-spf50-p-12350"
  }
];

async function migrateProductsToDatabase() {
  const db = new Database();
  
  console.log('🚀 Ürünler database\'e aktarılıyor...');
  
  try {
    // Test database connection
    await db.testConnection();
    console.log('✅ Database bağlantısı başarılı');

    // Create products table if not exists (from schema)
    const createTableQuery = `
      CREATE TABLE IF NOT EXISTS products (
        id INT PRIMARY KEY AUTO_INCREMENT,
        name VARCHAR(255) NOT NULL,
        slug VARCHAR(255) UNIQUE NOT NULL,
        description TEXT,
        short_description VARCHAR(500),
        price DECIMAL(10,2) NOT NULL,
        compare_price DECIMAL(10,2),
        featured_image VARCHAR(255),
        gallery_images JSON,
        sku VARCHAR(100) UNIQUE,
        brand VARCHAR(100),
        ingredients JSON,
        skin_type JSON,
        stock INT DEFAULT 0,
        rating DECIMAL(3,2) DEFAULT 0,
        reviews_count INT DEFAULT 0,
        category_id INT DEFAULT 1,
        is_active BOOLEAN DEFAULT TRUE,
        is_featured BOOLEAN DEFAULT FALSE,
        meta_title VARCHAR(255),
        meta_description TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `;
    
    await db.query(createTableQuery);
    console.log('✅ Products tablosu hazır');

    // Insert each product
    for (const product of mockProducts) {
      const insertQuery = `
        INSERT INTO products (
          id, name, slug, description, short_description, price, compare_price,
          featured_image, gallery_images, sku, brand, ingredients, skin_type,
          stock, rating, reviews_count, is_active, is_featured,
          meta_title, meta_description
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE
          name = VALUES(name),
          price = VALUES(price),
          stock = VALUES(stock),
          rating = VALUES(rating),
          updated_at = NOW()
      `;

      const values = [
        product.id,
        product.name,
        product.slug,
        product.longDescription || product.description,
        product.description,
        product.price,
        product.originalPrice,
        product.mainImage,
        JSON.stringify(product.images || []),
        `MADEUS-${product.id}`,
        product.brand,
        JSON.stringify(product.ingredients || []),
        JSON.stringify(product.skinType || []),
        product.stock,
        product.rating,
        product.reviewCount || 0,
        true,
        product.isFeatured || false,
        product.name,
        product.description
      ];

      await db.query(insertQuery, values);
      console.log(`✅ ${product.name} kaydedildi`);
    }

    console.log('🎉 Tüm ürünler başarıyla database\'e aktarıldı!');
    
    // Verify insertion
    const countResult = await db.query('SELECT COUNT(*) as count FROM products WHERE is_active = TRUE');
    console.log(`📊 Database\'de ${countResult[0].count} aktif ürün bulunuyor`);

  } catch (error) {
    console.error('❌ Migration hatası:', error);
  } finally {
    await db.close();
  }
}

async function addCreatedAtIndex() {
  const db = new Database();
  try {
    await db.query('CREATE INDEX IF NOT EXISTS idx_created_at ON products(created_at)');
    console.log('✅ products.created_at alanına index eklendi (idx_created_at)');
  } catch (error) {
    if (error.message && error.message.includes('Duplicate key name')) {
      console.log('ℹ️ idx_created_at indexi zaten mevcut.');
    } else {
      console.error('❌ Index eklenirken hata:', error);
    }
  } finally {
    await db.close();
  }
}

if (require.main === module) {
  addCreatedAtIndex();
}

// Run migration
migrateProductsToDatabase(); 