const nodemailer = require('nodemailer');
require('dotenv').config();

class EmailService {
    constructor() {
        try {
            console.log('🚀 Initializing email service...');
            console.log('📧 Environment variables check:', {
                EMAIL_HOST: process.env.EMAIL_HOST || 'not set',
                EMAIL_PORT: process.env.EMAIL_PORT || 'not set',
                EMAIL_USER: process.env.EMAIL_USER || 'not set',
                EMAIL_PASS: process.env.EMAIL_PASS ? 'Set' : 'Not set',
                EMAIL_SECURE: process.env.EMAIL_SECURE || 'not set',
                EMAIL_FROM: process.env.EMAIL_FROM || 'not set'
            });
            
            if (!process.env.EMAIL_HOST || !process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
                console.warn('⚠️ Email configuration incomplete - service will be disabled');
                this.transporter = null;
                return;
            }
            
            this.transporter = this.createTransporter();
            console.log('✅ Email service initialized successfully');
        } catch (error) {
            console.error('❌ Email service initialization failed:', error);
            console.error('Stack trace:', error.stack);
            this.transporter = null;
        }
    }

    createTransporter() {
        const port = parseInt(process.env.EMAIL_PORT) || 587;
        const isSecure = port === 465 || process.env.EMAIL_SECURE === 'true';
        
        console.log('📧 Email transporter creating:', {
            host: process.env.EMAIL_HOST || 'smtp.gmail.com',
            port: port,
            secure: isSecure,
            user: process.env.EMAIL_USER || 'not set'
        });
        
        const config = {
            host: process.env.EMAIL_HOST || 'smtp.gmail.com',
            port: port,
            secure: isSecure, // true for 465 (SSL), false for 587 (TLS)
            auth: {
                user: process.env.EMAIL_USER,
                pass: process.env.EMAIL_PASS
            },
            tls: {
                rejectUnauthorized: false,
                ciphers: 'SSLv3'
            },
            debug: process.env.NODE_ENV === 'development',
            logger: process.env.NODE_ENV === 'development'
        };
        
        // Turkish hosting providers (Turhost, trwww.com) specific settings
        if (process.env.EMAIL_HOST && process.env.EMAIL_HOST.includes('trwww.com')) {
            console.log('🇹🇷 Turkish hosting detected - applying specific settings');
            config.pool = true;
            config.maxConnections = 1;
            config.rateDelta = 20000;
            config.rateLimit = 5;
            config.connectionTimeout = 60000;
            config.greetingTimeout = 30000;
            config.socketTimeout = 60000;
        }
        
        console.log('📧 Final transporter config:', JSON.stringify(config, null, 2));
        
        return nodemailer.createTransport(config);
    }

    async sendMail(mailOptions) {
        try {
            if (!this.transporter) {
                console.warn('⚠️ Email service not available - skipping email');
                return { success: false, error: 'Email service not initialized' };
            }

            const info = await this.transporter.sendMail({
                from: process.env.EMAIL_FROM || `"Madeus Skincare" <${process.env.EMAIL_USER}>`,
                ...mailOptions
            });
            
            console.log('Email sent successfully:', info.messageId);
            return { success: true, messageId: info.messageId };
        } catch (error) {
            console.error('Email sending failed:', error);
            return { success: false, error: error.message };
        }
    }

