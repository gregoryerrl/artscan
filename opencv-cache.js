// OpenCV Descriptor Caching System
// Serializes/deserializes OpenCV Mat descriptors for sessionStorage

const CACHE_KEY = 'artscan_processed_artworks';
const CACHE_VERSION = '1.1';  // v1.1: Descriptors only (keypoints not needed for matching)

/**
 * Serialize cv.Mat descriptor to plain object
 */
function serializeDescriptor(mat) {
    if (!mat || mat.empty()) return null;

    return {
        rows: mat.rows,
        cols: mat.cols,
        type: mat.type(),
        data: Array.from(mat.data)
    };
}

/**
 * Deserialize plain object back to cv.Mat
 */
function deserializeDescriptor(cv, obj) {
    if (!obj) return new cv.Mat();

    const mat = new cv.Mat(obj.rows, obj.cols, obj.type);
    mat.data.set(obj.data);
    return mat;
}

/**
 * NOTE: Keypoints are NOT serialized because:
 * 1. They're not needed for matching (only descriptors are used)
 * 2. cv.KeyPoint is not a constructor in OpenCV.js
 * 3. KeyPoints cannot be reconstructed from plain data in OpenCV.js
 *
 * We only store descriptors, which is all that's needed for feature matching.
 */

/**
 * Save processed artworks to sessionStorage
 */
function saveProcessedArtworks(referenceData) {
    try {
        console.log(`[Cache] Serializing ${referenceData.length} artworks...`);

        const serialized = referenceData.map((ref, index) => {
            console.log(`[Cache] Serializing ${index + 1}/${referenceData.length}: ${ref.title}`);
            return {
                id: ref.id,
                title: ref.title,
                artist: ref.artist,
                year: ref.year,
                img: ref.img,
                descriptors: serializeDescriptor(ref.descriptors)
                // Note: keypoints not serialized - not needed for matching
            };
        });

        const cacheData = {
            version: CACHE_VERSION,
            timestamp: Date.now(),
            data: serialized
        };

        const jsonString = JSON.stringify(cacheData);
        const sizeKB = (jsonString.length / 1024).toFixed(2);
        console.log(`[Cache] JSON size: ${sizeKB} KB`);

        sessionStorage.setItem(CACHE_KEY, jsonString);
        console.log('[Cache] ✓ Successfully saved to sessionStorage');

        // Verify it was saved
        const verify = sessionStorage.getItem(CACHE_KEY);
        if (verify) {
            console.log('[Cache] ✓ Verified cache exists in sessionStorage');
            return true;
        } else {
            console.error('[Cache] ✗ Cache verification failed!');
            return false;
        }
    } catch (error) {
        console.error('[Cache] Failed to save artworks:', error);
        if (error.name === 'QuotaExceededError') {
            console.error('[Cache] SessionStorage quota exceeded!');
        }
        return false;
    }
}

/**
 * Load processed artworks from sessionStorage
 */
function loadProcessedArtworks(cv) {
    try {
        console.log('[Cache] Checking sessionStorage for cached data...');
        const cached = sessionStorage.getItem(CACHE_KEY);

        if (!cached) {
            console.log('[Cache] No cache found');
            return null;
        }

        console.log('[Cache] Cache found, parsing...');
        const cacheData = JSON.parse(cached);

        // Check version
        if (cacheData.version !== CACHE_VERSION) {
            console.log(`[Cache] Version mismatch: expected ${CACHE_VERSION}, got ${cacheData.version}`);
            sessionStorage.removeItem(CACHE_KEY);
            return null;
        }

        const age = Date.now() - cacheData.timestamp;
        const ageMinutes = (age / 1000 / 60).toFixed(1);
        console.log(`[Cache] Cache age: ${ageMinutes} minutes`);

        // Deserialize data
        console.log(`[Cache] Deserializing ${cacheData.data.length} artworks...`);
        const referenceData = cacheData.data.map((item, index) => {
            console.log(`[Cache] Deserializing ${index + 1}/${cacheData.data.length}: ${item.title}`);
            return {
                id: item.id,
                title: item.title,
                artist: item.artist,
                year: item.year,
                img: item.img,
                descriptors: deserializeDescriptor(cv, item.descriptors),
                keypoints: new cv.KeyPointVector()  // Empty placeholder - not needed for matching
            };
        });

        console.log(`[Cache] ✓ Successfully loaded ${referenceData.length} artworks from cache`);
        return referenceData;
    } catch (error) {
        console.error('[Cache] Failed to load cache:', error);
        console.error('[Cache] Clearing corrupted cache...');
        sessionStorage.removeItem(CACHE_KEY);
        return null;
    }
}

/**
 * Clear cache
 */
function clearCache() {
    sessionStorage.removeItem(CACHE_KEY);
}

// Export functions
window.OpencvCache = {
    saveProcessedArtworks,
    loadProcessedArtworks,
    clearCache
};
