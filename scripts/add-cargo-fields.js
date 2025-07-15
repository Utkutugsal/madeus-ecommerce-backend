const { Database } = require('../config/database');

async function addCargoFields() {
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
                throw error;
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
                throw error;
            }
        }
        
        console.log('🎉 Migration completed successfully!');
        
    } catch (error) {
        console.error('❌ Migration failed:', error);
        process.exit(1);
    } finally {
        process.exit(0);
    }
}

addCargoFields(); 