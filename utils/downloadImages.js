// Download artwork images from Cleveland Museum CDN
import fs from 'fs';
import https from 'https';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Read artworks.json
const artworks = JSON.parse(fs.readFileSync('artworks.json', 'utf8'));

// Download function
function downloadImage(url, filepath) {
    return new Promise((resolve, reject) => {
        const file = fs.createWriteStream(filepath);
        https.get(url, (response) => {
            if (response.statusCode !== 200) {
                reject(new Error(`Failed to download ${url}: ${response.statusCode}`));
                return;
            }
            response.pipe(file);
            file.on('finish', () => {
                file.close();
                resolve();
            });
        }).on('error', (err) => {
            fs.unlink(filepath, () => {});
            reject(err);
        });
    });
}

// Download all images
async function downloadAll() {
    console.log(`Downloading ${artworks.length} images...`);

    for (let i = 0; i < artworks.length; i++) {
        const artwork = artworks[i];
        const url = artwork.img;

        // Extract filename from URL
        const urlParts = url.split('/');
        const filename = urlParts[urlParts.length - 1];
        const filepath = path.join(__dirname, 'images', filename);

        try {
            console.log(`[${i + 1}/${artworks.length}] Downloading ${filename}...`);
            await downloadImage(url, filepath);
            console.log(`✓ Downloaded ${filename}`);
        } catch (error) {
            console.error(`✗ Failed to download ${filename}:`, error.message);
        }
    }

    console.log('\n✓ All images downloaded!');
}

downloadAll().catch(console.error);
