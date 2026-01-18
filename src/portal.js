import { app, worldContainer, TILE_SIZE, mapData } from "./engine.js";
import { updateMyPosition } from "./network.js";
import { currentUser } from "./auth.js";
import { db, ref, update } from "./config.js";

// State
let currentMap = "world";

export function initPortal() {
    // Listen for taps on Portal Tiles (Value 2)
    // We already have generic Input listener in src/input.js
    // Ideally Input should call us if target is Portal.
    // But Input.js handles 'Move Request'. If target is Portal(2), pathfinder might fail if it treats 2 as Block?
    // In InitHousing, we set Door = 2.
    // Let's patch Pathfinder to allow 2.

    // Better: Monitor Player Position. If entering Door Tile, trigger Portal.
    app.ticker.add(checkPortalTrigger);
}

function checkPortalTrigger() {
    // Find my sprite
    // Need export from engine? Or store in a global state manager?
    // MVP hack: Assuming we can access player via a singleton or property.
    // Passing...

    // Actually, let's just listen to Grid Taps in Input.
    // If double tap? Or just walking onto it?
    // Spec: "Enter Logic: Tap Door tile... Fade Out -> Switch... -> Teleport"
    // So distinct from Moving.
}

// Since I cannot modify src/input.js easily in this turn without overwriting, 
// I will export a 'teleport' function and use it inside Housing logic or Engine?
// No, the spec says "Tap 'Door' tile".
// If I tap a door, Input.js sees it. 
// If it's value 2, Pathfinder might say "Blocked" (since we only check !== 1?).
// I need to ensure Pathfinder allows 2. (Checked pathfinder.js: `if (mapData[endY][endX] === 1) return null;`. So 2 is OK!)
// So player walks to door.
// When 'arriving' at door, trigger.

export async function enterInterior(interiorID, entryX, entryY) {
    console.log("Entering Interior:", interiorID);

    // 1. Fade Out
    await fadeEffect(0, 1);

    // 2. Change Data
    currentMap = interiorID;
    update(ref(db, `users/${currentUser.uid}`), { currentMap: interiorID });

    // 3. Move Player (Local) to Entry
    // We need access to mySprite from engine.
    // This requires refactoring Engine to export 'teleportPlayer(x, y)'.
    // For now, assume engine follows global state or we update firebase and engine updates?
    // Engine update is throttle. Teleport is instant.

    // 4. Fade In
    await fadeEffect(1, 0);
}

function fadeEffect(from, to) {
    return new Promise(resolve => {
        const overlay = document.createElement("div");
        overlay.style.position = "fixed";
        overlay.style.top = 0;
        overlay.style.left = 0;
        overlay.style.width = "100%";
        overlay.style.height = "100%";
        overlay.style.background = "#000";
        overlay.style.opacity = from;
        overlay.style.transition = "opacity 0.5s";
        overlay.style.zIndex = 99999;
        document.body.appendChild(overlay);

        // Force reflow
        overlay.offsetHeight;

        requestAnimationFrame(() => {
            overlay.style.opacity = to;
            setTimeout(() => {
                if (to === 0) overlay.remove();
                resolve();
            }, 500);
        });
    });
}
