import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import https from 'https';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 8000;

// Train images list endpoint
app.get('/api/train-images', (req, res) => {
    const trainDir = path.join(__dirname, 'train');
    try {
        const files = fs.readdirSync(trainDir)
            .filter(file => file.endsWith('.jpg'))
            .sort();
        res.json(files);
    } catch (error) {
        console.error('Error reading train directory:', error);
        res.status(500).json({ error: 'Failed to read train directory' });
    }
});

// Image proxy endpoint to bypass CORS
app.get('/api/proxy-image', async (req, res) => {
    const imageUrl = req.query.url;

    if (!imageUrl || !imageUrl.startsWith('https://openaccess-cdn.clevelandart.org/')) {
        return res.status(400).send('Invalid image URL');
    }

    try {
        https.get(imageUrl, (response) => {
            res.setHeader('Content-Type', response.headers['content-type']);
            res.setHeader('Access-Control-Allow-Origin', '*');
            response.pipe(res);
        }).on('error', (err) => {
            console.error('Proxy error:', err);
            res.status(500).send('Failed to fetch image');
        });
    } catch (error) {
        console.error('Proxy error:', error);
        res.status(500).send('Failed to fetch image');
    }
});

// Serve static files
app.use(express.static(__dirname));

// Serve index.html for root
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(PORT, () => {
    console.log(`✓ Server running at http://localhost:${PORT}`);
    console.log(`✓ Image proxy enabled at /api/proxy-image`);
    console.log(`✓ Press Ctrl+C to stop`);
});
