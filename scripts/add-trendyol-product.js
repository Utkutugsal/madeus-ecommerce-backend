const { Database } = require('../config/database');
require('dotenv').config();

async function addTrendyolProduct() {
    const db = new Database();
    
    try {
        console.log('🚀 Adding Madeus Sivrisinek Kovucu Sprey to database...');
        
        // First Trendyol product data
        const productData = {
            name: '%100 Doğal Sivrisinek, Sinek Ve Kene Kovucu Sprey',
            slug: 'madeus-dogal-sivrisinek-kovucu-sprey-100ml',
            description: `%100 doğal sivrisinek, sinek ve kene kovucu sprey. Bebek ve çocuklar için güvenle kullanılabilir. 
            
Özellikler:
• %100 doğal içerik
• Kimyasal içermez
• Bebek ve çocuk dostu
• Sivrisinek, sinek ve kene kovucu
• 100 ml pratik şişe
• Uzun süreli koruma

Doğal aktif bileşenlerle formüle edilmiş bu sprey, zararlı kimyasallar içermeden etkili koruma sağlar. Bebek ve çocukların hassas cildi için özel olarak geliştirilmiştir.`,
            short_description: 'Bebek ve çocuklar için %100 doğal sivrisinek, sinek ve kene kovucu sprey. Kimyasal içermez, güvenle kullanılabilir.',
            category_id: 1, // Baby & Child Care category
            price: 89.90,
            compare_price: 129.90,
            cost_price: 45.00,
            sku: 'MADEUS-REPEL-100ML',
            barcode: '8680001234567',
            track_quantity: true,
            quantity: 2, // "Son 2 Ürün"
            allow_out_of_stock_purchase: false,
            weight: 0.15, // 100ml + packaging
            requires_shipping: true,
            is_active: true,
            is_featured: true,
            meta_title: 'Madeus %100 Doğal Sivrisinek Kovucu Sprey 100ml | Bebek & Çocuk',
            meta_description: 'Bebek ve çocuklar için kimyasal içermeyen %100 doğal sivrisinek, sinek ve kene kovucu sprey. Güvenli ve etkili koruma.',
            tags: JSON.stringify(['doğal', 'bebek', 'çocuk', 'sivrisinek kovucu', 'kimyasal free', 'madeus']),
            images: JSON.stringify([
                '/images/products/madeus-repellent-1.jpg',
                '/images/products/madeus-repellent-2.jpg', 
                '/images/products/madeus-repellent-3.jpg',
                '/images/products/madeus-repellent-4.jpg',
                '/images/products/madeus-repellent-5.jpg',
                '/images/products/madeus-repellent-6.jpg',
                '/images/products/madeus-repellent-7.jpg'
            ]),
            variants: JSON.stringify([]),
            attributes: JSON.stringify({
                volume: '100ml',
                type: 'Spray',
                target: 'Sivrisinek, Sinek, Kene',
                age_group: 'Bebek & Çocuk',
                natural: true,
                chemical_free: true,
                ingredients: 'Doğal esansiyel yağlar, bitki özleri',
                usage: 'Ciltten 15-20 cm uzaklıktan spreyleyin',
                storage: 'Serin ve kuru yerde saklayın'
            }),
            trendyol_url: 'https://www.trendyol.com/madeus/100-dogal-sivrisinek-sinek-ve-kene-kovucu-sprey-bebek-cocuk-kimyasal-icermez-100-ml-p-944516808',
            trendyol_product_id: '944516808'
        };

        // Check if product already exists
        const existingProduct = await db.findOne(
            'SELECT id FROM products WHERE sku = ? OR trendyol_product_id = ?',
            [productData.sku, productData.trendyol_product_id]
        );

        if (existingProduct) {
            console.log('⚠️ Product already exists. Updating...');
            
            await db.update(
                'products',
                productData,
                'id = ?',
                [existingProduct.id]
            );
            
            console.log('✅ Product updated successfully!');
            return existingProduct.id;
        } else {
            const result = await db.insert('products', productData);
            console.log('✅ Product added successfully! ID:', result.insertId);
            return result.insertId;
        }

    } catch (error) {
        console.error('❌ Error adding product:', error);
        throw error;
    }
}

async function createCategoryIfNotExists() {
    const db = new Database();
    
    try {
        // Check if Baby & Child Care category exists
        const category = await db.findOne(
            'SELECT id FROM categories WHERE slug = ?',
            ['baby-child-care']
        );

        if (!category) {
            console.log('🏷️ Creating Baby & Child Care category...');
            
            const categoryData = {
                name: 'Bebek & Çocuk Bakımı',
                slug: 'baby-child-care',
                description: 'Bebek ve çocuklar için özel olarak geliştirilmiş güvenli ürünler',
                parent_id: null,
                sort_order: 1,
                is_active: true,
                meta_title: 'Bebek & Çocuk Bakım Ürünleri | Madeus Skincare',
                meta_description: 'Bebek ve çocuklar için güvenli, doğal ve etkili bakım ürünleri. Kimyasal içermeyen formülasyonlar.',
                image: '/images/categories/baby-child-care.jpg'
            };

            const result = await db.insert('categories', categoryData);
            console.log('✅ Category created! ID:', result.insertId);
            return result.insertId;
        } else {
            console.log('✅ Category already exists. ID:', category.id);
            return category.id;
        }
    } catch (error) {
        console.error('❌ Error creating category:', error);
        throw error;
    }
}

async function main() {
    try {
        console.log('🚀 Starting Trendyol product import...');
        
        // First create category if needed
        await createCategoryIfNotExists();
        
        // Then add the product
        const productId = await addTrendyolProduct();
        
        console.log('🎉 Product import completed successfully!');
        console.log('📦 Product ID:', productId);
        console.log('🔗 Check your admin panel to see the new product');
        
        process.exit(0);
    } catch (error) {
        console.error('💥 Import failed:', error);
        process.exit(1);
    }
}

if (require.main === module) {
    main();
}

module.exports = { addTrendyolProduct, createCategoryIfNotExists }; 