    // Welcome email for new users
    async sendWelcomeEmail(user) {
        const htmlContent = `
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="utf-8">
                <style>
                    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                    .header { background: linear-gradient(135deg, #10b981, #059669); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
                    .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px; }
                    .button { display: inline-block; background: #10b981; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
                    .footer { text-align: center; margin-top: 30px; color: #666; font-size: 12px; }
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="header">
                        <h1>🌿 Madeus Skincare'e Hoş Geldiniz!</h1>
                        <p>Doğal güzelliğinizi keşfetmeye hazır mısınız?</p>
                    </div>
                    <div class="content">
                        <p>Merhaba <strong>${user.name}</strong>,</p>
                        
                        <p>Madeus Skincare ailesine katıldığınız için çok mutluyuz! Hassas cildiniz için özel olarak geliştirilmiş, doğal ve etkili ürünlerimizi keşfetmeye başlayabilirsiniz.</p>
                        
                        <h3>✨ Size özel avantajlar:</h3>
                        <ul>
                            <li><strong>%10 İndirim:</strong> İlk siparişinizde YENIMUSTERI koduyla</li>
                            <li><strong>Ücretsiz Kargo:</strong> 300₺ ve üzeri alışverişlerde</li>
                            <li><strong>Cilt Analizi:</strong> Size uygun ürünler için ücretsiz danışmanlık</li>
                            <li><strong>Newsletter:</strong> Özel teklifler ve cilt bakım ipuçları</li>
                        </ul>
                        
                        <div style="text-align: center;">
                            <a href="${process.env.FRONTEND_URL}/products" class="button">Ürünleri Keşfet 🛍️</a>
                        </div>
                        
                        <p><strong>Cilt Tipi Önerilerimiz:</strong></p>
                        <p>Profil ayarlarınızda cilt tipinizi belirtirseniz, size özel ürün önerileri gönderebiliriz.</p>
                        
                        <p>Herhangi bir sorunuz olursa, müşteri hizmetlerimiz 7/24 hizmetinizdedir.</p>
                        
                        <p>Güzel günler dileriz,<br>
                        <strong>Madeus Skincare Ekibi</strong></p>
                    </div>
                    <div class="footer">
                        <p>© 2024 Madeus Skincare. Tüm hakları saklıdır.</p>
                        <p>Bu e-postayı almak istemiyorsanız <a href="#">abonelikten çıkabilirsiniz</a>.</p>
                    </div>
                </div>
            </body>
            </html>
        `;

        return await this.sendMail({
            to: user.email,
            subject: '🌿 Madeus Skincare\'e Hoş Geldiniz!',
            html: htmlContent
        });
    }

    // Email verification
    async sendVerificationEmail(user, verificationToken) {
        const verificationUrl = `${process.env.FRONTEND_URL}/verify-email?token=${verificationToken}`;
        
        const htmlContent = `
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="utf-8">
                <style>
                    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                    .header { background: #10b981; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
                    .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px; }
                    .button { display: inline-block; background: #10b981; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
                    .token { background: #e5e7eb; padding: 15px; border-radius: 6px; font-family: monospace; text-align: center; margin: 20px 0; }
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="header">
                        <h1>📧 Email Adresinizi Doğrulayın</h1>
                    </div>
                    <div class="content">
                        <p>Merhaba <strong>${user.name}</strong>,</p>
                        
                        <p>Madeus Skincare hesabınızı oluşturduğunuz için teşekkür ederiz. Hesabınızı aktifleştirmek için email adresinizi doğrulamanız gerekmektedir.</p>
                        
                        <div style="text-align: center;">
                            <a href="${verificationUrl}" class="button">Email Adresimi Doğrula ✅</a>
                        </div>
                        
                        <p>Eğer yukarıdaki buton çalışmıyorsa, aşağıdaki linki tarayıcınızın adres çubuğuna kopyalayabilirsiniz:</p>
                        <div class="token">${verificationUrl}</div>
                        
                        <p><strong>⚠️ Önemli:</strong> Bu doğrulama linki 24 saat boyunca geçerlidir.</p>
                        
                        <p>Eğer bu hesabı siz oluşturmadıysanız, bu e-postayı görmezden gelebilirsiniz.</p>
                        
                        <p>Saygılarımızla,<br>
                        <strong>Madeus Skincare Ekibi</strong></p>
                    </div>
                </div>
            </body>
            </html>
        `;

        return await this.sendMail({
            to: user.email,
            subject: '📧 Email Adresinizi Doğrulayın - Madeus Skincare',
            html: htmlContent
        });
    }

