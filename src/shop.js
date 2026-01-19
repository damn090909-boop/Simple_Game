import * as PIXI from "https://cdnjs.cloudflare.com/ajax/libs/pixi.js/7.2.4/pixi.min.mjs";
import { app, worldContainer, TILE_SIZE, mySprite } from "./engine.js";
import { Assets } from "./loader.js";
import { db, ref, get, set, update, onValue, remove } from "./config.js";

export class ShopSystem {
    constructor() {
        this.shopSprite = null;
        this.uiContainer = null;
        this.isOpen = false;
        this.prices = {};
        this.basePrices = {
            wood: 10,
            stone: 15
        };
        this.multiplier = 1.0;

        this.init();
    }

    async init() {
        // 1. Place Shop Building at (10, 10)
        this.shopSprite = new PIXI.Sprite(Assets.textures.building_house_01); // Reuse house asset or placeholder
        this.shopSprite.anchor.set(0.5, 1);
        this.shopSprite.x = 10 * TILE_SIZE + TILE_SIZE / 2;
        this.shopSprite.y = 10 * TILE_SIZE + TILE_SIZE;
        this.shopSprite.zIndex = this.shopSprite.y;
        this.shopSprite.tint = 0xFFD700; // Gold tint to distinguish
        worldContainer.getChildByName("entityLayer")?.addChild(this.shopSprite) || worldContainer.addChild(this.shopSprite);

        // 2. Setup Daily Seed / Prices
        await this.updateDailyPrices();
    }

    async updateDailyPrices() {
        // C-5 Item 46: server/daily_seed
        // For prototype, we generate seed from Date string if not present
        const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
        const seedRef = ref(db, 'server/daily_seed');

        get(seedRef).then(async snapshot => {
            let seed = snapshot.val();
            if (!seed || seed.date !== today) {
                // Generate new seed
                seed = { date: today, value: Math.random() };
                await set(seedRef, seed);
            }

            // Calculate Multiplier: 0.8 ~ 1.3
            // Use seed.value (0-1)
            this.multiplier = 0.8 + (seed.value * 0.5);
            console.log("Today's Price Multiplier:", this.multiplier.toFixed(2));

            // Apply to prices
            for (const [item, price] of Object.entries(this.basePrices)) {
                this.prices[item] = Math.floor(price * this.multiplier);
            }
        });
    }

    checkTap(x, y) {
        if (!this.shopSprite) return false;

        // Bounds check
        const s = this.shopSprite;
        if (x >= s.x - s.width / 2 && x <= s.x + s.width / 2 &&
            y >= s.y - s.height && y <= s.y) {

            // Distance check
            const dist = Math.sqrt(Math.pow(s.x - mySprite.x, 2) + Math.pow(s.y - mySprite.y, 2));
            if (dist < TILE_SIZE * 3) {
                this.openShop();
            } else {
                console.log("Too far to trade!");
                // Optional: visual feedback
            }
            return true;
        }
        return false;
    }

    openShop() {
        if (this.isOpen) return;
        this.isOpen = true;
        this.createShopUI();
    }

    createShopUI() {
        // Create HTML Modal overlay
        const modal = document.createElement("div");
        modal.id = "shop-modal";
        modal.className = "modal active";

        // Modal Content
        modal.innerHTML = `
            <div class="modal-content shop-content">
                <button class="close-modal-btn">X</button>
                <h2>🏘️ Village Shop</h2>
                <div class="shop-tabs">
                    <button id="tab-buy" class="active">Buy</button>
                    <button id="tab-sell">Sell</button>
                </div>
                <div class="price-info">
                    Today's Market: <span style="color: ${this.multiplier >= 1 ? '#4CAF50' : '#F44336'}">
                        ${(this.multiplier * 100).toFixed(0)}%
                    </span>
                </div>
                <div id="shop-items-container" class="shop-items"></div>
                <div class="wallet-display">💰 Gold: <span id="player-gold">...</span></div>
            </div>
        `;

        document.body.appendChild(modal);

        // Styling via JS for now (or append to style.css later)
        // I will add to style.css via a separate tool call for cleanliness, 
        // but for now relying on existing modal classes and adding inline/specifics here if needed.

        // Event Listeners
        modal.querySelector(".close-modal-btn").onclick = () => this.closeShop();

        const tabBuy = modal.querySelector("#tab-buy");
        const tabSell = modal.querySelector("#tab-sell");

        tabBuy.onclick = () => {
            tabBuy.classList.add("active");
            tabSell.classList.remove("active");
            this.renderItems("buy");
        };

        tabSell.onclick = () => {
            tabSell.classList.add("active");
            tabBuy.classList.remove("active");
            this.renderItems("sell");
        };

        // Start with Buy
        this.renderItems("buy");
        this.updateGoldDisplay();
    }

