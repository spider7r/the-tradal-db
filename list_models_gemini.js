
const fs = require('fs');
const https = require('https');

try {
    const env = fs.readFileSync('.env.local', 'utf8');
    const match = env.match(/GEMINI_API_KEY="?([^"\n\r]+)"?/);
    const key = match ? match[1] : null;

    if (!key) {
        console.log("No key found!");
        process.exit(1);
    }

    console.log("Using Key ending in:", key.slice(-5));

    const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${key}`;

    https.get(url, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
            try {
                const json = JSON.parse(data);
                if (json.error) {
                    console.error("API Error:", JSON.stringify(json.error, null, 2));
                } else if (json.models) {
                    console.log("Models found:");
                    json.models.forEach(m => console.log(m.name));
                } else {
                    console.log("Unexpected response structure:", json);
                }
            } catch (e) {
                console.log("Raw Response:", data);
            }
        });
    }).on('error', e => console.error(e));

} catch (e) {
    console.error("File Read Error:", e.message);
}
