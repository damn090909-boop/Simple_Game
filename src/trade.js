import { db, ref, set, update, onValue, remove, push, child, get } from "./config.js";
import { app } from "./engine.js";

export class TradeSystem {
    constructor() {
        this.currentSessionId = null;
        this.myUid = null;
        this.otherUid = null;
        this.isCreator = false;

        this.myOffer = { gold: 0, items: {} };
        this.theirOffer = { gold: 0, items: {} };

        this.myStatus = "editing"; // editing, locked, confirmed
        this.theirStatus = "editing";
    }

    init(user) {
        this.myUid = user.uid;

        // Listen for requests (Method A: Check players/{myUid}/tradeRequest)
        // Or Method B: Check 'trades' where 'to' == myUid
        const playerRef = ref(db, `players/${this.myUid}/tradeRequest`);
        onValue(playerRef, (snap) => {
            const req = snap.val();
            if (req) {
                if (confirm(`Trade Request from ${req.fromName}. Accept?`)) {
                    this.acceptTrade(req.sessionId, req.fromUid);
                } else {
                    // Reject -> Remove request
                    remove(playerRef);
                }
            }
        });
    }

    requestTrade(targetUid) {
        if (this.myUid === targetUid) return;

        const sessionId = "trade_" + Date.now();
        this.currentSessionId = sessionId;
        this.otherUid = targetUid;
        this.isCreator = true;

        // Create Session
        const tradeRef = ref(db, `trades/${sessionId}`);
        set(tradeRef, {
            users: {
                [this.myUid]: { status: "editing", offer: {} },
                [targetUid]: { status: "editing", offer: {} }
            },
            state: "active"
        });

        // Send Notify
        const targetRef = ref(db, `players/${targetUid}/tradeRequest`);
        // We know our name... we should store it. Assume global or fetch.
        // For now simple string.
        set(targetRef, {
            fromUid: this.myUid,
            fromName: "Player", // TODO: Get real name
            sessionId: sessionId,
            timestamp: Date.now()
        });

        this.openTradeUI();
        this.watchSession(sessionId);
    }

    acceptTrade(sessionId, fromUid) {
        this.currentSessionId = sessionId;
        this.otherUid = fromUid;
        this.isCreator = false;

        // Clear request
        remove(ref(db, `players/${this.myUid}/tradeRequest`));

        this.openTradeUI();
        this.watchSession(sessionId);
    }

    watchSession(sessionId) {
        const tradeRef = ref(db, `trades/${sessionId}`);
        onValue(tradeRef, (snap) => {
            const data = snap.val();
            if (!data) {
                // Closed
                this.closeTradeUI();
                return;
            }

            const myData = data.users[this.myUid];
            const theirData = data.users[this.otherUid];

            this.items = myData.offer || {};
            this.theirOffer = theirData.offer || {};

            this.myStatus = myData.status;
            this.theirStatus = theirData.status;

            this.updateUI();

            if (this.myStatus === "confirmed" && this.theirStatus === "confirmed") {
                this.executeTrade(data);
            }
        });
    }

    openTradeUI() {
        // Create HTML Modal
        let modal = document.getElementById("trade-modal");
        if (!modal) {
            modal = document.createElement("div");
            modal.id = "trade-modal";
            modal.className = "modal active";
            document.body.appendChild(modal);
        }
        modal.classList.remove("hidden");

        modal.innerHTML = `
            <div class="modal-content trade-content">
                <h2>🤝 Trade</h2>
                <div class="trade-columns">
                    <div class="trade-col" id="my-offer-col">
                        <h3>My Offer</h3>
                        <div class="offer-list" id="my-offer-list"></div>
                        <div class="offer-controls">
                            <button onclick="window.gameTrade.addItem('wood')">+ Wood</button>
                            <button onclick="window.gameTrade.addItem('stone')">+ Stone</button>
                            <div class="gold-input">
                                💰 <input type="number" id="trade-gold-input" value="0" style="width:50px">
                            </div>
                        </div>
                        <div class="status-indicator" id="my-status">Editing</div>
                        <button id="btn-lock-my">Lock Offer</button>
                    </div>
                    <div class="trade-col" id="their-offer-col">
                        <h3>Their Offer</h3>
                        <div class="offer-list" id="their-offer-list"></div>
                        <div class="status-indicator" id="their-status">Editing</div>
                    </div>
                </div>
                <button id="btn-cancel-trade" style="background:#F44336; margin-top:10px;">Cancel Trade</button>
            </div>
        `;

        // Expose helper
        window.gameTrade = this;

        // Inputs
        const goldIn = document.getElementById("trade-gold-input");
        goldIn.onchange = () => this.setGold(parseInt(goldIn.value));

        document.getElementById("btn-lock-my").onclick = () => this.toggleLock();
        document.getElementById("btn-cancel-trade").onclick = () => this.cancelTrade();

        this.updateUI();
    }

