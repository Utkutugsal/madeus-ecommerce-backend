const nodemailer = require('nodemailer');

console.log(' Email service loading...');

class EmailService {
    constructor() {
        this.transporter = null;
        this.initializeTransporter();
    }

    initializeTransporter() {
        try {
            this.transporter = this.createTransporter();
            console.log(' Email transporter initialized successfully');
        } catch (error) {
            console.error(' Failed to initialize email transporter:', error);
        }
    }

    createTransporter() {
        console.log(' Creating email transporter...');
        
        const emailConfig = {
            host: process.env.EMAIL_HOST || 'srvc121.trwww.com',
            port: parseInt(process.env.EMAIL_PORT) || 465,
            secure: process.env.EMAIL_SECURE === 'true' || true,
            auth: {
                user: process.env.EMAIL_USER || 'noreply@madeusskincare.com',
                pass: process.env.EMAIL_PASS || '05319759947Utku%'
            },
            tls: {
                rejectUnauthorized: false
            }
        };

        console.log(' Email config:', {
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
            
            console.log(' Testing email connection...');
            const result = await this.transporter.verify();
            console.log(' Email connection verified:', result);
            
            return {
                success: true,
                verified: result,
                message: 'Email connection test successful'
            };
        } catch (error) {
            console.error(' Email connection test failed:', error);
            return {
                success: false,
                error: error.message,
                message: 'Email connection test failed'
            };
        }
    }
}

const emailService = new EmailService();

module.exports = emailService;
