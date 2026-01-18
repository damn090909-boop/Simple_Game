import { app, worldContainer, TILE_SIZE, entityLayer } from "./engine.js";
import { currentUser } from "./auth.js";
import { update, ref, push, child } from "./config.js";
import { db } from "./config.js";
import { updateMyPosition } from "./network.js"; // If needed

let chatInputVisible = false;

export function initUI() {
    // 1. HUD Init
    document.getElementById("chat-toggle-btn").onclick = toggleChatInput;
    document.getElementById("chat-send").onclick = sendChatMessage;
    document.getElementById("chat-input").addEventListener("keypress", (e) => {
        if (e.key === "Enter") sendChatMessage();
    });

    // 2. Chat Bubbles Listener
    // We listen to `messages` node? Or `users/{uid}/chat`?
    // Project.txt says: "Sync logic: Chat data... via users/{ID}/chat node"
    // Actually, widespread chat usually goes to a shared node or we listen to all users.
    // Let's listen to specific `world/chat` or just handle local bubble for now?
    // Project.txt: "Sync: Chat data also via users/{ID}/chat node"
    // So each user has a 'latest message'.

    // We already listen to 'players' in network.js
    // Let's add chat handling there or here? 
    // Ideally Network handles data, UI handles display.
    // We need a function `showChatBubble(uid, msg)` exported for network.js to use.
}

function toggleChatInput() {
    chatInputVisible = !chatInputVisible;
    const bar = document.getElementById("chat-bar");
    const input = document.getElementById("chat-input");

    if (chatInputVisible) {
        bar.classList.add("visible");
        input.focus();
        // Keyboard slide up logic is handled by browser/CSS (interactive-widget)
    } else {
        bar.classList.remove("visible");
        input.blur();
    }
}

async function sendChatMessage() {
    const input = document.getElementById("chat-input");
    const msg = input.value.trim();
    if (!msg) return;

    if (!currentUser) return;

    // 1. Send to Firebase (Update my state)
    // We can use a 'chat' field in player state that network listeners pick up
    // Or a persistent chat log.
    // Spec says: "Bubble... 5 seconds fade out". Ephemeral is fine.

    update(ref(db, `players/${currentUser.uid}`), {
        chat: msg,
        chatTime: Date.now()
    });

    // 2. Clear Input
    input.value = "";
    toggleChatInput(); // Hide after send
}

export function showChatBubble(sprite, text) {
    if (!sprite) return;

    // Remove existing bubble
    const existing = sprite.children.find(c => c.name === "chatBubble");
    if (existing) sprite.removeChild(existing);

    const bubble = new PIXI.Container();
    bubble.name = "chatBubble";
    bubble.y = -60; // Above Name Tag

    // Background
    const bg = new PIXI.Graphics();
    bg.beginFill(0xFFFFFF);
    bg.lineStyle(2, 0x000000);
    bg.drawRoundedRect(0, 0, 100, 40, 10); // temporary size
    bg.endFill();

    // Text
    const style = new PIXI.TextStyle({
        fontFamily: "Arial",
        fontSize: 14,
        fill: "black",
        wordWrap: true,
        wordWrapWidth: 140
    });
    const textObj = new PIXI.Text(text, style);
    textObj.anchor.set(0.5, 0.5);

    // Resize bg to text
    const w = textObj.width + 20;
    const h = textObj.height + 10;
    bg.clear();
    bg.beginFill(0xFFFFFF);
    bg.lineStyle(2, 0x000000);
    bg.drawRoundedRect(-w / 2, -h / 2, w, h, 10);
    bg.endFill();

    bubble.addChild(bg);
    bubble.addChild(textObj);

    sprite.addChild(bubble);

    // Auto Destroy
    setTimeout(() => {
        if (sprite && !sprite.destroyed) {
            sprite.removeChild(bubble);
            bubble.destroy();
        }
    }, 5000);
}
