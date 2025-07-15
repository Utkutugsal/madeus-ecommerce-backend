// This script should be run on Railway environment
const { Database } = require('../config/database');

async function addCargoFields() {
    console.log('🔧 Starting cargo fields migration...');
    
    // Check if we're in Railway environment
    if (!process.env.RAILWAY_ENVIRONMENT) {
        console.log('⚠️ This script should be run on Railway environment');
        console.log('💡 Deploy this script and run it on Railway');
        return;
    }
    
    const db = new Database();
    
    try {
        console.log('🔧 Adding cargo fields to orders table...');
        
        // Add cargo_company field
        try {
            await db.query(`
                ALTER TABLE orders 
                ADD COLUMN cargo_company VARCHAR(100) DEFAULT NULL
            `);
            console.log('✅ cargo_company field added');
        } catch (error) {
            if (error.message.includes('Duplicate column name')) {
                console.log('⚠️ cargo_company field already exists');
            } else {
                console.error('❌ Error adding cargo_company:', error.message);
            }
        }
        
        // Add cargo_tracking_number field
        try {
            await db.query(`
                ALTER TABLE orders 
                ADD COLUMN cargo_tracking_number VARCHAR(100) DEFAULT NULL
            `);
            console.log('✅ cargo_tracking_number field added');
        } catch (error) {
            if (error.message.includes('Duplicate column name')) {
                console.log('⚠️ cargo_tracking_number field already exists');
            } else {
                console.error('❌ Error adding cargo_tracking_number:', error.message);
            }
        }
        
        // Test the new fields
        console.log('🧪 Testing new fields...');
        const testResult = await db.query(`
            SELECT cargo_company, cargo_tracking_number 
            FROM orders 
            LIMIT 1
        `);
        
        console.log('✅ Fields are working correctly');
        console.log('🎉 Migration completed successfully!');
        
    } catch (error) {
        console.error('❌ Migration failed:', error);
        throw error;
    }
}

// Export for use in server startup
module.exports = addCargoFields;

// Run if called directly
if (require.main === module) {
    addCargoFields()
        .then(() => {
            console.log('✅ Migration completed');
            process.exit(0);
        })
        .catch((error) => {
            console.error('❌ Migration failed:', error);
            process.exit(1);
        });
} 