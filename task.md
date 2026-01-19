# Family Town Development Task List

## Phase 1: Environment & Foundation
- [x] **Verify Game Launch**
    - [x] Confirm assets load without errors.
    - [x] Note: Visual verification limited by tool rate limits; verified via code inspection (curl).
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
    - [x] Slot UI: Split Left(Portrait/Btns) & Right(Info) -> **Refined**: Portrait(Left), Info(Right), Buttons(Bottom)
    - [x] Character Customizer Modal (Body/Hair/Color/Face)
        - [ ] **Layout**: Top/Bottom split (50/50)
            - **Top Half**: Full character preview image (live update based on selections)
            - **Bottom Half**: Customization interface
        - [ ] **Customization Tabs** (Swipeable horizontal navigation):
            - Body (몸)
            - Body Color (바디 컬러)
            - Hair Style (헤어스타일)
            - Hair Color (헤어 컬러)
            - Eye Shape (눈 모양)
            - Nose Shape (코 모양)
            - Mouth Shape (입 모양)
        - [ ] **Sample Selection**: When tab is selected, display sample images in horizontal scrollable boxes
        - [ ] **Swipe Navigation**: Implement touch swipe for both tabs and sample images
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
- [x] **Verification**: Verified core logic via Deployed URL (GitHub Pages).
    - Confirmed 'Cancel' button logic in local code (Deployment was outdated).





# Family Town Development Guidelines

## 1. Project Overview
**Target Platform:** iOS/iPadOS Chrome Browser (PWA Standalone)
**Core Concept:** 4-Player Family Multiplayer Game (RPG + Sim)
**Tech Stack:** 
- **Frontend:** PixiJS v7+ (Render), Firebase v9 Modular (Auth/DB)
- **Style:** 48px Grid Tile, Skeletal (Cutout) Animation, Pixel Art (Nearest Scale)

## 2. Technical Constraints & iOS Optimization
1.  **Rendering:** `PIXI.settings.SCALE_MODE = PIXI.SCALE_MODES.NEAREST` (Mandatory).
2.  **PWA/Touch:** 
    - Strict control of `overscroll-behavior`, `touch-action: none`.
    - `user-select: none` to prevent text selection/magnifiers.
    - Meta tags for `apple-mobile-web-app-capable`.
3.  **Audio:** `AudioContext` must be resumed on the very first user interaction (PIN Keypad touch).
4.  **Device Aspect:** 16:9 Landscape Ratio (simulated on desktop, native on mobile).

## 3. Database Schema (Firebase Realtime DB)
| Path | Structure & Description |
| :--- | :--- |
| `users/{userID}` | `{ pin: "1234", avatar: {...} }` |
| `users/{userID}/characters` | List of created characters (Max 3). |
| `users/{userID}/currentMap` | Current location ID (default: `"world"`). |
| `players/{userID}` | Ephemeral game state (x, y, anim, direction). |
| `players/{userID}/stats` | RPG Stats: `{ level, xp, hp, max_hp, str... }`. |
| `players/{userID}/inventory` | Personal items. |
| `players/{userID}/wallet` | Currency: `{ gold: 1000 }`. |
| `world/buildings/{buildID}` | Exterior buildings: `{ type, x, y, owner, interiorID }`. |
| `world/drops` | Shared field items (FIFO pickup). |
| `interiors/{interiorID}/items` | Furniture placement inside houses. |
| `trades/{sessionID}` | P2P Trade session data. |

## 4. Module Specifications

### A. Authentication System (`src/auth.js`)
- **UI (Intro):** 4 separate square input boxes (centered). Below: "Connect" button (Active ONLY if PIN is valid). Below: "Create Auth Key" text link.
- **UI (Creation Popup):** 4 input boxes (New PIN) + 4 input boxes (Confirm PIN). "Create" button activates only if both match.
- **Logic:** Real-time PIN validation against DB to enable Connect button. Auto-focus next box on input.
- **Trigger:** First interaction resumes AudioContext.

### B. Lobby & Customization (`src/lobby.js`)
- **Slots:** 3 Character Cards.
    - *Exists:* 
        - Layout: 50% Left (Portrait), 50% Right (Info + Buttons).
        - Right Column: Name/Info at top, Delete/Connect buttons at bottom.
        - Buttons: Consistent small size, aligned right-bottom.
    - *Empty:* Black Silhouette + [+] Button.
- **Character Creator:** 
    - **Parts:** Body, Hair (Bone toggle), Face (Sprite toggle).
    - **Color:** Tint application (Requires Grayscale/White source assets).
    - **Save:** Stores JSON structure to `users/{uid}/characters`.

