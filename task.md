# Family Town Development Task List

## Phase 1: Environment & Foundation
- [ ] **Project Setup**
    - [ ] Create directory structure (`src/`, `assets/`, `lib/`)
    - [ ] Create `index.html` with iOS PWA Meta tags & Viewport settings
    - [ ] Create `style.css` with strict touch/overscroll control & UI styles
    - [ ] Create `src/config.js` (Firebase setup)
- [ ] **Asset Generation (Placeholder/Basic)**
    - [ ] Generate/Place 48px `tile_grass.png`, `tile_wall.png`
    - [ ] Generate/Place Skeletal parts (`body`, `head`, `arm`, `leg` - Grayscale)
    - [ ] Generate/Place UI icons (`search`, `chat`, `menu`, `inventory`)

## Phase 2: Core Engine & Authentication
- [ ] **Resource Loader (`src/loader.js`)**
    - [ ] Implement PIXI.Assets preloader
    - [ ] Create Loading UI
- [ ] **Authentication (`src/auth.js`)**
    - [ ] Implement PIN Keypad UI (No buttons, strictly 0-9 grid)
    - [ ] Logic: Auto-login on 4-digit input
    - [ ] AudioContext resume trigger on keypad touch
- [ ] **Lobby System (`src/lobby.js`)**
    - [ ] Character Slot UI (Cards)
    - [ ] Character Customizer Modal (Body/Hair/Color/Face)
    - [ ] Save/Load logic to Firebase `users/{uid}/characters`

## Phase 3: In-Game Engine & Multiplayer
- [ ] **Game Loop & Rendering (`src/engine.js`)**
    - [ ] Initialize PixiJS Application (Nearest Scale)
    - [ ] Implement skeletal assembly from JSON data
    - [ ] **Crucial:** Z-Index sorting by Y-coordinate (Ticker loop)
- [ ] **Camera System (`src/camera.js`)**
    - [ ] Implement Zoom Toggle (48px <-> 64px)
    - [ ] Ensure Local Player Centering logic
- [ ] **Input & Movement (`src/input.js`, `src/pathfinder.js`)**
    - [ ] Tap-to-Move logic
    - [ ] A* Pathfinding implementation (Block `1` detection)
    - [ ] Movement smoothing (Lerp) & Directional mirroring
- [ ] **Network Sync (`src/network.js`)**
    - [ ] Firebase Realtime DB listener setup
    - [ ] Position throttling (Local) & Interpolation (Remote)
    - [ ] Presence system (onDisconnect)

## Phase 4: Gameplay Expansion (Housing & Portal)
- [ ] **Housing System (`src/housing.js`)**
    - [ ] Ghost Building rendering (3x3)
    - [ ] Placement validation & Collision Grid update
- [ ] **Portal & Interior (`src/portal.js`, `src/interior.js`)**
    - [ ] Interior data structure & rendering filtering
    - [ ] Transition effects (Fade In/Out)
    - [ ] Furniture placement logic

## Phase 5: Economy & Social
- [ ] **Chat System (`src/ui.js`)**
    - [ ] Hidden Input Bar logic (Slide-up)
    - [ ] Chat Bubble rendering & auto-destroy
- [ ] **Economy (`src/shop.js`)**
    - [ ] Shop UI Modal
    - [ ] Daily dynamic price logic (Seeded random)
- [ ] **P2P Trade (`src/trade.js`)**
    - [ ] Interaction Bubble (Approaching friend)
    - [ ] Trade Window UI & Transaction logic

## Phase 6: RPG & Environment
- [ ] **RPG Core (`src/rpg_core.js`, `src/monster.js`)**
    - [ ] Stats data sync (HP, XP, Level)
    - [ ] Monster AI (Idle/Chase/Attack) & Death logic
- [ ] **Environment (`src/environment.js`)**
    - [ ] Resource gathering (Shake anim, Item drop)
    - [ ] Respawn timer logic
- [ ] **Housing Rental (`src/housing_rental.js`)**
    - [ ] Inn system logic

## Phase 7: Polish & Deploy
- [ ] Final Code Review against Project.txt
- [ ] iOS PWA Verification (Overscroll check)
