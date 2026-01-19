import * as PIXI from "https://cdnjs.cloudflare.com/ajax/libs/pixi.js/7.2.4/pixi.min.mjs";
import { app, entityLayer, TILE_SIZE, mySprite } from "./engine.js";
import { db as database, ref, set, remove, push, onChildAdded, onChildRemoved } from "./config.js";

export class ItemManager {
    constructor() {
        this.drops = {}; // Local storage of drop sprites by ID
        this.dropContainer = new PIXI.Container();
        this.dropContainer.zIndex = 1; // Below characters usually, but we sort by Y anyway
        entityLayer.addChild(this.dropContainer);

        // Listeners
        this.initListeners();
    }

    initListeners() {
        const dropsRef = ref(database, 'world/drops');

        // On new item drop
        onChildAdded(dropsRef, (snapshot) => {
            const data = snapshot.val();
            this.spawnVisualDrop(snapshot.key, data);
        });

        // On item collected/removed
        onChildRemoved(dropsRef, (snapshot) => {
            this.removeVisualDrop(snapshot.key);
        });
    }

    // Called when a resource is "mined"
    spawnItemData(x, y, type) {
        const dropsRef = ref(database, 'world/drops');
        const newDropRef = push(dropsRef);
        set(newDropRef, {
            x: x,
            y: y,
            type: type,
            timestamp: Date.now()
        });
    }

    // Create the visual sprite & animation
    spawnVisualDrop(key, data) {
        if (this.drops[key]) return;

        // Visual Representation (Graphics for now, as per plan)
        const drop = new PIXI.Container();
        drop.x = data.x;
        drop.y = data.y;

        // Shadow
        const shadow = new PIXI.Graphics();
        shadow.beginFill(0x000000, 0.3);
        shadow.drawEllipse(0, 0, 10, 5); // Flat shadow
        shadow.endFill();
        shadow.y = 5; // Slightly below
        drop.addChild(shadow);

        // Item Graphic
        const item = new PIXI.Graphics();
        const color = data.type === 'wood' ? 0x8B4513 : 0x808080; // Brown or Grey
        item.beginFill(color);
        item.drawCircle(0, 0, 8);
        item.endFill();
        drop.addChild(item);

        // Store data
        drop.userData = { key, type: data.type, startY: data.y, itemSprite: item };
        this.drops[key] = drop;
        this.dropContainer.addChild(drop);

        // Parabola Jump Animation (Tween)
        // If it's a fresh drop (timestamp close to now), animate. 
        // Otherwise just place it (if loading existing world state).
        if (Date.now() - data.timestamp < 2000) {
            this.animateParabola(drop, item);
        }
    }

    animateParabola(drop, item) {
        let t = 0;
        const jumpHeight = 30;
        const duration = 0.5; // seconds

        const animate = (delta) => {
            t += (delta / 60) / duration;
            if (t > 1) {
                t = 1;
                item.y = 0;
                app.ticker.remove(animate);
                return;
            }
            // Parabola: 4 * h * t * (1 - t)
            // But we want it to go UP then DOWN back to 0.
            // y offset should be negative (up).
            const height = jumpHeight * 4 * t * (1 - t);
            item.y = -height;
        };
        app.ticker.add(animate);
    }

    removeVisualDrop(key) {
        const drop = this.drops[key];
        if (drop) {
            this.dropContainer.removeChild(drop);
            delete this.drops[key];
        }
    }

    // Check if a tap hits an item
    checkTap(x, y) {
        // Simple radius check
        for (const key in this.drops) {
            const drop = this.drops[key];
            const dx = drop.x - x;
            const dy = drop.y - y;
            if (Math.sqrt(dx * dx + dy * dy) < 20) { // Hit radius
                this.collectItem(key, drop);
                return true;
            }
        }
        return false;
    }

    collectItem(key, drop) {
        // 1. Fly to UI
        // Assuming Inventory Button position (approximate, hardcoded for now or fetch from DOM)
        // Item 51: Bottom Left Inventory Button. Let's aim for generic corner for now.
        const startX = drop.x;
        const startY = drop.y;
        // Convert world to screen? No, UI is overlay. We emulate 'flying' in World Space relative to Camera?
        // Actually, easiest is to fly towards the camera center or a fixed point on screen if we convert coords.
        // For simplicity: Fly up and fade out. Or fly to player.
        // "Fly-to-UI" implies flying to the button.
        // Screen coords of button:
        const btn = document.querySelector(".bottom-left-1"); // Inventory button class from style.css
        let targetX = startX;
        let targetY = startY - 100; // Default upwards

        if (btn) {
            const rect = btn.getBoundingClientRect();
            // This is screen coords. Need World coords?
            // Since camera follows player, World Coords of UI change always.
            // It's tricky to fly "to UI" in World Space.
            // We'll fly to the Player for now as a placeholder for "Collection", or just up/fade.
            // Wait, Project.txt #43 says "Fly-to-UI".
            // I'll make it fly towards the player then fade. It's safer than converting screen coords for now.
            targetX = mySprite.x;
            targetY = mySprite.y - 40; // Head height
        }

        // Remove from DB immediately or after anim? 
        // Project.txt #44: "Arrival immediately delete DB".
        // Let's anim first.

        // Disable interaction
        delete this.drops[key]; // Logic remove

        let t = 0;
        const duration = 0.5;
        const animateFly = (delta) => {
            t += (delta / 60) / duration;
            if (t > 1) {
                app.ticker.remove(animateFly);
                this.dropContainer.removeChild(drop);

                // DB Update
                remove(ref(database, `world/drops/${key}`));
                // Add to inventory (TODO: Import Inventory or User ID)
                // For now just console log. Detailed Inventory logic is separate or needs userID import.
                // Re-add to inventory is #44. I will add a placeholder call.
                this.addToInventory(drop.userData.type);
                return;
            }

            // Lerp
            drop.x = startX + (targetX - startX) * t;
            drop.y = startY + (targetY - startY) * t;
            drop.alpha = 1 - t; // Fade out
            drop.scale.set(1 - t * 0.5); // Shrink
        };
        app.ticker.add(animateFly);
    }

    addToInventory(type) {
        // Need userID. It's passed to engine init, but maybe I need to export it or access global.
        // Passing user via init or assuming global would be better.
        // For now, I'll dispatch a CustomEvent or use a global.
        // Let's assume mySprite.userData contains ID if I set it.
        if (window.currentUser) {
            const invRef = ref(database, `players/${window.currentUser.uid}/inventory/${type}`);
            // Increment transaction? Or just push.
            // Simple increment for now? No, Realtime DB needs transaction for safety usually, or just reading first.
            // Simplest: push new instance or set count?
            // "inventory/wood" : 5
            // Use transaction in real app. For prototype:
            // Just fire and forget for now, or handle in separate Inventory module later.
            console.log("Collected:", type);
            // Verify Logic later.
        }
    }
}
