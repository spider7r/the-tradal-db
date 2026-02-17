const https = require('https');

const apiKey = process.env.LEMONSQUEEZY_API_KEY;
const storeId = process.env.LEMONSQUEEZY_STORE_ID;

if (!apiKey) {
    console.error('LEMONSQUEEZY_API_KEY is not set');
    process.exit(1);
}

const options = {
    hostname: 'api.lemonsqueezy.com',
    path: '/v1/variants?page[size]=100',
    method: 'GET',
    headers: {
        'Accept': 'application/vnd.api+json',
        'Content-Type': 'application/vnd.api+json',
        'Authorization': `Bearer ${apiKey}`
    }
};

const req = https.request(options, (res) => {
    let data = '';

    res.on('data', (chunk) => {
        data += chunk;
    });

    res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
            const response = JSON.parse(data);
            console.log('Variants found:', response.data.length);
            response.data.forEach(variant => {
                console.log(`ID: ${variant.id}, Name: ${variant.attributes.name}, Product ID: ${variant.attributes.product_id}`);
            });

            // Also fetch products to map names better if needed
            fetchProducts();
        } else {
            console.error(`Error: ${res.statusCode} ${res.statusMessage}`);
            console.error(data);
        }
    });
});

req.on('error', (e) => {
    console.error(`Problem with request: ${e.message}`);
});

req.end();

function fetchProducts() {
    const prodOptions = { ...options, path: '/v1/products?page[size]=100' };
    const prodReq = https.request(prodOptions, (res) => {
        let data = '';
        res.on('data', c => data += c);
        res.on('end', () => {
            if (res.statusCode >= 200 && res.statusCode < 300) {
                const response = JSON.parse(data);
                console.log('\nProducts found:', response.data.length);
                response.data.forEach(product => {
                    console.log(`ID: ${product.id}, Name: ${product.attributes.name}`);
                });
            }
        });
    });
    prodReq.end();
}
