# ArtScan - Artwork Recognition Scanner

## Features

-   Real-time artwork recognition using ORB feature matching
-   Mobile-optimized full-screen scanner interface
-   Desktop and mobile camera support with fallback to image upload
-   Curated dataset of 34 artworks from renowned artists
-   Responsive landing page with artwork gallery
-   HTTPS support for mobile camera access
-   Zero framework dependencies

## Technical Stack

-   **Frontend**: Vanilla JavaScript (ES6)
-   **Computer Vision**: OpenCV.js 4.5.0 (via CDN)
-   **Server**: Express.js (development only)
-   **Algorithm**: ORB feature detection with Lowe's ratio test
-   **Deployment**: Cloudflare Pages (static hosting)

## Project Structure

```
/
├── index.html              # Landing page
├── scan.html               # Scanner page
├── landing.css             # Landing page styles
├── styles.css              # Scanner styles
├── landing.js              # Landing page logic
├── scan.js                 # Scanner logic
├── artworks.json           # Artwork dataset
├── server.js               # Development server with image proxy
├── generateArtDataset.js   # Dataset generation script
└── _headers                # Cloudflare Pages headers
```

## Architecture

### Computer Vision Pipeline

1. **Feature Extraction**: Extract 500 ORB keypoints from reference images on load
2. **Capture**: Obtain image from camera or file upload
3. **Matching**: Compare captured image features against reference dataset using BFMatcher
4. **Validation**: Apply Lowe's ratio test (0.75 threshold) to filter matches
5. **Identification**: Require 15+ good matches for positive identification

### ORB Configuration

```javascript
const orb = new cv.ORB(500); // 500 keypoints per image
const matcher = new cv.BFMatcher(cv.NORM_HAMMING, false);
```

### Matching Criteria

-   Minimum 15 good matches required for identification
-   Lowe's ratio test: `m1.distance < 0.75 * m2.distance`
-   Confidence calculation: `Math.min(95, Math.round((matches / 500) * 100 + 40))`

## Dataset

The application includes 34 verified artworks from 12 renowned artists:

-   Vincent van Gogh (5 works)
-   Claude Monet (5 works)
-   Leonardo da Vinci (4 works)
-   Rembrandt (4 works)
-   Michelangelo (4 works)
-   Edvard Munch (3 works)
-   Diego Velázquez (2 works)
-   Raphael (2 works)
-   Georgia O'Keeffe (2 works)
-   Pablo Picasso (1 work)
-   Gustav Klimt (1 work)
-   Caravaggio (1 work)

Dataset source: Cleveland Museum of Art Open Access API

### Regenerating Dataset

```bash
node generateArtDataset.js
```

The script validates artist attribution and removes duplicates to ensure data quality.

## Browser Compatibility

### Minimum Requirements

-   ES6 module support
-   WebAssembly support
-   Canvas API
-   Fetch API
-   MediaDevices API (for camera)

### Recommended Browsers

-   Chrome/Edge 90+
-   Firefox 88+
-   Safari 14+
-   Mobile browsers with HTTPS

## Performance Considerations

-   OpenCV.js load time: 10-20 seconds (CDN, first load)
-   Feature extraction: 100-300ms per image
-   Matching latency: <100ms per reference image
-   Dataset size: 34 artworks (optimal for browser performance)
-   Memory usage: Features stored in-memory during session

## Known Limitations

-   ORB lacks scale invariance (distance variations may affect accuracy)
-   Requires textured artworks (minimal art may not match well)
-   Linear search algorithm (suitable for datasets under 100 images)
-   Mobile camera requires HTTPS connection
-   Browser performance varies by device capability

## CORS and Image Proxy

External images from Cleveland Museum API are proxied through the Express server to bypass CORS restrictions:

```javascript
GET /api/proxy-image?url=<encoded-url>
```

This is only required for local development. Cloudflare Pages serves images directly.

## API Reference

### Cleveland Museum of Art API

```
GET https://openaccess-api.clevelandart.org/api/artworks?q={artist}&has_image=1&limit=50
```

Response includes artwork metadata and image URLs.

## Acknowledgments

-   Cleveland Museum of Art for open access artwork data
