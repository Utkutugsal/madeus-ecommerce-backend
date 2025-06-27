const db = require('../config/database');
require('dotenv').config();

// Existing product data from frontend
const sampleProducts = [
    {
        name: "Vitamin C Serum",
        slug: "vitamin-c-serum",
        description: "Cildinizi aydınlatan ve yaşlanma karşıtı etkili serum. Doğal vitamin C ile zenginleştirilmiş formülü sayesinde cildinize ışıltı kazandırır.",
        short_description: "Cildinizi aydınlatan ve yaşlanma karşıtı etkili serum.",
        price: 299.00,
        featured_image: "https://images.unsplash.com/photo-1620916566398-39f1143ab7be?w=400&h=500&fit=crop",
        category_id: 1, // Serumlar
        brand: "Madeus",
        ingredients: JSON.stringify(["Vitamin C", "Hyaluronic Acid", "Niacinamide"]),
        skin_type: JSON.stringify(["Karma", "Yağlı", "Normal"]),
        stock: 50,
        rating: 4.8,
        reviews_count: 124,
        sku: "MD-VC-001",
        is_active: true,
        is_featured: true
    },
    {
        name: "Hyaluronic Acid Moisturizer",
        slug: "hyaluronic-acid-moisturizer",
        description: "Yoğun nemlendirici etki için hyaluronik asit içeren krem. 24 saat nem kilidi sağlar.",
        short_description: "24 saat nem kilidi sağlayan yoğun nemlendirici.",
        price: 349.00,
        featured_image: "https://images.unsplash.com/photo-1608248543803-ba4f8c70ae0b?w=400&h=500&fit=crop",
        category_id: 2, // Nemlendiriciler
        brand: "Madeus",
        ingredients: JSON.stringify(["Hyaluronic Acid", "Ceramides", "Peptides"]),
        skin_type: JSON.stringify(["Kuru", "Hassas", "Normal"]),
        stock: 30,
        rating: 4.9,
        reviews_count: 89,
        sku: "MD-HA-002",
        is_active: true,
        is_featured: true
    },
    {
        name: "Gentle Cleanser",
        slug: "gentle-cleanser",
        description: "Hassas ciltler için yumuşak ve etkili temizleme jeli. Cildi kurutmadan derinlemesine temizler.",
        short_description: "Hassas ciltler için yumuşak temizleme jeli.",
        price: 199.00,
        featured_image: "https://images.unsplash.com/photo-1556228578-8c89e6adf883?w=400&h=500&fit=crop",
        category_id: 3, // Temizleyiciler
        brand: "Madeus",
        ingredients: JSON.stringify(["Gentle Surfactants", "Aloe Vera", "Chamomile"]),
        skin_type: JSON.stringify(["Hassas", "Kuru", "Normal"]),
        stock: 75,
        rating: 4.7,
        reviews_count: 156,
        sku: "MD-GC-003",
        is_active: true,
        is_featured: false
    },
    {
        name: "Retinol Night Cream",
        slug: "retinol-night-cream",
        description: "Gece kullanımı için yenileyici retinol kremi. Yaşlanma karşıtı etkisiyle cildi yeniler.",
        short_description: "Gece kullanımı için yenileyici retinol kremi.",
        price: 399.00,
        featured_image: "https://images.unsplash.com/photo-1571781926291-c477ebfd024b?w=400&h=500&fit=crop",
        category_id: 4, // Gece Kremi
        brand: "Madeus",
        ingredients: JSON.stringify(["Retinol", "Peptides", "Vitamin E"]),
        skin_type: JSON.stringify(["Olgun", "Karma", "Normal"]),
        stock: 25,
        rating: 4.6,
        reviews_count: 92,
        sku: "MD-RN-004",
        is_active: true,
        is_featured: true
    },
    {
        name: "Niacinamide Toner",
        slug: "niacinamide-toner",
        description: "Gözenekleri sıkılaştıran ve cildi dengeleyici toner. Sebum kontrolü sağlar.",
        short_description: "Gözenekleri sıkılaştıran dengeleyici toner.",
        price: 249.00,
        featured_image: "https://images.unsplash.com/photo-1598440947619-2c35fc9aa908?w=400&h=500&fit=crop",
        category_id: 5, // Tonerler
        brand: "Madeus",
        ingredients: JSON.stringify(["Niacinamide", "Zinc", "Hyaluronic Acid"]),
        skin_type: JSON.stringify(["Yağlı", "Karma", "Akneli"]),
        stock: 60,
        rating: 4.5,
        reviews_count: 78,
        sku: "MD-NT-005",
        is_active: true,
        is_featured: false
    },
    {
        name: "Clay Mask",
        slug: "clay-mask",
        description: "Derin temizleme için kil maskesi. Gözenekleri temizler ve sıkılaştırır.",
        short_description: "Derin temizleme için kil maskesi.",
        price: 179.00,
        featured_image: "https://images.unsplash.com/photo-1596755389378-c31d21fd1273?w=400&h=500&fit=crop",
        category_id: 6, // Maskeler
        brand: "Madeus",
        ingredients: JSON.stringify(["Bentonite Clay", "Charcoal", "Tea Tree Oil"]),
        skin_type: JSON.stringify(["Yağlı", "Karma", "Akneli"]),
        stock: 40,
        rating: 4.4,
        reviews_count: 67,
        sku: "MD-CM-006",
        is_active: true,
        is_featured: false
    }
];

