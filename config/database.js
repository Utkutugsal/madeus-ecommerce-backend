const mysql = require('mysql2/promise');
require('dotenv').config();

// Parse DATABASE_URL as fallback
function parseDatabaseUrl(url) {
    if (!url) return null;
    
    try {
        const parsed = new URL(url);
        return {
            host: parsed.hostname,
            port: parseInt(parsed.port) || 3306,
            user: parsed.username,
            password: parsed.password,
            database: parsed.pathname.slice(1) // Remove leading slash
        };
    } catch (error) {
        console.error('Error parsing DATABASE_URL:', error.message);
        return null;
    }
}

// Try DATABASE_URL first, then individual variables
const urlConfig = parseDatabaseUrl(process.env.DATABASE_URL);
const useUrlConfig = urlConfig && !process.env.DB_HOST;

// Database connection configuration
const dbConfig = useUrlConfig ? {
    host: urlConfig.host,
    port: urlConfig.port,
    user: urlConfig.user,
    password: urlConfig.password,
    database: urlConfig.database,
    charset: 'utf8mb4',
    
    // Connection pool settings
    connectionLimit: 5,
    queueLimit: 0,
    waitForConnections: true,
    
    // SSL for Railway
    ssl: {
        rejectUnauthorized: false
    },
    
    // Force IPv4
    family: 4,
    connectTimeout: 30000
} : {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT) || 3306,
    user: process.env.DB_USER,
    password: process.env.DB_PASS,
    database: process.env.DB_NAME,
    charset: 'utf8mb4',
    
    // Connection pool settings (MySQL2 compatible)
    connectionLimit: 5,
    queueLimit: 0,
    waitForConnections: true,
    
    // Additional MySQL settings
    supportBigNumbers: true,
    bigNumberStrings: true,
    dateStrings: false,
    timezone: '+00:00', // Use UTC for better compatibility
    
    // Railway MySQL specific settings
    ssl: process.env.NODE_ENV === 'production' ? {
        rejectUnauthorized: false
    } : false,
    
    // Force IPv4 for Railway compatibility
    family: 4,
    
    // Connection timeout settings
    connectTimeout: 30000,
    
    // Railway connection flags
    flags: [
        'LONG_PASSWORD',
        'LONG_FLAG', 
        'TRANSACTIONS',
        'PROTOCOL_41',
        'SECURE_CONNECTION'
    ]
};

// Log connection attempt (for debugging)
console.log(`🔍 Using ${useUrlConfig ? 'DATABASE_URL' : 'individual variables'} for connection`);
console.log('🔍 Database connection config:', {
    host: dbConfig.host,
    port: dbConfig.port,
    user: dbConfig.user,
    database: dbConfig.database,
    ssl: !!dbConfig.ssl,
    family: dbConfig.family
});

// Create connection pool
const pool = mysql.createPool(dbConfig);

// Database connection class
class Database {
    constructor() {
        this.pool = pool;
    }

    // Execute query with error handling
    async query(sql, params = []) {
        try {
            const [rows, fields] = await this.pool.execute(sql, params);
            return rows;
        } catch (error) {
            console.error('Database query error:', {
                sql: sql.substring(0, 100) + '...',
                params,
                error: error.message
            });
            throw error;
        }
    }

    // Execute transaction
    async transaction(callback) {
        const connection = await this.pool.getConnection();
        
        try {
            await connection.beginTransaction();
            const result = await callback(connection);
            await connection.commit();
            return result;
        } catch (error) {
            await connection.rollback();
            throw error;
        } finally {
            connection.release();
        }
    }

    // Get single record
    async findOne(sql, params = []) {
        const rows = await this.query(sql, params);
        return rows[0] || null;
    }

    // Get multiple records
    async findMany(sql, params = []) {
        return await this.query(sql, params);
    }

