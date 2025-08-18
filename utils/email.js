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
                user: process.env.BREVO_SMTP_USER,
                pass: process.env.BREVO_SMTP_PASS
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

    async sendEmailViaAPI(to, subject, htmlContent) {
        try {
            if (!this.brevoApiKey) {
                throw new Error('Brevo API key not configured');
            }

            const response = await axios.post('https://api.brevo.com/v3/smtp/email', {
                sender: {
                    name: 'Madeus Skincare',
                    email: 'noreply@madeusskincare.com'
                },
                to: [{ email: to }],
                subject: subject,
                htmlContent: htmlContent
            }, {
                headers: {
                    'api-key': this.brevoApiKey,
                    'content-type': 'application/json'
                }
            });

            console.log('✅ Email sent via API:', response.data);
            return {
                success: true,
                messageId: response.data.messageId,
                message: 'Email sent successfully via API'
            };
        } catch (error) {
            console.error('❌ Failed to send email via API:', error.response?.data || error.message);
            return {
                success: false,
                error: error.message,
                message: 'Failed to send email via API'
            };
        }
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
                from: 'Madeus Skincare <noreply@madeusskincare.com>',
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

    async sendGuestOrderConfirmation({ email, orderNumber, customerName, totalAmount, items, shippingAddress }) {
        try {
            console.log('📧 Sending guest order confirmation email to:', email);

            const itemsHtml = items.map(item => `
                <tr>
                    <td style="padding: 10px; border-bottom: 1px solid #e2e8f0;">${item.name}</td>
                    <td style="padding: 10px; text-align: center; border-bottom: 1px solid #e2e8f0;">${item.quantity}</td>
                    <td style="padding: 10px; text-align: right; border-bottom: 1px solid #e2e8f0;">${item.price} TL</td>
                    <td style="padding: 10px; text-align: right; border-bottom: 1px solid #e2e8f0;">${item.total} TL</td>
                </tr>
            `).join('');

            const htmlTemplate = `
                <!DOCTYPE html>
                <html lang="tr">
                <head>
                    <meta charset="UTF-8">
                    <meta name="viewport" content="width=device-width, initial-scale=1.0">
                    <title>Sipariş Onayı - Madeus Skincare</title>
                </head>
                <body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f8fafc;">
                    <div style="max-width: 600px; margin: 0 auto; background-color: white;">
                        <div style="background: linear-gradient(135deg, #059669 0%, #10b981 100%); padding: 30px; text-align: center;">
                            <h1 style="color: white; margin: 0; font-size: 28px;">🎉 Siparişiniz Alındı!</h1>
                            <p style="color: white; margin: 10px 0 0 0; font-size: 16px;">Madeus Skincare</p>
                        </div>
                        
                        <div style="padding: 30px;">
                            <h2 style="color: #1f2937; margin-bottom: 20px;">Merhaba ${customerName},</h2>
                            
                            <p style="color: #4b5563; line-height: 1.6; margin-bottom: 20px;">
                                Siparişiniz başarıyla alındı ve işleme alındı. Sipariş detaylarınız aşağıda yer almaktadır.
                            </p>

                            <div style="background: #f0fdf4; padding: 20px; border-radius: 8px; border-left: 4px solid #059669; margin-bottom: 25px;">
                                <h3 style="color: #059669; margin: 0 0 10px 0;">📋 Sipariş Bilgileri</h3>
                                <p style="margin: 5px 0; color: #065f46;"><strong>Sipariş Numarası:</strong> ${orderNumber}</p>
                                <p style="margin: 5px 0; color: #065f46;"><strong>Sipariş Tarihi:</strong> ${new Date().toLocaleString('tr-TR')}</p>
                                <p style="margin: 5px 0; color: #065f46;"><strong>Toplam Tutar:</strong> ${totalAmount} TL</p>
                            </div>

                            <h3 style="color: #1f2937; margin-bottom: 15px;">🛍️ Sipariş Edilen Ürünler</h3>
                            <div style="background: white; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden; margin-bottom: 25px;">
                                <table style="width: 100%; border-collapse: collapse;">
                                    <thead>
                                        <tr style="background-color: #f8fafc;">
                                            <th style="padding: 12px; text-align: left; border-bottom: 2px solid #e2e8f0;">Ürün</th>
                                            <th style="padding: 12px; text-align: center; border-bottom: 2px solid #e2e8f0;">Adet</th>
                                            <th style="padding: 12px; text-align: right; border-bottom: 2px solid #e2e8f0;">Fiyat</th>
                                            <th style="padding: 12px; text-align: right; border-bottom: 2px solid #e2e8f0;">Toplam</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        ${itemsHtml}
                                    </tbody>
                                </table>
                            </div>

                            <h3 style="color: #1f2937; margin-bottom: 15px;">🏠 Teslimat Adresi</h3>
                            <div style="background: #f8fafc; padding: 20px; border-radius: 8px; margin-bottom: 25px;">
                                <p style="margin: 5px 0; color: #374151;"><strong>${shippingAddress?.title || 'Adres'}:</strong></p>
                                <p style="margin: 5px 0; color: #374151;">${shippingAddress?.fullName || customerName}</p>
                                <p style="margin: 5px 0; color: #374151;">${shippingAddress?.address || 'Adres bilgisi'}</p>
                                <p style="margin: 5px 0; color: #374151;">${shippingAddress?.district || ''} ${shippingAddress?.city || ''} ${shippingAddress?.postalCode || ''}</p>
                                <p style="margin: 5px 0; color: #374151;"><strong>Telefon:</strong> ${shippingAddress?.phone || 'Belirtilmemiş'}</p>
                            </div>

                            <div style="background: #eff6ff; padding: 20px; border-radius: 8px; border-left: 4px solid #3b82f6; margin-bottom: 25px;">
                                <h3 style="color: #1e40af; margin: 0 0 10px 0;">📞 Sipariş Takibi</h3>
                                <p style="margin: 5px 0; color: #1e3a8a;">
                                    Siparişinizi takip etmek için aşağıdaki bilgileri kullanabilirsiniz:
                                </p>
                                <p style="margin: 5px 0; color: #1e3a8a;"><strong>Sipariş Numarası:</strong> ${orderNumber}</p>
                                <p style="margin: 5px 0; color: #1e3a8a;"><strong>Email Adresiniz:</strong> ${email}</p>
                                <p style="margin: 10px 0 0 0; color: #1e3a8a;">
                                    <a href="https://madeusskincare.com/siparis-takip" style="color: #3b82f6; text-decoration: none; font-weight: bold;">
                                        🔍 Sipariş Takip Sayfasına Git
                                    </a>
                                </p>
                            </div>

                            <div style="background: #fef3c7; padding: 20px; border-radius: 8px; border-left: 4px solid #f59e0b; margin-bottom: 25px;">
                                <h3 style="color: #92400e; margin: 0 0 10px 0;">⚠️ Önemli Bilgi</h3>
                                <p style="margin: 5px 0; color: #78350f;">
                                    Üye olmadan yaptığınız bu sipariş için sipariş takibi yapabilmek adına 
                                    <strong>sipariş numaranızı ve email adresinizi</strong> saklayınız.
                                </p>
                            </div>

                            <div style="text-align: center; margin-top: 30px;">
                                <a href="https://madeusskincare.com" style="display: inline-block; background: #059669; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">
                                    🛍️ Alışverişe Devam Et
                                </a>
                            </div>
                        </div>
                        
                        <div style="background: #f8fafc; padding: 20px; text-align: center; border-top: 1px solid #e2e8f0;">
                            <p style="margin: 0; color: #64748b; font-size: 14px;">
                                Bu email ${email} adresine gönderilmiştir.
                            </p>
                            <p style="margin: 5px 0 0 0; color: #64748b; font-size: 14px;">
                                Sorularınız için: <a href="mailto:hello@madeusskincare.com" style="color: #059669;">hello@madeusskincare.com</a>
                            </p>
                            <p style="margin: 5px 0 0 0; color: #64748b; font-size: 14px;">
                                © 2024 Madeus Skincare - Tüm hakları saklıdır
                            </p>
                        </div>
                    </div>
                </body>
                </html>
            `;

            const mailOptions = {
                from: process.env.EMAIL_FROM || 'Madeus Skincare <noreply@madeusskincare.com>',
                to: email,
                subject: `🎉 Sipariş Onayı #${orderNumber} - Madeus Skincare`,
                html: htmlTemplate
            };

            const result = await this.transporter.sendMail(mailOptions);
            console.log('✅ Guest order confirmation email sent successfully:', result.messageId);
            
            return {
                success: true,
                messageId: result.messageId,
                message: 'Guest order confirmation email sent successfully'
            };
        } catch (error) {
            console.error('❌ Failed to send guest order confirmation email:', error);
            return {
                success: false,
                error: error.message,
                message: 'Failed to send guest order confirmation email'
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
