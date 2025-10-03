// Artwork Scanner - Mobile Full-Screen Version
// Uses OpenCV.js for ORB feature matching

let cv = null;
let stream = null;
let referenceData = [];
let artworks = [];

// Wait for OpenCV.js to load
function onOpenCvReady() {
    cv = window.cv;
    console.log("OpenCV.js loaded:", cv);
    updateStatus("✓ OpenCV.js loaded! Loading artworks...", "info");
    loadArtworks();
}

// Load artworks from JSON
async function loadArtworks() {
    try {
        const response = await fetch("artworks.json");
        artworks = await response.json();
        console.log(`✓ Loaded ${artworks.length} artworks from JSON`);
        updateStatus(`✓ Loaded ${artworks.length} artworks. Processing...`, "info");
        processReferenceImages();
    } catch (error) {
        console.error("Error loading artworks:", error);
        updateStatus(`✗ Error loading artworks: ${error.message}`, "error");
    }
}

// Set up Module for OpenCV initialization
var Module = {
    onRuntimeInitialized: onOpenCvReady,
};

// Update status message
function updateStatus(message, type = "info") {
    const statusEl = document.getElementById("status-overlay");
    const statusText = document.getElementById("status-text");
    statusText.textContent = message;

    statusEl.classList.remove("success", "error", "loading");
    if (type === "success") statusEl.classList.add("success");
    if (type === "error") statusEl.classList.add("error");
    if (type === "loading") statusEl.classList.add("loading");
}

// Process all reference images and extract ORB features
async function processReferenceImages() {
    try {
        for (const artwork of artworks) {
            const img = await loadImage(artwork.img);
            const features = extractORBFeatures(img);

            referenceData.push({
                ...artwork,
                descriptors: features.descriptors,
                keypoints: features.keypoints,
            });

            console.log(
                `✓ Processed ${artwork.title}: ${features.keypoints.size()} keypoints`
            );
        }

        updateStatus(`✓ Ready! ${referenceData.length} artworks loaded.`, "success");

        // Auto-request camera after processing
        setTimeout(() => {
            requestCameraAccess();
        }, 500);
    } catch (error) {
        console.error("Error processing reference images:", error);
        updateStatus(`✗ Error: ${error.message}`, "error");
    }
}

// Load image element
function loadImage(src) {
    return new Promise((resolve, reject) => {
        const img = new Image();

        // Use proxy for external Cleveland Museum images
        let imageSrc = src;
        if (src.startsWith('https://openaccess-cdn.clevelandart.org/')) {
            imageSrc = `/api/proxy-image?url=${encodeURIComponent(src)}`;
        }

        // Always set crossOrigin for canvas compatibility
        img.crossOrigin = "anonymous";
        img.onload = () => resolve(img);
        img.onerror = (e) => {
            console.error(`Failed to load image: ${src}`, e);
            reject(new Error(`Failed to load ${src}`));
        };
        img.src = imageSrc;
    });
}

// Extract ORB features from an image
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
        console.error('ORB extraction error:', error);
        throw error;
    }
}

// Match captured image against reference images
function matchImage(capturedDescriptors) {
    const matcher = new cv.BFMatcher(cv.NORM_HAMMING, false);
    let bestMatch = null;
    let bestScore = 0;

    for (const ref of referenceData) {
        if (ref.descriptors.empty()) continue;

        const matches = new cv.DMatchVectorVector();
        matcher.knnMatch(capturedDescriptors, ref.descriptors, matches, 2);

        // Apply Lowe's ratio test
        let goodMatches = 0;
        for (let i = 0; i < matches.size(); i++) {
            const match = matches.get(i);
            if (match.size() >= 2) {
                const m1 = match.get(0);
                const m2 = match.get(1);
                if (m1.distance < 0.75 * m2.distance) {
                    goodMatches++;
                }
            }
        }

        matches.delete();

        if (goodMatches > bestScore) {
            bestScore = goodMatches;
            bestMatch = { ...ref, matches: goodMatches };
        }
    }

    matcher.delete();
    return bestMatch;
}

// Request camera access
async function requestCameraAccess() {
    try {
        // Check if mediaDevices is available
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
            throw new Error("Camera API not available. Use HTTPS or modern browser.");
        }

        updateStatus("📷 Requesting camera access...", "loading");

        const video = document.getElementById("camera");

        // Try different video constraints for better mobile compatibility
        let constraints = {
            video: {
                facingMode: { ideal: "environment" },
                width: { ideal: 1920 },
                height: { ideal: 1080 },
            },
            audio: false,
        };

        try {
            stream = await navigator.mediaDevices.getUserMedia(constraints);
        } catch (e) {
            console.log("Trying simplified constraints...", e);
            // Fallback: try without specific constraints
            stream = await navigator.mediaDevices.getUserMedia({
                video: { facingMode: "environment" },
                audio: false,
            });
        }

        video.srcObject = stream;
        await video.play();

        // Show capture button
        document.getElementById("capture-btn").style.display = "block";

        updateStatus("✓ Point camera at artwork and tap to scan", "success");

        // Hide status after 3 seconds
        setTimeout(() => {
            const statusEl = document.getElementById("status-overlay");
            statusEl.style.opacity = "0";
            statusEl.style.transition = "opacity 0.5s";
        }, 3000);

    } catch (error) {
        console.error("Camera error:", error);
        updateStatus(`✗ Camera access denied`, "error");
        showPermissionPrompt();
    }
}

