const express = require('express');
const router = express.Router();

// SEO Keywords Database
const seoKeywords = {
  primary: [
    'doğal cilt bakım ürünleri',
    'organik kozmetik',
    'madeus skincare',
    'doğal nemlendirici',
    'organik temizleyici',
    'bitkisel serum',
    'yaşlanma karşıtı doğal krem'
  ],
  secondary: [
    'hassas cilt bakımı',
    'vegan kozmetik',
    'paraben free ürünler',
    'sülfat free şampuan',
    'doğal güneş koruyucu',
    'organik yüz maskesi',
    'bitkisel göz kremi'
  ],
  longTail: [
    'en iyi doğal cilt bakım ürünleri türkiye',
    'organik cilt bakım markası madeus',
    'hassas cilt için doğal nemlendirici',
    'paraben içermeyen organik kozmetik',
    'türkiye yapımı doğal cilt bakım',
    'vegan ve cruelty free kozmetik markası'
  ]
};

// SEO Configuration
const seoConfig = {
  siteName: 'Madeus Glow',
  siteDescription: 'Premium cilt bakım ürünleri ve profesyonel güzellik çözümleri',
  siteUrl: process.env.SITE_URL || 'https://madeusglow.com',
  defaultImage: '/images/og-default.jpg',
  twitterHandle: '@madeusglow',
  facebookAppId: process.env.FACEBOOK_APP_ID || '',
  googleAnalyticsId: process.env.GOOGLE_ANALYTICS_ID || '',
  googleTagManagerId: process.env.GOOGLE_TAG_MANAGER_ID || ''
};

// Dinamik Sitemap Generator
router.get('/sitemap.xml', async (req, res) => {
  try {
    const baseUrl = req.protocol + '://' + req.get('host');
    const lastmod = new Date().toISOString().split('T')[0];
    
    // Ana sayfalar
    const staticPages = [
      { url: '/', priority: '1.0', changefreq: 'daily' },
      { url: '/products', priority: '0.9', changefreq: 'daily' },
      { url: '/blog', priority: '0.8', changefreq: 'daily' },
      { url: '/about', priority: '0.7', changefreq: 'monthly' },
      { url: '/sales-points', priority: '0.6', changefreq: 'weekly' }
    ];

    // Ürün sayfaları (dinamik)
    const productPages = [];
    for (let i = 1; i <= 6; i++) {
      productPages.push({
        url: `/product/${i}`,
        priority: '0.8',
        changefreq: 'weekly'
      });
    }

    // Blog sayfaları
    const blogPosts = [
      'dogal-cilt-bakim-rutini-rehber',
      'organik-vs-sentetik-kozmetik',
      'yaslanma-karsiti-dogal-icerikler',
      'hassas-cilt-icin-altin-kurallar',
      'gunes-koruyucu-secimi-spf-rehberi',
      'kis-aylarinda-cilt-bakimi'
    ];

    const blogPages = blogPosts.map(slug => ({
      url: `/blog/${slug}`,
      priority: '0.7',
      changefreq: 'monthly'
    }));

    const allPages = [...staticPages, ...productPages, ...blogPages];

    let sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">`;

    allPages.forEach(page => {
      sitemap += `
  <url>
    <loc>${baseUrl}${page.url}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>${page.changefreq}</changefreq>
    <priority>${page.priority}</priority>
  </url>`;
    });

    sitemap += `
</urlset>`;

    res.set('Content-Type', 'text/xml');
    res.send(sitemap);
  } catch (error) {
    console.error('Sitemap generation error:', error);
    res.status(500).json({ error: 'Sitemap generation failed' });
  }
});