// Additional sample coupons
const sampleCoupons = [
    {
        code: "MADEUS10",
        name: "10% İndirim",
        description: "Tüm ürünlerde geçerli %10 indirim kuponu",
        discount_type: "percentage",
        discount_value: 10.00,
        minimum_amount: 200.00,
        maximum_discount: 100.00,
        usage_limit: 100,
        usage_limit_per_customer: 1,
        is_active: true,
        expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days from now
    },
    {
        code: "YENIMUSTERI",
        name: "Yeni Müşteri İndirimi",
        description: "Yeni müşteriler için 50₺ indirim",
        discount_type: "fixed_amount",
        discount_value: 50.00,
        minimum_amount: 300.00,
        usage_limit: 200,
        usage_limit_per_customer: 1,
        is_active: true,
        expires_at: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000) // 60 days from now
    },
    {
        code: "UCRETSZKARGO",
        name: "Ücretsiz Kargo",
        description: "Ücretsiz kargo kuponu",
        discount_type: "free_shipping",
        discount_value: 0.00,
        minimum_amount: 150.00,
        usage_limit: 50,
        usage_limit_per_customer: 1,
        is_active: true,
        expires_at: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000) // 15 days from now
    }
];

async function migrateProducts() {
    try {
        console.log('🚀 Starting product migration...');

        // Check if products already exist
        const existingProducts = await db.query('SELECT COUNT(*) as count FROM products');
        if (existingProducts[0].count > 0) {
            console.log('⚠️  Products already exist in database. Skipping migration.');
            console.log(`📊 Current product count: ${existingProducts[0].count}`);
            return;
        }

        // Insert products
        let insertedCount = 0;
        for (const product of sampleProducts) {
            try {
                const result = await db.insert('products', product);
                console.log(`✅ Inserted product: ${product.name} (ID: ${result.insertId})`);
                insertedCount++;
            } catch (error) {
                console.error(`❌ Failed to insert product ${product.name}:`, error.message);
            }
        }

        console.log(`📦 Successfully migrated ${insertedCount} products`);

        // Insert sample coupons
        console.log('🎟️  Inserting sample coupons...');
        let couponCount = 0;
        for (const coupon of sampleCoupons) {
            try {
                const result = await db.insert('coupons', coupon);
                console.log(`✅ Inserted coupon: ${coupon.code} (ID: ${result.insertId})`);
                couponCount++;
            } catch (error) {
                console.error(`❌ Failed to insert coupon ${coupon.code}:`, error.message);
            }
        }

        console.log(`🎟️  Successfully created ${couponCount} coupons`);

        // Verify migration
        const totalProducts = await db.query('SELECT COUNT(*) as count FROM products WHERE is_active = true');
        const totalCategories = await db.query('SELECT COUNT(*) as count FROM categories');
        const totalCoupons = await db.query('SELECT COUNT(*) as count FROM coupons WHERE is_active = true');

        console.log('\n📊 Migration Summary:');
        console.log('==================');
        console.log(`📦 Active Products: ${totalProducts[0].count}`);
        console.log(`📁 Categories: ${totalCategories[0].count}`);
        console.log(`🎟️  Active Coupons: ${totalCoupons[0].count}`);
        console.log('==================');

        // Display featured products
        const featuredProducts = await db.query(`
            SELECT p.name, p.price, c.name as category 
            FROM products p 
            LEFT JOIN categories c ON p.category_id = c.id 
            WHERE p.is_featured = true
        `);
        
        console.log('\n⭐ Featured Products:');
        featuredProducts.forEach(product => {
            console.log(`   • ${product.name} - ₺${product.price} (${product.category})`);
        });

        console.log('\n🎉 Product migration completed successfully!');

    } catch (error) {
        console.error('💥 Migration failed:', error);
        process.exit(1);
    }
}

// Run migration if called directly
if (require.main === module) {
    migrateProducts()
        .then(() => {
            console.log('\n✨ Migration script completed');
            process.exit(0);
        })
        .catch((error) => {
            console.error('💥 Migration script failed:', error);
            process.exit(1);
        });
}

module.exports = { migrateProducts, sampleProducts, sampleCoupons }; 