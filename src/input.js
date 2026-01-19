import * as PIXI from "https://cdnjs.cloudflare.com/ajax/libs/pixi.js/7.2.4/pixi.min.mjs";
import { app, worldContainer, TILE_SIZE, mapData } from "./engine.js";
import { findPath } from "./pathfinder.js";
import { updateMyPosition } from "./network.js"; // Will be created
import { centerOn } from "./camera.js";

// Visual Marker
let targetMarker = null;

export function initInput(localPlayer, onMoveStart) {
    // Create Target Marker
    targetMarker = new PIXI.Graphics();
    targetMarker.lineStyle(2, 0xFFFFFF, 1);
    targetMarker.drawCircle(0, 0, 10);
    targetMarker.visible = false;
    worldContainer.addChild(targetMarker);

    // Tap event on stage? Or Interactive background?
    // Since World moves, we should listen on app.stage or a full-screen background hitarea.
    // Let's use app.stage event (hitArea needed)
    app.stage.eventMode = 'static';
    app.stage.hitArea = app.screen;

    app.stage.on('pointerdown', (e) => {
        // e.global is screen coordinate
        // Convert to World Coordinate
        // World is scaled and translated.
        // localPos = (screen - worldPos) / scale

        const worldX = (e.global.x - worldContainer.x) / worldContainer.scale.x;
        const worldY = (e.global.y - worldContainer.y) / worldContainer.scale.y;

        const gridX = Math.floor(worldX / TILE_SIZE);
        const gridY = Math.floor(worldY / TILE_SIZE);

        console.log("Tap Grid:", gridX, gridY);

        // Show Marker
        targetMarker.x = gridX * TILE_SIZE + TILE_SIZE / 2;
        targetMarker.y = gridY * TILE_SIZE + TILE_SIZE / 2;
        targetMarker.visible = true;
        targetMarker.alpha = 1;

        // Animate Marker (Simple fade)
        // We'll trust ticker or CSS anim? Pixi ticker cleaner.
        // For MVP, just leave it or quick fade.

        // Pathfinding
        const startX = Math.floor((localPlayer.x - 24) / TILE_SIZE); // approx center
        const startY = Math.floor((localPlayer.y - 48) / TILE_SIZE); // feet

        // Fix coordinates logic:
        // Player is Anchor(0.5, 1.0). x is center, y is bottom.
        // Tile X: Math.floor(player.x / TILE_SIZE)
        // Tile Y: Math.floor((player.y - 1) / TILE_SIZE) -> since y is bottom boundary

        const pGridX = Math.floor(localPlayer.x / TILE_SIZE);
        const pGridY = Math.floor((localPlayer.y - 1) / TILE_SIZE);

        const path = findPath(pGridX, pGridY, gridX, gridY);
        if (path && path.length > 0) {
            console.log("Path found:", path.length);
            onMoveStart(path);
        } else {
            // console.log("Blocked or No path");
            // Highlight red?
            targetMarker.tint = 0xFF0000;
            setTimeout(() => targetMarker.tint = 0xFFFFFF, 500);
        }
    });

    // Handle resizing hitarea
    window.addEventListener('resize', () => {
        app.stage.hitArea = app.screen;
    });
}
