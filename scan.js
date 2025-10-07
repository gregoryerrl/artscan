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

    // Check for cached processed data first
    if (window.OpencvCache) {
        const cached = window.OpencvCache.loadProcessedArtworks(cv);
        if (cached) {
            referenceData = cached;
            updateStatus(`✓ Loaded ${referenceData.length} artworks from cache!`, "success");
            setTimeout(() => {
                requestCameraAccess();
            }, 500);
            return;
        }
    }

    // No cache, process normally
    updateStatus("✓ OpenCV.js loaded! Loading artworks...", "info");
    loadArtworks();
}

// Load pre-computed descriptors from JSON
async function loadArtworks() {
    try {
        const response = await fetch("lib/descriptors.json");
        artworks = await response.json();
        console.log(`✓ Loaded ${artworks.length} pre-computed descriptors from JSON`);
        updateStatus(`✓ Loaded ${artworks.length} presidents. Deserializing...`, "info");
        deserializeDescriptors();
    } catch (error) {
        console.error("Error loading descriptors:", error);
        updateStatus(`✗ Error loading descriptors: ${error.message}`, "error");
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

// Deserialize pre-computed descriptors (no image processing needed!)
function deserializeDescriptors() {
    try {
        for (const item of artworks) {
            // Deserialize descriptors from JSON
            const descriptorObj = item.descriptors;
            const mat = new cv.Mat(descriptorObj.rows, descriptorObj.cols, descriptorObj.type);
            mat.data.set(descriptorObj.data);

            referenceData.push({
                id: item.id,
                name: item.name,
                description: item.description,
                url: item.url,
                descriptors: mat,
                keypoints: new cv.KeyPointVector() // Empty placeholder - not needed for matching
            });

            console.log(`✓ Deserialized ${item.name}: ${descriptorObj.rows} descriptors`);
        }

        updateStatus(`✓ Ready! ${referenceData.length} presidents loaded.`, "success");

        // Auto-request camera after loading
        setTimeout(() => {
            requestCameraAccess();
        }, 500);
    } catch (error) {
        console.error("Error deserializing descriptors:", error);
        updateStatus(`✗ Error: ${error.message}`, "error");
    }
}

// Load image element
function loadImage(src) {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = (e) => {
            console.error(`Failed to load image: ${src}`, e);
            reject(new Error(`Failed to load ${src}`));
        };
        img.src = src;
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

// Capture and identify artwork with multi-frame voting
async function captureAndIdentify() {
    const video = document.getElementById("camera");
    const canvas = document.getElementById("capture-canvas");
    const statusEl = document.getElementById("status-overlay");

    // Configuration
    const NUM_FRAMES = 5;
    const FRAME_DELAY = 250; // ms between frames

    // Initial vibration
    vibrate(50);

    // Show status overlay
    statusEl.style.opacity = "1";
    updateStatus("📸 Capturing frames...", "loading");

    try {
        const frameResults = [];

        // Capture multiple frames
        for (let i = 0; i < NUM_FRAMES; i++) {
            updateStatus(`📸 Capturing frame ${i + 1}/${NUM_FRAMES}...`, "loading");

            // Capture current frame
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
            const ctx = canvas.getContext("2d");
            ctx.drawImage(video, 0, 0);

            // Extract features and match
            const features = extractORBFeatures(canvas);
            console.log(`Frame ${i + 1}: Captured ${features.keypoints.size()} keypoints`);

            const match = matchImage(features.descriptors);

            // Clean up
            features.keypoints.delete();
            features.descriptors.delete();

            // Store result
            if (match) {
                frameResults.push(match);
                console.log(`Frame ${i + 1}: ${match.name} (${match.matches} matches)`);
            }

            // Wait before next frame (except on last frame)
            if (i < NUM_FRAMES - 1) {
                await new Promise(resolve => setTimeout(resolve, FRAME_DELAY));
            }
        }

        // Aggregate results using voting
        updateStatus("⏳ Analyzing results...", "loading");
        const aggregatedResult = aggregateFrameResults(frameResults);

        // Display final result
        displayResult(aggregatedResult);

        // Vibrate based on result
        if (aggregatedResult && aggregatedResult.matches >= 15) {
            vibrate([50, 100, 50]); // Success pattern
        } else {
            vibrate([100, 50, 100]); // No match pattern
        }

    } catch (error) {
        console.error("Multi-frame capture error:", error);
        updateStatus(`✗ Error: ${error.message}`, "error");
        vibrate(200); // Error vibration
    }
}

// Aggregate results from multiple frames using voting
function aggregateFrameResults(frameResults) {
    if (frameResults.length === 0) return null;

    // Count votes for each president
    const votes = new Map();

    for (const result of frameResults) {
        if (!votes.has(result.name)) {
            votes.set(result.name, {
                name: result.name,
                description: result.description,
                url: result.url,
                voteCount: 0,
                totalMatches: 0,
                maxMatches: 0,
                frameCount: 0
            });
        }

        const president = votes.get(result.name);
        president.voteCount++;
        president.totalMatches += result.matches;
        president.maxMatches = Math.max(president.maxMatches, result.matches);
        president.frameCount++;
    }

    // Find president with most votes
    let winner = null;
    let maxVotes = 0;

    for (const president of votes.values()) {
        if (president.voteCount > maxVotes) {
            maxVotes = president.voteCount;
            winner = president;
        }
    }

    if (!winner) return null;

    // Calculate average matches across frames that voted for winner
    const avgMatches = Math.round(winner.totalMatches / winner.frameCount);

    return {
        name: winner.name,
        description: winner.description,
        url: winner.url,
        matches: winner.maxMatches, // Use best match count
        avgMatches: avgMatches,
        voteCount: winner.voteCount,
        totalFrames: frameResults.length,
        confidence: Math.round((winner.voteCount / frameResults.length) * 100)
    };
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

        // Build stats display
        let statsHTML = `
            <p><strong>Confidence:</strong> ${confidence}%</p>
            <p><strong>Best Match:</strong> ${match.matches} features</p>
        `;

        // Add voting stats if available (multi-frame capture)
        if (match.voteCount && match.totalFrames) {
            statsHTML += `
                <p><strong>Frame Consensus:</strong> ${match.voteCount}/${match.totalFrames} frames</p>
                <p><strong>Avg Matches:</strong> ${match.avgMatches} features</p>
            `;
        }

        resultDisplay.innerHTML = `
            <div class="result-match">
                <img src="${match.url}" alt="${match.name}">
                <div class="result-info">
                    <h3>✓ Match Found!</h3>
                    <h2>${match.name}</h2>
                    <p>${match.description}</p>
                    <div class="result-stats">
                        ${statsHTML}
                    </div>
                </div>
            </div>
        `;
        updateStatus(`✓ Matched: ${match.name}`, "success");
    } else {
        const matchCount = match ? match.matches : 0;
        const voteInfo = (match && match.voteCount)
            ? ` (${match.voteCount}/${match.totalFrames} frames agreed)`
            : '';

        resultDisplay.innerHTML = `
            <div class="result-no-match">
                <h3>⚠ No Match Found</h3>
                <p>Try adjusting lighting, angle, or distance.</p>
                <p style="margin-top: 1rem; font-size: 0.9rem; opacity: 0.7;">
                    Found ${matchCount} matches (need 15+)${voteInfo}
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
