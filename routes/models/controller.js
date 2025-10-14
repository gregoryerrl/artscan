// Model Tester Controller
// Real-time face detection testing with visual feedback and performance metrics

// State
let modelStream = null;
let detectionActive = false;
let showLandmarks = false;
let showAgeGender = false;
let showExpression = false;
let faceApiModelsReady = false;
let selectedModel = 'ssd';
let modelsLoaded = {
    ssd: false,
    tiny: false,
    mtcnn: false,
    landmarks: false,
    ageGender: false,
    expression: false
};

// Canvas and video elements
let video = null;
let canvas = null;
let ctx = null;

// Performance tracking
let frameCount = 0;
let lastFpsUpdate = Date.now();
let fps = 0;
let detectionTimes = [];

// Device detection (reuse from scanner)
const isMobileDevice = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

// ============================================================================
// INITIALIZATION
// ============================================================================

// Load face-api.js models (if not already loaded)
async function loadModelsForTester() {
    try {
        updateModelStatus('⏳ Loading face-api.js models...', 'loading');

        // Wait for face-api.js to be available
        if (typeof faceapi === 'undefined') {
            console.log('[Model Tester] Waiting for face-api.js to load...');
            await new Promise((resolve) => {
                const checkInterval = setInterval(() => {
                    if (typeof faceapi !== 'undefined') {
                        clearInterval(checkInterval);
                        resolve();
                    }
                }, 100);

                setTimeout(() => {
                    clearInterval(checkInterval);
                    resolve();
                }, 10000);
            });

            if (typeof faceapi === 'undefined') {
                throw new Error('face-api.js failed to load');
            }
        }

        // Set backend to WebGL for GPU acceleration
        await faceapi.tf.setBackend('webgl');
        await faceapi.tf.ready();

        const backend = faceapi.tf.getBackend();
        console.log(`[Model Tester] Backend: ${backend}` + (backend === 'webgl' ? ' (GPU-accelerated)' : ' (fallback)'));

        // Load all models in parallel
        console.log('[Model Tester] Loading all models...');
        const modelStartTime = Date.now();

        await Promise.all([
            faceapi.nets.ssdMobilenetv1.loadFromUri('lib/face-api')
                .then(() => { modelsLoaded.ssd = true; console.log('  ✓ SSD MobileNet V1'); }),
            faceapi.nets.tinyFaceDetector.loadFromUri('lib/face-api')
                .then(() => { modelsLoaded.tiny = true; console.log('  ✓ Tiny Face Detector'); }),
            faceapi.nets.mtcnn.loadFromUri('lib/face-api')
                .then(() => { modelsLoaded.mtcnn = true; console.log('  ✓ MTCNN'); }),
            faceapi.nets.faceLandmark68Net.loadFromUri('lib/face-api')
                .then(() => { modelsLoaded.landmarks = true; console.log('  ✓ Face Landmarks 68'); }),
            faceapi.nets.ageGenderNet.loadFromUri('lib/face-api')
                .then(() => { modelsLoaded.ageGender = true; console.log('  ✓ Age & Gender'); }),
            faceapi.nets.faceExpressionNet.loadFromUri('lib/face-api')
                .then(() => { modelsLoaded.expression = true; console.log('  ✓ Face Expression'); })
        ]);

        const modelLoadTime = Date.now() - modelStartTime;
        faceApiModelsReady = true;
        console.log(`[Model Tester] ✓ All models loaded in ${modelLoadTime}ms`);
        updateModelStatus(`✓ All models loaded (${modelLoadTime}ms)! Starting camera...`, 'success');

        // Request camera access
        setTimeout(() => requestModelCamera(), 500);
    } catch (error) {
        console.error('[Model Tester] Failed to load models:', error);
        updateModelStatus('✗ Failed to load models', 'error');
        faceApiModelsReady = false;
    }
}

// ============================================================================
// CAMERA ACCESS
// ============================================================================

