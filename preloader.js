// Preload and process artworks on landing page
// Runs in background to prepare data for scanner page

let cv = null;
let isProcessing = false;

// Update preloader status
function updatePreloaderStatus(message, isComplete = false) {
    const indicator = document.getElementById("preload-indicator");
    const statusText = document.getElementById("preload-status");

    if (indicator && statusText) {
        statusText.textContent = message;
        if (isComplete) {
            indicator.classList.add("complete");
            setTimeout(() => {
                indicator.style.opacity = "0";
                setTimeout(() => (indicator.style.display = "none"), 500);
            }, 2000);
        }
    }
    console.log("[Preloader]", message);
}

// OpenCV ready callback
function onOpenCvReady() {
    cv = window.cv;
    console.log("[Preloader] OpenCV.js loaded");
    updatePreloaderStatus("Processing artworks...");
    processArtworks();
}

// Set up OpenCV module
var Module = {
    onRuntimeInitialized: onOpenCvReady,
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
        const tempCanvas = document.createElement("canvas");
        tempCanvas.width = img.width || img.videoWidth;
        tempCanvas.height = img.height || img.videoHeight;
        const ctx = tempCanvas.getContext("2d");
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

        return {keypoints, descriptors};
    } catch (error) {
        console.error("[Preloader] ORB extraction error:", error);
        throw error;
    }
}

// Load pre-computed descriptors
async function processArtworks() {
    if (isProcessing) {
        console.log("[Preloader] Already processing, skipping...");
        return;
    }
    isProcessing = true;

    try {
        console.log("[Preloader] Loading pre-computed descriptors...");

        // Load pre-computed descriptors JSON
        const response = await fetch("lib/descriptors.json");
        if (!response.ok) {
            throw new Error(
                `Failed to fetch lib/descriptors.json: ${response.status}`
            );
        }
        const descriptors = await response.json();
        console.log(`[Preloader] Loaded ${descriptors.length} pre-computed descriptors from JSON`);

        updatePreloaderStatus(`Deserializing ${descriptors.length} descriptors...`);

        const referenceData = [];

        // Deserialize each descriptor
        for (let i = 0; i < descriptors.length; i++) {
            const item = descriptors[i];
            const progress = `${i + 1}/${descriptors.length}`;
            updatePreloaderStatus(
                `Deserializing ${progress}: ${item.name.substring(0, 30)}...`
            );
            console.log(
                `[Preloader] [${progress}] Deserializing: ${item.name}`
            );

            // Deserialize descriptors from JSON
            const descriptorObj = item.descriptors;
            const mat = new cv.Mat(descriptorObj.rows, descriptorObj.cols, descriptorObj.type);
            mat.data.set(descriptorObj.data);

            console.log(
                `[Preloader] [${progress}] Deserialized ${descriptorObj.rows} descriptors`
            );

            referenceData.push({
                id: item.id,
                name: item.name,
                description: item.description,
                url: item.url,
                descriptors: mat,
                keypoints: new cv.KeyPointVector() // Empty placeholder
            });
        }

        console.log(
            `[Preloader] Finished deserializing ${referenceData.length} presidents`
        );

        // Save to cache
        if (window.OpencvCache) {
            console.log("[Preloader] Saving to sessionStorage...");
            const saved =
                window.OpencvCache.saveProcessedArtworks(referenceData);
            if (saved) {
                console.log("[Preloader] ✓ Successfully cached all presidents!");
                updatePreloaderStatus("✓ All presidents ready!", true);
            } else {
                console.error("[Preloader] Failed to save cache");
                updatePreloaderStatus("Cache save failed");
            }
        } else {
            console.error("[Preloader] OpencvCache not available!");
            updatePreloaderStatus("Cache module missing");
        }

        // Clean up
        referenceData.forEach((ref) => {
            if (ref.descriptors) ref.descriptors.delete();
            if (ref.keypoints) ref.keypoints.delete();
        });
    } catch (error) {
        console.error("[Preloader] Fatal error:", error);
        updatePreloaderStatus(`✗ Error: ${error.message}`);
    } finally {
        isProcessing = false;
        console.log("[Preloader] Processing complete");
    }
}

// Initialize preloader
console.log("[Preloader] Starting background processing...");
updatePreloaderStatus("Loading OpenCV.js...");
