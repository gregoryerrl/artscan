// generateArtDataset.js
import fetch from "node-fetch";
import fs from "fs";

// Most famous artists - prioritized list
const artists = [
    { name: "Leonardo da Vinci", limit: 5 },
    { name: "Vincent van Gogh", limit: 5 },
    { name: "Pablo Picasso", limit: 5 },
    { name: "Claude Monet", limit: 5 },
    { name: "Rembrandt", limit: 4 },
    { name: "Michelangelo", limit: 4 },
    { name: "Edvard Munch", limit: 3 },
    { name: "Salvador Dalí", limit: 3 },
    { name: "Frida Kahlo", limit: 3 },
    { name: "Gustav Klimt", limit: 3 },
    { name: "Henri Matisse", limit: 3 },
    { name: "Caravaggio", limit: 2 },
    { name: "Johannes Vermeer", limit: 2 },
    { name: "Diego Velázquez", limit: 2 },
    { name: "Raphael", limit: 2 },
    { name: "Paul Cézanne", limit: 2 },
    { name: "Georgia O'Keeffe", limit: 2 },
];

async function fetchArtworks() {
    const artworks = [];

    console.log("🎨 Fetching TOP 50 artworks from Cleveland Museum of Art API...\n");

    for (const artist of artists) {
        console.log(`Fetching works by ${artist.name}...`);

        // Try search query instead of artist parameter
        const url = `https://openaccess-api.clevelandart.org/api/artworks?q=${encodeURIComponent(
            artist.name
        )}&has_image=1&limit=50`;

        try {
            const res = await fetch(url);
            const data = await res.json();

            let count = 0;
            const seenIds = new Set();

            for (const item of data.data) {
                // Skip if no image
                if (!item.images?.web?.url) continue;

                // Skip duplicates
                if (seenIds.has(item.id)) {
                    console.log(`    [Skip] Duplicate ID ${item.id}: ${item.title}`);
                    continue;
                }

                // Validate artist name (API sometimes returns wrong results)
                const itemCreators = item.creators || [];
                const artistMatch = itemCreators.some(creator =>
                    creator.description?.toLowerCase().includes(artist.name.toLowerCase()) ||
                    creator.description?.toLowerCase().includes(artist.name.split(' ')[artist.name.split(' ').length - 1].toLowerCase())
                );

                // If no creators info, check tombstone or skip
                if (itemCreators.length === 0) {
                    // Try tombstone field
                    if (!item.tombstone?.toLowerCase().includes(artist.name.toLowerCase())) {
                        console.log(`    [Skip] No artist match: ${item.title}`);
                        continue;
                    }
                }

                if (!artistMatch && itemCreators.length > 0) {
                    console.log(`    [Skip] Artist mismatch: ${item.title} (creators: ${itemCreators.map(c => c.description).join(', ')})`);
                    continue;
                }

                seenIds.add(item.id);
                artworks.push({
                    id: item.id,
                    title: item.title,
                    artist: artist.name,
                    year: item.creation_date || "Unknown",
                    img: item.images.web.url,
                });

                count++;
                if (count >= artist.limit) break;
            }

            console.log(`  ✓ Found ${count} artworks by ${artist.name}`);
        } catch (error) {
            console.error(`  ✗ Error fetching ${artist.name}:`, error.message);
        }
    }

    console.log(`\n✅ Total: ${artworks.length} artworks`);

    // Save to JSON file
    fs.writeFileSync("artworks.json", JSON.stringify(artworks, null, 2));
    console.log(`✅ Saved to artworks.json`);

    // Generate summary
    const summary = artists.map((artist) => {
        const count = artworks.filter((a) => a.artist === artist.name).length;
        return `${artist.name}: ${count} artworks`;
    });

    console.log("\n📊 Summary by Artist:");
    summary.forEach((s) => console.log(`  ${s}`));
}

fetchArtworks().catch(console.error);
