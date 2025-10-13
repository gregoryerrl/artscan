# ArtScan - Relief Society General Presidents Recognition

A mobile-first web application that identifies Relief Society General Presidents through camera or image upload using advanced computer vision techniques.

## Features

- **2-Layer Recognition System**: Fast face recognition (face-api.js) with ORB feature matching fallback
- **WebGL GPU Acceleration**: 10-100x performance improvement on mobile devices
- **Continuous Auto-Scanning**: Automatic detection without button presses (like a barcode scanner)
- **Mobile-Optimized**: Intelligent downscaling, adaptive configuration, and diagnostic logging
- **Instant Loading**: Pre-computed descriptors and face embeddings for sub-second startup
- **Offline-Capable**: Works after initial load (camera requires HTTPS on mobile)
- **Zero Framework Dependencies**: Pure vanilla JavaScript

## Quick Start

```bash
npm install        # Install dependencies
npm start          # Start development server on port 8000
```

Access at `http://localhost:8000`

## Technical Stack

- **Frontend**: Vanilla JavaScript (ES6)
- **Recognition Layer 1**: face-api.js ResNet-34 (128D face embeddings) with WebGL
- **Recognition Layer 2**: OpenCV.js 4.5.0 ORB feature matching (fallback)
- **GPU Acceleration**: TensorFlow.js WebGL backend
- **Server**: Express.js (development only)
- **Deployment**: Static hosting ready (Cloudflare Pages, Netlify, Vercel)

## Architecture

### 2-Layer Recognition Pipeline

1. **Layer 1 (Primary)**: Face detection → 68 landmarks → 128D embedding → Match (99.38% accuracy)
   - Speed: ~50-150ms per frame on mobile
   - Works on: Frontal and near-frontal faces
   - Threshold: Distance < 0.6

2. **Layer 2 (Fallback)**: ORB keypoint extraction → Feature matching → Validation
   - Speed: ~200-400ms per frame on mobile
   - Works on: All portrait types (frontal, side profile, artistic renderings)
   - Threshold: 20+ good matches required

### Continuous Auto-Scanning

- **No button press needed**: Just point camera at portrait
- **Multi-frame voting**: Captures 5-7 frames per scan attempt
- **Consensus threshold**: 80% agreement required
- **Scan history**: Consistency checking across last 3 attempts
- **Live feedback**: Real-time feature count and scanning status

### Mobile Optimization

- **WebGL Backend**: 15x faster than CPU on mobile
- **Smart Downscaling**: 960p for faces, 1920p for ORB (optimal quality/performance)
- **Adaptive Configuration**: 7 frames on mobile vs 5 on desktop
- **Full HD Video**: 1920×1080 input for maximum quality
- **Aggressive Mode**: 300ms scan interval, 50ms frame delay
- **Total Detection Time**: 1-2 seconds typical (2.5x faster than before)

## Dataset

**17 Relief Society General Presidents** from The Church of Jesus Christ of Latter-day Saints:

1. Emma Smith (1842-1844)
2. Eliza R. Snow (1866-1887)
3. Zina Diantha Huntington Young (1888-1901)
4. Bathsheba W. Smith (1901-1910)
5. Emmeline B. Wells (1910-1921)
6. Clarissa Smith Williams (1921-1928)
7. Louise Yates Robison (1928-1939)
8. Amy Brown Lyman (1940-1945)
9. Belle Smith Spafford (1945-1974)
10. Barbara Bradshaw Smith (1974-1984)
11. Barbara Woodhead Winder (1984-1990)
12. Elaine Low Jack (1990-1997)
13. Mary Ellen Wood Smoot (1997-2002)
14. Bonnie Dansie Parkin (2002-2007)
15. Julie Bangerter Beck (2007-2012)
16. Linda K. Burton (2012-2017)
17. Jean B. Bingham (2017-present)

**Data Source**: https://www.churchofjesuschrist.org/media/collection/relief-society-general-presidents-images

### Updating the Dataset

When a new president is called:

```bash
# 1. Download new image
node utils/downloadChurchImages.js

# 2. Generate face embeddings (browser-based)
# Open http://localhost:8000/utils/generate-face-embeddings.html
# Click "Start Processing" → "Download face-embeddings.json"
# Replace lib/face-embeddings.json

# 3. Generate ORB descriptors (browser-based)
# Open http://localhost:8000/utils/generate-descriptors.html
# Click "Start Processing" → "Download descriptors.json"
# Replace lib/descriptors.json
```

## Project Structure

```
/
├── index.html              # SPA shell with route templates
├── router.js               # Client-side router with History API
├── routes/                 # Route-based organization
│   ├── homepage.html       # Gallery page template
│   ├── homepage.js         # Gallery page controller
│   ├── homepage.css        # Gallery page styles
│   └── scan/               # Scanner route files
│       ├── controller.js   # Scanner page controller (2-layer recognition)
│       ├── result.js       # Result page controller
│       └── styles.css      # Scanner and result page styles
├── lib/                    # Core libraries and data
│   ├── opencv.js           # OpenCV.js 4.5.0 (8.2MB)
│   ├── descriptors.json    # Pre-computed ORB descriptors (1.6MB)
│   ├── face-embeddings.json # Pre-computed face embeddings (65KB)
│   └── face-api/           # Face recognition models (12MB total)
├── images/                 # President portrait images (17 JPEGs)
├── server.js               # Express development server (SPA fallback)
├── _headers                # Cloudflare Pages security headers
└── utils/                  # Dataset maintenance utilities
```

## Performance

**Desktop (WebGL):**
- Layer 1: ~20-50ms per frame
- Layer 2: ~150-300ms per frame
- Total detection: 0.1-0.3 seconds

**Mobile (WebGL):**
- Layer 1: ~50-150ms per frame
- Layer 2: ~200-400ms per frame
- Total detection: 1-2 seconds

**Asset Loading:**
- First visit: 5-10 seconds (OpenCV + models)
- Background loading: OpenCV loads while viewing gallery (transparent to user)
- Subsequent scans: Instant (<1s) - already loaded in memory

## Diagnostic Logging

Built-in performance tracking for mobile debugging:

```javascript
// In browser console:
getDiagnosticSummary()    // View performance stats
exportDiagnosticLogs()     // Download logs as JSON
```

**Auto-upload**: Logs automatically sent to Cloudflare Workers after first successful scan (mobile-optimized with sendBeacon API).

## Browser Compatibility

**Minimum Requirements:**
- ES6 module support
- WebAssembly support
- WebGL support (for GPU acceleration)
- Canvas API
- MediaDevices API (for camera)

**Recommended Browsers:**
- Chrome/Edge 90+
- Firefox 88+
- Safari 14+
- Mobile browsers with HTTPS

## Deployment

Deploy as a static site (no build step required):

**Recommended Hosts:**
- Cloudflare Pages
- Netlify
- Vercel
- GitHub Pages

**Requirements:**
- HTTPS required for camera access on mobile
- Serve `_headers` file for proper security headers
- Enable Brotli/gzip compression (22MB → 8-10MB)

## Known Limitations

- ORB lacks scale invariance (very different distances may affect accuracy)
- Linear search becomes slow beyond ~200 presidents
- WebGL backend may fall back to CPU on older devices
- Diagnostic logging limited to last 100 entries (memory management)
- Camera requires HTTPS on mobile (works on localhost without HTTPS)

## Development

For detailed architecture, implementation patterns, and optimization history, see `CLAUDE.md`.

## Acknowledgments

- The Church of Jesus Christ of Latter-day Saints for official portrait images
- face-api.js and OpenCV.js communities for excellent computer vision libraries