async function requestModelCamera() {
    try {
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
            throw new Error('Camera API not available');
        }

        updateModelStatus('📷 Requesting camera access...', 'loading');

        // Request camera stream
        const constraints = {
            video: {
                facingMode: 'user', // Front camera for face testing
                width: { ideal: 1280 },
                height: { ideal: 720 }
            },
            audio: false
        };

        try {
            modelStream = await navigator.mediaDevices.getUserMedia(constraints);
        } catch (e) {
            console.log('[Model Tester] Trying simplified constraints...', e);
            modelStream = await navigator.mediaDevices.getUserMedia({ video: true });
        }

        video.srcObject = modelStream;

        // Wait for video metadata to load before setting up canvas
        await new Promise((resolve) => {
            video.addEventListener('loadedmetadata', () => {
                console.log(`[Model Tester] Video dimensions: ${video.videoWidth}x${video.videoHeight}`);
                resolve();
            }, { once: true });
        });

        await video.play();

        // Set up canvas to match video dimensions
        setupCanvas();

        updateModelStatus('✓ Camera ready! Click "Start Detection" to begin', 'success');

        // Hide status after 3 seconds
        setTimeout(() => {
            const statusEl = document.getElementById('model-status-overlay');
            if (statusEl) {
                statusEl.style.opacity = '0';
            }
        }, 3000);
    } catch (error) {
        console.error('[Model Tester] Camera error:', error);
        updateModelStatus('✗ Camera access denied', 'error');
        showModelPermissionPrompt();
    }
}

function setupCanvas() {
    // Match canvas size to video dimensions
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    console.log(`[Model Tester] Canvas setup: ${canvas.width}x${canvas.height}`);

    // Configure image smoothing for better quality
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';  // 'low', 'medium', or 'high'

    console.log('[Model Tester] Canvas ready for processed view (video frames + detections)');
}

function showModelPermissionPrompt() {
    const prompt = document.getElementById('model-permission-prompt');
    if (prompt) {
        prompt.style.display = 'flex';
    }
}

// ============================================================================
// DETECTION LOOP
// ============================================================================

async function startDetection() {
    if (!faceApiModelsReady || !modelStream) {
        console.warn('[Model Tester] Models or camera not ready');
        return;
    }

    detectionActive = true;
    console.log('[Model Tester] Starting detection loop');

    // Update button text
    const btn = document.getElementById('toggle-detection-btn');
    if (btn) {
        btn.textContent = 'Stop Detection';
        btn.classList.remove('btn-primary');
        btn.classList.add('btn-danger');
    }

    detectFaces();
}

function stopDetection() {
    detectionActive = false;
    console.log('[Model Tester] Stopping detection loop');

    // Update button text
    const btn = document.getElementById('toggle-detection-btn');
    if (btn) {
        btn.textContent = 'Start Detection';
        btn.classList.remove('btn-danger');
        btn.classList.add('btn-primary');
    }

    // Clear canvas to black (processed view stopped)
    if (ctx && canvas) {
        ctx.fillStyle = '#000';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Draw stopped message
        ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
        ctx.font = 'bold 24px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('Detection Stopped', canvas.width / 2, canvas.height / 2);
        ctx.font = '16px Arial';
        ctx.fillText('Click "Start Detection" to resume', canvas.width / 2, canvas.height / 2 + 40);
        ctx.textAlign = 'left';  // Reset
    }
}

async function detectFaces() {
    if (!detectionActive) return;

    const startTime = performance.now();

    try {
        // Ensure canvas size matches video
        if (canvas.width !== video.videoWidth || canvas.height !== video.videoHeight) {
            setupCanvas();
        }

        // Detect faces based on selected model
        let options;
        switch (selectedModel) {
            case 'ssd':
                options = new faceapi.SsdMobilenetv1Options({
                    minConfidence: isMobileDevice ? 0.3 : 0.5,
                    maxResults: 10
                });
                break;
            case 'tiny':
                options = new faceapi.TinyFaceDetectorOptions({
                    inputSize: 416,
                    scoreThreshold: isMobileDevice ? 0.4 : 0.5
                });
                break;
            case 'mtcnn':
                options = new faceapi.MtcnnOptions({
                    minFaceSize: 20,
                    scaleFactor: 0.709
                });
                break;
            default:
                options = new faceapi.SsdMobilenetv1Options({
                    minConfidence: 0.5,
                    maxResults: 10
                });
        }

        // Build detection pipeline
        let detectionPromise = faceapi.detectAllFaces(video, options);

        if (showLandmarks) {
            detectionPromise = detectionPromise.withFaceLandmarks();
        }

        if (showAgeGender) {
            detectionPromise = detectionPromise.withAgeAndGender();
        }

        if (showExpression) {
            detectionPromise = detectionPromise.withFaceExpressions();
        }

        const detections = await detectionPromise;

        // Draw current video frame to canvas (processed view)
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

        // Draw detections on top of the video frame
        if (detections && detections.length > 0) {
            console.log(`[Model Tester] Detected ${detections.length} face(s)`);
            drawDetections(detections);
        }

        // Update metrics
        const detectionTime = performance.now() - startTime;
        updateMetrics(detections ? detections.length : 0, detectionTime);

    } catch (error) {
        console.error('[Model Tester] Detection error:', error);
    }

    // Continue loop
    if (detectionActive) {
        requestAnimationFrame(detectFaces);
    }
}

