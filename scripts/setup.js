const fs = require('fs');
const path = require('path');
require('dotenv').config();

console.log('🚀 Madeus E-commerce Backend Setup');
console.log('=====================================');

// Check if .env file exists
function checkEnvFile() {
    const envPath = path.join(__dirname, '../.env');
    if (!fs.existsSync(envPath)) {
        console.log('❌ .env file not found');
        console.log('📝 Creating .env from template...');
        
        const examplePath = path.join(__dirname, '../.env.example');
        if (fs.existsSync(examplePath)) {
            fs.copyFileSync(examplePath, envPath);
            console.log('✅ .env file created from template');
            console.log('⚠️  Please update the values in .env file');
            return false;
        }
    }
    console.log('✅ .env file exists');
    return true;
}

// Check required environment variables
function checkEnvironmentVariables() {
    console.log('\n🔧 Checking environment variables...');
    
    const required = [
        'DB_HOST', 'DB_USER', 'DB_PASS', 'DB_NAME',
        'JWT_SECRET', 'EMAIL_USER', 'EMAIL_PASS'
    ];
    
    const missing = [];
    const configured = [];
    
    required.forEach(key => {
        if (!process.env[key] || process.env[key].startsWith('your_')) {
            missing.push(key);
        } else {
            configured.push(key);
        }
    });
    
    console.log(`✅ Configured: ${configured.length}/${required.length}`);
    configured.forEach(key => console.log(`   ✓ ${key}`));
    
    if (missing.length > 0) {
        console.log(`❌ Missing configuration: ${missing.length}`);
        missing.forEach(key => console.log(`   ✗ ${key}`));
        return false;
    }
    
    return true;
}

// Check Node.js version
function checkNodeVersion() {
    console.log('\n📊 Checking Node.js version...');
    const nodeVersion = process.version;
    const majorVersion = parseInt(nodeVersion.substring(1).split('.')[0]);
    
    console.log(`Current version: ${nodeVersion}`);
    
    if (majorVersion < 16) {
        console.log('❌ Node.js 16+ required');
        return false;
    }
    
    console.log('✅ Node.js version compatible');
    return true;
}

// Check required directories
function checkDirectories() {
    console.log('\n📁 Checking directories...');
    
    const dirs = [
        '../uploads',
        '../backups',
        '../logs',
        '../routes',
        '../middleware'
    ];
    
    dirs.forEach(dir => {
        const fullPath = path.join(__dirname, dir);
        if (!fs.existsSync(fullPath)) {
            console.log(`📁 Creating directory: ${dir}`);
            fs.mkdirSync(fullPath, { recursive: true });
        }
    });
    
    console.log('✅ All directories ready');
}

// Test database connection
async function testDatabaseConnection() {
    console.log('\n🗄️  Testing database connection...');
    
    try {
        const db = require('../config/database');
        const isConnected = await db.testConnection();
        
        if (!isConnected) {
            console.log('❌ Database connection failed');
            console.log('💡 Check your database credentials in .env file');
            return false;
        }
        
        return true;
    } catch (error) {
        console.log('❌ Database test failed:', error.message);
        return false;
    }
}

// Test email service
async function testEmailService() {
    console.log('\n📧 Testing email service...');
    
    try {
        const emailService = require('../utils/email');
        const isReady = await emailService.testConnection();
        
        if (!isReady) {
            console.log('❌ Email service connection failed');
            console.log('💡 Check your email credentials in .env file');
            return false;
        }
        
        return true;
    } catch (error) {
        console.log('❌ Email test failed:', error.message);
        return false;
    }
}

// Check package dependencies
function checkDependencies() {
    console.log('\n📦 Checking dependencies...');
    
    try {
        const packageJson = require('../package.json');
        const dependencies = Object.keys(packageJson.dependencies || {});
        
        console.log(`📋 Total dependencies: ${dependencies.length}`);
        
        // Check if node_modules exists
        const nodeModulesPath = path.join(__dirname, '../node_modules');
        if (!fs.existsSync(nodeModulesPath)) {
            console.log('❌ node_modules not found');
            console.log('💡 Run: npm install');
            return false;
        }
        
        console.log('✅ Dependencies installed');
        return true;
    } catch (error) {
        console.log('❌ Package.json not found');
        return false;
    }
}

// Generate JWT secret if missing
function generateJWTSecret() {
    if (!process.env.JWT_SECRET || process.env.JWT_SECRET === 'your_super_secret_jwt_key_change_this_in_production') {
        console.log('\n🔐 Generating JWT secret...');
        const crypto = require('crypto');
        const secret = crypto.randomBytes(64).toString('hex');
        
        console.log('🔑 New JWT Secret generated:');
        console.log(`JWT_SECRET=${secret}`);
        console.log('⚠️  Please update this in your .env file');
    }
}

// Main setup function
async function main() {
    let allGood = true;
    
    // Basic checks
    if (!checkNodeVersion()) allGood = false;
    if (!checkEnvFile()) allGood = false;
    if (!checkDependencies()) allGood = false;
    
    checkDirectories();
    generateJWTSecret();
    
    if (!checkEnvironmentVariables()) {
        allGood = false;
    } else {
        // Only run service tests if env vars are configured
        if (!await testDatabaseConnection()) allGood = false;
        if (!await testEmailService()) allGood = false;
    }
    
    console.log('\n=====================================');
    
    if (allGood) {
        console.log('🎉 Setup completed successfully!');
        console.log('\n🚀 You can now start the server:');
        console.log('   npm run dev');
        console.log('\n📚 Next steps:');
        console.log('   1. Create database tables: npm run migrate');
        console.log('   2. Start development server: npm run dev');
        console.log('   3. Test API: http://localhost:5000/api/health');
    } else {
        console.log('❌ Setup completed with issues');
        console.log('\n🔧 Please fix the issues above and run setup again');
        console.log('   node scripts/setup.js');
    }
    
    process.exit(allGood ? 0 : 1);
}

// Run setup
main().catch(error => {
    console.error('💥 Setup failed:', error);
    process.exit(1);
}); 