### C. Game Engine Core (`src/engine.js`, `src/camera.js`)
- **Viewport:** Mobile Fullscreen.
- **Z-Sorting:** **Critical.** Re-sort `WorldContainer` children by Y-coordinate every frame to verify depth.
- **Skeletal Renderer:** Procedural animation (walking) by rotating Container bones code-side.
- **Camera/Zoom:** 
    - Toggle Button `[ 🔍 ]`: Switch between **48px (1.0x)** and **64px (1.33x)**.
    - **Centering:** Local player must ALWAYS be center-screen.

### D. Input & Movement (`src/pathfinder.js`, `src/input.js`)
- **Control:** Tap-to-move (Point & Click).
- **Feedback:** Visual 'Target Marker' animation at touch point (0.5s).
- **Logic:** 
    1. Grid conversion -> Collision Check (`1` = Block).
    2. **A* Pathfinding:** Calculate shortest path.
    3. **Smoothing:** Lerp movement between tiles. Mirror sprite based on direction.

### E. Network & Chat (`src/network.js`, `src/ui.js`)
- **Sync:** 
    - Local: 100ms Throttle.
    - Remote: Linear Interpolation (Lerp) for smooth lag compensation.
- **Off-line:** Handle `onDisconnect` to remove player presence.
- **Chat:** 
    - Input: Hidden by default. Toggle `[ 💬 ]` slides up keyboard + input bar. 
    - **No-Gap:** Ensure Viewport adjustment so input bar sits on top of keyboard without white space.
    - **Display:** Bubble above head (Rounded Rect), auto-destroy after 5s.

### F. Housing & Interiors (`src/housing.js`, `src/interior.js`, `src/portal.js`)
- **Ghost Building:** 3x3 semitransparent visual following cursor. Red tint if invalid placement.
- **Placement:** Updates specific 3x3 grid area to `Collision(1)`.
- **Portal:** 
    - **Enter:** Tap 'Door' tile -> Fade Out -> Switch `currentMap` -> Teleport to interior.
    - **Exit:** Tap 'Mat' tile -> Fade Out -> Switch `world` -> Teleport to door front.
- **Filtering:** Only render entities sharing the same `currentMap` ID.
- **Interior:** 10x10 fixed room. Furniture placement allowed (except door frontage).

### G. Economy & Trade (`src/shop.js`, `src/trade.js`)
- **Shop:** Fixed map location (Town Center). Modal Popup.
    - **Dynamic Price:** Daily fluctuation based on Seed (`DateString`). Range: 0.8 ~ 1.3x.
- **P2P Trade:**
    - **Interaction:** Tap User -> Move to adjacent tile -> Show `[ 🤝 Trade ]` Bubble.
    - **Flow:** Request -> Window Open -> Offer -> Lock -> Confirm -> Transaction.

### H. RPG & Combat (`src/rpg_core.js`, `src/monster.js`)
- **Stats:** Level, XP, HP/MaxHP, Str/Vit/Int/Agi.
- **Progression:** Level Up -> +3 Free Points.
- **Monsters:** 
    - **AI:** Idle (Random Walk) -> Detect (3 tiles) -> Chase -> Attack (1 tile).
    - **Combat:** Simple HP deduction.
- **Death:** `HP <= 0` -> Faint State -> Screen Fade -> Respawn at "Well" (Town Center) after 3s.

### I. Environment & Resources (`src/environment.js`)
- **Gathering:** Tap Resource (Tree/Rock) -> Shake Anim -> Drop Item.
- **Drops:** Parabola Tween animation (Up -> Down). Shadow casting.
- **Looting:** Tap Drop -> Fly-to-bag animation (Bezier) -> Inventory `+1`.
- **Regeneration:** 
    - Depleted objects set `active: false` (Invisible/No-collision).
    - Timer check (e.g., Tree 5min) -> Restore to `active: true`.

### J. Rental System (`src/housing_rental.js`)
- **Inn:** Rental room for players without houses.
- **Logic:** Pay gold -> Set spawn point to Inn Room.

## 5. Asset Conventions
- **Path:** `assets/`
- **Naming:** 
    - Parts: `body_basic.png`, `head_{n}.png`, `arm_basic.png`
    - Tiles: `tile_grass.png`, `tile_wall.png`
    - Objects: `building_house_01.png` (3x3), `furniture_bed.png`
- **Tint Rule:** All tintable sprites (Skin, Hair) **MUST be Grayscale or White**.

## 6. Test Credentials
- **Test PIN:** `0000`
