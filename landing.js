// Landing Page - Load and display artworks

let artworks = [];
let displayedCount = 12;
const loadMoreIncrement = 12;

// Load artworks from JSON
async function loadArtworks() {
    try {
        const response = await fetch('artworks.json');
        artworks = await response.json();

        // Display initial artworks
        displayArtworks();
    } catch (error) {
        console.error('Error loading artworks:', error);
    }
}

// Display artworks in grid
function displayArtworks() {
    const grid = document.getElementById('artwork-grid');
    const artworksToShow = artworks.slice(0, displayedCount);

    grid.innerHTML = artworksToShow.map(artwork => `
        <div class="artwork-card" onclick="window.location.href='/scan.html'">
            <img src="${artwork.img}"
                 alt="${artwork.title}"
                 loading="lazy"
                 onerror="this.src='https://via.placeholder.com/280x280?text=Image+Not+Found'">
            <div class="artwork-info">
                <h3>${artwork.title}</h3>
                <p class="artist">${artwork.artist}</p>
                <p class="year">${artwork.year}</p>
            </div>
        </div>
    `).join('');

    // Show/hide load more button
    const loadMoreBtn = document.getElementById('load-more-btn');
    if (displayedCount >= artworks.length) {
        loadMoreBtn.style.display = 'none';
    } else {
        loadMoreBtn.style.display = 'inline-flex';
    }
}

// Load more artworks
document.getElementById('load-more-btn').addEventListener('click', () => {
    displayedCount += loadMoreIncrement;
    displayArtworks();
});

// Initialize
loadArtworks();
