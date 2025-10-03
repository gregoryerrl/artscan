// Check for duplicate/incorrect artworks in dataset
import fs from 'fs';

const data = JSON.parse(fs.readFileSync('artworks.json', 'utf8'));

console.log('🔍 Scanning dataset for errors...\n');

// Find duplicate titles with different artists
const titleMap = {};
data.forEach(artwork => {
    if (!titleMap[artwork.title]) {
        titleMap[artwork.title] = [];
    }
    titleMap[artwork.title].push(artwork.artist);
});

const duplicates = Object.entries(titleMap).filter(([title, artists]) => {
    const unique = [...new Set(artists)];
    return unique.length > 1;
});

if (duplicates.length > 0) {
    console.log('❌ Found artworks with MULTIPLE ARTISTS (API error):');
    duplicates.forEach(([title, artists]) => {
        const unique = [...new Set(artists)];
        console.log(`  - "${title}": ${unique.join(', ')}`);
    });
    console.log();
}

// Find exact duplicate artworks (same ID)
const idMap = {};
data.forEach(artwork => {
    if (!idMap[artwork.id]) {
        idMap[artwork.id] = [];
    }
    idMap[artwork.id].push(artwork.artist);
});

const duplicateIds = Object.entries(idMap).filter(([id, artists]) => artists.length > 1);

if (duplicateIds.length > 0) {
    console.log('❌ Found DUPLICATE IDs:');
    duplicateIds.forEach(([id, artists]) => {
        console.log(`  - ID ${id}: ${artists.join(', ')}`);
    });
    console.log();
}

// Count by artist
const artistCount = {};
data.forEach(artwork => {
    if (!artistCount[artwork.artist]) {
        artistCount[artwork.artist] = 0;
    }
    artistCount[artwork.artist]++;
});

console.log('📊 Artworks per Artist:');
Object.entries(artistCount)
    .sort((a, b) => b[1] - a[1])
    .forEach(([artist, count]) => {
        console.log(`  ${artist}: ${count}`);
    });

console.log(`\n✅ Total artworks: ${data.length}`);
