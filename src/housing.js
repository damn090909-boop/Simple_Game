import { app, worldContainer, TILE_SIZE, mapData } from "./engine.js";
import { Assets } from "./loader.js";
import { db, ref, push, onValue, set, update, child } from "./config.js";
import { currentUser } from "./auth.js";

let buildMode = false;
let ghostSprite = null;
let currentBuildingType = "house_red"; // MVP fixed

const BUILDINGS = {}; // { id: sprite }

export function initHousing() {
    // Listen to Buildings
    const buildingsRef = ref(db, "world/buildings");
    onValue(buildingsRef, (snapshot) => {
        const data = snapshot.val() || {};

        // Render from data
        Object.entries(data).forEach(([id, b]) => {
            if (!BUILDINGS[id]) {
                spawnBuilding(id, b);
            }
        });

        // Handle removals (omitted for MVP brevity, but same logic as players)
    });

    // Add Build Button to HUD (Programmatically for MVP)
    const hud = document.querySelector("#game-hud .bottom-bar");
    const buildBtn = document.createElement("button");
    buildBtn.className = "hud-btn";
    buildBtn.innerText = "🔨";
    buildBtn.onclick = toggleBuildMode;
    hud.insertBefore(buildBtn, hud.firstElementChild); // Add to left
}

function toggleBuildMode(e) {
    if (e) e.stopPropagation();
    buildMode = !buildMode;
    console.log("Build Mode:", buildMode);

    if (buildMode) {
        if (!ghostSprite) {
            ghostSprite = new PIXI.Sprite(Assets.textures.building_house_01);
            ghostSprite.alpha = 0.5;
            ghostSprite.zIndex = 9999;
            worldContainer.addChild(ghostSprite);
        }
        ghostSprite.visible = true;

        // Follow Cursor Logic attach
        app.stage.on("pointermove", moveGhost);
        app.stage.on("pointerdown", placeBuilding);

    } else {
        if (ghostSprite) ghostSprite.visible = false;
        app.stage.off("pointermove", moveGhost);
        app.stage.off("pointerdown", placeBuilding);
    }
}

function moveGhost(e) {
    if (!buildMode || !ghostSprite) return;

    const worldX = (e.global.x - worldContainer.x) / worldContainer.scale.x;
    const worldY = (e.global.y - worldContainer.y) / worldContainer.scale.y;

    // Snap to Grid (3x3 origin top-left)
    const gridX = Math.floor(worldX / TILE_SIZE);
    const gridY = Math.floor(worldY / TILE_SIZE);

    ghostSprite.x = gridX * TILE_SIZE;
    ghostSprite.y = gridY * TILE_SIZE;

    // Validation Color
    const valid = isValidPlacement(gridX, gridY, 3, 3);
    ghostSprite.tint = valid ? 0xFFFFFF : 0xFF0000;
}

function isValidPlacement(x, y, w, h) {
    // Check Bounds
    if (x < 0 || y < 0 || x + w > 20 || y + h > 20) return false;

    // Check Collision (mapData block)
    for (let i = 0; i < w; i++) {
        for (let j = 0; j < h; j++) {
            if (mapData[y + j][x + i] === 1) return false;
        }
    }

    // Check Existing Buildings? (mapData should include them, but if not synced to local mapData yet...)
    // For MVP, we assume mapData is updated when building spawns.
    return true;
}

function placeBuilding(e) {
    if (!buildMode) return;
    e.stopPropagation(); // Prevent move tap

    const worldX = (e.global.x - worldContainer.x) / worldContainer.scale.x;
    const worldY = (e.global.y - worldContainer.y) / worldContainer.scale.y;
    const gridX = Math.floor(worldX / TILE_SIZE);
    const gridY = Math.floor(worldY / TILE_SIZE);

    if (isValidPlacement(gridX, gridY, 3, 3)) {
        // Build!
        const newBuild = {
            type: "house_red",
            x: gridX * TILE_SIZE,
            y: gridY * TILE_SIZE,
            owner: currentUser.uid,
            interiorID: `room_${currentUser.uid}_01`, // unique ID
            timestamp: Date.now()
        };

        push(ref(db, "world/buildings"), newBuild);

        toggleBuildMode(); // Exit mode
    }
}

function spawnBuilding(id, data) {
    // 1. Create Sprite
    const sprite = new PIXI.Sprite(Assets.textures.building_house_01);
    sprite.x = data.x;
    sprite.y = data.y;
    sprite.anchor.set(0, 1.0); // Anchor bottom-left? No 3x3 image usually uses top-left origin but for Sort...
    // Project.txt says: anchor.y = 1.0. 
    // Image is 144x144. If we set x,y to Top-Left Grid, but anchor is bottom...
    // Top-Left Grid (gx, gy). Pixel (gx*48, gy*48).
    // If sprite is 3 tiles high, it covers y, y+1, y+2.
    // Bottom Y is (gy+3)*48.
    // If we use anchor (0, 1), we should set sprite.y = (gy+3)*48.

    // Let's adjust coordinate logic
    const gridY = data.y / TILE_SIZE;
    sprite.y = (gridY + 3) * TILE_SIZE; // Bottom of the building area
    sprite.zIndex = sprite.y; // Sort by bottom

    // Add to Entity Layer (sorted)
    // Find entity layer
    const entityLayer = worldContainer.children.find(c => c.sortableChildren);
    entityLayer.addChild(sprite);
    BUILDINGS[id] = sprite;

    // 2. Update Collision (Block 3x3)
    const gridX = data.x / TILE_SIZE;
    for (let i = 0; i < 3; i++) {
        for (let j = 0; j < 3; j++) {
            // Door Logic: (x+1, y+2) is door. Don't block? Or special block?
            // Spec says "Door Offset: (x+1, y+2)".
            // For MVP, block all, Portal handles door tap on 'Blocked' tile?
            // Actually A* fails if blocked.
            // Let's mark Door as 2 (Portal).
            if (i === 1 && j === 2) {
                mapData[gridY + j][gridX + i] = 2; // Portal
            } else {
                mapData[gridY + j][gridX + i] = 1; // Block
            }
        }
    }
}
