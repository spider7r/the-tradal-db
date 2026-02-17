
const apiKey = 'eyJ0eXAiOiJKV1QiLCJhbGciOiJSUzI1NiJ9.eyJhdWQiOiI5NGQ1OWNlZi1kYmI4LTRlYTUtYjE3OC1kMjU0MGZjZDY5MTkiLCJqdGkiOiI1ZTJkNGU0YTE3ZWU4NGNjNTFiOTI2ZGM3Y2RhOTJkYmQ0MDFjOTAyYzg4NWM4NmIwN2U1NjIzYTY2ZGUwOTMwNTJlYTM5OGQ1ZmZlY2EyYiIsImlhdCI6MTc3MDk5MzI0OC4zNDE0MjQsIm5iZiI6MTc3MDk5MzI0OC4zNDE0MjcsImV4cCI6MTc4NjU3OTIwMC4wMzE3Niwic3ViIjoiNjEwNDI5NyIsInNjb3BlcyI6W119.iEGU5bqKgw_eR-toUU6xPn0U5AsF8R3sCF8k-9Csp-Mrw1SNP8OyX7ne2SHUqvqYE3Y37Dnvo85uqGgAzXGw6fb5-Rk4lyHoIFZD7JQ-B7O03nqnVvTGBHx7bT7st4af-G85QGcG0CLXK3sqcyseYNc35UdUm1zpr3AaIrg3t3gdmMlrgzi-GocXIqjQu-YJ0EySP96ftT72_UOQ8Xi3cCtU_56EKA03Q7VKMuI-INk4svL2GyL21KsxCA5zEvZ_YyYMpeO5i7LIpxF2wAW2fA2RB9g1EYLZ57xySAuZYTB9qJTRHm-W3vn8It4XrZ4uYpXuM7pxZk12iBanyHCpxI4_Kqnzs1krD3lUAywYijr8JtBefeFcYEogGEVnCjUXepM5wapCFHHtCBPEDtybF9sOcNi4xKLEmnvk6i7qmC7mBMfnN3fYPEggK10dKvXjUqRkJSgzRgnT65bnw8EYq07MmwZDvFhIA4lKxmOx58ms4RDTBMOO-lyyGDxwrn9ftGm6JLBmdJOrxqaJyV4ApvIyYYiVKCCz6OXedaaV6GB6l_-_dos5duX8mSLma8Sbq0-FijTEK3huaLojPzkz-DVnQfiuWJKjT3IoBNmkUyATRdg11tuFmIwk_CgbEh8pCNSyKUQhA_1EBstGtzOTS86I5M6VfMPkFX-Ndn6pExE';

async function fetchProducts() {
    try {
        // Try fetching products without the store_id filter first to see if it works
        const response = await fetch('https://api.lemonsqueezy.com/v1/products', {
            headers: {
                'Accept': 'application/vnd.api+json',
                'Content-Type': 'application/vnd.api+json',
                'Authorization': `Bearer ${apiKey}`
            }
        });

        if (!response.ok) {
            const txt = await response.text();
            throw new Error(`HTTP error! status: ${response.status} - ${txt}`);
        }

        const data = await response.json();
        
        console.log("--- LEMON SQUEEZY PRODUCTS ---");
        if (data.data && data.data.length > 0) {
            data.data.forEach((product: any) => {
                console.log(`Product Name: ${product.attributes.name}`);
                console.log(`Product ID: ${product.id}`);
                console.log(`Store ID: ${product.attributes.store_id}`);
                console.log(`Price: ${product.attributes.price_formatted}`);
                console.log(`Buy URL: ${product.attributes.buy_url}`);
                console.log("--------------------------------");
            });
        } else {
            console.log("No products found.");
            console.log("Full response:", JSON.stringify(data, null, 2));
        }

    } catch (error) {
        console.error('Error fetching products:', error);
    }
}

fetchProducts();
