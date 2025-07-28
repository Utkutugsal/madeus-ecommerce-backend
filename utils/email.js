const nodemailer = require('nodemailer');

console.log('📧 Email service loading...');

class EmailService {
    constructor() {
        this.transporter = null;
        this.initializeTransporter();
    }

    initializeTransporter() {
        try {
            this.transporter = this.createTransporter();
            console.log('✅ Email transporter initialized successfully');
        } catch (error) {
            console.error('❌ Failed to initialize email transporter:', error);
        }
    }

    createTransporter() {
        console.log('🔧 Creating Brevo email transporter...');
        
        // Sadece Brevo SMTP ayarları
        const emailConfig = {
            host: process.env.BREVO_SMTP_HOST || 'smtp-relay.brevo.com',
            port: parseInt(process.env.BREVO_SMTP_PORT) || 587,
            secure: false, // TLS için false
            auth: {
                user: process.env.BREVO_SMTP_USER || '932d65001@smtp-brevo.com',
                pass: process.env.BREVO_SMTP_PASS || 'api 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'
            },
            tls: {
                rejectUnauthorized: false
            }
        };

        console.log('📧 Brevo Email config:', {
            host: emailConfig.host,
            port: emailConfig.port,
            user: emailConfig.auth.user,
            secure: emailConfig.secure
        });

        return nodemailer.createTransport(emailConfig);
    }

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

    async sendWelcomeEmail(userEmail, userName) {
        try {
            const htmlTemplate = `
                <!DOCTYPE html>
                <html>
                <head>
                    <meta charset="utf-8">
                    <title>Madeus Skincare'e Hoş Geldiniz</title>
                </head>
                <body style="font-family: 'Arial', sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
                    <div style="background: linear-gradient(135deg, #a855f7 0%, #ec4899 100%); padding: 30px; border-radius: 10px; text-align: center; margin-bottom: 30px;">
                        <h1 style="color: white; margin: 0; font-size: 28px;">Madeus Skincare</h1>
                        <p style="color: white; margin: 10px 0 0 0; font-size: 16px;">#YourSkinYourChoice</p>
                    </div>
                    
                    <div style="background: #f8fafc; padding: 30px; border-radius: 10px; margin-bottom: 20px;">
                        <h2 style="color: #a855f7; margin-bottom: 20px;">Hoş Geldiniz ${userName}! 🎉</h2>
                        
                        <p style="margin-bottom: 15px;">Madeus Skincare ailesine katıldığınız için teşekkür ederiz!</p>
                        
                        <div style="background: white; padding: 20px; border-radius: 8px; border-left: 4px solid #a855f7; margin: 20px 0;">
                            <h3 style="color: #a855f7; margin-top: 0;">✨ Size özel avantajlar:</h3>
                            <ul style="margin: 0; padding-left: 20px;">
                                <li>🌿 PETA Onaylı Cruelty-Free ürünler</li>
                                <li>💜 Vegan sertifikalı formülasyonlar</li>
                                <li>🔬 Bilimsel araştırma destekli içerikler</li>
                                <li>🚚 Hızlı ve güvenli teslimat</li>
                                <li>💝 Özel kampanya ve indirimler</li>
                            </ul>
                        </div>
                        
                        <p>Cilt bakım yolculuğunuzda yanınızdayız!</p>
                    </div>
                    
                    <div style="text-align: center; padding: 20px; border-top: 1px solid #e2e8f0;">
                        <p style="margin: 0; color: #64748b; font-size: 14px;">
                            © 2024 Madeus Skincare - Cilt Bakım Ürünleri
                        </p>
                        <p style="margin: 5px 0 0 0; color: #64748b; font-size: 12px;">
                            Bu e-posta ${userEmail} adresine gönderildi.
                        </p>
                    </div>
                </body>
                </html>
            `;

            const mailOptions = {
                from: process.env.EMAIL_FROM || 'Madeus Skincare <noreply@madeusskincare.com>',
                to: userEmail,
                subject: '🎉 Madeus Skincare\'e Hoş Geldiniz!',
                html: htmlTemplate
            };

            const result = await this.transporter.sendMail(mailOptions);
            console.log('✅ Welcome email sent successfully:', result.messageId);
            
            return {
                success: true,
                messageId: result.messageId,
                message: 'Welcome email sent successfully'
            };
        } catch (error) {
            console.error('❌ Failed to send welcome email:', error);
            return {
                success: false,
                error: error.message,
                message: 'Failed to send welcome email'
            };
        }
    }

