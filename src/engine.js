import * as PIXI from "https://cdnjs.cloudflare.com/ajax/libs/pixi.js/7.2.4/pixi.min.mjs";
import { Assets } from "./loader.js";
import { Character } from "./character.js";
import { initCamera } from "./camera.js";
import { initInput } from "./input.js";
import { initNetwork, updateMyPosition } from "./network.js";

// Global App Reference
export let app;
export let worldContainer;
export let mapData = [];
export const TILE_SIZE = 48;

let backgroundLayer;
export let entityLayer; // Export for Network to add others

// Local Player State
let mySprite;
let movePath = []; // Array of {x, y} (Grid Coords)
let isMoving = false;
const MOVE_SPEED = 2; // Pixels per frame * delta

export function initGame(user, characterData) {
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

    // 4. Spawn ME
    spawnPlayer(characterData, user);

    // 5. Init Subsystems
    initCamera(mySprite);
    initInput(mySprite, onMoveRequset);
    initNetwork(user, mySprite);

    // 6. HUD
    document.getElementById("game-hud").classList.remove("hidden");

    // 7. Loop
    app.ticker.add(gameLoop);
    window.addEventListener("resize", onResize);
}

function generateMap(cols, rows) {
    mapData = [];
    backgroundLayer.removeChildren();
    for (let y = 0; y < rows; y++) {
        let row = [];
        for (let x = 0; x < cols; x++) {
            const isWall = (x === 0 || x === cols - 1 || y === 0 || y === rows - 1);
            row.push(isWall ? 1 : 0);
            const texture = isWall ? Assets.textures.tile_wall : Assets.textures.tile_grass;
            const tile = new PIXI.Sprite(texture);
            tile.x = x * TILE_SIZE;
            tile.y = y * TILE_SIZE;
            backgroundLayer.addChild(tile);
        }
        mapData.push(row);
    }
}

function spawnPlayer(charData, user) {
    // Skeletal Character
    mySprite = new Character(charData);

    // Container Logic for Character
    // We already adjust y in animate(), but need base position
    mySprite.x = 5 * TILE_SIZE + 24;
    mySprite.y = 5 * TILE_SIZE + 48;
    mySprite.zIndex = mySprite.y;

    entityLayer.addChild(mySprite);
}

function onMoveRequset(path) {
    // path is Array of {x, y} grid nodes
    // Convert to World Pixels
    movePath = path.map(node => ({
        x: node.x * TILE_SIZE + 24, // Center
        y: node.y * TILE_SIZE + 48  // Bottom Anchor
    }));
    isMoving = true;
}

function gameLoop(delta) {
    // 1. Z-Sort
    entityLayer.children.forEach(child => child.zIndex = child.y);
    entityLayer.sortChildren();

    // 2. Movement Logic
    if (isMoving && movePath.length > 0) {
        const target = movePath[0];
        // Dist
        const dx = target.x - mySprite.x;
        const dy = target.y - mySprite.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < MOVE_SPEED * delta) {
            // Arrived at node
            mySprite.x = target.x;
            mySprite.y = target.y;
            if (movePath.length === 0) isMoving = false;
        } else {
            // Move towards
            mySprite.x += (dx / dist) * MOVE_SPEED * delta;
            mySprite.y += (dy / dist) * MOVE_SPEED * delta;
        }

        // Network Sync
        updateMyPosition(mySprite.x, mySprite.y);
    }

    // Animate Character
    if (mySprite instanceof Character) {
        mySprite.animate(delta, isMoving);
    }
}

function onResize() {
    app.renderer.resize(window.innerWidth, window.innerHeight);
    // Camera center re-calc happens in camera ticker
}
