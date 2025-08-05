// Railway'de ürün sorununu debug etmek için
const express = require('express');
const { Database } = require('./config/database');

async function debugProductsRailway() {
    console.log('🔍 Railway ürün sorununu debug ediyorum...');
    
    try {
        const db = new Database();
        
        // 1. Database bağlantısını test et
        console.log('📡 Database bağlantısı test ediliyor...');
        const connectionTest = await db.query('SELECT 1 as test');
        console.log('✅ Database bağlantısı başarılı:', connectionTest[0]);
        
        // 2. Products tablosunu kontrol et
        console.log('📋 Products tablosu kontrol ediliyor...');
        const tableCheck = await db.query(`
            SELECT TABLE_NAME 
            FROM INFORMATION_SCHEMA.TABLES 
            WHERE TABLE_NAME = 'products'
        `);
        console.log('📋 Products tablosu mevcut mu:', tableCheck.length > 0);
        
        if (tableCheck.length > 0) {
            // 3. Ürün sayısını kontrol et
            const countResult = await db.query('SELECT COUNT(*) as count FROM products');
            console.log('📊 Toplam ürün sayısı:', countResult[0].count);
            
            // 4. İlk 5 ürünü listele
            const products = await db.query('SELECT id, name, price, is_active FROM products LIMIT 5');
            console.log('📦 İlk 5 ürün:');
            products.forEach((product, index) => {
                console.log(`  ${index + 1}. ID: ${product.id}, Name: ${product.name}, Price: ${product.price}, Active: ${product.is_active}`);
            });
            
            // 5. Admin panel için ürünleri test et
            console.log('🔧 Admin panel ürünleri test ediliyor...');
            const adminProducts = await db.query(`
                SELECT 
                    p.id, p.name, p.price, p.stock, p.image_url, p.is_active, p.created_at, p.updated_at, p.brand, p.category,
                    p.description, p.original_price, p.gallery_images, p.show_in_homepage, p.show_in_popular, p.show_in_bestsellers, p.show_in_featured,
                    p.rating, p.reviews_count
                FROM products p
                ORDER BY p.created_at DESC
                LIMIT 5
            `);
            console.log('🔧 Admin panel ürünleri:', adminProducts.length);
            
            // 6. Ana site için ürünleri test et
            console.log('🌐 Ana site ürünleri test ediliyor...');
            const siteProducts = await db.query(`
                SELECT 
                    id, name, price, image_url, gallery_images, stock, is_active, brand, category, 
                    rating, reviews_count, trendyol_url, trendyol_rating, trendyol_review_count, trendyol_last_update,
                    created_at, updated_at
                FROM products 
                WHERE is_active = TRUE
                LIMIT 5
            `);
            console.log('🌐 Ana site ürünleri:', siteProducts.length);
            
            // 7. API endpoint'lerini test et
            console.log('🌐 API endpoint'leri test ediliyor...');
            
            // Ana site API'si
            const siteAPIProducts = await db.query(`
                SELECT 
                    id, name, price, image_url, gallery_images, stock, is_active, brand, category, 
                    rating, reviews_count, trendyol_url, trendyol_rating, trendyol_review_count, trendyol_last_update,
                    created_at, updated_at
                FROM products 
                WHERE is_active = TRUE
                ORDER BY name ASC
                LIMIT 50
            `);
            console.log('🌐 Ana site API ürünleri:', siteAPIProducts.length);
            
            // Admin panel API'si
            const adminAPIProducts = await db.query(`
                SELECT 
                    p.id, p.name, p.price, p.stock, p.image_url, p.is_active, p.created_at, p.updated_at, p.brand, p.category,
                    p.description, p.original_price, p.gallery_images, p.show_in_homepage, p.show_in_popular, p.show_in_bestsellers, p.show_in_featured,
                    p.rating, p.reviews_count
                FROM products p
                ORDER BY p.created_at DESC
                LIMIT 20
            `);
            console.log('🔧 Admin panel API ürünleri:', adminAPIProducts.length);
            
        } else {
            console.log('❌ Products tablosu bulunamadı!');
        }
        
    } catch (error) {
        console.error('❌ Test hatası:', error);
    }
}

// Railway'de çalıştırılacak
if (require.main === module) {
    debugProductsRailway();
}

module.exports = { debugProductsRailway }; 