    async sendVerificationEmail(userEmail, verificationToken) {
        try {
            const verificationUrl = `${process.env.FRONTEND_URL || 'https://madeusskincare.com'}/verify-email?token=${verificationToken}`;
            
            const htmlTemplate = `
                <!DOCTYPE html>
                <html>
                <head>
                    <meta charset="utf-8">
                    <title>Email Adresinizi Doğrulayın</title>
                </head>
                <body style="font-family: 'Arial', sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
                    <div style="background: linear-gradient(135deg, #a855f7 0%, #ec4899 100%); padding: 30px; border-radius: 10px; text-align: center; margin-bottom: 30px;">
                        <h1 style="color: white; margin: 0; font-size: 28px;">Madeus Skincare</h1>
                        <p style="color: white; margin: 10px 0 0 0; font-size: 16px;">#YourSkinYourChoice</p>
                    </div>
                    
                    <div style="background: #f8fafc; padding: 30px; border-radius: 10px; margin-bottom: 20px;">
                        <h2 style="color: #a855f7; margin-bottom: 20px;">Email Adresinizi Doğrulayın 📧</h2>
                        
                        <p style="margin-bottom: 20px;">Hesabınızı aktifleştirmek için aşağıdaki butona tıklayın:</p>
                        
                        <div style="text-align: center; margin: 30px 0;">
                            <a href="${verificationUrl}" style="background: linear-gradient(135deg, #a855f7 0%, #ec4899 100%); color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block;">
                                ✅ Email Adresimi Doğrula
                            </a>
                        </div>
                        
                        <div style="background: white; padding: 20px; border-radius: 8px; border-left: 4px solid #f59e0b; margin: 20px 0;">
                            <p style="margin: 0; color: #92400e; font-size: 14px;">
                                <strong>⚠️ Önemli:</strong> Bu doğrulama linki 24 saat geçerlidir.
                            </p>
                        </div>
                        
                        <p style="font-size: 14px; color: #64748b;">
                            Eğer butona tıklayamıyorsanız, aşağıdaki linki tarayıcınıza kopyalayın:<br>
                            <code style="background: #e2e8f0; padding: 5px; border-radius: 3px; word-break: break-all;">${verificationUrl}</code>
                        </p>
                    </div>
                    
                    <div style="text-align: center; padding: 20px; border-top: 1px solid #e2e8f0;">
                        <p style="margin: 0; color: #64748b; font-size: 14px;">
                            © 2024 Madeus Skincare - Cilt Bakım Ürünleri
                        </p>
                        <p style="margin: 5px 0 0 0; color: #64748b; font-size: 12px;">
                            Bu e-posta ${userEmail} adresine gönderildi.
                        </p>
                    </div>
                </body>
                </html>
            `;

            const mailOptions = {
                from: process.env.EMAIL_FROM || 'Madeus Skincare <noreply@madeusskincare.com>',
                to: userEmail,
                subject: '📧 Email Adresinizi Doğrulayın - Madeus Skincare',
                html: htmlTemplate
            };

            const result = await this.transporter.sendMail(mailOptions);
            console.log('✅ Verification email sent successfully:', result.messageId);
            
            return {
                success: true,
                messageId: result.messageId,
                message: 'Verification email sent successfully'
            };
        } catch (error) {
            console.error('❌ Failed to send verification email:', error);
            return {
                success: false,
                error: error.message,
                message: 'Failed to send verification email'
            };
        }
    }

