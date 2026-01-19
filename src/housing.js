// src/housing.js
import * as PIXI from "https://cdnjs.cloudflare.com/ajax/libs/pixi.js/7.2.4/pixi.min.mjs";
import { app, worldContainer, mapData, TILE_SIZE, mySprite, entityLayer, backgroundLayer } from "./engine.js";
import { Assets } from "./loader.js";
import { db, ref, set, push, onValue, update, get, child } from "./config.js";
import { PortalSystem } from "./portal.js";

export class HousingSystem {
    constructor(portalSystem) {
        this.portalSystem = portalSystem;
        this.buildings = {}; // { id: { x, y, owner, type, sprite } }
        this.isBuildMode = false;
        this.ghostSprite = null;

        // Listen for buildings
        this.initBuildings();
    }

    initBuildings() {
        const buildingsRef = ref(db, "world/buildings");
        onValue(buildingsRef, (snapshot) => {
            const data = snapshot.val() || {};
            // Clear existing logic if needed or just add new
            // For simplicity, just add new ones or update
            for (const [id, bData] of Object.entries(data)) {
                if (!this.buildings[id]) {
                    this.createBuilding(id, bData);
                }
            }
        });
    }

    createBuilding(id, data) {
        // data: { x, y, owner, type }
        // 3x3 Building
        // Visual: Just a placeholder rect or sprite for now.
        // Assuming we have a house asset or use colors.

        const container = new PIXI.Container();
        container.x = data.x * TILE_SIZE;
        container.y = data.y * TILE_SIZE;

        // Main House Body (3x3)
        // Tint based on owner for now or fixed texture
        const texture = Assets.textures.house_1 || PIXI.Texture.WHITE; // Use house_1 if exists, else WHITE
        const sprite = new PIXI.Sprite(texture);
        sprite.width = 3 * TILE_SIZE;
        sprite.height = 3 * TILE_SIZE;

        if (texture === PIXI.Texture.WHITE) {
            sprite.tint = 0x8B4513; // Brown fallback
        }

        container.addChild(sprite);

        // Door (Portal) at (1, 2) local grid -> center bottom
        // Visual door
        const door = new PIXI.Sprite(PIXI.Texture.WHITE);
        door.width = TILE_SIZE;
        door.height = TILE_SIZE;
        door.tint = 0x000000;
        door.x = 1 * TILE_SIZE;
        door.y = 2 * TILE_SIZE;
        container.addChild(door);

        // Add to World
        // Building should be in background or entity? 
        // Entity layer is sorted by Y. Background is tiles.
        // House is big. Let's put in entity layer but make sure Z sort works.
        // Pivot needs to be bottom center for Z sort?
        // Let's keep top-left anchor for grid alignment simplicity, 
        // but set zIndex to bottom Y.

        container.zIndex = (data.y + 3) * TILE_SIZE; // Sort by bottom
        entityLayer.addChild(container);

        this.buildings[id] = { ...data, sprite: container };

        // Collision Update (Mark 3x3 as wall)
        for (let dy = 0; dy < 3; dy++) {
            for (let dx = 0; dx < 3; dx++) {
                const mx = data.x + dx;
                const my = data.y + dy;
                // Don't mark Door as wall so we can tap it? 
                // Or mark as wall but handle tap differently.
                // Section F: 66 says update collision to 1.
                // Section F: 67 says Tap Door -> Enter.
                // If it's 1, pathfinding won't go there. That's fine.
                // We just need tap detection.
                if (mapData[my] && mapData[my][mx] !== undefined) {
                    mapData[my][mx] = 1;
                }
            }
        }

        // Portal Registration
        // Door is at global (data.x + 1, data.y + 2)
        this.portalSystem.registerPortal(data.x + 1, data.y + 2, id);
    }

    reapplyCollisions() {
        if (!mapData) return;
        for (const [id, data] of Object.entries(this.buildings)) {
            for (let dy = 0; dy < 3; dy++) {
                for (let dx = 0; dx < 3; dx++) {
                    const mx = data.x + dx;
                    const my = data.y + dy;
                    if (mapData[my] && mapData[my][mx] !== undefined) {
                        mapData[my][mx] = 1;
                    }
                }
            }
        }
    }

    reapplyCollisions() {
        if (!mapData) return;
        for (const [id, data] of Object.entries(this.buildings)) {
            for (let dy = 0; dy < 3; dy++) {
                for (let dx = 0; dx < 3; dx++) {
                    const mx = data.x + dx;
                    const my = data.y + dy;
                    if (mapData[my] && mapData[my][mx] !== undefined) {
                        mapData[my][mx] = 1;
                    }
                }
            }
        }
    }

