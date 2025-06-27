# Email Kurulum Kılavuzu

## 📧 Email Seçenekleri

### 1. Gmail (Ücretsiz - Test İçin)
**Avantajları:**
- ✅ Ücretsiz
- ✅ Kolay kurulum  
- ✅ Güvenilir
- ❌ Günlük limit (500 email)
- ❌ Profesyonel görünmez

### 2. SendGrid (Önerilen)
**Avantajları:**
- ✅ Aylık 100 email ücretsiz
- ✅ Profesyonel
- ✅ Yüksek delivery rate
- ✅ Analytics
- ✅ Template editor

### 3. Hosting Email (Profesyonel)
**Avantajları:**
- ✅ Domain adınızla (@madeus.com)
- ✅ Sınırsız email
- ✅ Profesyonel görünüm
- ❌ Delivery rate problemi olabilir

## 🚀 Hızlı Gmail Setup (Test İçin)

### 1. Gmail App Password Oluştur
1. Gmail hesabına gir
2. **Hesap Ayarları** > **Güvenlik**
3. **2 Adımlı Doğrulama**'yı aktif et
4. **Uygulama Şifreleri** kısmına git
5. **Yeni uygulama şifresi** oluştur
6. **"Diğer"** seç, **"Madeus Backend"** yaz
7. Oluşan 16 haneli şifreyi kopyala

### 2. Backend .env Güncelle
```env
# Email Configuration (Gmail)
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=youremail@gmail.com
EMAIL_PASS=abcd efgh ijkl mnop
EMAIL_FROM="Madeus Skincare <noreply@madeus.com>"
```

## 🎯 SendGrid Setup (Önerilen)

### 1. SendGrid Hesabı Aç
1. **https://sendgrid.com** 'a git
2. **"Free Plan"** ile kayıt ol
3. Email doğrulama yap
4. Hesap onayını bekle (24 saat)

### 2. API Key Oluştur
1. SendGrid Dashboard'a gir
2. **Settings** > **API Keys**
3. **"Create API Key"** tıkla
4. **"Full Access"** seç
5. API Key'i kopyala

### 3. Domain Doğrulama
```bash
# SendGrid Domain Authentication
1. Settings > Sender Authentication
2. "Authenticate Your Domain" tıkla  
3. Domain bilgilerini gir (madeus.com)
4. DNS kayıtlarını hosting paneline ekle
5. Doğrulama tamamlanana kadar bekle
```

### 4. Backend .env Güncelle
```env
# Email Configuration (SendGrid)
EMAIL_SERVICE=sendgrid
SENDGRID_API_KEY=SG.xxxxxxxxxxxxxxxxxxxx
EMAIL_FROM="Madeus Skincare <noreply@madeus.com>"
```

## 🏢 Hosting Email Setup

### 1. Email Hesabı Oluştur
Hosting panelinden:
```bash
# Email hesapları oluştur
noreply@madeus.com     # Sistem emailleri
info@madeus.com        # Genel iletişim  
siparis@madeus.com     # Sipariş bildirimleri
destek@madeus.com      # Müşteri destek
```

### 2. SMTP Bilgilerini Al
```bash
# Hosting Email SMTP
SMTP Server: mail.madeus.com
Port: 587 (veya 465)
Username: noreply@madeus.com
Password: ****
Encryption: STARTTLS (veya SSL)
```

### 3. Backend .env Güncelle
```env
# Email Configuration (Hosting)
EMAIL_HOST=mail.madeus.com
EMAIL_PORT=587
EMAIL_USER=noreply@madeus.com
EMAIL_PASS=your_email_password
EMAIL_FROM="Madeus Skincare <noreply@madeus.com>"
EMAIL_SECURE=false
```

## 🧪 Email Template Test

### Test Email Gönderimi
```javascript
// Backend test scripti
const emailService = require('./utils/email');

// Test email gönder
const testUser = {
  name: 'Test Kullanıcı',
  email: 'test@example.com'
};

// Hoş geldin emaili test et
await emailService.sendWelcomeEmail(testUser);

// Sipariş onay emaili test et
await emailService.sendOrderConfirmation(testUser, {
  order_number: 'MD-12345',
  total_amount: 150,
  items: [
    { name: 'Hyaluronic Acid Serum', quantity: 1, price: 150 }
  ]
});
```

