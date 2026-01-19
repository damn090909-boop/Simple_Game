import * as PIXI from "https://cdnjs.cloudflare.com/ajax/libs/pixi.js/7.2.4/pixi.min.mjs";
import { Assets } from "./loader.js";
import { Character } from "./character.js";
import { initCamera } from "./camera.js";
import { initInput, getInputVector } from "./input.js";
import { initNetwork, updateMyPosition } from "./network.js";
import { initHUD } from "./ui.js";
import { ItemManager } from "./item_manager.js";
import { Environment } from "./environment.js";
import { ActionSystem } from "./interaction.js";
import { TradeSystem } from "./trade.js";
import { HousingSystem } from "./housing.js";
import { RentalSystem } from "./housing_rental.js";
import { PortalSystem } from "./portal.js";
import { RPGSystem } from "./rpg_core.js";
import { MonsterManager } from "./monster_manager.js";
import { findPath } from "./pathfinder.js";
import { db, ref, get } from "./config.js";

// Global App Reference
export let app;
export let worldContainer;
export let mapData = [];
export const TILE_SIZE = 48;
let backgroundLayer;
export let entityLayer;

// Local Player State
export let mySprite;
let movePath = [];
let isMoving = false;
const MOVE_SPEED = 2;

// Map State
let currentMapId = "main_world";

// System Instances (Module Scope for access)
let itemManager;
let env;
let shopSystem;
let interactionSystem;
let tradeSystem;
let portalSystem;
let housingSystem;
let rpgSystem;
let monsterManager;

export function getCurrentMapId() {
    return currentMapId;
}

export function updateCurrentMapId(id) {
    currentMapId = id;
    console.log("Current Map changed to:", id);
}

export async function initGame(user, characterData) {
    console.log("Initializing Engine for", characterData.name);

    // 1. Setup Pixi Application
    app = new PIXI.Application({
        width: window.innerWidth,
        height: window.innerHeight,
        backgroundColor: 0x1a1a1a,
        antialias: false,
        resolution: window.devicePixelRatio || 1,
        autoDensity: true
    });
    PIXI.BaseTexture.defaultOptions.scaleMode = PIXI.SCALE_MODES.NEAREST;
    document.getElementById("game-container").appendChild(app.view);

    // 2. Hierarchy
    worldContainer = new PIXI.Container();
    backgroundLayer = new PIXI.Container();
    entityLayer = new PIXI.Container();
    entityLayer.sortableChildren = true;

    worldContainer.addChild(backgroundLayer);
    worldContainer.addChild(entityLayer);
    app.stage.addChild(worldContainer);

    // 3. Map
    generateMap(20, 20);

    // 4. Spawn ME (Async Wait)
    await spawnPlayer(characterData, user);

    // 5. Init Subsystems
    initCamera(mySprite);

    itemManager = new ItemManager();
    env = new Environment(itemManager);
    shopSystem = new ShopSystem();
    interactionSystem = new InteractionSystem(); // Handles P2P checks
    tradeSystem = new TradeSystem(user.uid); // Pass UID if needed
    portalSystem = new PortalSystem();
    housingSystem = new HousingSystem(portalSystem);
    const rentalSystem = new RentalSystem();

    rpgSystem = new RPGSystem(user.uid, mySprite);
    monsterManager = new MonsterManager(rpgSystem);

    // Expose for Debug
    window.game = {
        app, worldContainer, mySprite,
        itemManager, env, shopSystem, interactionSystem, tradeSystem, portalSystem, housingSystem, rentalSystem,
        rpgSystem, monsterManager
    };

    // 6. Input & Network
    initInput(mySprite, onMoveRequest, handleTap);
    initNetwork(user, mySprite);

    // 7. HUD
    document.getElementById("game-hud").classList.remove("hidden");
    initHUD();

    // 8. Event Listeners
    window.addEventListener("playerFainted", onPlayerFainted);
    window.addEventListener("resize", onResize);

    // 9. Start Loop
    app.ticker.add(gameLoop);
}

// Tap Handler
const handleTap = (screenX, screenY) => {
    // Convert Screen to World
    const globalPoint = new PIXI.Point(screenX, screenY);
    const worldPoint = worldContainer.toLocal(globalPoint);
    console.log("Tap at World:", worldPoint.x, worldPoint.y);

    // Priority Order
    if (housingSystem.isBuildMode) return; // Build handled by pointerdown usually, but safe check
    if (interactionSystem.checkTap(worldPoint.x, worldPoint.y)) return; // P2P
    if (monsterManager.checkTap(worldPoint.x, worldPoint.y)) return; // Combat
    if (shopSystem.checkTap(worldPoint.x, worldPoint.y)) return; // Shop
    if (itemManager.checkTap(worldPoint.x, worldPoint.y)) return; // Item Pickup
    if (env.checkTap(worldPoint.x, worldPoint.y)) return; // Resource
    if (portalSystem.checkTap(worldPoint.x, worldPoint.y)) return; // Portal

    // Move
    const startX = Math.floor(mySprite.x / TILE_SIZE);
    const startY = Math.floor((mySprite.y - 1) / TILE_SIZE);
    const endX = Math.floor(worldPoint.x / TILE_SIZE);
    const endY = Math.floor(worldPoint.y / TILE_SIZE);

    showRipple(worldPoint.x, worldPoint.y);

    if (startX === endX && startY === endY) return;

    const path = findPath(startX, startY, endX, endY);
    if (path) {
        onMoveRequest(path);
    }
};