// Show permission prompt
function showPermissionPrompt() {
    document.getElementById("permission-prompt").style.display = "flex";
}

// Vibrate device (if supported)
function vibrate(pattern = 50) {
    if (navigator.vibrate) {
        navigator.vibrate(pattern);
    }
}

// Capture and identify artwork
async function captureAndIdentify() {
    const video = document.getElementById("camera");
    const canvas = document.getElementById("capture-canvas");

    // Vibrate on capture
    vibrate(50);

    // Capture frame
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    ctx.drawImage(video, 0, 0);

    updateStatus("⏳ Processing image...", "loading");

    // Show status overlay during processing
    const statusEl = document.getElementById("status-overlay");
    statusEl.style.opacity = "1";

    // Process capture
    setTimeout(() => {
        try {
            const features = extractORBFeatures(canvas);
            console.log(`Captured ${features.keypoints.size()} keypoints`);

            const match = matchImage(features.descriptors);

            // Clean up
            features.keypoints.delete();
            features.descriptors.delete();

            displayResult(match);

            // Vibrate based on result
            if (match && match.matches >= 15) {
                vibrate([50, 100, 50]); // Success pattern
            } else {
                vibrate([100, 50, 100]); // No match pattern
            }
        } catch (error) {
            console.error("Match error:", error);
            updateStatus(`✗ Error: ${error.message}`, "error");
            vibrate(200); // Error vibration
        }
    }, 100);
}

// Display match result
function displayResult(match) {
    const resultModal = document.getElementById("result-modal");
    const resultDisplay = document.getElementById("result-display");

    if (match && match.matches >= 15) {
        const confidence = Math.min(
            95,
            Math.round((match.matches / 500) * 100 + 40)
        );

        resultDisplay.innerHTML = `
            <div class="result-match">
                <img src="${match.img}" alt="${match.title}">
                <div class="result-info">
                    <h3>✓ Match Found!</h3>
                    <h2>${match.title}</h2>
                    <p><strong>Artist:</strong> ${match.artist}</p>
                    <p><strong>Year:</strong> ${match.year}</p>
                    <div class="result-stats">
                        <p><strong>Confidence:</strong> ${confidence}%</p>
                        <p><strong>Matches:</strong> ${match.matches}</p>
                    </div>
                </div>
            </div>
        `;
        updateStatus(`✓ Matched: ${match.title}`, "success");
    } else {
        resultDisplay.innerHTML = `
            <div class="result-no-match">
                <h3>⚠ No Match Found</h3>
                <p>Try adjusting lighting, angle, or distance.</p>
                <p style="margin-top: 1rem; font-size: 0.9rem; opacity: 0.7;">
                    Found ${match ? match.matches : 0} matches (need 15+)
                </p>
            </div>
        `;
        updateStatus("No match found", "error");
    }

    resultModal.style.display = "block";
}

// Close result modal
function closeResult() {
    document.getElementById("result-modal").style.display = "none";
    const statusEl = document.getElementById("status-overlay");
    statusEl.style.opacity = "0";
}

// Process uploaded file
function processUploadedFile(file) {
    const reader = new FileReader();
    reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
            updateStatus("⏳ Processing uploaded image...", "loading");

            const statusEl = document.getElementById("status-overlay");
            statusEl.style.opacity = "1";

            setTimeout(() => {
                try {
                    const features = extractORBFeatures(img);
                    console.log(`Uploaded image: ${features.keypoints.size()} keypoints`);

                    const match = matchImage(features.descriptors);

                    features.keypoints.delete();
                    features.descriptors.delete();

                    displayResult(match);

                    if (match && match.matches >= 15) {
                        vibrate([50, 100, 50]);
                    } else {
                        vibrate([100, 50, 100]);
                    }
                } catch (error) {
                    console.error("Processing error:", error);
                    updateStatus(`✗ Error: ${error.message}`, "error");
                    vibrate(200);
                }
            }, 100);
        };
        img.src = e.target.result;
    };
    reader.readAsDataURL(file);
}

// Event Listeners
document.getElementById("capture-btn").addEventListener("click", captureAndIdentify);

document.getElementById("close-result-btn").addEventListener("click", closeResult);

document.getElementById("scan-again-btn").addEventListener("click", closeResult);

document.getElementById("request-permission-btn").addEventListener("click", () => {
    document.getElementById("permission-prompt").style.display = "none";
    requestCameraAccess();
});

document.getElementById("use-upload-btn").addEventListener("click", () => {
    document.getElementById("file-upload").click();
});

document.getElementById("file-upload").addEventListener("change", (e) => {
    const file = e.target.files[0];
    if (file) {
        document.getElementById("permission-prompt").style.display = "none";
        processUploadedFile(file);
    }
});

// Initialize
console.log("App loaded. Waiting for OpenCV.js...");