    async sendPasswordResetEmail(userEmail, resetToken) {
        try {
            const resetUrl = `${process.env.FRONTEND_URL || 'https://madeusskincare.com'}/reset-password?token=${resetToken}`;
            
            const htmlTemplate = `
                <!DOCTYPE html>
                <html>
                <head>
                    <meta charset="utf-8">
                    <title>Şifre Sıfırlama</title>
                </head>
                <body style="font-family: 'Arial', sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
                    <div style="background: linear-gradient(135deg, #a855f7 0%, #ec4899 100%); padding: 30px; border-radius: 10px; text-align: center; margin-bottom: 30px;">
                        <h1 style="color: white; margin: 0; font-size: 28px;">Madeus Skincare</h1>
                        <p style="color: white; margin: 10px 0 0 0; font-size: 16px;">#YourSkinYourChoice</p>
                    </div>
                    
                    <div style="background: #f8fafc; padding: 30px; border-radius: 10px; margin-bottom: 20px;">
                        <h2 style="color: #a855f7; margin-bottom: 20px;">Şifre Sıfırlama Talebi 🔐</h2>
                        
                        <p style="margin-bottom: 20px;">Şifrenizi sıfırlamak için aşağıdaki butona tıklayın:</p>
                        
                        <div style="text-align: center; margin: 30px 0;">
                            <a href="${resetUrl}" style="background: linear-gradient(135deg, #dc2626 0%, #b91c1c 100%); color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block;">
                                🔐 Şifremi Sıfırla
                            </a>
                        </div>
                        
                        <div style="background: white; padding: 20px; border-radius: 8px; border-left: 4px solid #dc2626; margin: 20px 0;">
                            <p style="margin: 0; color: #dc2626; font-size: 14px;">
                                <strong>⚠️ Güvenlik:</strong> Bu link 1 saat geçerlidir. Eğer bu talebi siz yapmadıysanız, bu e-postayı görmezden gelin.
                            </p>
                        </div>
                        
                        <p style="font-size: 14px; color: #64748b;">
                            Eğer butona tıklayamıyorsanız, aşağıdaki linki tarayıcınıza kopyalayın:<br>
                            <code style="background: #e2e8f0; padding: 5px; border-radius: 3px; word-break: break-all;">${resetUrl}</code>
                        </p>
                    </div>
                    
                    <div style="text-align: center; padding: 20px; border-top: 1px solid #e2e8f0;">
                        <p style="margin: 0; color: #64748b; font-size: 14px;">
                            © 2024 Madeus Skincare - Cilt Bakım Ürünleri
                        </p>
                        <p style="margin: 5px 0 0 0; color: #64748b; font-size: 12px;">
                            Bu e-posta ${userEmail} adresine gönderildi.
                        </p>
                    </div>
                </body>
                </html>
            `;

            const mailOptions = {
                from: process.env.EMAIL_FROM || 'Madeus Skincare <noreply@madeusskincare.com>',
                to: userEmail,
                subject: '🔐 Şifre Sıfırlama Talebi - Madeus Skincare',
                html: htmlTemplate
            };

            const result = await this.transporter.sendMail(mailOptions);
            console.log('✅ Password reset email sent successfully:', result.messageId);
            
            return {
                success: true,
                messageId: result.messageId,
                message: 'Password reset email sent successfully'
            };
        } catch (error) {
            console.error('❌ Failed to send password reset email:', error);
            return {
                success: false,
                error: error.message,
                message: 'Failed to send password reset email'
            };
        }
    }

