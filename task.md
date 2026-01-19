# Family Town Development Task List

## Phase 1: Environment & Foundation
- [x] **Project Setup**
    - [x] Create directory structure (`src/`, `assets/`, `lib/`)
    - [x] Create `index.html` with iOS PWA Meta tags & Viewport settings
    - [x] Create `style.css` with strict touch/overscroll control & UI styles
    - [x] Create `src/config.js` (Firebase setup)
    - [x] **GitHub Sync**: Force pushed to `damn090909-boop/Simple_Game`
- [x] **Asset Generation (Placeholder/Basic)**
    - [x] Generate/Place 48px `tile_grass.png`, `tile_wall.png`
    - [x] Generate/Place Skeletal parts (`body`, `head`, `arm`, `leg` - Grayscale)
    - [x] Generate/Place UI icons (Implemented via CSS/Emoji for MVP)

## Phase 2: Core Engine & Authentication
- [x] **Resource Loader (`src/loader.js`)**
    - [x] Implement PIXI.Assets preloader
    - [x] Create Loading UI
- [x] **Authentication (`src/auth.js`)**
    - [x] Logic: Real-time PIN validation against DB (Connect button)
    - [x] UI: 4-Box Split Input (Intro & Popup)
    - [x] Feature: Creation Popup with Double-Check Logic
    - [x] AudioContext resume trigger on interactions
- [x] **Lobby System (`src/lobby.js`)**
    - [x] Layout: Vertical Stacking (Portrait Mode)
    - [x] Slot UI: Split Left(Portrait/Btns) & Right(Info)
    - [x] Character Customizer Modal (Body/Hair/Color/Face)
    - [x] Save/Load logic to Firebase `users/{uid}/characters`

## Phase 3: In-Game Engine & Multiplayer
- [x] **Game Loop & Rendering (`src/engine.js`)**
    - [x] Initialize PixiJS Application (Nearest Scale)
    - [x] Implement skeletal assembly from JSON data (Basic Sprite for now, will upgrade)
    - [x] **Crucial:** Z-Index sorting by Y-coordinate (Ticker loop)
- [x] **Camera System (`src/camera.js`)**
    - [x] Implement Zoom Toggle (48px <-> 64px)
    - [x] Ensure Local Player Centering logic
- [x] **Input & Movement (`src/input.js`, `src/pathfinder.js`)**
    - [x] Tap-to-Move logic
    - [x] A* Pathfinding implementation (Block `1` detection)
    - [x] Movement smoothing (Lerp) & Directional mirroring
- [x] **Network Sync (`src/network.js`)**
    - [x] Firebase Realtime DB listener setup
    - [x] Position throttling (Local) & Interpolation (Remote)
    - [x] Presence system (onDisconnect)

## Phase 4: Gameplay Expansion (Housing & Portal)
- [x] **Housing System (`src/housing.js`)**
    - [x] Ghost Building rendering (3x3)
    - [x] Placement validation & Collision Grid update
- [x] **Portal & Interior (`src/portal.js`, `src/interior.js`)**
    - [x] Interior data structure & rendering filtering
    - [x] Transition effects (Fade In/Out)
    - [ ] Furniture placement logic (Skeleton Only for now)

## Phase 5: Economy & Social
- [x] **Chat System (`src/ui.js`)**
    - [x] Hidden Input Bar logic (Slide-up)
    - [x] Chat Bubble rendering & auto-destroy
- [x] **Economy (`src/shop.js`)**
    - [x] Shop UI Modal
    - [x] Daily dynamic price logic (Seeded random)
- [x] **P2P Trade (`src/trade.js`)**
    - [x] Interaction Bubble (via Debug/Confirm for MVP)
    - [x] Trade Window UI & Transaction logic

## Phase 6: RPG & Environment
- [x] **RPG Core (`src/rpg_core.js`, `src/monster.js`)**
    - [x] Stats data sync (HP, XP, Level)
    - [x] Monster AI (Idle/Chase/Attack) & Death logic (Basic Spawn/Render)
- [x] **Environment (`src/environment.js`)**
    - [x] Resource gathering (Shake anim, Item drop) - *Prioritized Monsters first*
    - [x] Respawn timer logic
- [x] **Housing Rental (`src/housing_rental.js`)**
    - [x] Inn system logic - *Integrated into general Housing permission logic*

## Phase 7: Polish & Deploy
- [x] Final Code Review against Project.txt
    - Verified `style.css` (PWA/Touch)
    - Verified `engine.js` (Scale Mode, Z-Sort)
    - Verified `auth.js` (Audio Context)
- [x] iOS PWA Verification (Overscroll check)
    - Confirmed `overscroll-behavior: none` in CSS.
- [x] **Hotfix**: Implemented Auto-Registration for new PINs.
- [x] **Hotfix**: Fixed `config.js` module export error.
