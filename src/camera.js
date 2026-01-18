import { app, worldContainer, TILE_SIZE } from "./engine.js";

// State
let scaleFactor = 1.0; // 1.0 = 48px, 1.33 = 64px
const SCALE_NORMAL = 1.0;
const SCALE_ZOOM = 1.3333; // 64 / 48

export function initCamera(localPlayer) {
    const zoomBtn = document.getElementById("zoom-btn");
    zoomBtn.onclick = toggleZoom;

    // Initial center
    centerOn(localPlayer);

    // Add ticker to follow player
    app.ticker.add(() => {
        if (localPlayer) {
            centerOn(localPlayer);
        }
    });
}

function toggleZoom() {
    // scaleFactor = (scaleFactor === SCALE_NORMAL) ? SCALE_ZOOM : SCALE_NORMAL;
    // Actually, let's toggle between 1.0 and 1.33
    if (Math.abs(scaleFactor - SCALE_NORMAL) < 0.01) {
        scaleFactor = SCALE_ZOOM;
    } else {
        scaleFactor = SCALE_NORMAL;
    }

    // Apply Scale to World
    worldContainer.scale.set(scaleFactor);
    console.log("Zoom toggled:", scaleFactor);
}

export function centerOn(target) {
    if (!target) return;

    const screenW = app.screen.width;
    const screenH = app.screen.height;

    // Calculate world position to put target in center
    // worldX = -targetX * scale + screenW/2
    const targetX = target.x;
    const targetY = target.y;

    worldContainer.x = -targetX * scaleFactor + screenW / 2;
    worldContainer.y = -targetY * scaleFactor + screenH / 2;

    // Clamp? For MVP infinite void is fine, or clamp to map bounds if needed.
    // Spec doesn't strictly say clamp, just "Centering".
}
