import { db, ref, set, onValue, onDisconnect, push, update, remove, child } from "./config.js";
import { app, worldContainer, TILE_SIZE, getCurrentMapId } from "./engine.js";
import { Assets } from "./loader.js";
import { Character } from "./character.js";

export const OTHER_PLAYERS = {}; // { uid: { sprite: Character, targetX, targetY } }
let myUid = null;
let lastSentTime = 0;

export function initNetwork(user, localPlayer) {
    myUid = user.uid;
    const playerRef = ref(db, `players/${myUid}`);

    // 1. Set Initial Presence
    set(playerRef, {
        x: localPlayer.x,
        y: localPlayer.y,
        mapId: getCurrentMapId(),
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

                // Update Map ID for visibility
                if (remote.sprite) {
                    remote.sprite.mapId = pData.mapId || "main_world";
                }

                // Chat Check
                if (pData.chat && pData.chatTime > (remote.lastChatTime || 0)) {
                    // Use Character method
                    if (remote.sprite.showChat) {
                        remote.sprite.showChat(pData.chat);
                    }
                    remote.lastChatTime = pData.chatTime;
                }
            }
        }

        // Remove disconnected players
        Object.keys(OTHER_PLAYERS).forEach(uid => {
            if (!data[uid]) {
                // Player gone
                const sprite = OTHER_PLAYERS[uid].sprite;
                if (sprite && sprite.parent) sprite.parent.removeChild(sprite);
                delete OTHER_PLAYERS[uid];
            }
        });
    });

    // 4. Start Interpolation Loop
    app.ticker.add(remoteLoop);
}

export function updateMyPosition(x, y) {
    const now = Date.now();
    if (now - lastSentTime > 100) {
        update(ref(db, `players/${myUid}`), {
            x: Math.round(x),
            y: Math.round(y),
            mapId: getCurrentMapId(),
            timestamp: now
        });
        lastSentTime = now;
    }
}

export function sendChat(message) {
    if (!myUid) return;
    update(ref(db, `players/${myUid}`), {
        chat: message,
        chatTime: Date.now()
    });
}

function spawnRemotePlayer(uid, data) {
    const charData = {
        name: data.name,
        skinColor: data.skin,
        parts: {}
    };
    const sprite = new Character(charData);

    sprite.x = data.x;
    sprite.y = data.y;
    sprite.zIndex = data.y;
    sprite.mapId = data.mapId || "main_world"; // Initial mapId

    // Store
    OTHER_PLAYERS[uid] = {
        sprite: sprite,
        targetX: data.x,
        targetY: data.y,
        lastChatTime: 0
    };

    // Add to Entity Layer
    const entityLayer = worldContainer.getChildByName("entityLayer");
    if (entityLayer) {
        entityLayer.addChild(sprite);
    } else {
        // Fallback if layer not named or found
        worldContainer.addChild(sprite);
    }
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
