// Download Relief Society General President images from Church website
import fs from 'fs';
import https from 'https';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Read images metadata
const metadata = JSON.parse(fs.readFileSync('images-metadata.json', 'utf8'));

// Ensure images directory exists
const imagesDir = path.join(__dirname, '..', 'images');
if (!fs.existsSync(imagesDir)) {
    fs.mkdirSync(imagesDir, { recursive: true });
}

// Download function
function downloadImage(url, filepath) {
    return new Promise((resolve, reject) => {
        const file = fs.createWriteStream(filepath);
        https.get(url, (response) => {
            if (response.statusCode === 301 || response.statusCode === 302) {
                // Follow redirect
                https.get(response.headers.location, (redirectResponse) => {
                    if (redirectResponse.statusCode !== 200) {
                        reject(new Error(`Failed after redirect: ${redirectResponse.statusCode}`));
                        return;
                    }
                    redirectResponse.pipe(file);
                    file.on('finish', () => {
                        file.close();
                        resolve();
                    });
                }).on('error', (err) => {
                    fs.unlink(filepath, () => {});
                    reject(err);
                });
            } else if (response.statusCode !== 200) {
                reject(new Error(`Failed to download ${url}: ${response.statusCode}`));
                return;
            } else {
                response.pipe(file);
                file.on('finish', () => {
                    file.close();
                    resolve();
                });
            }
        }).on('error', (err) => {
            fs.unlink(filepath, () => {});
            reject(err);
        });
    });
}

// Download all images
async function downloadAll() {
    console.log(`Downloading ${metadata.length} images from Church website...`);

    for (let i = 0; i < metadata.length; i++) {
        const item = metadata[i];
        const filepath = path.join(imagesDir, item.filename);

        // Skip if already exists
        if (fs.existsSync(filepath)) {
            console.log(`[${i + 1}/${metadata.length}] ⏭️  ${item.filename} already exists, skipping...`);
            continue;
        }

        try {
            console.log(`[${i + 1}/${metadata.length}] Downloading ${item.name}...`);
            await downloadImage(item.imageUrl, filepath);
            console.log(`✓ Downloaded ${item.filename}`);
        } catch (error) {
            console.error(`✗ Failed to download ${item.filename}:`, error.message);
        }
    }

    console.log('\n✓ All images downloaded!');
    console.log(`Images saved to: ${imagesDir}`);
}

downloadAll().catch(console.error);
