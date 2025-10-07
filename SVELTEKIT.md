# SvelteKit Migration Guide

This document provides a comprehensive guide to migrating the ArtScan application from vanilla JavaScript to SvelteKit, utilizing the full capabilities of the framework for enhanced performance, maintainability, and developer experience.

## Table of Contents

1. [Why Migrate to SvelteKit](#why-migrate-to-sveltekit)
2. [Architecture Overview](#architecture-overview)
3. [Project Setup](#project-setup)
4. [Project Structure](#project-structure)
5. [Core Implementation](#core-implementation)
6. [Advanced Features](#advanced-features)
7. [Deployment](#deployment)
8. [Migration Checklist](#migration-checklist)

---

## Why Migrate to SvelteKit

### Benefits Over Vanilla JavaScript

**Developer Experience**:
- ✅ **TypeScript Support**: Full type safety for OpenCV operations and data structures
- ✅ **Component Architecture**: Reusable, maintainable UI components
- ✅ **Hot Module Replacement**: Instant feedback during development
- ✅ **Built-in Routing**: File-based routing with layouts and nested routes
- ✅ **Better Tooling**: ESLint, Prettier, Vitest integration out of the box

**Performance**:
- ✅ **Server-Side Rendering**: Faster initial page load with pre-rendered HTML
- ✅ **Code Splitting**: Automatic bundle optimization
- ✅ **Streaming**: Progressive page rendering
- ✅ **Optimized Builds**: Vite-powered bundling with tree-shaking

**Features**:
- ✅ **API Routes**: Serve descriptors via `/api/descriptors` endpoint
- ✅ **Server Actions**: Form handling with progressive enhancement
- ✅ **State Management**: Svelte stores for global state
- ✅ **Database Integration**: Easy connection to PostgreSQL, MongoDB, etc.
- ✅ **Authentication**: Built-in session management for admin features

**Maintainability**:
- ✅ **Type Safety**: Catch errors at compile time
- ✅ **Component Isolation**: Easier testing and debugging
- ✅ **Clear Separation**: Client vs server code organization
- ✅ **Better Scalability**: Structure supports growth to 100+ presidents

---

## Architecture Overview

### Current Vanilla JS Architecture

```
┌─────────────┐     ┌──────────────┐     ┌──────────────┐
│ index.html  │────▶│ landing.js   │────▶│ descriptors  │
│ (gallery)   │     │ (fetch JSON) │     │   .json      │
└─────────────┘     └──────────────┘     └──────────────┘
                                                 │
┌─────────────┐     ┌──────────────┐            │
│ scan.html   │────▶│ scan.js      │◀───────────┘
│ (scanner)   │     │ (OpenCV +    │
│             │     │  matching)   │
└─────────────┘     └──────────────┘
```

**Limitations**:
- No code reuse between pages
- No type safety
- Manual state management
- Client-side only data loading
- No SEO optimization

### Proposed SvelteKit Architecture

```
┌──────────────────────────────────────────────────────┐
│                    SvelteKit App                     │
├──────────────────────────────────────────────────────┤
│                                                      │
│  ┌─────────────┐           ┌──────────────┐        │
│  │ +layout     │───────────│  Stores      │        │
│  │ (shared)    │           │  - opencv    │        │
│  └─────────────┘           │  - camera    │        │
│         │                  │  - results   │        │
│         ├─────────┬────────└──────────────┘        │
│         │         │                                 │
│  ┌──────▼─────┐  │  ┌──────────────┐              │
│  │ +page      │  │  │ scan/        │              │
│  │ (gallery)  │  │  │ +page.svelte │              │
│  │ +page.ts   │  └──│ (scanner)    │              │
│  │ (SSR load) │     │              │              │
│  └────────────┘     └──────────────┘              │
│                                                    │
│  ┌─────────────────────────────────────────┐     │
│  │ Components                              │     │
│  │  - PresidentCard.svelte                 │     │
│  │  - Scanner.svelte                       │     │
│  │  - ResultModal.svelte                   │     │
│  │  - CameraControls.svelte                │     │
│  └─────────────────────────────────────────┘     │
│                                                    │
│  ┌─────────────────────────────────────────┐     │
│  │ API Routes                              │     │
│  │  - /api/descriptors                     │     │
│  │  - /api/presidents                      │     │
│  │  - /api/admin/upload (future)           │     │
│  └─────────────────────────────────────────┘     │
│                                                    │
└────────────────────────────────────────────────────┘
```

**Advantages**:
- Shared layouts and components
- Server-side data loading
- Type-safe data flow
- Reactive state management
- SEO-friendly SSR

---

## Project Setup

### 1. Initialize SvelteKit Project

```bash
# Create new SvelteKit project
npm create svelte@latest artscan-sveltekit

# Choose options:
# - Skeleton project
# - TypeScript syntax
# - ESLint, Prettier
# - Vitest for testing

cd artscan-sveltekit
npm install
```

### 2. Install Dependencies

```bash
# Core dependencies
npm install

# Optional enhancements
npm install @sveltejs/adapter-static  # For static deployment
npm install -D @types/node            # Node.js types
```

### 3. Copy Static Assets

```bash
# Copy from vanilla project
cp -r ../artscan/lib ./static/
cp -r ../artscan/images ./static/
cp ../artscan/_headers ./static/
```

**Important**: The `lib/descriptors.json` file (1.6MB) is committed to the repository, just like in the vanilla version. This file contains all pre-computed ORB descriptors for the 17 presidents and is **not** generated at build time or stored in a database (unless you choose to add that as an advanced feature later).

---

## Project Structure

```
artscan-sveltekit/
├── src/
│   ├── lib/
│   │   ├── components/
│   │   │   ├── PresidentCard.svelte
│   │   │   ├── Scanner.svelte
│   │   │   ├── ResultModal.svelte
│   │   │   ├── CameraControls.svelte
│   │   │   └── LoadingIndicator.svelte
│   │   ├── stores/
│   │   │   ├── opencv.ts
│   │   │   ├── camera.ts
│   │   │   ├── descriptors.ts
│   │   │   └── results.ts
│   │   ├── utils/
│   │   │   ├── opencv.ts
│   │   │   ├── matching.ts
│   │   │   ├── camera.ts
│   │   │   └── serialization.ts
│   │   ├── types/
│   │   │   └── index.ts
│   │   └── server/
│   │       └── database.ts (optional future feature)
│   ├── routes/
│   │   ├── +layout.svelte
│   │   ├── +layout.ts
│   │   ├── +page.svelte
│   │   ├── +page.ts (optional SSR)
│   │   ├── scan/
│   │   │   ├── +page.svelte
│   │   │   └── +page.ts
│   │   └── api/
│   │       └── admin/ (optional future feature)
│   │           └── upload/+server.ts
│   ├── app.html
│   └── app.css
├── static/
│   ├── lib/
│   │   ├── opencv.js           # 8.2MB - committed to repo
│   │   └── descriptors.json    # 1.6MB - committed to repo ✓
│   ├── images/                 # 17 president images - committed to repo
│   └── favicon.png
├── svelte.config.js
├── vite.config.ts
└── tsconfig.json
```

**Note**: The `static/lib/descriptors.json` file is **committed to the repository** (same as vanilla version). It contains pre-computed ORB descriptors and is loaded directly from the static folder at runtime.

---

## Core Implementation

### 1. TypeScript Types

**`src/lib/types/index.ts`**

```typescript
// President data structure
export interface President {
  id: number;
  name: string;
  description: string;
  url: string;
  descriptors?: SerializedDescriptor;
}

// Serialized OpenCV descriptor
export interface SerializedDescriptor {
  rows: number;
  cols: number;
  type: number;
  data: number[];
}

// Match result
export interface MatchResult {
  president: President;
  matches: number;
  confidence: number;
}

// OpenCV types (simplified)
export interface CVMat {
  rows: number;
  cols: number;
  type(): number;
  data: Uint8Array;
  delete(): void;
  empty(): boolean;
}

export interface CVKeyPointVector {
  size(): number;
  get(index: number): CVKeyPoint;
  delete(): void;
}

export interface CVKeyPoint {
  pt: { x: number; y: number };
  size: number;
  angle: number;
  response: number;
  octave: number;
  class_id: number;
}

// OpenCV global
export interface CV {
  Mat: new (rows: number, cols: number, type: number) => CVMat;
  ORB: new (nfeatures: number) => CVOrb;
  BFMatcher: new (normType: number, crossCheck: boolean) => CVBFMatcher;
  KeyPointVector: new () => CVKeyPointVector;
  imread(source: HTMLCanvasElement | HTMLImageElement): CVMat;
  cvtColor(src: CVMat, dst: CVMat, code: number): void;
  COLOR_RGBA2GRAY: number;
  NORM_HAMMING: number;
}

export interface CVOrb {
  detectAndCompute(
    image: CVMat,
    mask: CVMat,
    keypoints: CVKeyPointVector,
    descriptors: CVMat
  ): void;
  delete(): void;
}

export interface CVBFMatcher {
  knnMatch(
    queryDescriptors: CVMat,
    trainDescriptors: CVMat,
    matches: CVDMatchVectorVector,
    k: number
  ): void;
  delete(): void;
}

export interface CVDMatchVectorVector {
  size(): number;
  get(index: number): CVDMatchVector;
  delete(): void;
}

export interface CVDMatchVector {
  size(): number;
  get(index: number): CVDMatch;
}

export interface CVDMatch {
  distance: number;
  trainIdx: number;
  queryIdx: number;
  imgIdx: number;
}
```

### 2. OpenCV Store

**`src/lib/stores/opencv.ts`**

```typescript
import { writable, derived, get } from 'svelte/store';
import type { CV } from '$lib/types';

// OpenCV loading state
export const opencvLoading = writable(true);
export const opencvError = writable<string | null>(null);
export const cv = writable<CV | null>(null);

// Derived store for ready state
export const opencvReady = derived(
  [opencvLoading, opencvError, cv],
  ([$loading, $error, $cv]) => !$loading && !$error && $cv !== null
);

// Initialize OpenCV
export async function initializeOpenCV(): Promise<void> {
  opencvLoading.set(true);
  opencvError.set(null);

  return new Promise((resolve, reject) => {
    // Check if already loaded
    if (typeof window !== 'undefined' && (window as any).cv) {
      cv.set((window as any).cv);
      opencvLoading.set(false);
      resolve();
      return;
    }

    // Set up module callback
    if (typeof window !== 'undefined') {
      (window as any).Module = {
        onRuntimeInitialized: () => {
          cv.set((window as any).cv);
          opencvLoading.set(false);
          resolve();
        },
        onAbort: (error: string) => {
          opencvError.set(`OpenCV initialization failed: ${error}`);
          opencvLoading.set(false);
          reject(new Error(error));
        }
      };

      // Load OpenCV.js script
      const script = document.createElement('script');
      script.src = '/lib/opencv.js';
      script.async = true;
      script.onerror = () => {
        const error = 'Failed to load OpenCV.js';
        opencvError.set(error);
        opencvLoading.set(false);
        reject(new Error(error));
      };
      document.body.appendChild(script);
    }
  });
}

// Clean up OpenCV resources
export function cleanupOpenCV(): void {
  cv.set(null);
  opencvLoading.set(true);
  opencvError.set(null);
}
```

### 3. Descriptors Store

**`src/lib/stores/descriptors.ts`**

```typescript
import { writable, derived, get } from 'svelte/store';
import type { President, SerializedDescriptor, CVMat } from '$lib/types';
import { cv } from './opencv';

export interface ProcessedPresident extends President {
  descriptorMat: CVMat;
}

// Raw presidents from JSON
export const presidents = writable<President[]>([]);

// Processed presidents with OpenCV Mat objects
export const processedPresidents = writable<ProcessedPresident[]>([]);

// Loading state
export const descriptorsLoading = writable(false);
export const descriptorsError = writable<string | null>(null);

// Derived ready state
export const descriptorsReady = derived(
  [processedPresidents, descriptorsLoading],
  ([$processed, $loading]) => $processed.length > 0 && !$loading
);

// Load and deserialize descriptors
// Fetches from static/lib/descriptors.json (committed to repo)
export async function loadDescriptors(): Promise<void> {
  descriptorsLoading.set(true);
  descriptorsError.set(null);

  try {
    // Fetch descriptors JSON from static folder
    // This file is committed to the repository (1.6MB)
    const response = await fetch('/lib/descriptors.json');
    if (!response.ok) {
      throw new Error(`Failed to load descriptors: ${response.status}`);
    }

    const data: President[] = await response.json();
    presidents.set(data);

    // Deserialize using OpenCV
    const cvInstance = get(cv);
    if (!cvInstance) {
      throw new Error('OpenCV not initialized');
    }

    const processed = data.map((president) => {
      if (!president.descriptors) {
        throw new Error(`No descriptors for ${president.name}`);
      }

      const { rows, cols, type, data: descriptorData } = president.descriptors;
      const mat = new cvInstance.Mat(rows, cols, type);
      mat.data.set(descriptorData);

      return {
        ...president,
        descriptorMat: mat
      };
    });

    processedPresidents.set(processed);
    descriptorsLoading.set(false);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    descriptorsError.set(message);
    descriptorsLoading.set(false);
    throw error;
  }
}

// Clean up OpenCV Mat objects
export function cleanupDescriptors(): void {
  const processed = get(processedPresidents);
  processed.forEach((p) => p.descriptorMat.delete());
  processedPresidents.set([]);
}
```

### 4. Matching Utility

**`src/lib/utils/matching.ts`**

```typescript
import type { CV, CVMat, MatchResult, ProcessedPresident } from '$lib/types';

// Extract ORB features from image
export function extractORBFeatures(
  cv: CV,
  img: HTMLImageElement | HTMLCanvasElement
): { descriptors: CVMat; keypoints: any } {
  // Create canvas if needed
  let canvas: HTMLCanvasElement;
  if (img instanceof HTMLCanvasElement) {
    canvas = img;
  } else {
    canvas = document.createElement('canvas');
    canvas.width = img.width;
    canvas.height = img.height;
    const ctx = canvas.getContext('2d')!;
    ctx.drawImage(img, 0, 0);
  }

  const src = cv.imread(canvas);
  const gray = new cv.Mat();
  cv.cvtColor(src, gray, cv.COLOR_RGBA2GRAY);

  const orb = new cv.ORB(500);
  const keypoints = new cv.KeyPointVector();
  const descriptors = new cv.Mat();

  orb.detectAndCompute(gray, new cv.Mat(), keypoints, descriptors);

  // Clean up
  src.delete();
  gray.delete();
  orb.delete();

  return { descriptors, keypoints };
}

// Match captured image against all presidents
export function matchImage(
  cv: CV,
  capturedDescriptors: CVMat,
  presidents: ProcessedPresident[]
): MatchResult | null {
  const matcher = new cv.BFMatcher(cv.NORM_HAMMING, false);
  let bestMatch: MatchResult | null = null;
  let bestScore = 0;

  for (const president of presidents) {
    if (president.descriptorMat.empty()) continue;

    const matches = new (cv as any).DMatchVectorVector();
    matcher.knnMatch(capturedDescriptors, president.descriptorMat, matches, 2);

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
      const confidence = Math.min(95, Math.round((goodMatches / 500) * 100 + 40));

      bestMatch = {
        president,
        matches: goodMatches,
        confidence
      };
    }
  }

  matcher.delete();

  // Require minimum 15 matches
  return bestMatch && bestMatch.matches >= 15 ? bestMatch : null;
}
```

### 5. Gallery Page Component

**`src/routes/+page.svelte`**

```svelte
<script lang="ts">
  import { onMount } from 'svelte';
  import PresidentCard from '$lib/components/PresidentCard.svelte';
  import { presidents, loadDescriptors } from '$lib/stores/descriptors';
  import { initializeOpenCV, opencvReady } from '$lib/stores/opencv';

  let displayCount = 12;
  const increment = 12;

  onMount(async () => {
    // Initialize OpenCV in background
    initializeOpenCV().catch(console.error);

    // Load descriptors for preloading
    if ($opencvReady) {
      loadDescriptors().catch(console.error);
    }
  });

  function loadMore() {
    displayCount += increment;
  }

  $: visiblePresidents = $presidents.slice(0, displayCount);
  $: hasMore = displayCount < $presidents.length;
</script>

<svelte:head>
  <title>ArtScan - Relief Society General Presidents</title>
  <meta name="description" content="Identify Relief Society General Presidents using image recognition" />
</svelte:head>

<main>
  <section class="hero">
    <h1>ArtScan</h1>
    <p>Identify Relief Society General Presidents</p>
    <a href="/scan" class="btn-primary" data-sveltekit-preload-data>
      Start Scanning
    </a>
  </section>

  <section class="gallery">
    <h2>Available Presidents</h2>
    <div class="grid">
      {#each visiblePresidents as president (president.id)}
        <PresidentCard {president} />
      {/each}
    </div>

    {#if hasMore}
      <button on:click={loadMore} class="btn-secondary">
        Load More
      </button>
    {/if}
  </section>
</main>

<style>
  /* Component styles */
  main {
    max-width: 1200px;
    margin: 0 auto;
    padding: 2rem;
  }

  .hero {
    text-align: center;
    padding: 4rem 0;
  }

  .gallery {
    margin-top: 3rem;
  }

  .grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
    gap: 2rem;
    margin: 2rem 0;
  }
</style>
```

### 6. President Card Component

**`src/lib/components/PresidentCard.svelte`**

```svelte
<script lang="ts">
  import type { President } from '$lib/types';

  export let president: President;
</script>

<article class="card">
  <a href={president.url} target="_blank" rel="noopener noreferrer">
    <img src={president.url} alt={president.name} />
  </a>
  <div class="info">
    <h3>{president.name}</h3>
    <p>{president.description}</p>
  </div>
</article>

<style>
  .card {
    background: white;
    border-radius: 8px;
    overflow: hidden;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
    transition: transform 0.2s;
  }

  .card:hover {
    transform: translateY(-4px);
    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.15);
  }

  img {
    width: 100%;
    height: 300px;
    object-fit: cover;
  }

  .info {
    padding: 1rem;
  }

  h3 {
    margin: 0 0 0.5rem 0;
    font-size: 1.25rem;
  }

  p {
    margin: 0;
    font-size: 0.9rem;
    color: #666;
    line-height: 1.4;
  }
</style>
```

### 7. Scanner Page

**`src/routes/scan/+page.svelte`**

```svelte
<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { goto } from '$app/navigation';
  import Scanner from '$lib/components/Scanner.svelte';
  import ResultModal from '$lib/components/ResultModal.svelte';
  import { initializeOpenCV, opencvReady, opencvLoading } from '$lib/stores/opencv';
  import { loadDescriptors, descriptorsReady } from '$lib/stores/descriptors';
  import type { MatchResult } from '$lib/types';

  let matchResult: MatchResult | null = null;
  let showResult = false;

  onMount(async () => {
    // Initialize if not already done
    if (!$opencvReady) {
      await initializeOpenCV();
    }

    // Load descriptors if not already loaded
    if (!$descriptorsReady) {
      await loadDescriptors();
    }
  });

  function handleMatch(event: CustomEvent<MatchResult | null>) {
    matchResult = event.detail;
    showResult = true;
  }

  function closeResult() {
    showResult = false;
    matchResult = null;
  }

  $: isReady = $opencvReady && $descriptorsReady;
</script>

<svelte:head>
  <title>Scanner - ArtScan</title>
</svelte:head>

{#if $opencvLoading}
  <div class="loading">
    <p>Loading OpenCV.js...</p>
  </div>
{:else if !isReady}
  <div class="loading">
    <p>Loading descriptors...</p>
  </div>
{:else}
  <Scanner on:match={handleMatch} />
{/if}

{#if showResult}
  <ResultModal result={matchResult} on:close={closeResult} />
{/if}

<style>
  .loading {
    display: flex;
    justify-content: center;
    align-items: center;
    height: 100vh;
    font-size: 1.5rem;
  }
</style>
```

### 8. Scanner Component

**`src/lib/components/Scanner.svelte`**

```svelte
<script lang="ts">
  import { onMount, createEventDispatcher } from 'svelte';
  import { get } from 'svelte/store';
  import { cv } from '$lib/stores/opencv';
  import { processedPresidents } from '$lib/stores/descriptors';
  import { extractORBFeatures, matchImage } from '$lib/utils/matching';
  import type { MatchResult } from '$lib/types';

  const dispatch = createEventDispatcher<{ match: MatchResult | null }>();

  let video: HTMLVideoElement;
  let canvas: HTMLCanvasElement;
  let stream: MediaStream | null = null;
  let capturing = false;

  onMount(async () => {
    await requestCamera();
    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  });

  async function requestCamera() {
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' },
        audio: false
      });
      video.srcObject = stream;
      await video.play();
    } catch (error) {
      console.error('Camera error:', error);
      // Show upload fallback
    }
  }

  async function capture() {
    if (capturing) return;
    capturing = true;

    // Draw video frame to canvas
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d')!;
    ctx.drawImage(video, 0, 0);

    // Extract features and match
    const cvInstance = get(cv);
    const presidents = get(processedPresidents);

    if (cvInstance && presidents.length > 0) {
      const { descriptors, keypoints } = extractORBFeatures(cvInstance, canvas);
      const result = matchImage(cvInstance, descriptors, presidents);

      // Clean up
      descriptors.delete();
      keypoints.delete();

      // Emit result
      dispatch('match', result);
    }

    capturing = false;
  }
</script>

<div class="scanner">
  <video bind:this={video} autoplay playsinline muted />
  <canvas bind:this={canvas} style="display: none;" />

  <button
    class="capture-btn"
    on:click={capture}
    disabled={capturing}
  >
    {capturing ? 'Processing...' : 'Capture'}
  </button>
</div>

<style>
  .scanner {
    position: relative;
    width: 100vw;
    height: 100vh;
    overflow: hidden;
    background: #000;
  }

  video {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  .capture-btn {
    position: absolute;
    bottom: 2rem;
    left: 50%;
    transform: translateX(-50%);
    width: 80px;
    height: 80px;
    border-radius: 50%;
    border: 4px solid white;
    background: rgba(255, 255, 255, 0.9);
    cursor: pointer;
    transition: all 0.2s;
  }

  .capture-btn:hover {
    background: white;
    transform: translateX(-50%) scale(1.1);
  }

  .capture-btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
</style>
```

---

## Advanced Features

### 1. API Routes (Optional)

**Note**: API routes are **optional** for this application. The recommended approach is to fetch `descriptors.json` directly from the static folder (same as vanilla version):

```typescript
// Recommended: Direct fetch from static folder
const response = await fetch('/lib/descriptors.json');
```

**Optional API Route** (for future features like filtering/pagination):

**`src/routes/api/descriptors/+server.ts`**

```typescript
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import fs from 'fs/promises';
import path from 'path';

// Optional: API endpoint to serve descriptors
// Can add filtering, pagination, or transformations here
export const GET: RequestHandler = async () => {
  try {
    const descriptorsPath = path.join(process.cwd(), 'static', 'lib', 'descriptors.json');
    const data = await fs.readFile(descriptorsPath, 'utf-8');
    const descriptors = JSON.parse(data);

    return json(descriptors, {
      headers: {
        'Cache-Control': 'public, max-age=3600' // Cache for 1 hour
      }
    });
  } catch (error) {
    return json(
      { error: 'Failed to load descriptors' },
      { status: 500 }
    );
  }
};
```

### 2. Server-Side Data Loading (Optional)

For simple static deployment (recommended), load data client-side. For SSR/SEO benefits, use server-side loading:

**Option A: Client-Side Loading (Simpler, same as vanilla)**

No `+page.ts` needed - load in component's `onMount()`:

```typescript
// In +page.svelte
onMount(async () => {
  const response = await fetch('/lib/descriptors.json');
  const data = await response.json();
  presidents.set(data);
});
```

**Option B: Server-Side Loading (For SSR/SEO)**

**`src/routes/+page.ts`**

```typescript
import type { PageLoad } from './$types';
import type { President } from '$lib/types';

export const load: PageLoad = async ({ fetch }) => {
  try {
    // Fetch from static folder
    const response = await fetch('/lib/descriptors.json');
    const presidents: President[] = await response.json();

    return {
      presidents,
      meta: {
        title: 'ArtScan - Relief Society Presidents',
        description: `Browse ${presidents.length} Relief Society General Presidents`
      }
    };
  } catch (error) {
    console.error('Failed to load presidents:', error);
    return {
      presidents: [],
      meta: {
        title: 'ArtScan',
        description: 'Image recognition for Relief Society Presidents'
      }
    };
  }
};
```

### 3. Progressive Enhancement with Actions

**Future admin feature example:**

**`src/routes/admin/upload/+page.server.ts`**

```typescript
import { fail, redirect } from '@sveltejs/kit';
import type { Actions } from './$types';
import fs from 'fs/promises';
import path from 'path';

export const actions = {
  upload: async ({ request }) => {
    const formData = await request.formData();
    const image = formData.get('image') as File;
    const name = formData.get('name') as string;
    const description = formData.get('description') as string;

    if (!image || !name || !description) {
      return fail(400, { missing: true });
    }

    // Save image
    const imageBuffer = await image.arrayBuffer();
    const imagePath = path.join(
      process.cwd(),
      'static',
      'images',
      `${name.toLowerCase().replace(/\s+/g, '-')}.jpg`
    );
    await fs.writeFile(imagePath, Buffer.from(imageBuffer));

    // TODO: Generate descriptors using opencv4nodejs

    throw redirect(303, '/admin');
  }
} satisfies Actions;
```

### 4. Database Integration (Future Enhancement)

**Current Approach**: File-based (`descriptors.json` committed to repo) - Same as vanilla version ✓

**Optional Future Enhancement**: Database storage for dynamic management

**`src/lib/server/database.ts`**

```typescript
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Note: This is an OPTIONAL future enhancement
// Current app works perfectly with static descriptors.json file

// Get all presidents
export async function getAllPresidents() {
  return prisma.president.findMany({
    orderBy: { id: 'asc' }
  });
}

// Add new president
export async function addPresident(data: {
  name: string;
  description: string;
  imageUrl: string;
  descriptors: any;
}) {
  return prisma.president.create({ data });
}

// Update president
export async function updatePresident(id: number, data: Partial<{
  name: string;
  description: string;
  imageUrl: string;
  descriptors: any;
}>) {
  return prisma.president.update({
    where: { id },
    data
  });
}
```

**When to Consider Database**:
- Need admin interface for non-technical users
- Frequent updates (not the case for this dataset)
- Need versioning/audit trail
- Want to serve different subsets of data dynamically

**Current File-Based Approach is Sufficient Because**:
- Presidents rarely change (decades between updates)
- Small dataset (17 presidents)
- Simple update process (regenerate descriptors.json)
- No authentication/admin needed
- Easier deployment (static hosting)

---

## Deployment

### Static Adapter (Recommended)

Since `descriptors.json` is committed to the repository and served as a static file, use the static adapter:

**`svelte.config.js`**

```javascript
import adapter from '@sveltejs/adapter-static';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

export default {
  preprocess: vitePreprocess(),
  kit: {
    adapter: adapter({
      pages: 'build',
      assets: 'build',
      fallback: null,
      precompress: false,
      strict: true
    })
  }
};
```

### Build and Deploy

```bash
# Build for production
npm run build

# Verify static assets are included
ls build/lib/descriptors.json  # Should exist
ls build/lib/opencv.js         # Should exist

# Preview production build
npm run preview

# Deploy to Cloudflare Pages
npx wrangler pages deploy build

# Or deploy to Netlify
netlify deploy --prod --dir=build

# Or deploy to Vercel
vercel --prod
```

**Important**: The build output includes:
- `build/lib/descriptors.json` (1.6MB) - Copied from `static/lib/`
- `build/lib/opencv.js` (8.2MB) - Copied from `static/lib/`
- `build/images/` (17 president images)
- All bundled JS/CSS

Total deployment size: ~20-25MB (same as vanilla version)

---

## Migration Checklist

### Phase 1: Setup & Core Migration
- [ ] Initialize SvelteKit project
- [ ] Set up TypeScript types
- [ ] Create OpenCV store
- [ ] Create descriptors store
- [ ] Migrate matching utilities
- [ ] Copy static assets

### Phase 2: Components
- [ ] Create PresidentCard component
- [ ] Create Scanner component
- [ ] Create ResultModal component
- [ ] Create CameraControls component
- [ ] Create LoadingIndicator component

### Phase 3: Routes
- [ ] Implement gallery page (+page.svelte)
- [ ] Implement scanner page (scan/+page.svelte)
- [ ] Add layouts (+layout.svelte)
- [ ] Implement API routes

### Phase 4: Features
- [ ] Server-side data loading
- [ ] Error handling
- [ ] Loading states
- [ ] Camera fallback
- [ ] Result sharing

### Phase 5: Optimization
- [ ] Code splitting
- [ ] Image optimization
- [ ] Preloading
- [ ] Caching strategy
- [ ] PWA support

### Phase 6: Testing & Deployment
- [ ] Unit tests for utilities
- [ ] Component tests
- [ ] E2E tests
- [ ] Build configuration
- [ ] Deploy to production

---

## Next Steps

1. **Start Simple**: Migrate core functionality first (gallery + scanner)
2. **Keep It Simple**: Use client-side loading from static files (same as vanilla)
3. **Add TypeScript**: Gradually add types for better DX
4. **Optional Enhancements**:
   - Add SSR if you need SEO
   - Add API routes if you need filtering/pagination
   - Add database if you need dynamic admin interface
5. **Scale**: Ready for 100+ presidents with better architecture

## Key Takeaways

**Same Data Approach as Vanilla Version**:
- ✅ `descriptors.json` committed to repository
- ✅ Served as static file from `/lib/`
- ✅ No build-time generation
- ✅ No database required (unless you want it)
- ✅ Simple deployment (static hosting)
- ✅ Manual update when new president added

**SvelteKit Adds**:
- ✅ Component architecture
- ✅ TypeScript support
- ✅ Better state management
- ✅ Optional SSR/API routes
- ✅ Better developer experience

**It's NOT Required to**:
- ❌ Generate descriptors at build time
- ❌ Store descriptors in database
- ❌ Use API routes (can fetch directly from static folder)
- ❌ Complicate the simple static file approach

The SvelteKit version maintains the same simplicity and deployment model as the vanilla version, just with better code organization and developer experience.

---

## Resources

- [SvelteKit Documentation](https://kit.svelte.dev/docs)
- [Svelte Tutorial](https://svelte.dev/tutorial)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [Vitest Documentation](https://vitest.dev/)
- [Prisma Documentation](https://www.prisma.io/docs/) (for database)

---

**Questions or Issues?**

This migration guide provides a foundation. Adjust based on your specific needs and constraints. SvelteKit's flexibility allows you to start simple and scale as needed.