    async updateGoldDisplay() {
        if (!window.currentUser) return;
        const goldEl = document.getElementById("player-gold");
        if (goldEl) {
            const snap = await get(ref(db, `players/${window.currentUser.uid}/wallet/gold`));
            goldEl.textContent = snap.val() || 0;
        }
    }

    async renderItems(mode) {
        const container = document.getElementById("shop-items-container");
        container.innerHTML = "";

        if (mode === "buy") {
            for (const [item, price] of Object.entries(this.prices)) {
                const el = this.createItemRow(item, price, "Buy");
                el.onclick = () => this.buyItem(item, price);
                container.appendChild(el);
            }
        } else {
            // Sell - need inventory
            if (!window.currentUser) return;
            const invSnap = await get(ref(db, `players/${window.currentUser.uid}/inventory`));
            const inventory = invSnap.val() || {};

            for (const [item, count] of Object.entries(inventory)) {
                if (this.prices[item]) {
                    const price = Math.floor(this.prices[item] * 0.8); // Sell for less? Or same? Project txt says "Sell immediate gold increase". Usually sell < buy. Let's do 100% of 'current market value' for simplicity or 80%.
                    // Let's stick to current calculated price to keep it simple, or maybe slightly lower.
                    // Project.txt doesn't specify spread. Let's use same price for now (fair trade) or -10%.
                    // Let's use Full Price for user satisfaction in this simple game.
                    const el = this.createItemRow(item, this.prices[item], `Sell (x${count})`);
                    el.onclick = () => this.sellItem(item, this.prices[item]);
                    container.appendChild(el);
                }
            }
        }
    }

    createItemRow(name, price, actionLabel) {
        const div = document.createElement("div");
        div.className = "shop-item-row";
        div.innerHTML = `
            <div class="item-icon item-${name}"></div>
            <div class="item-name">${name.toUpperCase()}</div>
            <div class="item-price">💰 ${price}</div>
            <button class="item-action-btn">${actionLabel}</button>
        `;
        return div;
    }

    closeShop() {
        const modal = document.getElementById("shop-modal");
        if (modal) modal.remove();
        this.isOpen = false;
    }

    async buyItem(item, price) {
        if (!window.currentUser) return;
        const uid = window.currentUser.uid;

        // Transaction
        // 1. Check Gold
        const goldRef = ref(db, `players/${uid}/wallet/gold`);
        const invRef = ref(db, `players/${uid}/inventory/${item}`);

        const goldSnap = await get(goldRef);
        const currentGold = goldSnap.val() || 0;

        if (currentGold >= price) {
            // Execute
            await update(ref(db, `players/${uid}/wallet`), { gold: currentGold - price });

            // Add Inventory
            const invSnap = await get(invRef);
            await set(invRef, (invSnap.val() || 0) + 1);

            alert(`Bought ${item}!`);
            this.updateGoldDisplay();
            this.renderItems("buy"); // Refresh
        } else {
            alert("Not enough Gold!");
        }
    }

    async sellItem(item, price) {
        if (!window.currentUser) return;
        const uid = window.currentUser.uid;

        const invRef = ref(db, `players/${uid}/inventory/${item}`);
        const goldRef = ref(db, `players/${uid}/wallet/gold`);

        const invSnap = await get(invRef);
        const count = invSnap.val() || 0;

        if (count > 0) {
            // Execute
            if (count === 1) {
                await remove(invRef);
            } else {
                await set(invRef, count - 1);
            }

            const goldSnap = await get(goldRef);
            await set(goldRef, (goldSnap.val() || 0) + price);

            alert(`Sold ${item}!`);
            this.updateGoldDisplay();
            this.renderItems("sell"); // Refresh list
        }
    }
}