## 📊 Email Delivery Monitoring

### 1. Bounce Rate İzleme
```javascript
// Email bounce handling
const handleBounce = async (email) => {
  await db.update('users', 
    { email_status: 'bounced' }, 
    'email = ?', 
    [email]
  );
};
```

### 2. Open Rate Tracking
```html
<!-- Email template'e tracking pixel ekle -->
<img src="https://madeus.com/api/email/track/open/{{email_id}}" 
     width="1" height="1" style="display:none;" />
```

### 3. Unsubscribe Link
```html
<!-- Email template footer -->
<p style="font-size: 12px; color: #666;">
  Bu emaillerden çıkmak için 
  <a href="https://madeus.com/unsubscribe/{{token}}">
    buraya tıklayın
  </a>
</p>
```

## ⚡ Email Template Örnekleri

### 1. Hoş Geldin Email
```html
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Madeus Skincare'e Hoş Geldiniz</title>
</head>
<body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
    <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center;">
        <h1 style="color: white; margin: 0;">Madeus Skincare</h1>
        <p style="color: white; margin: 10px 0 0 0;">Cildinize özel bakım deneyimi</p>
    </div>
    
    <div style="padding: 30px;">
        <h2>Hoş Geldiniz {{name}}!</h2>
        <p>Madeus Skincare ailesine katıldığınız için teşekkür ederiz.</p>
        
        <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3>İlk Siparişinizde %15 İndirim!</h3>
            <p>Kod: <strong>HOSGELDIN15</strong></p>
        </div>
        
        <a href="https://madeus.com/products" 
           style="background: #667eea; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
            Ürünleri Keşfet
        </a>
    </div>
</body>
</html>
```

## 🔧 Troubleshooting

### Gmail SMTP Hataları
```bash
# Hata: "Username and Password not accepted"
✅ App Password kullandığınızdan emin olun
✅ 2FA aktif olmalı
✅ "Less secure apps" kapalı olmalı

# Hata: "Connection timeout"  
✅ Port 587 kullanın
✅ STARTTLS aktif olsun
✅ Firewall kontrolü yapın
```

### SendGrid Hataları
```bash
# Hata: "The provided authorization grant is invalid"
✅ API Key doğru mu kontrol edin
✅ API Key'in Full Access yetkisi var mı?

# Hata: "Domain not verified"
✅ Domain authentication tamamlansın
✅ DNS kayıtları doğru mu kontrol edin
```

### Hosting Email Hataları
```bash
# Hata: "SMTP Authentication failed"
✅ Email hesabı oluşturuldu mu?
✅ Şifre doğru mu?
✅ SMTP ayarları hosting sağlayıcı ile uyumlu mu?

# Hata: "Connection refused"
✅ Port 587 veya 465 deneyin
✅ SSL/TLS ayarlarını kontrol edin
```

## 📈 Best Practices

### 1. Email Content
- ✅ Responsive design kullan
- ✅ Kısa ve öz konu satırları
- ✅ Açık CTA buttonları
- ✅ Unsubscribe linki ekle

### 2. Delivery Optimization  
- ✅ SPF, DKIM, DMARC kayıtları ekle
- ✅ Bounce rate'i %5'in altında tut
- ✅ Spam kelimelerden kaçın
- ✅ Email listeni temiz tut

### 3. Legal Compliance
- ✅ KVKK uyumlu consent al
- ✅ Açık unsubscribe seçeneği sun
- ✅ Kişisel veri kullanım izni al

## 🎯 Öncelik Sırası

### Hosting Beklerken:
1. ✅ **Gmail ile test setup** (5 dakika)
2. ✅ **Email template'ları test et** (15 dakika)
3. ✅ **SendGrid hesabı aç** (10 dakika)

### Hosting Aldıktan Sonra:
1. ✅ **Domain email hesapları oluştur**
2. ✅ **SMTP ayarlarını güncelle**  
3. ✅ **SPF/DKIM kayıtları ekle**
4. ✅ **Production email test et** 