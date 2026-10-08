# Abhyas (अभ्यास) — Gesture-Controlled Interactive Teaching Platform

Abhyas is an AI-powered, gesture-controlled interactive teaching workstation built for modern educators. It transforms a teacher's standard laptop webcam into a spatial input sensor, enabling seamless touchless air-drawing, 3D exploration, circuit simulation, textbook navigation, and slide presentation — without needing special hardware, external sensors, or styluses.

---

## 🚀 Quick Start & Run Instructions

To run the application locally on your computer:

```bash
# 1. Open terminal and navigate into the frontend folder:
cd frontend

# 2. Install dependencies (if not already installed):
npm install

# 3. Start the local Vite development server:
npm run dev
```

Open your browser and navigate to the local URL displayed in the terminal:
**`http://localhost:5173`**

*(Make sure to allow camera access when prompted by the browser so the spatial hand tracking engine can detect your gestures).*

---

## 🧠 Plain-Language Technical Architecture

### 1. How the Frame Loop Works
1. **Camera Acquisition (`WebcamView.tsx`)**:
   - The browser connects to the teacher's front-facing camera via `navigator.mediaDevices.getUserMedia` at 640x480 resolution (mirrored horizontally for natural eye-hand coordination).
   - An active camera stream cache (`sharedMediaStream`) allows the video feed to be shared smoothly across views (the live telemetry HUD and the blackboard background) without hardware device-locking.
2. **Animation Loop (`requestAnimationFrame`)**:
   - A high-performance `requestAnimationFrame` loop queries new video frames up to 60 times per second.
   - Per-frame tracking metrics (timestamps, FPS, raw coordinates) are stored in **mutable refs**, avoiding React re-render penalties or dropped frames.
3. **MediaPipe Inference (`handTracker.ts`)**:
   - Each frame is passed to `@mediapipe/tasks-vision`'s `HandLandmarker` running with a **GPU delegate** (or graceful WebAssembly CPU fallback).
   - The model infers the precise 3D spatial positions of **21 landmarks** on the hand.
4. **Coordinate Filtering & Smoothing (`filter.ts`)**:
   - Raw keypoints pass through a velocity-adaptive **Exponential Moving Average / One-Euro smoothing filter**. This eliminates high-frequency hand jitter while preserving lightning-fast responsiveness for quick strokes.
5. **Gesture Classification (`gestureRecognizer.ts`)**:
   - Trigonometric finger curl angles, pairwise tip distances (e.g. thumb-to-index pinch), and temporal palm velocities over ~300ms classify gestures into discrete types (`INDEX_POINT`, `OPEN_PALM`, `FIST`, `TWO_FINGERS`, `PINCH`, `SWIPE_LEFT`, `SWIPE_RIGHT`).
6. **Action Mapping & Decoupled Bus (`actionMapper.ts`)**:
   - An event-driven subscription bus emits normalized semantic pedagogical actions (`DRAW_START`, `DRAW_MOVE`, `DRAW_END`, `ERASE`, `CLEAR`, `HOVER`, `PINCH`, `PINCH_RELEASE`, `SWIPE_LEFT`, `SWIPE_RIGHT`).
   - Tool components subscribe to these actions without containing any MediaPipe math or React coupling.

---

### 2. What the 21 MediaPipe Hand Landmarks Represent

MediaPipe structures the human hand into 21 standardized landmarks indexed `0` to `20`:

| Landmark IDs | Anatomical Keypoints | How Abhyas Uses Them |
|---|---|---|
| **0** | **Wrist** | Anchor base for hand position and relative velocity |
| **1 – 4** | **Thumb** (CMC, MCP, IP, Tip) | Tip (4) measures distance to Index (8) for `PINCH` detection |
| **5 – 8** | **Index Finger** (MCP, PIP, DIP, Tip) | Tip (8) serves as the primary cursor and air-pen nib (`INDEX_POINT`) |
| **9 – 12** | **Middle Finger** (MCP, PIP, DIP, Tip) | Tip (12) combined with Index (8) detects `TWO_FINGERS` erase mode |
| **13 – 16** | **Ring Finger** (MCP, PIP, DIP, Tip) | Checked for full curl/extension to distinguish `OPEN_PALM` from `FIST` |
| **17 – 20** | **Pinky Finger** (MCP, PIP, DIP, Tip) | Along with Ring finger, verifies closed fist hold or open hand |