    async sendOrderConfirmationEmail(userEmail, orderDetails) {
        try {
            const htmlTemplate = `
                <!DOCTYPE html>
                <html>
                <head>
                    <meta charset="utf-8">
                    <title>Sipariş Onayı</title>
                </head>
                <body style="font-family: 'Arial', sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
                    <div style="background: linear-gradient(135deg, #a855f7 0%, #ec4899 100%); padding: 30px; border-radius: 10px; text-align: center; margin-bottom: 30px;">
                        <h1 style="color: white; margin: 0; font-size: 28px;">Madeus Skincare</h1>
                        <p style="color: white; margin: 10px 0 0 0; font-size: 16px;">#YourSkinYourChoice</p>
                    </div>
                    
                    <div style="background: #f8fafc; padding: 30px; border-radius: 10px; margin-bottom: 20px;">
                        <h2 style="color: #10b981; margin-bottom: 20px;">Siparişiniz Alındı! ✅</h2>
                        
                        <p style="margin-bottom: 20px;">Sipariş No: <strong>${orderDetails.orderNumber || 'MD-' + Date.now()}</strong></p>
                        
                        <div style="background: white; padding: 20px; border-radius: 8px; border-left: 4px solid #10b981; margin: 20px 0;">
                            <h3 style="color: #10b981; margin-top: 0;">📦 Sipariş Detayları:</h3>
                            <p style="margin: 5px 0;"><strong>Toplam:</strong> ${orderDetails.total || '0.00'} TL</p>
                            <p style="margin: 5px 0;"><strong>Teslimat:</strong> 1-3 iş günü</p>
                            <p style="margin: 5px 0;"><strong>Kargo:</strong> Ücretsiz (150 TL üzeri)</p>
                        </div>
                        
                        <p>En kısa sürede hazırlayıp gönderiyoruz! 🚀</p>
                    </div>
                    
                    <div style="text-align: center; padding: 20px; border-top: 1px solid #e2e8f0;">
                        <p style="margin: 0; color: #64748b; font-size: 14px;">
                            © 2024 Madeus Skincare - Cilt Bakım Ürünleri
                        </p>
                        <p style="margin: 5px 0 0 0; color: #64748b; font-size: 12px;">
                            Bu e-posta ${userEmail} adresine gönderildi.
                        </p>
                    </div>
                </body>
                </html>
            `;

            const mailOptions = {
                from: process.env.EMAIL_FROM || 'Madeus Skincare <noreply@madeusskincare.com>',
                to: userEmail,
                subject: `✅ Sipariş Onayı #${orderDetails.orderNumber || 'MD-' + Date.now()} - Madeus Skincare`,
                html: htmlTemplate
            };

            const result = await this.transporter.sendMail(mailOptions);
            console.log('✅ Order confirmation email sent successfully:', result.messageId);
            
            return {
                success: true,
                messageId: result.messageId,
                message: 'Order confirmation email sent successfully'
            };
        } catch (error) {
            console.error('❌ Failed to send order confirmation email:', error);
            return {
                success: false,
                error: error.message,
                message: 'Failed to send order confirmation email'
            };
        }
    }

