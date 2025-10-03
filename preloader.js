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

// Extract ORB features (using canvas to avoid CORS issues)
function extractORBFeatures(img) {
    try {
        // Create a temporary canvas to avoid CORS issues
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = img.width || img.videoWidth;
        tempCanvas.height = img.height || img.videoHeight;
        const ctx = tempCanvas.getContext('2d');
        ctx.drawImage(img, 0, 0);

        const src = cv.imread(tempCanvas);
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
    } catch (error) {
        console.error('[Preloader] ORB extraction error:', error);
        throw error;
    }
}

// Process all artworks
async function processArtworks() {
    if (isProcessing) {
        console.log('[Preloader] Already processing, skipping...');
        return;
    }
    isProcessing = true;

    try {
        console.log('[Preloader] Starting artwork processing...');

        // Load artworks JSON
        const response = await fetch('artworks.json');
        if (!response.ok) {
            throw new Error(`Failed to fetch artworks.json: ${response.status}`);
        }
        const artworks = await response.json();
        console.log(`[Preloader] Loaded ${artworks.length} artworks from JSON`);

        updatePreloaderStatus(`Processing ${artworks.length} artworks...`);

        const referenceData = [];

        // Process each artwork
        for (let i = 0; i < artworks.length; i++) {
            const artwork = artworks[i];
            const progress = `${i + 1}/${artworks.length}`;
            updatePreloaderStatus(`Processing ${progress}: ${artwork.title.substring(0, 30)}...`);
            console.log(`[Preloader] [${progress}] Processing: ${artwork.title}`);

            const img = await loadImage(artwork.img);
            const features = extractORBFeatures(img);

            console.log(`[Preloader] [${progress}] Extracted ${features.keypoints.size()} keypoints`);

            referenceData.push({
                ...artwork,
                descriptors: features.descriptors,
                keypoints: features.keypoints
            });
        }

        console.log(`[Preloader] Finished processing ${referenceData.length} artworks`);

        // Save to cache
        if (window.OpencvCache) {
            console.log('[Preloader] Saving to sessionStorage...');
            const saved = window.OpencvCache.saveProcessedArtworks(referenceData);
            if (saved) {
                console.log('[Preloader] ✓ Successfully cached all artworks!');
                updatePreloaderStatus('✓ All artworks ready!', true);
            } else {
                console.error('[Preloader] Failed to save cache');
                updatePreloaderStatus('Cache save failed');
            }
        } else {
            console.error('[Preloader] OpencvCache not available!');
            updatePreloaderStatus('Cache module missing');
        }

        // Clean up
        referenceData.forEach(ref => {
            if (ref.descriptors) ref.descriptors.delete();
            if (ref.keypoints) ref.keypoints.delete();
        });

    } catch (error) {
        console.error('[Preloader] Fatal error:', error);
        updatePreloaderStatus(`✗ Error: ${error.message}`);
    } finally {
        isProcessing = false;
        console.log('[Preloader] Processing complete');
    }
}

// Initialize preloader
console.log('[Preloader] Starting background processing...');
updatePreloaderStatus('Loading OpenCV.js...');
