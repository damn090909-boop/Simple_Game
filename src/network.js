import { db, ref, set, onValue, onDisconnect, push, update, remove, child } from "./config.js";
import { app, worldContainer, TILE_SIZE } from "./engine.js";
import { Assets } from "./loader.js";
import { showChatBubble } from "./ui.js";

const OTHER_PLAYERS = {}; // { uid: { sprite: PIXI.Container, targetX, targetY } }
let myUid = null;
let lastSentTime = 0;

export function initNetwork(user, localPlayer) {
    myUid = user.uid;
    const playerRef = ref(db, `players/${myUid}`);

    // 1. Set Initial Presence
    set(playerRef, {
        x: localPlayer.x,
        y: localPlayer.y,
        name: user.name,
        skin: user.skinColor || "#ffffff",
        timestamp: Date.now()
    });

    // 2. On Disconnect -> Remove player
    onDisconnect(playerRef).remove();

    // 3. Listen to ALL players
    const allPlayersRef = ref(db, 'players');
    onValue(allPlayersRef, (snapshot) => {
        const data = snapshot.val() || {};

        // Loop through data
        for (const [uid, pData] of Object.entries(data)) {
            if (uid === myUid) continue; // Skip self

            if (!OTHER_PLAYERS[uid]) {
                // Spawn Remote Player
                spawnRemotePlayer(uid, pData);
            } else {
                // Update Target for Interpolation
                const remote = OTHER_PLAYERS[uid];
                remote.targetX = pData.x;
                remote.targetY = pData.y;

                // Chat Check
                if (pData.chat && pData.chatTime > (remote.lastChatTime || 0)) {
                    showChatBubble(remote.sprite, pData.chat);
                    remote.lastChatTime = pData.chatTime;
                }
            }
        }

        // Remove disconnected players
        Object.keys(OTHER_PLAYERS).forEach(uid => {
            if (!data[uid]) {
                // Player gone
                worldContainer.children.map(layer => {
                    // Check children of entity layer... 
                    // Wait, we need access to entityLayer or just remove from parent
                    const sprite = OTHER_PLAYERS[uid].sprite;
                    if (sprite && sprite.parent) sprite.parent.removeChild(sprite);
                });
                delete OTHER_PLAYERS[uid];
            }
        });
    });

    // 4. Start Interpolation Loop
    app.ticker.add(remoteLoop);
}

// Throttle update (100ms)
export function updateMyPosition(x, y) {
    const now = Date.now();
    if (now - lastSentTime > 100) {
        update(ref(db, `players/${myUid}`), {
            x: Math.round(x),
            y: Math.round(y),
            timestamp: now
        });
        lastSentTime = now;
    }
}

function spawnRemotePlayer(uid, data) {
    // Similar to spawnPlayer but for others
    // We need to access entityLayer. 
    // Optimization: export entityLayer from engine.js? Or use worldContainer.children[1] (risky)
    // Let's modify engine.js to export 'addEntity'.
    // For now, assuming worldContainer.getChildAt(1) is entity layer.

    const sprite = new PIXI.Sprite(Assets.textures.body_basic); // Temp
    sprite.anchor.set(0.5, 1.0);
    sprite.tint = 0xAAAAAA; // Gray out others slightly? Or data.skin
    // Tint from hex string? Pixi needs 0x...
    if (data.skin && data.skin.startsWith("#")) {
        sprite.tint = parseInt(data.skin.replace("#", ""), 16);
    }

    sprite.x = data.x;
    sprite.y = data.y;
    sprite.zIndex = data.y;

    // Store
    OTHER_PLAYERS[uid] = {
        sprite: sprite,
        targetX: data.x,
        targetY: data.y
    };

    // Add to Entity Layer
    // We prefer a cleaner way, but for MVP:
    // Try to find the sortable container
    const entityLayer = worldContainer.children.find(c => c.sortableChildren === true);
    if (entityLayer) entityLayer.addChild(sprite);

    // Add Name Tag
    const nameText = new PIXI.Text(data.name, {
        fontSize: 12,
        fill: 0xffffff,
        stroke: 0x000000,
        strokeThickness: 2
    });
    nameText.anchor.set(0.5, 1);
    nameText.y = -35; // Above head
    sprite.addChild(nameText);
}

function remoteLoop(delta) {
    // Lerp other players
    for (const uid in OTHER_PLAYERS) {
        const p = OTHER_PLAYERS[uid];
        // Linear Interpolation: 0.1 factor
        p.sprite.x += (p.targetX - p.sprite.x) * 0.1 * delta;
        p.sprite.y += (p.targetY - p.sprite.y) * 0.1 * delta;
        p.sprite.zIndex = p.sprite.y; // Update depth
    }
}
