// Preload and process artworks on landing page
// Runs in background to prepare data for scanner page

let cv = null;
let isProcessing = false;

// Update preloader status
function updatePreloaderStatus(message, isComplete = false) {
    const indicator = document.getElementById('preload-indicator');
    const statusText = document.getElementById('preload-status');

    if (indicator && statusText) {
        statusText.textContent = message;
        if (isComplete) {
            indicator.classList.add('complete');
            setTimeout(() => {
                indicator.style.opacity = '0';
                setTimeout(() => indicator.style.display = 'none', 500);
            }, 2000);
        }
    }
    console.log('[Preloader]', message);
}

// OpenCV ready callback
function onOpenCvReady() {
    cv = window.cv;
    console.log('[Preloader] OpenCV.js loaded');
    updatePreloaderStatus('Processing artworks...');
    processArtworks();
}

// Set up OpenCV module
var Module = {
    onRuntimeInitialized: onOpenCvReady
};

// Load image
function loadImage(src) {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = (e) => reject(new Error(`Failed to load ${src}`));
        img.src = src;
    });
}

// Extract ORB features
function extractORBFeatures(img) {
    const src = cv.imread(img);
    const gray = new cv.Mat();
    cv.cvtColor(src, gray, cv.COLOR_RGBA2GRAY);

    const orb = new cv.ORB(500);
    const keypoints = new cv.KeyPointVector();
    const descriptors = new cv.Mat();

    orb.detectAndCompute(gray, new cv.Mat(), keypoints, descriptors);

    src.delete();
    gray.delete();
    orb.delete();

    return { keypoints, descriptors };
}

// Process all artworks
async function processArtworks() {
    if (isProcessing) return;
    isProcessing = true;

    try {
        // Load artworks JSON
        const response = await fetch('artworks.json');
        const artworks = await response.json();

        updatePreloaderStatus(`Processing ${artworks.length} artworks...`);

        const referenceData = [];

        // Process each artwork
        for (let i = 0; i < artworks.length; i++) {
            const artwork = artworks[i];
            updatePreloaderStatus(`Processing ${i + 1}/${artworks.length}: ${artwork.title}`);

            const img = await loadImage(artwork.img);
            const features = extractORBFeatures(img);

            referenceData.push({
                ...artwork,
                descriptors: features.descriptors,
                keypoints: features.keypoints
            });
        }

        // Save to cache
        if (window.OpencvCache) {
            window.OpencvCache.saveProcessedArtworks(referenceData);
            updatePreloaderStatus('✓ All artworks ready!', true);
        }

        // Clean up
        referenceData.forEach(ref => {
            ref.descriptors.delete();
            ref.keypoints.delete();
        });

    } catch (error) {
        console.error('[Preloader] Error:', error);
        updatePreloaderStatus('Error processing artworks');
    } finally {
        isProcessing = false;
    }
}

// Initialize preloader
console.log('[Preloader] Starting background processing...');
updatePreloaderStatus('Loading OpenCV.js...');
