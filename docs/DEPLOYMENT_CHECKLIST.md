# 🚀 Hosting Deployment Checklist

## ⏱️ **TOPLAM SÜRE: ~35 DAKİKA**

---

## 📋 **PHASE 1: DOSYA YÜKLEME (5 dakika)**

### ✅ Backend Dosyalarını Yükle
```bash
# FTP/cPanel File Manager ile yüklenecek dosyalar:
madeus-backend/
├── package.json           ✅
├── server.js              ✅  
├── config/database.js     ✅
├── database/schema.sql    ✅
├── routes/auth.js         ✅
├── routes/products.js     ✅
├── middleware/auth.js     ✅
├── utils/email.js         ✅
├── utils/payment.js       ✅
├── scripts/setup.js       ✅
├── scripts/migrate-products.js ✅
├── .env                   ✅ (güncellenmeli)
└── README.md              ✅
```

### ✅ .env Dosyasını Güncelle
```env
# Production Environment Variables
NODE_ENV=production
PORT=5000
FRONTEND_URL=https://madeus.com

# Database (Hosting MySQL)
DB_HOST=localhost
DB_USER=hosting_db_user
DB_PASS=hosting_db_password
DB_NAME=madeus_ecommerce
DB_PORT=3306

# PayTR (Production veya Test)
PAYTR_MERCHANT_ID=your_merchant_id
PAYTR_MERCHANT_KEY=your_merchant_key
PAYTR_MERCHANT_SALT=your_merchant_salt
PAYTR_CALLBACK_URL=https://madeus.com/api/payment/callback

# Email (Hosting Email)
EMAIL_HOST=mail.madeus.com
EMAIL_USER=noreply@madeus.com
EMAIL_PASS=email_password
EMAIL_FROM="Madeus Skincare <noreply@madeus.com>"
```

---

## 🗄️ **PHASE 2: DATABASE KURULUM (10 dakika)**

### ✅ MySQL Database Oluştur
```sql
-- cPanel MySQL Databases ile:
1. Database Name: madeus_ecommerce
2. Database User: madeus_user  
3. Password: güçlü_şifre_123!
4. Assign user to database (ALL PRIVILEGES)
```

### ✅ Schema Import Et
```bash
# phpMyAdmin ile:
1. madeus_ecommerce database'i seç
2. Import tab'ına git
3. database/schema.sql dosyasını yükle
4. Execute tıkla
```

### ✅ Database Connection Test
```bash
# Hosting terminal/SSH ile:
cd public_html/madeus-backend
node -e "
const db = require('./config/database');
db.testConnection().then(() => console.log('✅ DB OK')).catch(console.error);
"
```

---

## 🔧 **PHASE 3: NODE.JS KURULUM (5 dakika)**

### ✅ Dependencies Install
```bash
# Hosting terminal ile:
cd public_html/madeus-backend
npm install

# Eğer npm yok ise:
# cPanel > Node.js Selector > Create Application
# Entry point: server.js
# Startup File: server.js
```

### ✅ PM2 ile Servis Başlat
```bash
# Production'da sürekli çalışması için:
npm install -g pm2
pm2 start server.js --name "madeus-backend"
pm2 startup
pm2 save
```

---

## ⚙️ **PHASE 4: YAPIM VE TEST (10 dakika)**

### ✅ SSL Sertifikası Aktifleştir
```bash
# cPanel > SSL/TLS Status
1. Domain'i seç (madeus.com)
2. "AutoSSL" aktifleştir
3. Force HTTPS Redirect aktif et
```

### ✅ API Endpoints Test Et
```bash
# Backend health check
curl https://madeus.com/api/health

# Expected response:
{
  "status": "ok",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "database": "connected",
  "version": "1.0.0"
}
```

### ✅ Database Migration Çalıştır
```bash
# Ürün verilerini import et:
cd public_html/madeus-backend
node scripts/migrate-products.js

# Expected output:
✅ 6 products imported successfully
✅ 3 categories created
✅ Database migration completed
```

### ✅ Email Test Et
```bash
# Test email gönder:
node -e "
const emailService = require('./utils/email');
emailService.sendWelcomeEmail({
  name: 'Test User',
  email: 'test@example.com'
}).then(() => console.log('✅ Email sent')).catch(console.error);
"
```

---

## 🌐 **PHASE 5: FRONTEND GÜNCELLEME (5 dakika)**