    // Password reset email
    async sendPasswordResetEmail(user, resetToken) {
        const resetUrl = `${process.env.FRONTEND_URL}/reset-password?token=${resetToken}`;
        
        const htmlContent = `
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="utf-8">
                <style>
                    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                    .header { background: #ef4444; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
                    .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px; }
                    .button { display: inline-block; background: #ef4444; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
                    .warning { background: #fef3cd; border: 1px solid #fbbf24; padding: 15px; border-radius: 6px; margin: 20px 0; }
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="header">
                        <h1>🔐 Şifre Sıfırlama Talebi</h1>
                    </div>
                    <div class="content">
                        <p>Merhaba <strong>${user.name}</strong>,</p>
                        
                        <p>Madeus Skincare hesabınız için şifre sıfırlama talebinde bulundunuz. Yeni şifrenizi oluşturmak için aşağıdaki butona tıklayın:</p>
                        
                        <div style="text-align: center;">
                            <a href="${resetUrl}" class="button">Şifremi Sıfırla 🔑</a>
                        </div>
                        
                        <div class="warning">
                            <strong>⚠️ Güvenlik Uyarısı:</strong>
                            <ul>
                                <li>Bu link sadece 10 dakika boyunca geçerlidir</li>
                                <li>Link sadece bir kez kullanılabilir</li>
                                <li>Eğer şifre sıfırlama talebinde bulunmadıysanız, bu e-postayı görmezden geçin</li>
                            </ul>
                        </div>
                        
                        <p>Link çalışmıyorsa: <br>
                        <small>${resetUrl}</small></p>
                        
                        <p>Hesap güvenliğiniz için şifrenizi düzenli olarak değiştirmenizi öneririz.</p>
                        
                        <p>Saygılarımızla,<br>
                        <strong>Madeus Skincare Güvenlik Ekibi</strong></p>
                    </div>
                </div>
            </body>
            </html>
        `;

        return await this.sendMail({
            to: user.email,
            subject: '🔐 Şifre Sıfırlama Talebi - Madeus Skincare',
            html: htmlContent
        });
    }

    // Order confirmation email
    async sendOrderConfirmationEmail(order, user, orderItems) {
        const orderItemsHtml = orderItems.map(item => `
            <tr>
                <td style="padding: 10px; border-bottom: 1px solid #ddd;">
                    <img src="${item.product_image}" alt="${item.product_name}" style="width: 50px; height: 50px; object-fit: cover; border-radius: 4px;">
                </td>
                <td style="padding: 10px; border-bottom: 1px solid #ddd;">${item.product_name}</td>
                <td style="padding: 10px; border-bottom: 1px solid #ddd; text-align: center;">${item.quantity}</td>
                <td style="padding: 10px; border-bottom: 1px solid #ddd; text-align: right;">₺${item.unit_price.toFixed(2)}</td>
                <td style="padding: 10px; border-bottom: 1px solid #ddd; text-align: right; font-weight: bold;">₺${item.total_price.toFixed(2)}</td>
            </tr>
        `).join('');

        const htmlContent = `
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="utf-8">
                <style>
                    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                    .header { background: #10b981; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
                    .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px; }
                    .order-table { width: 100%; border-collapse: collapse; margin: 20px 0; background: white; }
                    .order-table th { background: #f3f4f6; padding: 12px; text-align: left; border-bottom: 2px solid #ddd; }
                    .order-summary { background: #e5f3ff; padding: 20px; border-radius: 6px; margin: 20px 0; }
                    .button { display: inline-block; background: #10b981; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="header">
                        <h1>🎉 Siparişiniz Alındı!</h1>
                        <p>Sipariş No: #${order.order_number}</p>
                    </div>
                    <div class="content">
                        <p>Merhaba <strong>${user.name}</strong>,</p>
                        
                        <p>Siparişiniz başarıyla alınmıştır. Aşağıda sipariş detaylarınızı bulabilirsiniz:</p>
                        
                        <div class="order-summary">
                            <h3>📦 Sipariş Özeti</h3>
                            <p><strong>Sipariş No:</strong> #${order.order_number}</p>
                            <p><strong>Sipariş Tarihi:</strong> ${new Date(order.created_at).toLocaleDateString('tr-TR')}</p>
                            <p><strong>Ödeme Durumu:</strong> ${order.payment_status === 'paid' ? '✅ Ödendi' : '⏳ Beklemede'}</p>
                            <p><strong>Sipariş Durumu:</strong> ${order.status === 'confirmed' ? '✅ Onaylandı' : '⏳ İşleniyor'}</p>
                        </div>

                        <h3>🛍️ Sipariş İçeriği</h3>
                        <table class="order-table">
                            <thead>
                                <tr>
                                    <th></th>
                                    <th>Ürün</th>
                                    <th>Adet</th>
                                    <th>Birim Fiyat</th>
                                    <th>Toplam</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${orderItemsHtml}
                            </tbody>
                        </table>

                        <div class="order-summary">
                            <table style="width: 100%;">
                                <tr>
                                    <td>Ara Toplam:</td>
                                    <td style="text-align: right;">₺${order.subtotal.toFixed(2)}</td>
                                </tr>
                                <tr>
                                    <td>Kargo:</td>
                                    <td style="text-align: right;">₺${order.shipping_cost.toFixed(2)}</td>
                                </tr>
                                ${order.discount_amount > 0 ? `
                                <tr style="color: #10b981;">
                                    <td>İndirim:</td>
                                    <td style="text-align: right;">-₺${order.discount_amount.toFixed(2)}</td>
                                </tr>
                                ` : ''}
                                <tr style="font-weight: bold; font-size: 18px; border-top: 2px solid #ddd;">
                                    <td>Genel Toplam:</td>
                                    <td style="text-align: right; color: #10b981;">₺${order.total_amount.toFixed(2)}</td>
                                </tr>
                            </table>
                        </div>

                        <h3>📍 Teslimat Adresi</h3>
                        <div style="background: white; padding: 15px; border-radius: 6px;">
                            ${order.shipping_address ? `
                                <p><strong>${JSON.parse(order.shipping_address).first_name} ${JSON.parse(order.shipping_address).last_name}</strong></p>
                                <p>${JSON.parse(order.shipping_address).address_line_1}</p>
                                <p>${JSON.parse(order.shipping_address).district}, ${JSON.parse(order.shipping_address).city}</p>
                                <p>Tel: ${JSON.parse(order.shipping_address).phone}</p>
                            ` : 'Adres bilgisi bulunamadı'}
                        </div>

                        <div style="text-align: center;">
                            <a href="${process.env.FRONTEND_URL}/orders/${order.id}" class="button">Siparişimi Takip Et 📦</a>
                        </div>

                        <p><strong>📞 Müşteri Hizmetleri:</strong> Herhangi bir sorunuz olursa bizimle iletişime geçebilirsiniz.</p>
                        
                        <p>Siparişiniz için teşekkür ederiz!<br>
                        <strong>Madeus Skincare Ekibi</strong></p>
                    </div>
                </div>
            </body>
            </html>
        `;

        return await this.sendMail({
            to: user.email,
            subject: `🎉 Siparişiniz Alındı! #${order.order_number} - Madeus Skincare`,
            html: htmlContent
        });
    }

