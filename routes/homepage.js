// Landing Page - Load and display Relief Society Presidents

let presidents = [];
let displayedCount = 12;
const loadMoreIncrement = 12;

// Load presidents from JSON
async function loadGalleryArtworks() {
    try {
        const response = await fetch("lib/descriptors.json");
        presidents = await response.json();

        // Display initial presidents
        displayGalleryArtworks();
    } catch (error) {
        console.error("Error loading presidents:", error);
    }
}

// Display presidents in grid
function displayGalleryArtworks() {
    const grid = document.getElementById("artwork-grid");
    const presidentsToShow = presidents.slice(0, displayedCount);

    grid.innerHTML = presidentsToShow
        .map(
            (president) => `
        <div class="artwork-card">
            <a href="${president.url}" target="_blank">
                <img src="${president.url}" alt="${president.name}">
            </a>
            <div class="artwork-info">
                <h3>${president.name}</h3>
                <p class="artist">${president.description}</p>
            </div>
        </div>
    `
        )
        .join("");

    // Show/hide load more button
    const loadMoreBtn = document.getElementById("load-more-btn");
    if (displayedCount >= presidents.length) {
        loadMoreBtn.style.display = "none";
    } else {
        loadMoreBtn.style.display = "inline-flex";
    }
}

// ============================================================================
// ROUTE LIFECYCLE FUNCTIONS
// ============================================================================

// Initialize gallery page (called by router onEnter)
window.initGalleryPage = function() {
    console.log('[Gallery] Page initialized');

    // Set up event listeners (now that template is rendered)
    const loadMoreBtn = document.getElementById("load-more-btn");
    if (loadMoreBtn) {
        loadMoreBtn.addEventListener("click", () => {
            displayedCount += loadMoreIncrement;
            displayGalleryArtworks();
        });
    }

    // Load artworks
    loadGalleryArtworks();
};

// Cleanup gallery page (called by router onLeave)
window.cleanupGalleryPage = function() {
    console.log('[Gallery] Cleaning up');
    // Nothing specific to clean up for gallery page
};

console.log('Gallery module loaded');