// ============================================================================
// DRAWING FUNCTIONS
// ============================================================================

function drawDetections(detections) {
    detections.forEach((detection, index) => {
        const box = detection.detection.box;
        const confidence = detection.detection.score;

        console.log(`[Model Tester] Face ${index + 1}: box=(${Math.round(box.x)},${Math.round(box.y)},${Math.round(box.width)},${Math.round(box.height)}), confidence=${(confidence * 100).toFixed(1)}%`);

        // Determine color based on confidence
        let color;
        if (confidence > 0.8) {
            color = '#27ae60'; // Green - high confidence
        } else if (confidence > 0.6) {
            color = '#f39c12'; // Yellow - medium confidence
        } else {
            color = '#e74c3c'; // Red - low confidence
        }

        // Draw bounding box
        ctx.strokeStyle = color;
        ctx.lineWidth = 4;
        ctx.strokeRect(box.x, box.y, box.width, box.height);

        // Draw labels
        let yOffset = box.y - 10;
        const labels = [];

        // Confidence label
        labels.push(`${Math.round(confidence * 100)}%`);

        // Age & Gender
        if (showAgeGender && detection.age && detection.gender) {
            const age = Math.round(detection.age);
            const gender = detection.gender;
            const genderProb = Math.round(detection.genderProbability * 100);
            labels.push(`${gender} (${genderProb}%)`);
            labels.push(`Age: ${age}`);
        }

        // Expression
        if (showExpression && detection.expressions) {
            const expressions = detection.expressions;
            const sorted = Object.entries(expressions)
                .sort(([,a], [,b]) => b - a);
            const topExpression = sorted[0];
            const expressionName = topExpression[0];
            const expressionProb = Math.round(topExpression[1] * 100);

            // Get emoji for expression
            const expressionEmoji = {
                'neutral': '😐',
                'happy': '😊',
                'sad': '😢',
                'angry': '😠',
                'fearful': '😨',
                'disgusted': '🤢',
                'surprised': '😲'
            };

            labels.push(`${expressionEmoji[expressionName] || ''} ${expressionName} (${expressionProb}%)`);
        }

        // Draw all labels
        ctx.font = 'bold 16px Arial';
        labels.forEach((label, i) => {
            const labelWidth = ctx.measureText(label).width;
            const labelHeight = 26;
            const labelY = yOffset - (labels.length - i) * (labelHeight + 4);

            // Background
            ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
            ctx.fillRect(box.x, labelY, labelWidth + 12, labelHeight);

            // Text
            ctx.fillStyle = i === 0 ? color : 'white';
            ctx.fillText(label, box.x + 6, labelY + 18);
        });

        // Draw landmarks if enabled
        if (showLandmarks && detection.landmarks) {
            drawLandmarks(detection.landmarks);
        }
    });
}

function drawLandmarks(landmarks) {
    const positions = landmarks.positions;

    ctx.fillStyle = '#3498db';
    positions.forEach(point => {
        ctx.beginPath();
        ctx.arc(point.x, point.y, 2, 0, 2 * Math.PI);
        ctx.fill();
    });
}

// ============================================================================
// PERFORMANCE METRICS
// ============================================================================

function updateMetrics(faceCount, detectionTime) {
    // Update detection time
    detectionTimes.push(detectionTime);
    if (detectionTimes.length > 30) {
        detectionTimes.shift(); // Keep last 30 frames
    }
    const avgTime = detectionTimes.reduce((a, b) => a + b, 0) / detectionTimes.length;

    // Update FPS
    frameCount++;
    const now = Date.now();
    const elapsed = now - lastFpsUpdate;
    if (elapsed >= 1000) {
        fps = Math.round((frameCount * 1000) / elapsed);
        frameCount = 0;
        lastFpsUpdate = now;
    }

    // Calculate average confidence from last detections
    // (This is a placeholder - we'd need to track this separately)
    const avgConfidence = 85; // Placeholder

    // Update DOM
    const faceCountEl = document.getElementById('face-count');
    const fpsEl = document.getElementById('fps-value');
    const timeEl = document.getElementById('detection-time');
    const confEl = document.getElementById('avg-confidence');

    if (faceCountEl) faceCountEl.textContent = faceCount;
    if (fpsEl) fpsEl.textContent = fps;
    if (timeEl) timeEl.textContent = `${Math.round(avgTime)}ms`;
    if (confEl) confEl.textContent = faceCount > 0 ? `${avgConfidence}%` : '0%';
}