### ✅ API URL'lerini Güncelle
```typescript
// src/lib/api.ts
const API_BASE_URL = process.env.NODE_ENV === 'production' 
  ? 'https://madeus.com/api'  // ✅ Güncelle
  : 'http://localhost:5000/api';
```

### ✅ Production Build Al
```bash
# Frontend klasöründe:
npm run build

# Build dosyalarını hosting'e yükle:
dist/ klasörünü public_html/'e kopyala
```

### ✅ CORS Ayarlarını Kontrol Et
```javascript
// server.js CORS config:
app.use(cors({
  origin: [
    'https://madeus.com',
    'https://www.madeus.com'
  ],
  credentials: true
}));
```

---

## ✅ **DEPLOYMENT VERIFICATION**

### 🔍 API Test Checklist
```bash
✅ GET  /api/health                    (Health check)
✅ GET  /api/products                  (Ürün listesi)
✅ GET  /api/products/featured         (Öne çıkan ürünler)
✅ POST /api/auth/register             (Kayıt)
✅ POST /api/auth/login                (Giriş)
✅ POST /api/payment/create            (Ödeme)
✅ GET  /api/products/categories/all   (Kategoriler)
```

### 🔍 Frontend Test Checklist
```bash
✅ Homepage yükleniyor
✅ Ürün listesi API'den geliyor
✅ Kullanıcı kayıt/giriş çalışıyor
✅ Sepet işlemleri çalışıyor
✅ Ödeme sayfası açılıyor
✅ PayTR entegrasyonu çalışıyor
```

### 🔍 Email Test Checklist
```bash
✅ Hoş geldin emaili gidiyor
✅ Şifre sıfırlama emaili gidiyor
✅ Sipariş onay emaili gidiyor
✅ Email template'ları düzgün görünüyor
```

---

## 🚨 **HATA ÇÖZÜMLEME**

### Database Connection Hatası
```bash
# Error: "Database connection failed"
1. .env DB bilgilerini kontrol et
2. MySQL user permissions kontrol et
3. Hosting firewall ayarlarını kontrol et
```

### API 500 Hatası
```bash
# Error: "Internal Server Error"
1. npm install çalıştırıldı mı?
2. Node.js version uyumlu mu? (16+)
3. PM2 loglarını kontrol et: pm2 logs
```

### CORS Hatası
```bash
# Error: "CORS policy blocked"
1. server.js CORS ayarlarını kontrol et
2. Frontend URL'i doğru mu?
3. SSL sertifikası aktif mi?
```

### PayTR Test Hatası
```bash
# Error: "PayTR connection failed"
1. MERCHANT_ID doğru mu?
2. Callback URL erişilebilir mi?
3. Test kartı bilgileri doğru mu?
```

---

## 🎯 **POST-DEPLOYMENT TASKS**

### ✅ Monitoring Setup
```bash
# PM2 monitoring
pm2 monit

# Database backup schedule
crontab -e
# Add: 0 2 * * * mysqldump madeus_ecommerce > backup_$(date +%Y%m%d).sql
```

### ✅ Performance Optimization
```bash
# Gzip compression aktifleştir (.htaccess)
# Image optimization setup
# CDN setup (CloudFlare)
# Database indexing optimization
```

### ✅ Security Hardening
```bash
# .env dosya permissions (600)
# Database user minimum permissions
# Hosting firewall rules
# Rate limiting test
```

---

## 📞 **SUPPORT CONTACTS**

### Hosting Desteği
- **TurHost Destek:** 0850 555 0 TUR
- **Canlı Chat:** hosting paneli içinden

### PayTR Desteği  
- **Email:** destek@paytr.com
- **Telefon:** 0850 532 77 99

### Geliştirici Desteği
- **Backend Issues:** GitHub issues
- **Deployment Problems:** Discord/Slack

---

## 🎉 **DEPLOYMENT BAŞARILI!**

**Tebrikler! E-ticaret siteniz artık canlıda!** 

### Sonraki Adımlar:
1. ✅ Google Analytics kurulumu
2. ✅ SEO optimizasyonu
3. ✅ Social media entegrasyonu
4. ✅ Email marketing setup
5. ✅ Customer support sistem
6. ✅ Product photography
7. ✅ Marketing campaigns

**🚀 Satışlara başlamaya hazırsın!** 