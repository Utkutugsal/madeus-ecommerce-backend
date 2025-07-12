const https = require('https');

async function callSetupEndpoint(path) {
    return new Promise((resolve, reject) => {
        const options = {
            hostname: 'madeus-ecommerce-backend-production.up.railway.app',
            port: 443,
            path: path,
            method: 'GET',
            headers: {
                'User-Agent': 'Node.js Setup Script'
            }
        };

        const req = https.request(options, (res) => {
            let data = '';
            res.on('data', (chunk) => {
                data += chunk;
            });
            res.on('end', () => {
                resolve({
                    statusCode: res.statusCode,
                    data: data
                });
            });
        });

        req.on('error', (error) => {
            reject(error);
        });

        req.end();
    });
}

async function setupDatabase() {
    try {
        console.log('1. Testing setup endpoint...');
        const testResult = await callSetupEndpoint('/api/setup/test');
        console.log('Test result:', testResult.statusCode, testResult.data);

        console.log('\n2. Creating database tables...');
        const createTablesResult = await callSetupEndpoint('/api/setup/create-tables');
        console.log('Create tables result:', createTablesResult.statusCode, createTablesResult.data);

        console.log('\n3. Inserting sample data...');
        const sampleDataResult = await callSetupEndpoint('/api/setup/sample-data');
        console.log('Sample data result:', sampleDataResult.statusCode, sampleDataResult.data);

        console.log('\n4. Creating admin user...');
        const adminResult = await callSetupEndpoint('/api/setup/create-admin');
        console.log('Admin creation result:', adminResult.statusCode, adminResult.data);

        console.log('\nSetup completed!');
    } catch (error) {
        console.error('Setup failed:', error);
    }
}

setupDatabase(); 