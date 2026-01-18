import { app, worldContainer, TILE_SIZE, mapData } from "./engine.js";
import { Assets } from "./loader.js";
import { db, ref, push, onValue } from "./config.js";
import { currentUser } from "./auth.js";

// Interior is 10x10.
// We need to switch 'mapData' when entering interior?
// Engine.js mapData is global.
// Swapping maps isn't implemented in Engine yet.
// For MVP Phase 4, we might skip full interior map swap and just focus on Furniture Logic.

export function initInterior() {
    // Similar to Housing but for furniture
    // furniture_bed, furniture_table
}

export function placeFurniture(type, x, y, interiorID) {
    // push to interiors/{id}/items
}

// Placeholder for full implementation next turn