function gameLoop(delta) {
    // Subsystem Updates
    if (monsterManager) monsterManager.update(delta);
    if (env) env.update(delta);

    // Z-Sort & Map Filtering
    if (entityLayer) {
        // ...
        // ... inside handleMovement joystick logic:
        // Simple Wall Collision (Center point)
        const feetGridX = Math.floor(nextX / TILE_SIZE);
        const feetGridY = Math.floor((nextY - 1) / TILE_SIZE);

        // Bounds Check
        if (feetGridY >= 0 && feetGridY < mapData.length && feetGridX >= 0 && feetGridX < mapData[0].length) {
            // Wall Check (mapData[y][x] === 1 is wall)
            const isWall = mapData[feetGridY][feetGridX] === 1;
            // Env Check
            const isResource = env.checkCollision(nextX, nextY); // passing world coords

            if (!isWall && !isResource) {
                mySprite.x = nextX;
                mySprite.y = nextY;
            }
        }
        entityLayer.children.forEach(child => {
            child.zIndex = child.y;

            const entityMap = child.mapId || "main_world";
            if (child === mySprite) {
                child.visible = true;
            } else {
                child.visible = (entityMap === currentMapId);
            }
        });
        entityLayer.sortChildren();
    }

    // Movement Logic
    handleMovement(delta);

    // Animate Character
    if (mySprite instanceof Character) {
        mySprite.animate(delta, isMoving);
    }
}

function handleMovement(delta) {
    if (isMoving && movePath.length > 0) {
        // Pathfinding Move
        const target = movePath[0];
        const dx = target.x - mySprite.x;
        const dy = target.y - mySprite.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dx < 0) mySprite.scale.x = -1;
        else if (dx > 0) mySprite.scale.x = 1;

        if (dist < MOVE_SPEED * delta) {
            mySprite.x = target.x;
            mySprite.y = target.y;
            movePath.shift();
            if (movePath.length === 0) isMoving = false;
        } else {
            mySprite.x += (dx / dist) * MOVE_SPEED * delta;
            mySprite.y += (dy / dist) * MOVE_SPEED * delta;
        }
        updateMyPosition(mySprite.x, mySprite.y);
    } else {
        // Joystick Move
        const joy = getInputVector();
        if (joy && (Math.abs(joy.x) > 0.1 || Math.abs(joy.y) > 0.1)) {
            isMoving = true;
            const nextX = mySprite.x + joy.x * MOVE_SPEED * delta;
            const nextY = mySprite.y + joy.y * MOVE_SPEED * delta;

            if (joy.x < -0.1) mySprite.scale.x = -1;
            else if (joy.x > 0.1) mySprite.scale.x = 1;

            const feetGridX = Math.floor(nextX / TILE_SIZE);
            const feetGridY = Math.floor((nextY - 1) / TILE_SIZE);

            if (feetGridY >= 0 && feetGridY < mapData.length && feetGridX >= 0 && feetGridX < mapData[0].length) {
                if (mapData[feetGridY][feetGridX] === 0) {
                    mySprite.x = nextX;
                    mySprite.y = nextY;
                }
            }
            updateMyPosition(mySprite.x, mySprite.y);
        } else if (!isMoving && movePath.length === 0) {
            isMoving = false;
        }
    }
}

function onMoveRequest(path) {
    movePath = path.map(node => ({
        x: node.x * TILE_SIZE + 24,
        y: node.y * TILE_SIZE + 48
    }));
    isMoving = true;
}

export function movePlayerTo(gridX, gridY) {
    const startX = Math.floor(mySprite.x / TILE_SIZE);
    const startY = Math.floor((mySprite.y - 1) / TILE_SIZE);
    const path = findPath(startX, startY, gridX, gridY);
    if (path) {
        onMoveRequest(path);
    }
}