    // Test connection method
    async testConnection() {
        try {
            if (!this.transporter) {
                throw new Error('Email transporter not initialized');
            }
            
            console.log('🔍 Testing email connection...');
            const result = await this.transporter.verify();
            console.log('✅ Email connection verified:', result);
            
            return {
                success: true,
                verified: result,
                message: 'Email connection test successful'
            };
        } catch (error) {
            console.error('❌ Email connection test failed:', error);
            return {
                success: false,
                error: error.message,
                message: 'Email connection test failed'
            };
        }
    }
}

// Create singleton instance
const emailService = new EmailService();

module.exports = emailService; 
                                <p>Tel: ${JSON.parse(order.shipping_address).phone}</p>
                            ` : 'Adres bilgisi bulunamadı'}
                        </div>

                        <div style="text-align: center;">
                            <a href="${process.env.FRONTEND_URL}/orders/${order.id}" class="button">Siparişimi Takip Et 📦</a>
                        </div>

                        <p><strong>📞 Müşteri Hizmetleri:</strong> Herhangi bir sorunuz olursa bizimle iletişime geçebilirsiniz.</p>
                        
                        <p>Siparişiniz için teşekkür ederiz!<br>
                        <strong>Madeus Skincare Ekibi</strong></p>
                    </div>
                </div>
            </body>
            </html>
        `;

        return await this.sendMail({
            to: user.email,
            subject: `🎉 Siparişiniz Alındı! #${order.order_number} - Madeus Skincare`,
            html: htmlContent
        });
    }

    // Test connection method
    async testConnection() {
        try {
            if (!this.transporter) {
                throw new Error('Email transporter not initialized');
            }
            
            console.log('🔍 Testing email connection...');
            const result = await this.transporter.verify();
            console.log('✅ Email connection verified:', result);
            
            return {
                success: true,
                verified: result,
                message: 'Email connection test successful'
            };
        } catch (error) {
            console.error('❌ Email connection test failed:', error);
            return {
                success: false,
                error: error.message,
                message: 'Email connection test failed'
            };
        }
    }
}

// Create singleton instance
const emailService = new EmailService();

module.exports = emailService; 