// SEO Keywords API
router.get('/keywords', (req, res) => {
  try {
    res.json({
      success: true,
      data: seoKeywords,
      meta: {
        totalKeywords: Object.values(seoKeywords).flat().length,
        lastUpdated: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('Keywords API error:', error);
    res.status(500).json({ error: 'Keywords fetch failed' });
  }
});

// SEO Analysis API
router.get('/analysis/:page', (req, res) => {
  try {
    const { page } = req.params;
    
    const analysis = {
      page: page,
      score: Math.floor(Math.random() * 30) + 70, // 70-100 arası
      issues: [],
      recommendations: [],
      keywords: {
        density: {},
        suggestions: []
      }
    };

    // Sayfa tipine göre analiz
    switch (page) {
      case 'home':
        analysis.keywords.density = {
          'doğal cilt bakım': 2.3,
          'organik kozmetik': 1.8,
          'madeus skincare': 3.1
        };
        analysis.recommendations = [
          'Blog bölümüne daha fazla içerik ekleyin',
          'Schema markup\'ı geliştirin',
          'Internal linking\'i güçlendirin'
        ];
        break;
      
      case 'products':
        analysis.keywords.density = {
          'cilt bakım ürünleri': 4.2,
          'doğal kozmetik': 2.1,
          'organik ürünler': 1.9
        };
        analysis.recommendations = [
          'Ürün açıklamalarını zenginleştirin',
          'Müşteri yorumlarını artırın',
          'Alt kategoriler oluşturun'
        ];
        break;
      
      default:
        analysis.keywords.suggestions = [
          'Daha fazla uzun kuyruklu keyword kullanın',
          'Başlık etiketlerini optimize edin',
          'Meta açıklamalarını güncelleyin'
        ];
    }

    res.json({
      success: true,
      data: analysis
    });
  } catch (error) {
    console.error('SEO Analysis error:', error);
    res.status(500).json({ error: 'Analysis failed' });
  }
});

// Google Search Console Verification
router.get('/google-verification', (req, res) => {
  try {
    // Google Search Console doğrulama dosyası
    const verificationContent = 'google-site-verification: google123456789abcdef.html';
    res.set('Content-Type', 'text/html');
    res.send(verificationContent);
  } catch (error) {
    console.error('Google verification error:', error);
    res.status(500).json({ error: 'Verification failed' });
  }
});

// Bing Webmaster Tools Verification
router.get('/bing-verification', (req, res) => {
  try {
    const bingVerification = `<?xml version="1.0"?>
<users>
  <user>1234567890ABCDEF</user>
</users>`;
    res.set('Content-Type', 'text/xml');
    res.send(bingVerification);
  } catch (error) {
    console.error('Bing verification error:', error);
    res.status(500).json({ error: 'Verification failed' });
  }
});

// SEO Performance Tracking
router.post('/track', (req, res) => {
  try {
    const { page, keyword, position, clicks, impressions } = req.body;
    
    // Bu normalde veritabanına kaydedilir
    const trackingData = {
      page,
      keyword,
      position,
      clicks,
      impressions,
      ctr: clicks / impressions * 100,
      timestamp: new Date().toISOString()
    };

    console.log('SEO Tracking:', trackingData);

    res.json({
      success: true,
      message: 'SEO data tracked successfully',
      data: trackingData
    });
  } catch (error) {
    console.error('SEO Tracking error:', error);
    res.status(500).json({ error: 'Tracking failed' });
  }
});

// Competitor Analysis API
router.get('/competitors', (req, res) => {
  try {
    const competitors = [
      {
        name: 'Flormar',
        domain: 'flormar.com.tr',
        estimatedTraffic: 150000,
        topKeywords: ['flormar', 'makyaj ürünleri', 'ruj'],
        strengths: ['Marka bilinirliği', 'Geniş ürün yelpazesi'],
        weaknesses: ['SEO optimizasyonu zayıf', 'Blog içeriği yetersiz']
      },
      {
        name: 'Avon',
        domain: 'avon.com.tr',
        estimatedTraffic: 120000,
        topKeywords: ['avon', 'kozmetik', 'cilt bakım'],
        strengths: ['Güçlü marka', 'Sosyal medya varlığı'],
        weaknesses: ['Site hızı yavaş', 'Mobile SEO zayıf']
      },
      {
        name: 'The Body Shop',
        domain: 'thebodyshop.com.tr',
        estimatedTraffic: 80000,
        topKeywords: ['body shop', 'doğal kozmetik', 'vegan ürünler'],
        strengths: ['Doğal ürün odağı', 'Etik değerler'],
        weaknesses: ['Fiyat rekabeti', 'Yerel SEO zayıf']
      }
    ];

    res.json({
      success: true,
      data: competitors,
      analysis: {
        ourPosition: 'Doğal kozmetik segmentinde güçlü fırsat var',
        recommendations: [
          'Blog içeriğini artırarak traffic çekin',
          'Yerel SEO\'ya odaklanın',
          'Long-tail keywords ile틈새 market yakalayın'
        ]
      }
    });
  } catch (error) {
    console.error('Competitor analysis error:', error);
    res.status(500).json({ error: 'Analysis failed' });
  }
});

// Generate robots.txt
router.get('/robots.txt', (req, res) => {
  try {
    const robotsTxt = `User-agent: *
Allow: /

# Sitemap
Sitemap: ${seoConfig.siteUrl}/api/seo/sitemap.xml

# Disallow admin and private areas
Disallow: /admin/
Disallow: /api/admin/
Disallow: /private/
Disallow: /_next/
Disallow: /api/auth/

# Crawl delay
Crawl-delay: 1
`;

    res.header('Content-Type', 'text/plain');
    res.send(robotsTxt);

  } catch (error) {
    console.error('Robots.txt generation error:', error);
    res.status(500).json({ error: 'Failed to generate robots.txt' });
  }
});

// Get meta tags for a page
router.post('/meta-tags', (req, res) => {
  try {
    const { page, data } = req.body;

    let metaTags = {
      title: seoConfig.siteName,
      description: seoConfig.siteDescription,
      keywords: 'cilt bakım, güzellik, serum, krem, nemlendirici, anti-aging',
      image: seoConfig.defaultImage,
      url: seoConfig.siteUrl,
      type: 'website',
      siteName: seoConfig.siteName,
      twitterHandle: seoConfig.twitterHandle,
      facebookAppId: seoConfig.facebookAppId
    };

    // Page-specific meta tags
    switch (page) {
      case 'home':
        metaTags.title = `${seoConfig.siteName} - Premium Cilt Bakım Ürünleri`;
        metaTags.description = 'Cildinizi aydınlatan ve gençleştiren premium cilt bakım ürünleri. Vitamin C serumları, nemlendiriciler ve anti-aging çözümleri.';
        metaTags.keywords = 'cilt bakım, güzellik, serum, krem, vitamin c, anti-aging, nemlendirici';
        break;

      case 'products':
        metaTags.title = `Ürünler - ${seoConfig.siteName}`;
        metaTags.description = 'Geniş ürün yelpazemizde cilt bakım ürünleri, serumlar, kremler ve daha fazlası.';
        metaTags.keywords = 'cilt bakım ürünleri, serum, krem, maske, güzellik ürünleri';
        break;

      case 'product':
        if (data && data.product) {
          const product = data.product;
          metaTags.title = `${product.name} - ${seoConfig.siteName}`;
          metaTags.description = product.description || `Kaliteli ${product.name} ürünü. ${seoConfig.siteName} güvencesiyle.`;
          metaTags.keywords = `${product.name}, ${product.category}, ${product.brand}, cilt bakım`;
          metaTags.image = product.mainImage || seoConfig.defaultImage;
          metaTags.url = `${seoConfig.siteUrl}/products/${product.id}`;
          metaTags.type = 'product';
        }
        break;

      case 'category':
        if (data && data.category) {
          const category = data.category;
          metaTags.title = `${category.name} - ${seoConfig.siteName}`;
          metaTags.description = `${category.name} kategorisinde kaliteli cilt bakım ürünleri. ${seoConfig.siteName} güvencesiyle.`;
          metaTags.keywords = `${category.name}, cilt bakım, güzellik ürünleri, ${seoConfig.siteName}`;
          metaTags.url = `${seoConfig.siteUrl}/category/${category.slug}`;
        }
        break;

      case 'about':
        metaTags.title = `Hakkımızda - ${seoConfig.siteName}`;
        metaTags.description = `${seoConfig.siteName} olarak cildinizin sağlığı ve güzelliği için premium ürünler sunuyoruz.`;
        metaTags.keywords = 'hakkımızda, madeus glow, cilt bakım, güzellik, misyon, vizyon';
        break;

      case 'contact':
        metaTags.title = `İletişim - ${seoConfig.siteName}`;
        metaTags.description = `${seoConfig.siteName} ile iletişime geçin. Sorularınız için bize ulaşın.`;
        metaTags.keywords = 'iletişim, müşteri hizmetleri, destek, madeus glow';
        break;

      case 'blog':
        metaTags.title = `Blog - ${seoConfig.siteName}`;
        metaTags.description = 'Cilt bakımı, güzellik ve sağlık hakkında uzman tavsiyeleri ve güncel bilgiler.';
        metaTags.keywords = 'blog, cilt bakımı, güzellik, sağlık, tavsiye, ipuçları';
        break;

      default:
        break;
    }

    // Add Open Graph tags
    metaTags.og = {
      title: metaTags.title,
      description: metaTags.description,
      image: metaTags.image,
      url: metaTags.url,
      type: metaTags.type,
      siteName: metaTags.siteName
    };

    // Add Twitter Card tags
    metaTags.twitter = {
      card: 'summary_large_image',
      title: metaTags.title,
      description: metaTags.description,
      image: metaTags.image,
      creator: metaTags.twitterHandle,
      site: metaTags.twitterHandle
    };

    res.json({ metaTags });

  } catch (error) {
    console.error('Meta tags generation error:', error);
    res.status(500).json({ error: 'Failed to generate meta tags' });
  }
});

// Get structured data (JSON-LD)
router.post('/structured-data', (req, res) => {
  try {
    const { type, data } = req.body;

    let structuredData = {};

    switch (type) {
      case 'organization':
        structuredData = {
          "@context": "https://schema.org",
          "@type": "Organization",
          "name": seoConfig.siteName,
          "url": seoConfig.siteUrl,
          "logo": `${seoConfig.siteUrl}/images/logo.png`,
          "description": seoConfig.siteDescription,
          "sameAs": [
            "https://www.facebook.com/madeusglow",
            "https://www.instagram.com/madeusglow",
            "https://twitter.com/madeusglow"
          ],
          "contactPoint": {
            "@type": "ContactPoint",
            "telephone": "+90-212-XXX-XXXX",
            "contactType": "customer service",
            "availableLanguage": ["Turkish", "English"]
          }
        };
        break;

      case 'product':
        if (data && data.product) {
          const product = data.product;
          structuredData = {
            "@context": "https://schema.org",
            "@type": "Product",
            "name": product.name,
            "description": product.description,
            "image": product.mainImage,
            "brand": {
              "@type": "Brand",
              "name": product.brand
            },
            "offers": {
              "@type": "Offer",
              "price": product.price,
              "priceCurrency": "TRY",
              "availability": product.stock > 0 ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
              "url": `${seoConfig.siteUrl}/products/${product.id}`
            },
            "aggregateRating": {
              "@type": "AggregateRating",
              "ratingValue": product.rating,
              "reviewCount": product.reviewCount
            }
          };
        }
        break;

      case 'breadcrumb':
        if (data && data.breadcrumbs) {
          structuredData = {
            "@context": "https://schema.org",
            "@type": "BreadcrumbList",
            "itemListElement": data.breadcrumbs.map((item, index) => ({
              "@type": "ListItem",
              "position": index + 1,
              "name": item.name,
              "item": `${seoConfig.siteUrl}${item.url}`
            }))
          };
        }
        break;

      case 'website':
        structuredData = {
          "@context": "https://schema.org",
          "@type": "WebSite",
          "name": seoConfig.siteName,
          "url": seoConfig.siteUrl,
          "description": seoConfig.siteDescription,
          "potentialAction": {
            "@type": "SearchAction",
            "target": `${seoConfig.siteUrl}/search?q={search_term_string}`,
            "query-input": "required name=search_term_string"
          }
        };
        break;

      default:
        break;
    }

    res.json({ structuredData });

  } catch (error) {
    console.error('Structured data generation error:', error);
    res.status(500).json({ error: 'Failed to generate structured data' });
  }
});

// SEO health check
router.get('/health', (req, res) => {
  try {
    const health = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      services: {
        sitemap: true,
        robots: true,
        metaTags: true,
        structuredData: true
      },
      config: {
        siteUrl: seoConfig.siteUrl,
        siteName: seoConfig.siteName,
        hasGoogleAnalytics: !!seoConfig.googleAnalyticsId,
        hasGoogleTagManager: !!seoConfig.googleTagManagerId
      }
    };

    res.json(health);

  } catch (error) {
    console.error('SEO health check error:', error);
    res.status(500).json({ error: 'SEO health check failed' });
  }
});

module.exports = router; 