const bcrypt = require('bcryptjs');
const { Database } = require('./config/database');

async function createTestUser() {
    try {
        const db = new Database();
        
        // Test user data
        const userData = {
            name: 'Test User',
            email: 'test@madeus.com',
            password: 'Test123!',
            phone: '5551234567',
            is_verified: true, // Email verification bypass
            created_at: new Date()
        };

        // Check if user already exists
        const existingUser = await db.query(
            'SELECT id FROM users WHERE email = ?',
            [userData.email]
        );

        if (existingUser.length > 0) {
            console.log('❌ User already exists:', userData.email);
            return;
        }

        // Hash password
        const saltRounds = 12;
        const hashedPassword = await bcrypt.hash(userData.password, saltRounds);

        // Create user
        const result = await db.query(
            `INSERT INTO users (name, email, password, phone, is_verified, created_at) 
             VALUES (?, ?, ?, ?, ?, ?)`,
            [
                userData.name,
                userData.email,
                hashedPassword,
                userData.phone,
                userData.is_verified,
                userData.created_at
            ]
        );

        console.log('✅ Test user created successfully!');
        console.log('📧 Email:', userData.email);
        console.log('🔑 Password:', userData.password);
        console.log('👤 Name:', userData.name);
        console.log('📱 Phone:', userData.phone);
        console.log('🆔 User ID:', result.insertId);

        // Close database connection
        await db.close();

    } catch (error) {
        console.error('❌ Error creating test user:', error);
    }
}

// Run the function
createTestUser(); 