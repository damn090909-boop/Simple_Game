import * as PIXI from "https://cdnjs.cloudflare.com/ajax/libs/pixi.js/7.2.4/pixi.min.mjs";
import { app, worldContainer, TILE_SIZE, mySprite, entityLayer, updateCurrentMapId, generateMap, mapData } from "./engine.js";
import { Assets } from "./loader.js";
import { db, ref, get, update, set } from "./config.js";

export class RentalSystem {
    constructor() {
        this.innSprite = null;
        this.rentalPopup = null;
        this.initInn();
    }

    initInn() {
        // Place a fixed Inn building at (15, 5)
        const x = 15;
        const y = 5;

        // Visual
        const texture = Assets.textures.building_house_01 || PIXI.Texture.WHITE;
        this.innSprite = new PIXI.Sprite(texture);
        this.innSprite.width = 3 * TILE_SIZE;
        this.innSprite.height = 3 * TILE_SIZE;
        this.innSprite.x = x * TILE_SIZE;
        this.innSprite.y = y * TILE_SIZE;
        this.innSprite.tint = 0x8A2BE2; // Violet Tint for Inn
        this.innSprite.zIndex = (y + 3) * TILE_SIZE; // Sort by bottom

        entityLayer.addChild(this.innSprite);

        this.applyCollision();
    }

    applyCollision() {
        const x = 15;
        const y = 5;
        if (mapData) {
            for (let dy = 0; dy < 3; dy++) {
                for (let dx = 0; dx < 3; dx++) {
                    if (mapData[y + dy] && mapData[y + dy][x + dx] !== undefined) {
                        mapData[y + dy][x + dx] = 1;
                    }
                }
            }
        }
    }

    checkTap(x, y) {
        if (!this.innSprite) return false;

        const s = this.innSprite;
        // Check 3x3 area
        if (x >= s.x && x <= s.x + s.width &&
            y >= s.y && y <= s.y + s.height) {

            // Distance Check
            const dist = Math.sqrt(Math.pow(s.x + s.width / 2 - mySprite.x, 2) + Math.pow(s.y + s.height - mySprite.y, 2)); // Approx center/base
            if (dist < TILE_SIZE * 4) {
                this.showRentalPopup();
            } else {
                console.log("Too far from Inn!");
            }
            return true;
        }
        return false;
    }

    showRentalPopup() {
        if (document.getElementById("rental-popup")) return;

        const div = document.createElement("div");
        div.id = "rental-popup";
        div.className = "modal active";
        div.innerHTML = `
            <div class="modal-content">
                <button class="close-modal-btn">X</button>
                <h2>🛏️ Village Inn</h2>
                <p>Rent a room to set your spawn point here?</p>
                <div class="price-info">Cost: 100 G / Day</div>
                <br>
                <button id="rent-btn" class="action-btn">Rent Room (100 G)</button>
            </div>
        `;
        document.body.appendChild(div);

        div.querySelector(".close-modal-btn").onclick = () => div.remove();
        div.querySelector("#rent-btn").onclick = () => this.rentRoom(div);
    }

    async rentRoom(modalCtx) {
        if (!window.currentUser) return;
        const uid = window.currentUser.uid;

        // Check Gold
        const walletRef = ref(db, `players/${uid}/wallet/gold`);
        const snap = await get(walletRef);
        const gold = snap.val() || 0;

        if (gold >= 100) {
            const now = Date.now();
            const oneDay = 24 * 60 * 60 * 1000;

            // Deduct Gold
            await update(ref(db, `players/${uid}/wallet`), { gold: gold - 100 });

            // Set Spawn Point
            // We use a special mapId 'inn_room_${uid}' or just coordinates in main_world?
            // Project.txt 82 says "Spawn point changes to Inn Room".
            // Let's create a virtual room ID.

            const spawnData = {
                x: 5 * TILE_SIZE, // Center of room
                y: 5 * TILE_SIZE,
                mapId: `inn_room_${uid}`,
                expiresAt: now + oneDay
            };

            await set(ref(db, `players/${uid}/spawnPoint`), spawnData);

            alert("Room Rented! Spawn point updated for 24 hours.");
            modalCtx.remove();

            // Explicitly teleport there now?
            // "골드 지불 시 스폰 포인트가 여관방으로 변경되고..."
            // Usually implies next login/respawn. But let's offer to move now.
            if (confirm("Move to your room now?")) {
                this.teleportToRoom(spawnData.mapId);
            }

        } else {
            alert("Not enough Gold!");
        }
    }

    teleportToRoom(roomMapId) {
        // Use engine helpers
        // Update Map ID
        updateCurrentMapId(roomMapId);

        // Generate Interior Map
        generateMap(10, 10, "interior");

        // Move Player
        mySprite.x = 5 * TILE_SIZE;
        mySprite.y = 5 * TILE_SIZE;

        // Network Sync happens automatically via updateMyPosition in gameLoop (checking changed x/y/mapId)
    }
}