    async startBuildMode() {
        // Cost Check
        if (window.currentUser) {
            const uid = window.currentUser.uid;
            // Check Gold (500)
            const goldSnap = await get(ref(db, `players/${uid}/wallet/gold`));
            const gold = goldSnap.val() || 0;

            if (gold < 500) {
                alert("Not enough Gold! Need 500 G to build.");
                return;
            }
            // Check Materials (Project.txt 80 says "resource/material shortage check")
            // Let's assume Wood 10, Stone 10
            const woodSnap = await get(ref(db, `players/${uid}/inventory/wood`));
            const stoneSnap = await get(ref(db, `players/${uid}/inventory/stone`));
            const wood = woodSnap.val() || 0;
            const stone = stoneSnap.val() || 0;

            if (wood < 10 || stone < 10) {
                alert(`Not enough Materials! Need 10 Wood, 10 Stone. (You have: ${wood} W, ${stone} S)`);
                return;
            }
        }

        this.isBuildMode = true;
        // Create Ghost
        this.ghostSprite = new PIXI.Graphics();
        this.ghostSprite.beginFill(0x00FF00, 0.5);
        this.ghostSprite.drawRect(0, 0, 3 * TILE_SIZE, 3 * TILE_SIZE);
        this.ghostSprite.endFill();
        this.ghostSprite.zIndex = 99999;
        worldContainer.addChild(this.ghostSprite);

        // Mouse Move Listener
        app.stage.on("pointermove", this.onGhostMove.bind(this));
        app.stage.on("pointerdown", this.onBuildClick.bind(this));

        // Enable stage interaction if not already
        app.stage.eventMode = 'static';
        app.stage.hitArea = app.screen;
    }

    stopBuildMode() {
        this.isBuildMode = false;
        if (this.ghostSprite) {
            this.ghostSprite.destroy();
            this.ghostSprite = null;
        }
        app.stage.off("pointermove", this.onGhostMove.bind(this));
        app.stage.off("pointerdown", this.onBuildClick.bind(this));
    }

    onGhostMove(e) {
        if (!this.ghostSprite) return;
        const globalPos = e.global;
        const localPos = worldContainer.toLocal(globalPos);

        // Snap to grid
        const gx = Math.floor(localPos.x / TILE_SIZE);
        const gy = Math.floor(localPos.y / TILE_SIZE);

        this.ghostSprite.x = gx * TILE_SIZE;
        this.ghostSprite.y = gy * TILE_SIZE;

        // Check Valid
        const isValid = this.isValidLocation(gx, gy);
        this.ghostSprite.tint = isValid ? 0xFFFFFF : 0xFF0000;
        this.ghostSprite.valid = isValid;
        this.ghostSprite.gridX = gx;
        this.ghostSprite.gridY = gy;
    }

    async onBuildClick(e) {
        if (!this.isBuildMode || !this.ghostSprite) return;

        // Check if we clicked on HUD or something handled elsewhere
        // But for now assume stage click is build.

        if (this.ghostSprite.valid) {
            const gx = this.ghostSprite.gridX;
            const gy = this.ghostSprite.gridY;

            // Build!
            const uid = window.currentUser.uid;
            const newBuildingRef = push(ref(db, "world/buildings"));
            await set(newBuildingRef, {
                x: gx,
                y: gy,
                owner: uid,
                type: "house_1"
            });

            // Deduct Cost
            // We should do this transactionally ideally, but simple sequential update for now
            const walletRef = ref(db, `players/${uid}/wallet`);
            const invRef = ref(db, `players/${uid}/inventory`);

            // Re-fetch to be safe or just decrement assuming single threaded client logic mostly
            // Better: Transaction
            // But simple update:
            const goldSnap = await get(child(walletRef, 'gold'));
            const woodSnap = await get(child(invRef, 'wood'));
            const stoneSnap = await get(child(invRef, 'stone'));

            update(walletRef, { gold: (goldSnap.val() || 0) - 500 });
            update(invRef, {
                wood: (woodSnap.val() || 0) - 10,
                stone: (stoneSnap.val() || 0) - 10
            });
            alert("Building Constructed! (-500G, -10 Wood, -10 Stone)");

            this.stopBuildMode();
        }
    }

    isValidLocation(x, y) {
        // Check 3x3 bounds
        for (let dy = 0; dy < 3; dy++) {
            for (let dx = 0; dx < 3; dx++) {
                const mx = x + dx;
                const my = y + dy;

                // Map Bounds
                if (my < 0 || my >= mapData.length || mx < 0 || mx >= mapData[0].length) return false;

                // Collision (Wall or other building)
                if (mapData[my][mx] === 1) return false;
            }
        }
        return true;
    }
}
