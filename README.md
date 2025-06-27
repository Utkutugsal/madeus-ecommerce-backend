# 🌿 Madeus E-commerce Backend API

Modern ve güvenli e-ticaret backend API'si. PayTR ödeme entegrasyonu, email servisleri ve kapsamlı güvenlik özellikleri ile.

## 🚀 Hızlı Başlangıç

### 1. Dependencies Kurulumu
```bash
npm install
```

### 2. Environment Configuration
```bash
# .env dosyasını oluştur
cp .env.example .env

# .env dosyasını düzenle ve gerekli bilgileri gir
```

### 3. Setup Script Çalıştır
```bash
node scripts/setup.js
```

### 4. Database Schema Oluştur
```bash
# MySQL'de veritabanını oluştur
mysql -u root -p < database/schema.sql
```

### 5. Sample Data Migration
```bash
npm run migrate
```

### 6. Server Başlat
```bash
# Development
npm run dev

# Production
npm start
```

## 📋 API Endpoints

### 🔐 Authentication
- `POST /api/auth/register` - Kullanıcı kaydı
- `POST /api/auth/login` - Giriş yapma
- `POST /api/auth/logout` - Çıkış yapma
- `POST /api/auth/refresh` - Token yenileme
- `POST /api/auth/forgot-password` - Şifre sıfırlama
- `POST /api/auth/reset-password` - Yeni şifre belirleme
- `POST /api/auth/verify-email` - Email doğrulama

### 🛍️ Products
- `GET /api/products` - Ürün listesi
- `GET /api/products/:id` - Ürün detayı
- `GET /api/products/slug/:slug` - Slug ile ürün
- `GET /api/products/category/:categoryId` - Kategoriye göre ürünler
- `GET /api/products/featured` - Öne çıkan ürünler
- `POST /api/products/search` - Ürün arama

### 🛒 Orders
- `GET /api/orders` - Kullanıcı siparişleri
- `GET /api/orders/:id` - Sipariş detayı
- `POST /api/orders` - Yeni sipariş oluşturma
- `PUT /api/orders/:id/cancel` - Sipariş iptali

### 💳 Payment
- `POST /api/payment/create` - Ödeme oluşturma
- `POST /api/payment/callback` - PayTR callback
- `POST /api/payment/verify` - Ödeme doğrulama

### 👤 Users
- `GET /api/users/profile` - Profil bilgileri
- `PUT /api/users/profile` - Profil güncelleme
- `GET /api/users/addresses` - Adres listesi
- `POST /api/users/addresses` - Yeni adres ekleme

### 📝 Reviews
- `GET /api/reviews/product/:productId` - Ürün yorumları
- `POST /api/reviews` - Yorum ekleme
- `PUT /api/reviews/:id` - Yorum güncelleme

### 🎟️ Coupons
- `POST /api/coupons/validate` - Kupon doğrulama
- `GET /api/coupons/user` - Kullanıcı kuponları

## 🔧 Configuration

### Environment Variables

#### Database
```env
DB_HOST=localhost
DB_USER=your_db_user
DB_PASS=your_db_password
DB_NAME=madeus_ecommerce
DB_PORT=3306
```

#### JWT Authentication
```env
JWT_SECRET=your_super_secret_jwt_key
JWT_EXPIRE=24h
```

#### Email Service (Gmail)
```env
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your_email@gmail.com
EMAIL_PASS=your_app_password
EMAIL_FROM="Madeus Skincare <noreply@madeus.com>"
```

#### PayTR Payment Gateway
```env
PAYTR_MERCHANT_ID=your_merchant_id
PAYTR_MERCHANT_KEY=your_merchant_key
PAYTR_MERCHANT_SALT=your_merchant_salt
```

#### Security Settings
```env
BCRYPT_ROUNDS=12
MAX_LOGIN_ATTEMPTS=5
RATE_LIMIT_MAX=100
```

## 🗄️ Database Schema

### Ana Tablolar
- **users** - Kullanıcı bilgileri ve authentication
- **products** - Ürün katalogu
- **categories** - Ürün kategorileri
- **orders** - Sipariş bilgileri
- **order_items** - Sipariş detayları
- **addresses** - Kullanıcı adresleri
- **reviews** - Ürün yorumları
- **coupons** - İndirim kuponları
- **user_sessions** - JWT token yönetimi
- **admin_logs** - Admin işlem logları

### Önemli Özellikler
- 🔐 Güvenli password hashing (bcrypt)
- 🛡️ JWT token blacklisting
- 📧 Email verification sistemi
- 🔄 Password reset mekanizması
- 📊 Comprehensive indexing
- 🎯 Optimized queries with views

## 🔒 Security Features

### Authentication & Authorization
- JWT token based authentication
- Password hashing with bcrypt
- Email verification requirement
- Password reset with secure tokens
- Session management with blacklisting

### API Security
- Rate limiting (100 requests/15min)
- Auth rate limiting (5 attempts/15min)
- CORS configuration
- Helmet security headers
- Input validation & sanitization
- SQL injection prevention
- XSS protection

### Payment Security
- PayTR secure integration
- Payment data encryption
- Secure hash verification
- Transaction logging

## 📧 Email Templates

### Otomatik Email Türleri
- 🎉 Hoş geldin emaili
- ✅ Email doğrulama
- 🔐 Şifre sıfırlama
- 📦 Sipariş onayı
- 🚚 Kargo bilgilendirme
- 💰 Ödeme bildirimleri

## 💳 PayTR Integration

### Desteklenen Özellikler
- Kredi kartı ödemeleri
- 3D Secure güvenlik
- Taksit seçenekleri
- Otomatik iade işlemleri
- Test ve production modu
- Güvenli callback handling

## 🛠️ Development Tools

### Available Scripts
```bash
npm run dev          # Development server with nodemon
npm start           # Production server
npm run test        # Run tests
npm run migrate     # Migrate sample data
npm run backup      # Database backup
```

### Testing
```bash
# API health check
curl http://localhost:5000/api/health

# Database connection test
node scripts/setup.js

# Email service test
node -e "require('./utils/email').testConnection()"
```

## 📊 Monitoring & Logging

### Log Files
- Server errors: `logs/error.log`
- Access logs: `logs/access.log`
- Payment logs: `logs/payment.log`
- Admin actions: Database `admin_logs` table

### Health Monitoring
- API health endpoint: `/api/health`
- Database connection status
- Email service status
- Memory and CPU usage

## 🚀 Deployment

### Production Checklist
- [ ] Set `NODE_ENV=production`
- [ ] Configure production database
- [ ] Set secure JWT secret
- [ ] Configure real PayTR credentials
- [ ] Set up email service
- [ ] Enable HTTPS
- [ ] Configure reverse proxy (nginx)
- [ ] Set up monitoring
- [ ] Configure automated backups

### Docker Support
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
EXPOSE 5000
CMD ["npm", "start"]
```

## 🤝 Contributing

1. Fork the repository
2. Create feature branch: `git checkout -b feature/new-feature`
3. Commit changes: `git commit -am 'Add new feature'`
4. Push to branch: `git push origin feature/new-feature`
5. Create Pull Request

## 📄 License

This project is licensed under the MIT License.

## 🆘 Support

Herhangi bir sorun için:
- 📧 Email: admin@madeus.com
- 📱 Phone: +90 555 123 4567
- 💬 GitHub Issues

---

**Madeus E-commerce Backend API** - Modern, güvenli ve ölçeklenebilir e-ticaret çözümü. 