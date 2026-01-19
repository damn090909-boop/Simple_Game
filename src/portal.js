// src/portal.js
import { app, worldContainer, mySprite, backgroundLayer, entityLayer, TILE_SIZE, updateCurrentMapId, getCurrentMapId, generateMap } from "./engine.js";

export class PortalSystem {
    constructor() {
        this.portals = {}; // { "x,y": { type: "enter"|"exit", targetMap: "id", targetX: 0, targetY: 0 } }
    }

    registerPortal(x, y, buildingId) {
        // Door at World (Enter)
        this.portals[`${x},${y}`] = {
            type: "enter",
            targetMap: `interior_${buildingId}`,
            targetX: 5, // Center of room
            targetY: 8  // Bottom of room
        };
        console.log(`Registered Portal at ${x},${y} -> interior_${buildingId}`);
    }

    checkTap(worldX, worldY) {
        // Check if tap hits a portal tile
        // Assuming tap is precise for now, or match grid.
        // worldX/Y are pixels.

        const gx = Math.floor(worldX / TILE_SIZE);
        const gy = Math.floor(worldY / TILE_SIZE);

        const key = `${gx},${gy}`;
        const portal = this.portals[key];

        if (portal) {
            this.transition(portal);
            return true;
        }

        // Also check "Exit" mat in interior
        // If current map is interior, we manually check Mat tile (5, 9).
        const currentMap = getCurrentMapId();
        if (currentMap.startsWith("interior_")) {
            if (gx === 5 && gy === 9) { // Exit Mat
                this.transition({
                    type: "exit",
                    targetMap: "main_world",
                    targetX: 10, // Default for now, ideally save last world pos
                    targetY: 10
                });
                return true;
            }
        }

        return false;
    }

    transition(data) {
        console.log("Portal Transition:", data);

        // 1. Fade Out
        const fade = new PIXI.Graphics();
        fade.beginFill(0x000000);
        fade.drawRect(0, 0, app.screen.width, app.screen.height);
        fade.endFill();
        fade.alpha = 0;
        fade.zIndex = 999999;
        app.stage.addChild(fade); // UI Layer, separate from world

        let alpha = 0;
        const fadeOut = (delta) => {
            alpha += 0.05 * delta;
            fade.alpha = alpha;
            if (alpha >= 1) {
                app.ticker.remove(fadeOut);

                // 2. Switch Map
                updateCurrentMapId(data.targetMap);

                // Reposition Player
                mySprite.x = data.targetX * TILE_SIZE + 24;
                mySprite.y = data.targetY * TILE_SIZE + 48;

                // If Interior, generate Room Map
                if (data.targetMap.startsWith("interior_")) {
                    generateMap(10, 10, "interior"); // Custom generator for room
                } else {
                    generateMap(20, 20, "world"); // Restore world
                }

                // 3. Fade In
                app.ticker.add(fadeIn);
            }
        };

        const fadeIn = (delta) => {
            alpha -= 0.05 * delta;
            fade.alpha = alpha;
            if (alpha <= 0) {
                fade.destroy();
                app.ticker.remove(fadeIn);
            }
        };

        app.ticker.add(fadeOut);
    }
}
