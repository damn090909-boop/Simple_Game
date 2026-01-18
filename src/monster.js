import { app, worldContainer, TILE_SIZE, entityLayer } from "./engine.js";
import { Assets } from "./loader.js";
import { db, ref, onValue, push, remove } from "./config.js";

const MONSTERS = {};

export function initMonsters() {
    // Listen 'world/monsters'
    onValue(ref(db, "world/monsters"), (snap) => {
        const data = snap.val() || {};

        // Render
        Object.entries(data).forEach(([id, m]) => {
            if (!MONSTERS[id]) {
                spawnMonster(id, m);
            } else {
                // Update pos
                MONSTERS[id].x = m.x;
                MONSTERS[id].y = m.y;
            }
        });

        // Remove dead
    });
}

function spawnMonster(id, data) {
    // Use head_1 as slime placeholder? Or generate new asset?
    // Let's use head_1 tinted Green
    const sprite = new PIXI.Sprite(Assets.textures.head_1);
    sprite.tint = 0x00FF00; // Slime
    sprite.anchor.set(0.5, 1);
    sprite.x = data.x;
    sprite.y = data.y;
    sprite.zIndex = data.y;

    // Interact: Click to Attack
    sprite.eventMode = 'static';
    sprite.on("pointerdown", () => {
        console.log("Attacking monster", id);
        // damage logic
    });

    // Find Entity Layer
    const entityLayer = worldContainer.children.find(c => c.sortableChildren);
    if (entityLayer) entityLayer.addChild(sprite);

    MONSTERS[id] = sprite;
}

// Logic to spawn random monster (admin only?)
export function spawnRandomMonster() {
    push(ref(db, "world/monsters"), {
        type: "slime",
        x: 10 * TILE_SIZE,
        y: 10 * TILE_SIZE,
        hp: 10
    });
}
