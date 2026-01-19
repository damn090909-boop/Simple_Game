import * as PIXI from "https://cdnjs.cloudflare.com/ajax/libs/pixi.js/7.2.4/pixi.min.mjs";
import { app, worldContainer, backgroundLayer, TILE_SIZE, mySprite } from "./engine.js";
import { Assets } from "./loader.js";

export class Environment {
    constructor(itemManager) {
        this.itemManager = itemManager;
        this.resources = [];
        this.container = new PIXI.Container();
        this.container.zIndex = 10; // Sortable
        worldContainer.addChild(this.container);

        // Generate some random resources for testing
        // In a real game, this would sync with DB or Map Data
        this.generateRandomResources();
    }

    generateRandomResources() {
        // 5 Trees, 5 Rocks
        for (let i = 0; i < 5; i++) {
            this.spawnResource('tree', 3 + i * 2, 3);
            this.spawnResource('rock', 3 + i * 2, 8);
        }
    }

    spawnResource(type, gridX, gridY) {
        const texture = Assets.textures.tile_wall; // Fallback

        const sprite = new PIXI.Sprite(texture);
        sprite.anchor.set(0.5, 1);
        sprite.x = gridX * TILE_SIZE + TILE_SIZE / 2;
        sprite.y = gridY * TILE_SIZE + TILE_SIZE;
        sprite.zIndex = sprite.y;

        if (type === 'tree') {
            sprite.tint = 0x228B22;
            sprite.scale.set(0.8, 1.2);
        } else {
            sprite.tint = 0x808080;
            sprite.scale.set(0.8, 0.6);
        }

        sprite.userData = {
            type,
            gridX,
            gridY,
            hp: 3,
            active: true,
            respawnTime: 0
        };
        this.container.addChild(sprite);
        this.resources.push(sprite);
    }

    update(delta) {
        const now = Date.now();
        this.resources.forEach(res => {
            if (!res.userData.active) {
                if (now > res.userData.respawnTime) {
                    // Respawn
                    res.userData.active = true;
                    res.userData.hp = 3;
                    res.visible = true;
                    // Fade in?
                    res.alpha = 1;
                }
            }
        });
    }

    checkCollision(x, y) {
        // x, y are world coordinates (e.g. center of player or target position)
        // Check strict bounds? Or Tile based?
        // Let's use Grid based collision for movement blocking
        const gridX = Math.floor(x / TILE_SIZE);
        const gridY = Math.floor(y / TILE_SIZE);

        for (const res of this.resources) {
            if (res.userData.active) {
                // Resources are at res.userData.gridX, gridY
                // Wait, sprite.y is bottom, so gridY is correct.
                if (res.userData.gridX === gridX && res.userData.gridY === gridY) {
                    return true;
                }
            }
        }
        return false;
    }

    checkTap(x, y) {
        // Find tapped resource
        for (const res of this.resources) {
            if (!res.userData.active) continue;

            const w = res.width;
            const h = res.height;
            // Bounds: (x - w/2) to (x + w/2), (y - h) to y
            if (x >= res.x - w / 2 && x <= res.x + w / 2 &&
                y >= res.y - h && y <= res.y) {

                this.gather(res);
                return true;
            }
        }
        return false;
    }

    gather(resource) {
        // 1. Check distance
        const dist = Math.sqrt(Math.pow(resource.x - mySprite.x, 2) + Math.pow(resource.y - mySprite.y, 2));
        if (dist > TILE_SIZE * 2.5) { // Increased reach slightly
            console.log("Too far to gather!");
            return;
        }

        // 2. Shake animation
        this.shake(resource);

        // 3. Drop Item
        const dropType = resource.userData.type === 'tree' ? 'wood' : 'stone';
        // Spawn slightly offset
        const dropX = resource.x + (Math.random() * 20 - 10);
        const dropY = resource.y + (Math.random() * 10 - 5);

        this.itemManager.spawnItemData(dropX, dropY, dropType);

        // 4. Deplete
        resource.userData.hp--;
        if (resource.userData.hp <= 0) {
            resource.userData.active = false;
            resource.visible = false;
            resource.userData.respawnTime = Date.now() + 10000; // 10s for test (User Spec asked for 1m/5m, let's use 10s for verification then maybe increase)
            // Let's use 60000 for "real" or 10000 for verify
            // I'll stick to 10s for quick verify as per Plan
        }
    }

    shake(sprite) {
        let t = 0;
        const duration = 0.2;
        const startX = sprite.x;
        const animate = (delta) => {
            t += (delta / 60) / duration;
            if (t > 1) {
                sprite.x = startX;
                sprite.rotation = 0;
                app.ticker.remove(animate);
                return;
            }
            // Simple wobble
            sprite.x = startX + Math.sin(t * Math.PI * 4) * 3;
            sprite.rotation = Math.sin(t * Math.PI * 4) * 0.05;
        };
        app.ticker.add(animate);
    }
}
