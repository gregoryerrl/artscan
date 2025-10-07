// Landing Page - Load and display Relief Society Presidents

let presidents = [];
let displayedCount = 12;
const loadMoreIncrement = 12;

// Load presidents from JSON
async function loadArtworks() {
    try {
        const response = await fetch("lib/descriptors.json");
        presidents = await response.json();

        // Display initial presidents
        displayArtworks();
    } catch (error) {
        console.error("Error loading presidents:", error);
    }
}

// Display presidents in grid
function displayArtworks() {
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

// Load more artworks
document.getElementById("load-more-btn").addEventListener("click", () => {
    displayedCount += loadMoreIncrement;
    displayArtworks();
});

// Initialize
loadArtworks();
