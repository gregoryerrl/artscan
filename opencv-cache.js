// OpenCV Descriptor Caching System
// Serializes/deserializes OpenCV Mat descriptors for sessionStorage

const CACHE_KEY = 'artscan_processed_artworks';
const CACHE_VERSION = '1.0';

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
 * Serialize keypoints to plain array
 */
function serializeKeypoints(keypoints) {
    const kpArray = [];
    for (let i = 0; i < keypoints.size(); i++) {
        const kp = keypoints.get(i);
        kpArray.push({
            x: kp.pt.x,
            y: kp.pt.y,
            size: kp.size,
            angle: kp.angle,
            response: kp.response,
            octave: kp.octave,
            class_id: kp.class_id
        });
    }
    return kpArray;
}

/**
 * Deserialize keypoints array back to KeyPointVector
 */
function deserializeKeypoints(cv, kpArray) {
    const keypoints = new cv.KeyPointVector();
    kpArray.forEach(kp => {
        keypoints.push_back(new cv.KeyPoint(
            kp.x, kp.y, kp.size, kp.angle, kp.response, kp.octave, kp.class_id
        ));
    });
    return keypoints;
}

/**
 * Save processed artworks to sessionStorage
 */
function saveProcessedArtworks(referenceData) {
    try {
        const serialized = referenceData.map(ref => ({
            id: ref.id,
            title: ref.title,
            artist: ref.artist,
            year: ref.year,
            img: ref.img,
            descriptors: serializeDescriptor(ref.descriptors),
            keypoints: serializeKeypoints(ref.keypoints)
        }));

        const cacheData = {
            version: CACHE_VERSION,
            timestamp: Date.now(),
            data: serialized
        };

        sessionStorage.setItem(CACHE_KEY, JSON.stringify(cacheData));
        console.log('✓ Cached processed artworks to sessionStorage');
        return true;
    } catch (error) {
        console.error('Failed to cache artworks:', error);
        return false;
    }
}

/**
 * Load processed artworks from sessionStorage
 */
function loadProcessedArtworks(cv) {
    try {
        const cached = sessionStorage.getItem(CACHE_KEY);
        if (!cached) return null;

        const cacheData = JSON.parse(cached);

        // Check version
        if (cacheData.version !== CACHE_VERSION) {
            console.log('Cache version mismatch, clearing...');
            sessionStorage.removeItem(CACHE_KEY);
            return null;
        }

        // Deserialize data
        const referenceData = cacheData.data.map(item => ({
            id: item.id,
            title: item.title,
            artist: item.artist,
            year: item.year,
            img: item.img,
            descriptors: deserializeDescriptor(cv, item.descriptors),
            keypoints: deserializeKeypoints(cv, item.keypoints)
        }));

        console.log(`✓ Loaded ${referenceData.length} artworks from cache`);
        return referenceData;
    } catch (error) {
        console.error('Failed to load cache:', error);
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
