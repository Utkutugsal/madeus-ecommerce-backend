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
        
        // Check if cargo_company field exists
        try {
            const checkCompany = await db.query(`
                SELECT COLUMN_NAME 
                FROM INFORMATION_SCHEMA.COLUMNS 
                WHERE TABLE_NAME = 'orders' 
                AND COLUMN_NAME = 'cargo_company'
            `);
            
            if (checkCompany.length === 0) {
                await db.query(`
                    ALTER TABLE orders 
                    ADD COLUMN cargo_company VARCHAR(100) DEFAULT NULL
                `);
                console.log('✅ cargo_company field added');
            } else {
                console.log('⚠️ cargo_company field already exists');
            }
        } catch (error) {
            console.error('❌ Error with cargo_company:', error.message);
        }
        
        // Check if cargo_tracking_number field exists
        try {
            const checkTracking = await db.query(`
                SELECT COLUMN_NAME 
                FROM INFORMATION_SCHEMA.COLUMNS 
                WHERE TABLE_NAME = 'orders' 
                AND COLUMN_NAME = 'cargo_tracking_number'
            `);
            
            if (checkTracking.length === 0) {
                await db.query(`
                    ALTER TABLE orders 
                    ADD COLUMN cargo_tracking_number VARCHAR(100) DEFAULT NULL
                `);
                console.log('✅ cargo_tracking_number field added');
            } else {
                console.log('⚠️ cargo_tracking_number field already exists');
            }
        } catch (error) {
            console.error('❌ Error with cargo_tracking_number:', error.message);
        }
        
        // Test the fields
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