const express = require('express');
const { body, query, validationResult } = require('express-validator');
const db = require('../config/database');

const router = express.Router();

// ===========================================
// PRODUCT ROUTES
// ===========================================

// Trendyol Madeus mağazasından alınan gerçek ürün verileri
const mockProducts = [
  {
    id: 7,
    name: "%100 Doğal Sivrisinek, Sinek Ve Kene Kovucu Sprey",
    slug: "madeus-dogal-sivrisinek-kovucu-sprey-100ml",
    description: "Bebek ve çocuklar için %100 doğal sivrisinek, sinek ve kene kovucu sprey. Kimyasal içermez, güvenle kullanılabilir.",
    longDescription: "%100 doğal sivrisinek, sinek ve kene kovucu sprey. Bebek ve çocuklar için güvenle kullanılabilir. Doğal aktif bileşenlerle formüle edilmiş bu sprey, zararlı kimyasallar içermeden etkili koruma sağlar. Bebek ve çocukların hassas cildi için özel olarak geliştirilmiştir. Sivrisinek, sinek ve kene gibi zararlı böceklere karşı uzun süreli koruma sağlar.",
    price: 89.90,
    originalPrice: 129.90,
    discount: 31,
    category: "Baby & Child Care",
    brand: "Madeus",
    stock: 2, // "Son 2 Ürün!"
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
    trendyolUrl: "https://www.trendyol.com/madeus/100-dogal-sivrisinek-sinek-ve-kene-kovucu-sprey-bebek-cocuk-kimyasal-icermez-100-ml-p-944516808",
    stockStatus: "limited", // Son 2 ürün
    ageGroup: "0-12 yaş",
    activeIngredients: "Sitronella Oil, Lavanta Oil",
    certification: "PETA Approved",
    safetyNote: "Bebek ve çocuklarda test edilmiştir. Alerjik reaksiyon durumunda kullanımı bırakın."
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
    usage: "Sabah ve akşam temizlenmiş cilde uygulayın. Nemlendirici öncesi kullanın.",
    features: ["Oil-free", "Non-comedogenic", "Fragrance free", "Vegan"],
    volume: "30ml",
    tags: ["niacinamide", "pore-minimizer", "oil-control", "serum"],
    isNew: true,
    isBestSeller: false,
    isFeatured: true,
    trendyolUrl: "https://www.trendyol.com/madeus/niacinamide-serum-p-12349"
  },
  {
    id: 6,
    name: "Madeus Sunscreen SPF 50",
    slug: "madeus-sunscreen-spf50",
    description: "Geniş spektrumlu güneş koruyucu krem. SPF 50 koruma ile UVA/UVB koruması sağlar.",
    longDescription: "Madeus Sunscreen SPF 50, mineral ve kimyasal filtre kombinasyonu ile güçlü güneş koruması sağlar. Su geçirmez formülü ile spor ve plaj aktivitelerine uygundur.",
    price: 179.99,
    originalPrice: 219.99,
    discount: 18,
    category: "Sun Protection",
    brand: "Madeus",
    stock: 80,
    rating: 4.4,
    reviewCount: 76,
    mainImage: "/images/products/madeus-sunscreen-main.jpg",
    images: [
      "/images/products/madeus-sunscreen-main.jpg",
      "/images/products/madeus-sunscreen-application.jpg",
      "/images/products/madeus-sunscreen-lifestyle.jpg",
      "/images/products/madeus-sunscreen-uv-protection.jpg"
    ],
    ingredients: ["Zinc Oxide", "Titanium Dioxide", "Octinoxate", "Avobenzone"],
    skinType: ["Tüm cilt tipleri", "Hassas"],
    benefits: ["SPF 50 koruma", "UVA/UVB koruması", "Su geçirmez", "Beyaz iz bırakmaz"],
    usage: "Güneşe çıkmadan 30 dakika önce cilde uygulayın. 2 saatte bir yenileyin.",
    features: ["Broad spectrum", "Water resistant", "Non-greasy", "Reef safe"],
    volume: "50ml",
    tags: ["sunscreen", "spf50", "uv-protection", "water-resistant"],
    isNew: false,
    isBestSeller: true,
    isFeatured: false,
    trendyolUrl: "https://www.trendyol.com/madeus/sunscreen-spf50-p-12350"
  }
];