    updateUI() {
        const modal = document.getElementById("trade-modal");
        if (!modal || modal.classList.contains("hidden")) return;

        // Render My List
        this.renderList("my-offer-list", this.myOffer);
        this.renderList("their-offer-list", this.theirOffer);

        // Status Text
        document.getElementById("my-status").innerText = this.myStatus.toUpperCase();
        document.getElementById("their-status").innerText = this.theirStatus.toUpperCase();

        // Button State
        const btnLock = document.getElementById("btn-lock-my");
        if (this.myStatus === "editing") {
            btnLock.innerText = "Lock Offer";
            btnLock.disabled = false;
        } else if (this.myStatus === "locked") {
            btnLock.innerText = "Confirm Trade";
            if (this.theirStatus === "locked" || this.theirStatus === "confirmed") {
                btnLock.disabled = false;
            } else {
                btnLock.innerText = "Waiting for Partner...";
                btnLock.disabled = true;
            }
        } else if (this.myStatus === "confirmed") {
            btnLock.innerText = "Confirmed!";
            btnLock.disabled = true;
        }
    }

    renderList(elementId, offerData) {
        const el = document.getElementById(elementId);
        if (!el) return;
        let html = "";
        if (offerData.gold) html += `<div>💰 Gold: ${offerData.gold}</div>`;
        if (offerData.items) {
            for (const [k, v] of Object.entries(offerData.items)) {
                if (v > 0) html += `<div>📦 ${k}: ${v}</div>`;
            }
        }
        el.innerHTML = html;
    }

    addItem(item) {
        if (this.myStatus !== "editing") return;
        if (!this.myOffer.items) this.myOffer.items = {};
        this.myOffer.items[item] = (this.myOffer.items[item] || 0) + 1;
        this.syncOffer();
    }

    setGold(amount) {
        if (this.myStatus !== "editing") return;
        this.myOffer.gold = amount;
        this.syncOffer();
    }

    syncOffer() {
        update(ref(db, `trades/${this.currentSessionId}/users/${this.myUid}`), {
            offer: this.myOffer
        });
    }

    toggleLock() {
        if (this.myStatus === "editing") {
            update(ref(db, `trades/${this.currentSessionId}/users/${this.myUid}`), { status: "locked" });
        } else if (this.myStatus === "locked") {
            update(ref(db, `trades/${this.currentSessionId}/users/${this.myUid}`), { status: "confirmed" });
        }
    }

    cancelTrade() {
        if (this.currentSessionId) {
            remove(ref(db, `trades/${this.currentSessionId}`));
        }
        this.closeTradeUI();
    }

    closeTradeUI() {
        const modal = document.getElementById("trade-modal");
        if (modal) modal.remove();
        this.currentSessionId = null;
    }

    async executeTrade(tradeData) {
        // Execute Transaction
        console.log("Executing Transaction...");

        // 1. Deduct my items/gold -> Add to them
        // 2. Deduct their items/gold -> Add to me
        // Actually, safer if each client only handles THEIR deduction (trust client?) 
        // OR better: One person handles both (Creator).
        // Let's have Creator handle DB updates to avoid race or double.

        if (this.isCreator) {
            const u1 = this.myUid;
            const u2 = this.otherUid;
            const offer1 = tradeData.users[u1].offer || {};
            const offer2 = tradeData.users[u2].offer || {};

            // Apply Changes
            await this.transferAssets(u1, u2, offer1); // u1 gives offer1 to u2
            await this.transferAssets(u2, u1, offer2); // u2 gives offer2 to u1

            // Nuke session
            remove(ref(db, `trades/${this.currentSessionId}`));
            alert("Trade Successful!");
        }
    }

    async transferAssets(fromUid, toUid, offer) {
        // Gold
        if (offer.gold && offer.gold > 0) {
            // Deduct
            const g1Ref = ref(db, `players/${fromUid}/wallet/gold`);
            const snap1 = await get(g1Ref);
            const g1 = snap1.val() || 0;
            update(ref(db, `players/${fromUid}/wallet`), { gold: g1 - offer.gold });

            // Add
            const g2Ref = ref(db, `players/${toUid}/wallet/gold`);
            const snap2 = await get(g2Ref);
            const g2 = snap2.val() || 0;
            update(ref(db, `players/${toUid}/wallet`), { gold: g2 + offer.gold });
        }

        // Items
        if (offer.items) {
            for (const [item, count] of Object.entries(offer.items)) {
                // Deduct
                const i1Ref = ref(db, `players/${fromUid}/inventory/${item}`);
                const s1 = await get(i1Ref);
                const c1 = s1.val() || 0;
                if (c1 - count <= 0) remove(i1Ref);
                else set(i1Ref, c1 - count);

                // Add
                const i2Ref = ref(db, `players/${toUid}/inventory/${item}`);
                const s2 = await get(i2Ref);
                const c2 = s2.val() || 0;
                set(i2Ref, c2 + count);
            }
        }
    }
}
