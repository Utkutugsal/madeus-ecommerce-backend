# 🚀 MADEUS BACKEND - RAILWAY DEPLOYMENT

## 📋 Railway Deployment Checklist

### 1️⃣ Railway Hesabı
- [x] railway.app hesabı aç
- [x] GitHub ile bağla
- [x] Credit card bilgisi ekle

### 2️⃣ GitHub Repository
```bash
# Bu klasörü ayrı repo olarak push et
git init
git add .
git commit -m "Initial backend commit"
git remote add origin https://github.com/yourusername/madeus-backend.git
git push -u origin main
```

### 3️⃣ Railway'de Import
1. New Project → Import from GitHub
2. madeus-backend repository seç
3. Auto-deploy enable et

### 4️⃣ Environment Variables
Railway dashboard'da şu değerleri ekle:

```env
DATABASE_URL=mysql://username:password@host:port/database
JWT_SECRET=madeus-super-secure-jwt-secret-2024
JWT_EXPIRE=24h
PAYTR_MERCHANT_ID=sandbox-merchant-id
PAYTR_MERCHANT_KEY=sandbox-merchant-key
PAYTR_MERCHANT_SALT=sandbox-merchant-salt
PAYTR_TEST_MODE=true
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-gmail@gmail.com
SMTP_PASS=your-app-password
NODE_ENV=production
PORT=3001
FRONTEND_URL=https://www.madeusskincare.com
RATE_LIMIT_WINDOW=15
RATE_LIMIT_MAX=100
CORS_ORIGINS=https://www.madeusskincare.com,https://madeusskincare.com
```

### 5️⃣ Custom Domain
1. Railway dashboard → Settings → Domains
2. Add custom domain: `api.madeusskincare.com`
3. DNS A record ekle: `api → railway-ip`

### 6️⃣ Database Connection (PlanetScale)
1. planetscale.com hesabı aç
2. Database oluştur: `madeus-production`
3. Connection string kopyala
4. Railway'de DATABASE_URL güncelle

### 7️⃣ Test Endpoints
```bash
# Health check
curl https://api.madeusskincare.com/health

# Products
curl https://api.madeusskincare.com/api/products

# Auth test
curl -X POST https://api.madeusskincare.com/api/auth/register
```

## 🔧 Troubleshooting

### Build Errors
- Node.js version uyumluluğu kontrol et
- package.json dependencies güncel mi?

### Environment Variables
- Tüm required variables set edildi mi?
- Syntax doğru mu? (no spaces around =)

### Database Connection
- PlanetScale connection string doğru mu?
- Database accessible mi Railway'den?

### CORS Issues
- FRONTEND_URL doğru domain'i işaret ediyor mu?
- CORS_ORIGINS her iki domain'i içeriyor mu?

## 📊 Monitoring
- Railway dashboard → Metrics
- Logs real-time takip
- Usage monitoring
- Error tracking

---

💡 **Not**: İlk deployment 5-10 dakika sürebilir. Sabırlı ol! 