async function spawnPlayer(charData, user) {
    mySprite = new Character(charData);
    mySprite.x = 10 * TILE_SIZE; // Default Well
    mySprite.y = 10 * TILE_SIZE;
    mySprite.zIndex = mySprite.y;
    entityLayer.addChild(mySprite);

    // Check saved spawn point
    try {
        const snap = await get(ref(db, `players/${user.uid}/spawnPoint`));
        const spawn = snap.val();
        if (spawn && spawn.expiresAt > Date.now()) {
            console.log("Restoring Spawn Point:", spawn);
            updateCurrentMapId(spawn.mapId || "main_world");

            // If map is different, generate it
            if (currentMapId.startsWith("inn_room")) {
                generateMap(10, 10, "interior");
            }

            mySprite.x = spawn.x;
            mySprite.y = spawn.y;
        }
    } catch (e) {
        console.error("Spawn Point Error:", e);
    }
}

// ...

function onPlayerFainted() {
    console.log("Respawning...");
    // ... Fade logic ...
    const fade = new PIXI.Graphics();
    fade.beginFill(0x000000);
    fade.drawRect(0, 0, app.screen.width, app.screen.height);
    fade.endFill();
    fade.alpha = 0;
    fade.zIndex = 9999999;
    app.stage.addChild(fade);

    let phase = 0;
    let t = 0;

    const respawnAnim = async (delta) => {
        if (phase === 0) {
            fade.alpha += 0.05 * delta;
            if (fade.alpha >= 1) {
                phase = 1;

                // Reset Logic moved here
                // Check Spawn Point
                let targetX = 10 * TILE_SIZE;
                let targetY = 10 * TILE_SIZE;
                let targetMap = "main_world";

                if (window.currentUser) {
                    try {
                        const snap = await get(ref(db, `players/${window.currentUser.uid}/spawnPoint`));
                        const spawn = snap.val();
                        if (spawn && spawn.expiresAt > Date.now()) {
                            targetX = spawn.x;
                            targetY = spawn.y;
                            targetMap = spawn.mapId;
                        } else {
                            // Expired or none
                            console.log("Spawn point expired or default.");
                        }
                    } catch (e) { console.error(e); }
                }

                mySprite.x = targetX;
                mySprite.y = targetY;

                if (targetMap !== currentMapId) {
                    updateCurrentMapId(targetMap);
                    // generateMap based on type
                    const type = targetMap.startsWith("inn_room") ? "interior" : "world";
                    generateMap(type === "interior" ? 10 : 20, type === "interior" ? 10 : 20, type);
                } else {
                    // Just reset camera usually handled by update
                }

                rpgSystem.stats.hp = rpgSystem.stats.maxHp;
                rpgSystem.saveStats();
                rpgSystem.updateVisuals();
            }
        } else if (phase === 1) {
            t += delta;
            if (t > 180) phase = 2; // ~3s
        } else {
            fade.alpha -= 0.05 * delta;
            if (fade.alpha <= 0) {
                fade.destroy();
                app.ticker.remove(respawnAnim);
            }
        }
    };
    app.ticker.add(respawnAnim);
}

export function generateMap(cols, rows, type = "world") {
    mapData = [];
    backgroundLayer.removeChildren();

    let floorTex = Assets.textures.tile_grass;
    let wallTex = Assets.textures.tile_wall;

    if (type === "interior") {
        floorTex = PIXI.Texture.WHITE;
        wallTex = PIXI.Texture.WHITE;
    }

    for (let y = 0; y < rows; y++) {
        let row = [];
        for (let x = 0; x < cols; x++) {
            const isWall = (x === 0 || x === cols - 1 || y === 0 || y === rows - 1);
            row.push(isWall ? 1 : 0);

            const texture = isWall ? wallTex : floorTex;
            const tile = new PIXI.Sprite(texture);
            tile.x = x * TILE_SIZE;
            tile.y = y * TILE_SIZE;

            if (type === "interior") {
                tile.tint = isWall ? 0xCCCCCC : 0xD2691E;
                if (x === 5 && y === 9) tile.tint = 0xFF0000;
            }
            backgroundLayer.addChild(tile);
        }
        mapData.push(row);
    }

    // Reapply collisions if systems exist
    if (window.game) {
        if (window.game.rentalSystem) window.game.rentalSystem.applyCollision();
        if (window.game.housingSystem) window.game.housingSystem.reapplyCollisions();
    }
}

function showRipple(x, y) {
    const ripple = new PIXI.Graphics();
    ripple.lineStyle(2, 0xFFFFFF, 0.7);
    ripple.drawCircle(0, 0, 10);
    ripple.x = x;
    ripple.y = y;
    ripple.zIndex = 9999;
    worldContainer.addChild(ripple);

    let scale = 1;
    let alpha = 0.7;
    const animateRipple = (delta) => {
        scale += 0.1 * delta;
        alpha -= 0.03 * delta;
        ripple.scale.set(scale);
        ripple.alpha = alpha;
        if (alpha <= 0) {
            ripple.destroy();
            app.ticker.remove(animateRipple);
        }
    };
    app.ticker.add(animateRipple);
}


function onResize() {
    app.renderer.resize(window.innerWidth, window.innerHeight);
}