    async sendOrderNotification(orderDetails) {
        try {
            const { orderId, customerName, customerEmail, customerPhone, items, totalAmount, shippingCost, shippingAddress } = orderDetails;
            
            const itemsHtml = items.map(item => `
                <tr>
                    <td style="padding: 10px; border-bottom: 1px solid #e2e8f0;">${item.name}</td>
                    <td style="padding: 10px; border-bottom: 1px solid #e2e8f0; text-align: center;">${item.quantity}</td>
                    <td style="padding: 10px; border-bottom: 1px solid #e2e8f0; text-align: right;">${item.price} TL</td>
                    <td style="padding: 10px; border-bottom: 1px solid #e2e8f0; text-align: right;">${(item.quantity * item.price).toFixed(2)} TL</td>
                </tr>
            `).join('');

            const htmlTemplate = `
                <!DOCTYPE html>
                <html>
                <head>
                    <meta charset="utf-8">
                    <title>🚨 YENİ SİPARİŞ ALINDI!</title>
                </head>
                <body style="font-family: 'Arial', sans-serif; line-height: 1.6; color: #333; max-width: 700px; margin: 0 auto; padding: 20px;">
                    <div style="background: linear-gradient(135deg, #dc2626 0%, #b91c1c 100%); padding: 30px; border-radius: 10px; text-align: center; margin-bottom: 30px;">
                        <h1 style="color: white; margin: 0; font-size: 28px;">🚨 YENİ SİPARİŞ!</h1>
                        <p style="color: white; margin: 10px 0 0 0; font-size: 16px;">Sipariş #${orderId}</p>
                    </div>
                    
                    <div style="background: #f8fafc; padding: 30px; border-radius: 10px; margin-bottom: 20px;">
                        <h2 style="color: #dc2626; margin-bottom: 20px;">👤 Müşteri Bilgileri</h2>
                        <div style="background: white; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
                            <p><strong>Ad Soyad:</strong> ${customerName}</p>
                            <p><strong>Email:</strong> ${customerEmail}</p>
                            <p><strong>Telefon:</strong> ${customerPhone || 'Belirtilmemiş'}</p>
                        </div>

                        <h3 style="color: #dc2626; margin-bottom: 15px;">📦 Sipariş Detayları</h3>
                        <div style="background: white; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
                            <table style="width: 100%; border-collapse: collapse;">
                                <thead>
                                    <tr style="background: #f1f5f9;">
                                        <th style="padding: 10px; text-align: left; border-bottom: 2px solid #e2e8f0;">Ürün</th>
                                        <th style="padding: 10px; text-align: center; border-bottom: 2px solid #e2e8f0;">Adet</th>
                                        <th style="padding: 10px; text-align: right; border-bottom: 2px solid #e2e8f0;">Fiyat</th>
                                        <th style="padding: 10px; text-align: right; border-bottom: 2px solid #e2e8f0;">Toplam</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    ${itemsHtml}
                                </tbody>
                            </table>
                            
                            <div style="margin-top: 20px; padding-top: 20px; border-top: 2px solid #e2e8f0;">
                                <p style="text-align: right; margin: 5px 0;"><strong>Kargo:</strong> ${shippingCost || 0} TL</p>
                                <p style="text-align: right; margin: 5px 0; font-size: 18px; color: #dc2626;"><strong>TOPLAM: ${totalAmount} TL</strong></p>
                            </div>
                        </div>

                        <h3 style="color: #dc2626; margin-bottom: 15px;">🏠 Teslimat Adresi</h3>
                        <div style="background: white; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
                            <p><strong>${shippingAddress?.title || 'Adres'}:</strong></p>
                            <p>${shippingAddress?.fullName || customerName}</p>
                            <p>${shippingAddress?.address || 'Adres bilgisi eksik'}</p>
                            <p>${shippingAddress?.district || ''} ${shippingAddress?.city || ''} ${shippingAddress?.postalCode || ''}</p>
                            <p><strong>Tel:</strong> ${shippingAddress?.phone || customerPhone || 'Belirtilmemiş'}</p>
                        </div>
                        
                        <div style="background: #fef2f2; padding: 20px; border-radius: 8px; border-left: 4px solid #dc2626;">
                            <p style="margin: 0; color: #dc2626; font-size: 16px;">
                                <strong>⚡ HEMEN HAZIRLAYIP GÖNDERMELİSİN!</strong>
                            </p>
                            <p style="margin: 10px 0 0 0; color: #7f1d1d; font-size: 14px;">
                                Sipariş zamanı: ${new Date().toLocaleString('tr-TR')}
                            </p>
                        </div>
                    </div>
                    
                    <div style="text-align: center; padding: 20px; border-top: 1px solid #e2e8f0;">
                        <p style="margin: 0; color: #64748b; font-size: 14px;">
                            © 2024 Madeus Skincare - Sipariş Bildirimi
                        </p>
                    </div>
                </body>
                </html>
            `;

            const mailOptions = {
                from: process.env.EMAIL_FROM || 'Madeus Skincare <noreply@madeusskincare.com>',
                to: process.env.ADMIN_EMAIL || 'admin@madeusskincare.com',
                subject: `🚨 YENİ SİPARİŞ #${orderId} - ${customerName} - ${totalAmount} TL`,
                html: htmlTemplate
            };

            const result = await this.transporter.sendMail(mailOptions);
            console.log('✅ Order notification email sent successfully:', result.messageId);
            
            return {
                success: true,
                messageId: result.messageId,
                message: 'Order notification email sent successfully'
            };
        } catch (error) {
            console.error('❌ Failed to send order notification email:', error);
            return {
                success: false,
                error: error.message,
                message: 'Failed to send order notification email'
            };
        }
    }

    async sendCustomEmail(to, subject, htmlContent) {
        try {
            const mailOptions = {
                from: process.env.EMAIL_FROM || 'Madeus Skincare <noreply@madeusskincare.com>',
                to: to,
                subject: subject,
                html: htmlContent
            };

            const result = await this.transporter.sendMail(mailOptions);
            console.log('✅ Custom email sent successfully:', result.messageId);
            
            return {
                success: true,
                messageId: result.messageId,
                message: 'Custom email sent successfully'
            };
        } catch (error) {
            console.error('❌ Failed to send custom email:', error);
            return {
                success: false,
                error: error.message,
                message: 'Failed to send custom email'
            };
        }
    }
}

const emailService = new EmailService();

module.exports = emailService;