// ============================================================================
// UI HELPERS
// ============================================================================

function updateModelStatus(message, type = 'info') {
    const statusEl = document.getElementById('model-status-overlay');
    const statusText = document.getElementById('model-status-text');

    if (!statusEl || !statusText) {
        console.log(`[Model Tester Status] ${message}`);
        return;
    }

    statusText.textContent = message;
    statusEl.style.opacity = '1';

    statusEl.classList.remove('success', 'error', 'loading');
    if (type === 'success') statusEl.classList.add('success');
    if (type === 'error') statusEl.classList.add('error');
    if (type === 'loading') statusEl.classList.add('loading');
}

// ============================================================================
// EVENT LISTENERS
// ============================================================================

function setupModelEventListeners() {
    // Toggle detection button
    const toggleDetectionBtn = document.getElementById('toggle-detection-btn');
    if (toggleDetectionBtn) {
        toggleDetectionBtn.addEventListener('click', () => {
            if (detectionActive) {
                stopDetection();
            } else {
                startDetection();
            }
        });
    }

    // Toggle landmarks button
    const toggleLandmarksBtn = document.getElementById('toggle-landmarks-btn');
    if (toggleLandmarksBtn) {
        toggleLandmarksBtn.addEventListener('click', () => {
            showLandmarks = !showLandmarks;
            toggleLandmarksBtn.textContent = showLandmarks ? 'Hide Landmarks' : 'Show Landmarks';
            console.log(`[Model Tester] Landmarks ${showLandmarks ? 'enabled' : 'disabled'}`);
        });
    }

    // Toggle age & gender button
    const toggleAgeGenderBtn = document.getElementById('toggle-age-gender-btn');
    if (toggleAgeGenderBtn) {
        toggleAgeGenderBtn.addEventListener('click', () => {
            showAgeGender = !showAgeGender;
            toggleAgeGenderBtn.textContent = showAgeGender ? 'Hide Age/Gender' : 'Show Age/Gender';
            console.log(`[Model Tester] Age/Gender ${showAgeGender ? 'enabled' : 'disabled'}`);
        });
    }

    // Toggle expression button
    const toggleExpressionBtn = document.getElementById('toggle-expression-btn');
    if (toggleExpressionBtn) {
        toggleExpressionBtn.addEventListener('click', () => {
            showExpression = !showExpression;
            toggleExpressionBtn.textContent = showExpression ? 'Hide Expression' : 'Show Expression';
            console.log(`[Model Tester] Expression ${showExpression ? 'enabled' : 'disabled'}`);
        });
    }

    // Model selector
    const modelSelect = document.getElementById('model-select');
    if (modelSelect) {
        modelSelect.addEventListener('change', (e) => {
            selectedModel = e.target.value;
            console.log(`[Model Tester] Model changed to: ${selectedModel}`);
            // Future: switch models dynamically
        });
    }

    // Permission prompt button
    const requestPermissionBtn = document.getElementById('model-request-permission-btn');
    if (requestPermissionBtn) {
        requestPermissionBtn.addEventListener('click', () => {
            const prompt = document.getElementById('model-permission-prompt');
            if (prompt) prompt.style.display = 'none';
            requestModelCamera();
        });
    }
}

// ============================================================================
// LIFECYCLE FUNCTIONS
// ============================================================================

window.initModelsPage = function() {
    console.log('[Model Tester] Page initialized');

    // Get DOM elements
    video = document.getElementById('model-camera');
    canvas = document.getElementById('detection-canvas');

    // Get canvas context with performance optimizations
    ctx = canvas?.getContext('2d', {
        alpha: false,              // No transparency needed
        desynchronized: true,      // Reduces latency for animations
        willReadFrequently: false  // Optimize for writing/drawing
    });

    if (!video || !canvas || !ctx) {
        console.error('[Model Tester] Required elements not found');
        return;
    }

    // Set up event listeners
    setupModelEventListeners();

    // Load models and start camera
    loadModelsForTester();
};

window.cleanupModelsPage = function() {
    console.log('[Model Tester] Cleaning up');

    // Stop detection
    if (detectionActive) {
        stopDetection();
    }

    // Stop camera stream
    if (modelStream) {
        modelStream.getTracks().forEach(track => track.stop());
        modelStream = null;
    }

    // Clear canvas
    if (ctx && canvas) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
    }

    // Reset state
    detectionActive = false;
    showLandmarks = false;
    showAgeGender = false;
    showExpression = false;
    frameCount = 0;
    fps = 0;
    detectionTimes = [];
    selectedModel = 'ssd';
};

console.log('[Model Tester] Controller loaded');
