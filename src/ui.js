// src/ui.js - C-1. Game UI & HUD
import { sendChat } from "./network.js";

export function initHUD() {
    const hudContainer = document.getElementById("game-hud");

    // Check if buttons already exist to prevent duplicates
    if (document.getElementById("menu-btn")) {
        // Just re-attach listeners if needed, or assume they are fine.
        // But we need to attach chat listeners if not already.
        // Let's assume initHUD is called once per session usually.
        return;
    }

    // 1. Menu Button [ ☰ ] (Top-Left) - Item 25
    const menuBtn = createButton("menu-btn", "☰", "hud-btn top-left");
    hudContainer.appendChild(menuBtn);

    // 2. Friends Button [ 👥 ] (Top-Right) - Item 26
    const friendBtn = createButton("friend-btn", "👥", "hud-btn top-right-1");
    hudContainer.appendChild(friendBtn);

    // 3. Zoom Button [ 🔍 ] (Top-Right) - Item 26
    const zoomBtn = createButton("zoom-btn", "🔍", "hud-btn top-right-2");
    hudContainer.appendChild(zoomBtn);

    // 4. Inventory Button [ 🎒 ] (Bottom-Left) - Item 27
    const invBtn = createButton("inv-btn", "🎒", "hud-btn bottom-left-1");
    hudContainer.appendChild(invBtn);

    // 5. Chat Toggle [ 💬 ] (Bottom-Left) - Item 28
    const chatBtn = createButton("chat-btn", "💬", "hud-btn bottom-left-2");
    hudContainer.appendChild(chatBtn);

    // Event Listeners
    menuBtn.onclick = () => console.log("Menu clicked");
    friendBtn.onclick = () => console.log("Friends clicked");
    zoomBtn.onclick = () => console.log("Zoom clicked");
    invBtn.onclick = () => console.log("Inventory clicked");

    // Chat Toggle Logic (Item 30)
    chatBtn.onclick = (e) => {
        e.stopPropagation();
        toggleChat();
    };

    initChatLogic();
}

function createButton(id, emoji, classes) {
    const btn = document.createElement("button");
    btn.id = id;
    btn.textContent = emoji;
    btn.className = classes;
    return btn;
}

// --- Chat Interface Logic ---
function toggleChat(forceState) {
    const chatContainer = document.getElementById("chat-input-container");
    const isHidden = chatContainer.classList.contains("hidden");
    const shouldShow = forceState !== undefined ? forceState : isHidden;

    if (shouldShow) {
        chatContainer.classList.remove("hidden");
        document.getElementById("chat-input").focus();
    } else {
        chatContainer.classList.add("hidden");
        document.getElementById("chat-input").blur();
    }
}

function initChatLogic() {
    const chatContainer = document.getElementById("chat-input-container");
    const chatInput = document.getElementById("chat-input");
    const chatSend = document.getElementById("chat-send-btn");

    // Send Message
    const submitChat = () => {
        const text = chatInput.value.trim();
        if (text) {
            sendChat(text);
            chatInput.value = "";
            toggleChat(false); // Hide on send
        }
    };

    chatSend.onclick = submitChat;
    chatInput.onkeydown = (e) => {
        if (e.key === "Enter") submitChat();
    };

    // Close on background click
    document.addEventListener("pointerdown", (e) => {
        if (!chatContainer.classList.contains("hidden")) {
            // If click is NOT on chat container and NOT on chat toggle button
            if (!chatContainer.contains(e.target) && e.target.id !== "chat-btn") {
                toggleChat(false);
            }
        }
    });
}
