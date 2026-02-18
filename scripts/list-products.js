require('dotenv').config({ path: '.env.local' });
const https = require('https');
const fs = require('fs');

const apiKey = process.env.LEMONSQUEEZY_API_KEY;

function fetchJSON(path) {
    return new Promise((resolve, reject) => {
        https.get({
            hostname: 'api.lemonsqueezy.com',
            path,
            headers: {
                'Accept': 'application/vnd.api+json',
                'Authorization': `Bearer ${apiKey}`
            }
        }, res => {
            let d = '';
            res.on('data', c => d += c);
            res.on('end', () => resolve(JSON.parse(d)));
        }).on('error', reject);
    });
}

async function main() {
    let out = '';

    const products = await fetchJSON('/v1/products?page[size]=100');
    out += '=== PRODUCTS ===\n';
    for (const p of products.data) {
        out += `  ${p.id} | ${p.attributes.name} | ${p.attributes.status} | $${(p.attributes.price / 100).toFixed(2)}\n`;
    }

    const variants = await fetchJSON('/v1/variants?page[size]=100');
    out += '\n=== VARIANTS ===\n';
    for (const v of variants.data) {
        out += `  ${v.id} | ${v.attributes.name} | ProductID: ${v.attributes.product_id} | $${(v.attributes.price / 100).toFixed(2)} | ${v.attributes.status}\n`;
    }

    fs.writeFileSync('ls-products.txt', out);
    console.log('Written to ls-products.txt');
}

main().catch(console.error);
