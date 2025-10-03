// Update artworks.json to use local image paths
import fs from 'fs';

const artworks = JSON.parse(fs.readFileSync('artworks.json', 'utf8'));

// Update each artwork's img path
artworks.forEach(artwork => {
    const url = artwork.img;
    const urlParts = url.split('/');
    const filename = urlParts[urlParts.length - 1];
    artwork.img = `images/${filename}`;
});

// Write updated JSON
fs.writeFileSync('artworks.json', JSON.stringify(artworks, null, 2));

console.log('✓ Updated artworks.json with local image paths');