- **`INDEX_POINT`**: Index finger extended; Middle, Ring, and Pinky curled into the palm. Follows fingertip to draw smooth quadratic bezier curves.
- **`OPEN_PALM`**: All five fingers extended outward with palm facing camera. Halts active drawing. Rotating hand orbits the 3D model.
- **`FIST`**: All fingertips curled tightly against their MCP base joints. When held continuously for 1.0 second, triggers a confirmed blackboard clear.
- **`TWO_FINGERS`**: Index and Middle fingers extended side-by-side (peace sign). Activates spatial eraser under fingertip.
- **`PINCH`**: Distance between thumb tip and index tip is below threshold (< 0.05 normalized). Used to click floating toolbar buttons, pick up circuit components, and zoom 3D models.
- **`SWIPE_LEFT` / `SWIPE_RIGHT`**: Open palm moving horizontally with velocity > 0.6 normalized units/sec over a 300ms sliding time window. Flips textbook pages and advances presentation slides.

---

## 🛠️ Complete Feature Summary by Module

### PART 1 — Air Drawing on Virtual Blackboard
- Transparent canvas overlay positioned over the mirrored webcam stream.
- Smooth quadratic bezier curve rendering following the index fingertip.
- Instant stop when showing `OPEN_PALM`.
- Visual radial countdown timer when holding `FIST` for 1 second to prevent accidental erasures.
- Local spatial eraser when showing `TWO_FINGERS`.
- Toggle between live camera backdrop and classic dark chalkboard slate.

### PART 2 — Floating Interactive Blackboard Toolbar
- **Drawing Tools**: Pen, semi-transparent Highlighter, Eraser.
- **5 Vibrant Palette Colors**: Chalk White (`#FFFFFF`), Amber (`#FDE047`), Electric Cyan (`#38BDF8`), Hot Pink (`#F43F5E`), Emerald (`#10B981`).
- **3 Stroke Weights**: Fine (3px), Medium (7px), Bold (14px).
- **Stroke-based History**: Full Undo / Redo history with keyboard shortcuts (`Ctrl+Z`, `Ctrl+Y`).
- **Save as PNG**: Downloads a high-resolution composite image combining the video background frame and drawing layer.

### PART 3 — Gesture-Driven Tool Control & HUD
- **Spatial Cursor**: Visible reticle dot tracking the index fingertip with active state halos.
- **Virtual Air Click**: `PINCH` gesture hovers and selects toolbar buttons touch-free via synthetic element targeting.
- **Gesture Legend Panel**: Modal reference guide displaying all 6 supported gestures.
- **Debug HUD Toggle**: Real-time telemetry inspector displaying raw landmark coordinates (X, Y, Z), FPS, and confidence score.

### PART 4 — 3D Solar System & Extensible GLB Model Viewer
- Built using **Three.js**, **React Three Fiber (R3F)**, and **@react-three/drei**.
- Procedural solar system with Sun and 8 labeled orbiting planets (Mercury, Venus, Earth, Mars, Jupiter, Saturn with ring, Uranus, Neptune).
- Extensible loader architecture ready for custom `.glb` models in `public/models/` (e.g., human heart).
- Open hand motion rotates the 3D scene; `PINCH + drag` zooms in and out; pointing highlights and reveals planet telemetry; Reset button restores initial perspective.
- Full dual-input support via mouse drag orbit and wheel zoom.

### PART 5 — Smart Textbook Viewer
- Built with **react-pdf (PDF.js)** with Web Worker acceleration.
- Custom PDF file upload from local disk plus built-in sample physics textbook.
- Page navigation via buttons, numeric page jump input, and air **Swipe Left / Right** gestures (300ms palm velocity detection).
- Table of Contents outline sidebar drawer.
- In-document text search with live match counters.
- Page bookmarking with corner dog-ear badge and bookmark list drawer.
- In-memory mouse text highlighting with multi-color selection (Yellow, Green, Cyan, Pink).

