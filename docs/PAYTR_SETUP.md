# PayTR Test Hesabı Kurulum Kılavuzu

## 🔥 PayTR Nedir?
PayTR, Türkiye'nin en güvenilir ödeme sağlayıcılarından biridir. 3D Secure desteği, tüm banka kartları, sanal pos hizmetleri sunar.

## 📋 Test Hesabı Alma Adımları

### 1. PayTR'ye Kayıt Ol
1. **https://www.paytr.com** adresine git
2. **"Ücretsiz Başla"** butonuna tıkla
3. **Test hesabı** seçeneğini işaretle
4. Gerekli bilgileri doldur:
   - İş Email adresi
   - Telefon numarası
   - Şirket/Website bilgileri
   - TC Kimlik/Vergi numarası

### 2. Hesap Doğrulama
- Email adresindeki doğrulama linkine tıkla
- Telefon numaranı SMS ile doğrula
- Kimlik belgelerini yükle (test için gerekli değil)

### 3. Test API Bilgilerini Al
Hesap onaylandıktan sonra PayTR panelinden:

```bash
# Test Environment Bilgileri
MERCHANT_ID: test_xxxxxx
MERCHANT_KEY: test_xxxxxxxxxxxxxx  
MERCHANT_SALT: test_xxxxxxxxxxxx
API_URL: https://www.paytr.com/odeme/api/get-token
```

### 4. Backend .env Dosyasını Güncelle

```env
# PayTR Payment Gateway (TEST MODE)
PAYTR_MERCHANT_ID=test_xxxxxx
PAYTR_MERCHANT_KEY=test_xxxxxxxxxxxxxx
PAYTR_MERCHANT_SALT=test_xxxxxxxxxxxx
PAYTR_API_URL=https://www.paytr.com/odeme/api/get-token
PAYTR_CALLBACK_URL=http://localhost:5000/api/payment/callback
```

## 🧪 Test Kartları

PayTR test ortamında kullanabileceğin kart bilgileri:

### ✅ Başarılı Test Kartları
```
Kart No: 5528790000000008
Son Kullanma: 12/29
CVV: 123
Kart Sahibi: TEST KART

Kart No: 4355084355084358
Son Kullanma: 12/29  
CVV: 000
Kart Sahibi: TEST KART
```

### ❌ Başarısız Test Kartları
```
Kart No: 5406675406675403
Son Kullanma: 12/29
CVV: 123
Kart Sahibi: FAIL KART
```

## 🔒 3D Secure Test

3D Secure testleri için:
- **Şifre:** 123456
- **SMS Kodu:** 123456

## 📞 PayTR Destek

### Test hesabı ile ilgili sorunlarda:
- **Email:** destek@paytr.com
- **Telefon:** 0850 532 77 99
- **Canlı Destek:** PayTR paneli içinden

### Dokümantasyon:
- **API Dokümantasyonu:** https://dev.paytr.com
- **Entegrasyon Kılavuzu:** https://dev.paytr.com/integration
- **GitHub Örnekleri:** https://github.com/PayTR/PayTR-php

## ⚡ Hızlı Test Senaryoları

### 1. Başarılı Ödeme Testi
```javascript
// Frontend'den test
const orderData = {
  items: [{ product_id: 1, quantity: 1, unit_price: 100 }],
  shipping_address: { /* adres bilgileri */ },
  payment_method: 'credit_card'
};

// API'ye gönder
const response = await apiClient.createPayment(orderData);
```

### 2. Başarısız Ödeme Testi
- Başarısız test kartını kullan
- Hatalı tutar gönder (0 TL)
- Geçersiz müşteri bilgileri

### 3. 3D Secure Testi
- 3D Secure destekli kart kullan
- Şifre: 123456 ile onayla
- Geri dönüş URL'ini test et

## 🚀 Production'a Geçiş

Test başarılı olduktan sonra:

1. **PayTR'den production bilgilerini al**
2. **KYC dokümanlarını tamamla**
3. **Production API bilgilerini .env'e ekle**
4. **SSL sertifikası aktif olsun**
5. **Webhook URL'lerini güncelle**

```env
# Production Environment
PAYTR_MERCHANT_ID=prod_xxxxxx
PAYTR_MERCHANT_KEY=prod_xxxxxxxxxxxxxx
PAYTR_MERCHANT_SALT=prod_xxxxxxxxxxxx
PAYTR_CALLBACK_URL=https://your-domain.com/api/payment/callback
```

## ⚠️ Önemli Notlar

- ✅ Test ortamında gerçek para hareketi olmaz
- ✅ Tüm işlemler simülasyondur
- ✅ Test kartları sadece test ortamında çalışır
- ❌ Production kartları test ortamında çalışmaz
- ⚡ Callback URL'ler mutlaka doğru olmalı
- 🔒 API bilgilerini hiç paylaşma

## 🎯 Sonraki Adımlar

1. ✅ PayTR test hesabı aç
2. ✅ API bilgilerini al
3. ✅ Backend .env dosyasını güncelle
4. ✅ Test kartları ile ödeme yap
5. ✅ Webhook'ları test et
6. ✅ Production'a geçiş yap 