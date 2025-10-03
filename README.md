# Artwork Scanner POC

A vanilla JavaScript Progressive Web App (PWA) that identifies artworks using ORB feature matching via OpenCV.js. Works completely offline with wa-sqlite for local data persistence.

## Features (Phase 1 Complete)

- ✅ **Offline-first architecture** - Works without internet after initial load
- ✅ **CRUD interface** - Add, edit, delete, and search artworks
- ✅ **Progressive Web App** - Installable on mobile devices
- ✅ **Vanilla JavaScript** - No framework dependencies, pure ES6 modules
- ✅ **Local database** - wa-sqlite with IndexedDB persistence
- 🚧 **Camera scanning** - Coming in Phase 2
- 🚧 **ORB recognition** - Coming in Phase 3

## Tech Stack

- **Frontend**: Vanilla JavaScript with ES6 modules
- **Database**: [@journeyapps/wa-sqlite](https://www.npmjs.com/package/@journeyapps/wa-sqlite) with IndexedDB
- **Recognition**: OpenCV.js (Phase 3)
- **PWA**: Service Worker + Web App Manifest

## Getting Started

### Installation

```bash
npm install
```

### Running the App

Start a local web server (no build step required):

```bash
# Option 1: Using Python
npm run dev

# Option 2: Using Python directly
python3 -m http.server 8000

# Option 3: Using Node.js
npx http-server -p 8000
```

Visit `http://localhost:8000` in your browser.

## Project Structure

```
artscan/
├── index.html           # Main HTML entry point
├── styles.css           # Global styles
├── manifest.json        # PWA manifest
├── service-worker.js    # PWA service worker
├── package.json
├── src/
│   ├── main.js          # App initialization
│   ├── router.js        # Client-side routing
│   ├── db/              # Database layer
│   │   ├── init.js      # wa-sqlite initialization
│   │   └── artwork-crud.js  # CRUD operations
│   ├── ui/              # View components
│   │   ├── home-view.js
│   │   ├── scan-view.js
│   │   ├── manage-view.js
│   │   └── components/  # Reusable UI components
│   └── utils/           # Utilities
│       ├── state.js     # State management
│       └── sample-data.js  # Sample artworks
└── Future additions (Phase 2-3):
    ├── src/recognition/ # Camera & ORB matching
    ├── workers/         # Web Workers for processing
    └── models/          # OpenCV.js WASM
```

## Database Schema

```sql
CREATE TABLE artworks (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  artist TEXT NOT NULL,
  year INTEGER,
  description TEXT,
  image_url TEXT NOT NULL,
  thumbnail_url TEXT,
  orb_descriptors BLOB,      -- For Phase 3
  keypoint_count INTEGER,    -- For Phase 3
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

## Sample Data

The app automatically populates 10 famous artworks on first run:
- The Starry Night (Van Gogh)
- Mona Lisa (da Vinci)
- The Persistence of Memory (Dalí)
- The Great Wave off Kanagawa (Hokusai)
- And 6 more...

## Development Roadmap

### ✅ Phase 1: Database & CRUD (Complete)
- wa-sqlite integration with IndexedDB
- Artwork management interface
- Search functionality
- PWA setup

### 🚧 Phase 2: Camera Integration (Next)
- MediaDevices API for camera access
- Image capture and preview
- Image preprocessing

### 🚧 Phase 3: ORB Recognition
- OpenCV.js WASM integration
- ORB keypoint extraction
- Feature matching with RANSAC
- Artwork identification

## Architecture Patterns

**Component Pattern**: Template literal functions
```javascript
export function componentName(data) {
  return `<div>${data.field}</div>`;
}
```

**Routing**: Dynamic imports for code splitting
```javascript
'/path': async () => {
  const { render } = await import('./view.js');
  render();
}
```

**State**: Simple observer pattern
```javascript
store.setState({ key: value });
store.subscribe(state => console.log(state));
```

## Browser Requirements

- ES6 modules support
- IndexedDB support
- Service Worker support (for offline)
- MediaDevices API (for camera in Phase 2)
- WebAssembly support (for OpenCV.js in Phase 3)

Recommended: Chrome/Edge 90+, Firefox 88+, Safari 14+

## License

MIT