### PART 6 — Interactive Circuit Lab & Graph Engine
- Interactive circuit simulator with 8 components: Battery (9V), Resistor (220Ω), LED, Light Bulb (60W), Switch (SPST), Capacitor (100µF), Ammeter (mA), Voltmeter (V).
- Component drag-and-drop from palette, canvas movement, and wire terminal connectivity.
- Graph-theoretic circuit evaluator:
  - Validates closed conductive loops from battery positive to negative using Breadth-First Search (BFS).
  - Verifies switch continuity, series ammeter placement, and parallel voltmeter behavior.
- Real-time electrical feedback: Switch toggles closed/open, LED glows with drop-shadow aura, bulb filament illuminates, and telemetry reports current (mA) and voltage (V).
- 2 preset lesson scenarios: *"Lesson 1: Simple LED Circuit"* and *"Lesson 2: Current in Series"*.
- Touch-free gesture interaction: `PINCH` picks up, repositions, and drops components with the fingertip cursor.

### PART 7 — Interactive Presentation Slides
- Large 16:9 presentation viewport with responsive scaling.
- Multi-source slide decks:
  - Built-in 4-slide physics lecture deck (*"Newton's Laws of Motion"*).
  - Custom PDF upload rendered as individual slide pages.
  - Multi-image file upload (PNG, JPG, WEBP).
- Next / Previous navigation via buttons, keyboard arrow keys, and touchless air **Swipe Left / Right** gestures.
- **Per-slide air drawing annotations**:
  - Transparent drawing layer over slides with Pen, Highlighter, and Eraser.
  - Annotations are automatically preserved and restored independently per slide when flipping back and forth.

### PART 8 — Persistent Studio Session & Error Resilience
- **Uninterrupted Tracking**: The camera feed, MediaPipe vision engine, and right-hand telemetry panel run continuously without unmounting when switching between tabs.
- **Preserved Tool State**: Switching from Blackboard to Circuit Lab, 3D Model, Textbook, or Slides preserves all user canvas drawings, wiring, and highlights.
- **Clear Error States**: Informative banners for `Camera Permission Denied` (with browser settings guide), `No Camera Detected`, and `Camera Already in Use` with one-click retry.
- **Dual-Control Standard**: Every single tool in the platform operates seamlessly with both mouse/keyboard AND touch-free air gestures.

---

## 📂 Project Structure

```
frontend/
├── src/
│   ├── components/         # Reusable UI (WebcamView, Sidebar, StudioHeader, GestureCursor)
│   ├── features/
│   │   ├── circuit/        # CircuitLab, circuitSolver (BFS loop engine), circuitTypes
│   │   ├── dashboard/      # Dashboard cards, schedule, metrics
│   │   ├── models/         # SolarSystem (R3F), ModelViewer, GLB loader
│   │   ├── slides/         # SlidesViewer (PDF/Images slides + per-slide air drawing)
│   │   ├── studio/         # BlackboardCanvas, FloatingToolbar, GestureStatusPanel, etc.
│   │   └── textbook/       # TextbookViewer (react-pdf, bookmarks, search, highlights)
│   ├── gestures/           # Pure TypeScript gesture engine (no UI / React dependencies)
│   │   ├── actionMapper.ts      # Semantic pedagogical action mapper
│   │   ├── drawingEngine.ts     # Stroke history, quadratic bezier smoothing, export
│   │   ├── filter.ts            # Exponential moving average / velocity filter
│   │   ├── gestureRecognizer.ts # Rule-based gesture recognition & swipe velocity
│   │   ├── handTracker.ts       # MediaPipe HandLandmarker wrapper & landmark drawing
│   │   └── types.ts             # Landmark and gesture type definitions
│   ├── pages/              # ActiveSessionPage, DashboardPage, StudioPreviewPage
│   └── types/              # Session, telemetry, and mock data types
```
