import { currentUser } from "./auth.js";
import { db, ref, update, onValue, child, get } from "./config.js";

// State
let shopOpen = false;
let catalog = [
    { id: "furniture_bed", name: "Cozy Bed", basePrice: 100 },
    { id: "furniture_table", name: "Oak Table", basePrice: 80 },
    { id: "wood", name: "Wood Stack", basePrice: 10 }
];

export function initShop() {
    // Add Shop Button to HUD
    const hud = document.querySelector("#game-hud .bottom-bar");
    const shopBtn = document.createElement("button");
    shopBtn.className = "hud-btn";
    shopBtn.innerText = "💰"; // Bag icon
    shopBtn.onclick = toggleShop;
    hud.appendChild(shopBtn);

    // Create Shop UI Modal
    createShopUI();
}

function createShopUI() {
    const modal = document.createElement("div");
    modal.id = "shop-modal";
    modal.className = "modal hidden";
    modal.innerHTML = `
        <div class="modal-content">
            <h2>Daily Shop</h2>
            <div id="shop-timer">Reset in: 12h</div>
            <div id="shop-list" class="shop-list"></div>
            <button onclick="document.getElementById('shop-modal').classList.add('hidden')">Close</button>
        </div>
    `;
    document.body.appendChild(modal);
}

function toggleShop() {
    const modal = document.getElementById("shop-modal");
    if (modal.classList.contains("hidden")) {
        modal.classList.remove("hidden");
        refreshShopList();
    } else {
        modal.classList.add("hidden");
    }
}

function refreshShopList() {
    const list = document.getElementById("shop-list");
    list.innerHTML = "";

    // Daily Logic: Price Multiplier based on Day
    // Day = Math.floor(Date.now() / 86400000)
    const day = Math.floor(Date.now() / 86400000);
    // Pseudo-random based on day
    const randomSeed = Math.sin(day) * 10000;

    catalog.forEach(item => {
        // Price fluctuations +/- 20%
        const noise = ((Math.sin(randomSeed + item.basePrice) + 1) / 2) * 0.4 - 0.2; // -0.2 to 0.2
        const price = Math.floor(item.basePrice * (1 + noise));

        const card = document.createElement("div");
        card.className = "shop-item";
        card.innerHTML = `
            <span>${item.name}</span>
            <span>${price} G</span>
            <button class="buy-btn">Buy</button>
        `;

        card.querySelector(".buy-btn").onclick = () => buyItem(item, price);
        list.appendChild(card);
    });
}

async function buyItem(item, price) {
    if (!currentUser) return;

    if (confirm(`Buy ${item.name} for ${price} G?`)) {
        // In real app, check balance.
        // For MVP, just add to inventory (we assume infinite money or credit).
        // Let's deduct from 'gold' if exists, else init 1000.

        const userRef = ref(db, `users/${currentUser.uid}`);
        const snap = await get(userRef);
        const data = snap.val();
        let gold = data.gold || 1000; // Starter money

        if (gold >= price) {
            gold -= price;
            // Add item
            // inventory: list or object logic
            const invRef = child(ref(db), `users/${currentUser.uid}/inventory`);
            // push new item
            // or count?
            // Simple push for unique items
            await update(userRef, { gold: gold });

            // Allow duplicates in inventory
            // We push { itemId, timestamp }
            // Actually inventory structure wasn't strictly defined.
            // Let's just push to 'inventory' list.
            const newInvRef = push(ref(db, `users/${currentUser.uid}/inventory`));
            await set(newInvRef, { itemId: item.id, acquired: Date.now() });

            alert(`Bought ${item.name}! Remaining: ${gold} G`);
        } else {
            alert("Not enough Gold!");
        }
    }
}