// GET /api/products - Tüm ürünleri getir
router.get('/', async (req, res) => {
  try {
    const { 
      category, 
      skinType, 
      minPrice, 
      maxPrice, 
      sortBy = 'name', 
      order = 'asc',
      limit = 10,
      offset = 0,
      search,
      featured,
      bestSeller,
      isNew
    } = req.query;

    let filteredProducts = [...mockProducts];

    // Kategori filtresi
    if (category) {
      filteredProducts = filteredProducts.filter(product => 
        product.category.toLowerCase() === category.toLowerCase()
      );
    }

    // Cilt tipi filtresi
    if (skinType) {
      filteredProducts = filteredProducts.filter(product => 
        product.skinType.some(type => 
          type.toLowerCase().includes(skinType.toLowerCase())
        )
      );
    }

    // Fiyat filtresi
    if (minPrice) {
      filteredProducts = filteredProducts.filter(product => 
        product.price >= parseFloat(minPrice)
      );
    }

    if (maxPrice) {
      filteredProducts = filteredProducts.filter(product => 
        product.price <= parseFloat(maxPrice)
      );
    }

    // Arama filtresi
    if (search) {
      const searchTerm = search.toLowerCase();
      filteredProducts = filteredProducts.filter(product => 
        product.name.toLowerCase().includes(searchTerm) ||
        product.description.toLowerCase().includes(searchTerm) ||
        product.tags.some(tag => tag.includes(searchTerm))
      );
    }

    // Özel filtreler
    if (featured === 'true') {
      filteredProducts = filteredProducts.filter(product => product.isFeatured);
    }

    if (bestSeller === 'true') {
      filteredProducts = filteredProducts.filter(product => product.isBestSeller);
    }

    if (isNew === 'true') {
      filteredProducts = filteredProducts.filter(product => product.isNew);
    }

    // Sıralama
    filteredProducts.sort((a, b) => {
      let aValue = a[sortBy];
      let bValue = b[sortBy];

      if (typeof aValue === 'string') {
        aValue = aValue.toLowerCase();
        bValue = bValue.toLowerCase();
      }

      if (order === 'desc') {
        return bValue > aValue ? 1 : -1;
      }
      return aValue > bValue ? 1 : -1;
    });

    // Sayfalama
    const total = filteredProducts.length;
    const paginatedProducts = filteredProducts.slice(
      parseInt(offset), 
      parseInt(offset) + parseInt(limit)
    );

    res.json({
      success: true,
      data: {
        products: paginatedProducts,
        total,
        limit: parseInt(limit),
        offset: parseInt(offset),
        hasMore: (parseInt(offset) + parseInt(limit)) < total
      }
    });

  } catch (error) {
    console.error('Ürünler getirilirken hata:', error);
    res.status(500).json({
      success: false,
      message: 'Ürünler getirilirken hata oluştu',
      error: error.message
    });
  }
});

// Get featured products (MUST be before /:id route)
router.get('/featured/list', (req, res) => {
  try {
    const { limit = 8 } = req.query;
    const featuredProducts = mockProducts
      .filter(p => p.isFeatured)
      .slice(0, parseInt(limit));
    
    res.json({ 
      success: true,
      count: featuredProducts.length,
      products: featuredProducts 
    });
  } catch (error) {
    console.error('Featured products error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get best sellers (MUST be before /:id route)
router.get('/bestsellers/list', (req, res) => {
  try {
    const { limit = 8 } = req.query;
    const bestSellers = mockProducts
      .filter(p => p.isBestSeller)
      .slice(0, parseInt(limit));
    
    res.json({ 
      success: true,
      count: bestSellers.length,
      products: bestSellers 
    });
  } catch (error) {
    console.error('Best sellers error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get categories
router.get('/categories/list', (req, res) => {
  try {
    const categories = [...new Set(mockProducts.map(p => p.category))];
    res.json({ categories });
  } catch (error) {
    console.error('Categories error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get brands
router.get('/brands/list', (req, res) => {
  try {
    const brands = [...new Set(mockProducts.map(p => p.brand))];
    res.json({ brands });
  } catch (error) {
    console.error('Brands error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get product by ID
router.get('/:id', (req, res) => {
  try {
    const productId = parseInt(req.params.id);
    const product = mockProducts.find(p => p.id === productId);

    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    // Get related products (same category)
    const relatedProducts = mockProducts
      .filter(p => p.category === product.category && p.id !== product.id)
      .slice(0, 4);

    res.json({
      product,
      relatedProducts
    });

  } catch (error) {
    console.error('Product fetch error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get products by category
router.get('/category/:category', (req, res) => {
  try {
    const { category } = req.params;
    const { limit = 8 } = req.query;

    const categoryProducts = mockProducts
      .filter(p => p.category === category);

    res.json({ products: categoryProducts });
  } catch (error) {
    console.error('Category products error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Search products
router.get('/search/:query', (req, res) => {
  try {
    const { query } = req.params;
    const searchLower = query.toLowerCase();

    const searchResults = mockProducts.filter(p => 
      p.name.toLowerCase().includes(searchLower) ||
      p.description.toLowerCase().includes(searchLower) ||
      p.tags.some(tag => tag.toLowerCase().includes(searchLower))
    );

    res.json({ products: searchResults });
  } catch (error) {
    console.error('Search error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router; 