    // Insert record
    async insert(table, data) {
        const keys = Object.keys(data);
        const values = Object.values(data);
        const placeholders = keys.map(() => '?').join(', ');
        
        const sql = `INSERT INTO ${table} (${keys.join(', ')}) VALUES (${placeholders})`;
        const result = await this.query(sql, values);
        
        return {
            insertId: result.insertId,
            affectedRows: result.affectedRows
        };
    }

    // Update record
    async update(table, data, where, whereParams = []) {
        const keys = Object.keys(data);
        const values = Object.values(data);
        const setClause = keys.map(key => `${key} = ?`).join(', ');
        
        const sql = `UPDATE ${table} SET ${setClause} WHERE ${where}`;
        const result = await this.query(sql, [...values, ...whereParams]);
        
        return {
            affectedRows: result.affectedRows,
            changedRows: result.changedRows
        };
    }

    // Delete record
    async delete(table, where, params = []) {
        const sql = `DELETE FROM ${table} WHERE ${where}`;
        const result = await this.query(sql, params);
        
        return {
            affectedRows: result.affectedRows
        };
    }

    // Check if table exists
    async tableExists(tableName) {
        const sql = `
            SELECT COUNT(*) as count 
            FROM information_schema.tables 
            WHERE table_schema = ? AND table_name = ?
        `;
        const result = await this.query(sql, [process.env.DB_NAME, tableName]);
        return result[0].count > 0;
    }

    // Get table columns
    async getTableColumns(tableName) {
        const sql = `
            SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE, COLUMN_DEFAULT
            FROM information_schema.COLUMNS 
            WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ?
            ORDER BY ORDINAL_POSITION
        `;
        return await this.query(sql, [process.env.DB_NAME, tableName]);
    }

    // Test database connection
    async testConnection() {
        try {
            await this.query('SELECT 1 as test');
            console.log('✅ Database connection successful');
            return true;
        } catch (error) {
            console.error('❌ Database connection failed:', error.message);
            return false;
        }
    }

    // Close all connections
    async closeAll() {
        try {
            await this.pool.end();
            console.log('Database connections closed');
        } catch (error) {
            console.error('Error closing database connections:', error);
        }
    }

    // Get database statistics
    async getStats() {
        try {
            const stats = {
                tables: await this.query(`
                    SELECT table_name, table_rows, data_length, index_length
                    FROM information_schema.tables 
                    WHERE table_schema = ?
                `, [process.env.DB_NAME]),
                
                connections: await this.query('SHOW STATUS LIKE "Threads_connected"'),
                
                uptime: await this.query('SHOW STATUS LIKE "Uptime"')
            };
            
            return stats;
        } catch (error) {
            console.error('Error getting database stats:', error);
            return null;
        }
    }
}

// Create singleton instance
const db = new Database();

// Initialize database connection on startup
(async () => {
    try {
        console.log('🔌 Attempting database connection...');
        const isConnected = await db.testConnection();
        if (!isConnected) {
            console.error('💥 Failed to connect to database. Please check your configuration.');
            console.error('🔍 Environment variables check:');
            console.error('- DB_HOST:', process.env.DB_HOST ? '✅ Set' : '❌ Missing');
            console.error('- DB_PORT:', process.env.DB_PORT ? '✅ Set' : '❌ Missing');
            console.error('- DB_USER:', process.env.DB_USER ? '✅ Set' : '❌ Missing');
            console.error('- DB_PASS:', process.env.DB_PASS ? '✅ Set' : '❌ Missing');
            console.error('- DB_NAME:', process.env.DB_NAME ? '✅ Set' : '❌ Missing');
            // Don't exit in production, let the server start without DB
            if (process.env.NODE_ENV !== 'production') {
                process.exit(1);
            }
        }
    } catch (error) {
        console.error('Database initialization error:', error);
        process.exit(1);
    }
})();

// Handle process termination
process.on('SIGINT', async () => {
    console.log('Closing database connections...');
    await db.closeAll();
    process.exit(0);
});

process.on('SIGTERM', async () => {
    console.log('Closing database connections...');
    await db.closeAll();
    process.exit(0);
});

module.exports = db; 