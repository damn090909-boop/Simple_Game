import { currentUser } from "./auth.js";
import { db, ref, onValue, set, remove, update } from "./config.js";

// State
let activeTrade = null; // { partnerUid, state: 'offering'|'confirm' }

export function initTrade() {
    // Listen for Trade Requests
    const myRequestsRef = ref(db, `trade_requests/${currentUser.uid}`);
    onValue(myRequestsRef, (snapshot) => {
        const req = snapshot.val();
        if (req && !activeTrade) {
            // New incoming request
            if (confirm(`Trade request from ${req.senderName}. Accept?`)) {
                acceptTrade(req.sender, req.senderName);
            } else {
                remove(myRequestsRef); // Decline
            }
        }
    });

    // How to initiate? Active Player Tap?
    // We already have Input for tap-to-move.
    // If tap on valid Entity (OtherPlayer), active Context Menu?
    // For MVP, assume a 'Nearby Players' list in HUD or just Command.
    // Let's add a debug 'Trade with...' for testing.
}

async function requestTrade(targetUid) {
    // Write to trade_requests/{targetUid}
    // { sender: me, senderName: myName }
}

function acceptTrade(senderUid, senderName) {
    // Start Trade Session
    // Open UI
    console.log("Trading with", senderName);
    activeTrade = { partnerUid: senderUid, state: 'offering' };
    createTradeUI(senderName);
}

function createTradeUI(partnerName) {
    // Simple Overlay
    const div = document.createElement("div");
    div.id = "trade-ui";
    div.style.position = "absolute";
    div.style.top = "10%";
    div.style.left = "10%";
    div.style.background = "#fff";
    div.style.padding = "20px";
    div.style.border = "2px solid black";
    div.innerHTML = `
        <h3>Trading with ${partnerName}</h3>
        <p>Your Offer: <input type="text" placeholder="Item ID"></p>
        <button onclick="alert('Trade Logic to be implemented')">Confirm</button>
        <button onclick="document.getElementById('trade-ui').remove()">Cancel</button>
    `;
    document.body.appendChild(div);
}
