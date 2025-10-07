// Scrape Relief Society General Presidents images from Church website
import fs from 'fs';
import https from 'https';

const URL = 'https://www.churchofjesuschrist.org/media/collection/relief-society-general-presidents-images?lang=eng';

function fetchPage(url) {
    return new Promise((resolve, reject) => {
        https.get(url, (response) => {
            let data = '';
            response.on('data', (chunk) => data += chunk);
            response.on('end', () => resolve(data));
        }).on('error', reject);
    });
}

async function scrapeImages() {
    console.log('Fetching Church website...');
    const html = await fetchPage(URL);

    // Extract JSON-LD structured data from the page
    const jsonLdMatch = html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/);

    if (jsonLdMatch) {
        const structuredData = JSON.parse(jsonLdMatch[1]);
        if (structuredData.itemListElement) {
            console.log(`Found ${structuredData.itemListElement.length} images in structured data`);
        }
    }

    // Extract from data attributes or image tags
    const imageMatches = [...html.matchAll(/data-src="([^"]*?)"/g)];
    const titleMatches = [...html.matchAll(/data-title="([^"]*?)"/g)];

    // Manual data (from the webpage) - 16 Relief Society General Presidents
    const presidents = [
        {
            name: "Emma Smith",
            description: "First Relief Society General President (1842-1844). Portrait by Lee Greene Richards.",
            searchTerm: "emma-smith"
        },
        {
            name: "Eliza R. Snow",
            description: "Second General President (1866-1887). Portrait by John Willard Clawson.",
            searchTerm: "eliza-snow"
        },
        {
            name: "Zina Diantha Huntington Young",
            description: "Third General President (1888-1901). Portrait by John Willard Clawson.",
            searchTerm: "zina-young"
        },
        {
            name: "Bathsheba W. Smith",
            description: "Fourth General President (1901-1910). Portrait by Lee Greene Richards.",
            searchTerm: "bathsheba-smith"
        },
        {
            name: "Emmeline B. Wells",
            description: "Fifth General President (1910-1921). Portrait by Lee Greene Richards.",
            searchTerm: "emmeline-wells"
        },
        {
            name: "Clarissa Smith Williams",
            description: "Sixth General President (1921-1928). Portrait by Lee Greene Richards.",
            searchTerm: "clarissa-williams"
        },
        {
            name: "Louise Yates Robison",
            description: "Seventh General President (1928-1939). Portrait by John Willard Clawson.",
            searchTerm: "louise-robison"
        },
        {
            name: "Amy Brown Lyman",
            description: "Eighth General President (1940-1945). Portrait by Lee Greene Richards.",
            searchTerm: "amy-lyman"
        },
        {
            name: "Belle Smith Spafford",
            description: "Ninth General President (1945-1974). Portrait by Alvin Gittins.",
            searchTerm: "belle-spafford"
        },
        {
            name: "Barbara B. Smith",
            description: "Tenth General President (1974-1984). Portrait by Cloy Paulson Kent.",
            searchTerm: "barbara-b-smith"
        },
        {
            name: "Barbara W. Winder",
            description: "Eleventh General President (1984-1990).",
            searchTerm: "barbara-winder"
        },
        {
            name: "Elaine L. Jack",
            description: "Twelfth General President (1990-1997).",
            searchTerm: "elaine-jack"
        },
        {
            name: "Mary Ellen Smoot",
            description: "Thirteenth General President (1997-2002).",
            searchTerm: "mary-smoot"
        },
        {
            name: "Bonnie D. Parkin",
            description: "Fourteenth General President (2002-2007).",
            searchTerm: "bonnie-parkin"
        },
        {
            name: "Julie B. Beck",
            description: "Fifteenth General President (2007-2012).",
            searchTerm: "julie-beck"
        },
        {
            name: "Linda K. Burton",
            description: "Sixteenth General President (2012-2017).",
            searchTerm: "linda-burton"
        }
    ];

    // Try to find image URLs in the HTML
    console.log('\nSearching for image URLs in page...');

    // Look for high-res image URLs (typically in .jpg format)
    const highResMatches = [...html.matchAll(/https:\/\/[^"'\s]*?churchofjesuschrist\.org[^"'\s]*?\.jpg/gi)];
    console.log(`Found ${highResMatches.length} potential image URLs`);

    // For now, we'll construct likely URLs based on the Church's media pattern
    // Actual URLs will need to be verified/updated after inspection
    const imagesMetadata = presidents.map((president, index) => ({
        id: index + 1,
        name: president.name,
        description: president.description,
        // Placeholder - these URLs need to be updated with actual URLs from the site
        imageUrl: `https://www.churchofjesuschrist.org/imgs/[TO_BE_FILLED]/${president.searchTerm}.jpg`,
        filename: `${president.searchTerm}.jpg`
    }));

    // Save metadata
    fs.writeFileSync('images-metadata.json', JSON.stringify(imagesMetadata, null, 2));
    console.log('\n✓ Saved metadata to images-metadata.json');
    console.log('\n⚠️  NOTE: Image URLs are placeholders. You need to:');
    console.log('   1. Visit the Church website');
    console.log('   2. Inspect each image to get the actual high-res URL');
    console.log('   3. Update images-metadata.json with real URLs');
    console.log('\nSample high-res URLs found:');
    highResMatches.slice(0, 5).forEach(match => console.log(`   ${match[0]}`));
}

scrapeImages().catch(console.error);
