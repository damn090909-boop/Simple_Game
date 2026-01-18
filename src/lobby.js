import { db, ref, get, set, child, push, remove } from "./config.js";
import { currentUser } from "./auth.js";
import { Assets } from "./loader.js";

// Callbacks
let onEnterGame = null;

export function initLobby(enterGameCallback) {
    onEnterGame = enterGameCallback;
    const lobbyScreen = document.getElementById("lobby-screen");
    lobbyScreen.classList.remove("hidden");
    lobbyScreen.classList.add("active");

    // Load characters
    loadCharacters();
}

async function loadCharacters() {
    if (!currentUser) return;

    console.log("Loading characters for:", currentUser.uid);
    const slotsContainer = document.getElementById("character-slots");
    slotsContainer.innerHTML = "Loading..."; // Simple loading text

    const dbRef = ref(db);
    const charRef = child(dbRef, `users/${currentUser.uid}/characters`);

    try {
        const snapshot = await get(charRef);
        slotsContainer.innerHTML = ""; // Clear loader

        let characters = [];
        if (snapshot.exists()) {
            // Firebase returns object with push IDs as keys
            const data = snapshot.val();
            characters = Object.entries(data).map(([id, char]) => ({ id, ...char }));
        }

        // Render 3 slots
        for (let i = 0; i < 3; i++) {
            const charData = characters[i] || null;
            const slotEl = createSlotElement(charData);
            slotsContainer.appendChild(slotEl);
        }

    } catch (e) {
        console.error("Error loading characters:", e);
        slotsContainer.innerHTML = "Error loading data.";
    }
}

function createSlotElement(charData) {
    const slot = document.createElement("div");
    slot.className = "slot";

    if (charData) {
        slot.classList.add("filled");

        // Info
        const nameDisplay = document.createElement("div");
        nameDisplay.textContent = charData.name || "Hero";
        slot.appendChild(nameDisplay);

        // Preview (Simple text for now, or canvas later)
        const preview = document.createElement("div");
        preview.textContent = "🧙‍♂️"; // Emoji placeholder till canvas
        preview.style.fontSize = "40px";
        slot.appendChild(preview);

        // Enter Button
        const enterBtn = document.createElement("button");
        enterBtn.textContent = "PLAY";
        enterBtn.onclick = (e) => {
            e.stopPropagation();
            enterGame(charData);
        };
        slot.appendChild(enterBtn);

        // Delete Button (Small for now)
        const delBtn = document.createElement("button");
        delBtn.textContent = "🗑";
        delBtn.style.marginTop = "5px";
        delBtn.style.background = "#d32f2f";
        delBtn.onclick = (e) => {
            e.stopPropagation();
            if (confirm("Delete this character?")) deleteCharacter(charData.id);
        };
        slot.appendChild(delBtn);

    } else {
        slot.classList.add("empty");

        // Create Button
        const createIcon = document.createElement("div");
        createIcon.textContent = "+";
        createIcon.style.fontSize = "40px";
        slot.appendChild(createIcon);

        const label = document.createElement("div");
        label.textContent = "New";
        slot.appendChild(label);

        slot.onclick = () => openCreatorModal();
    }

    return slot;
}

// --- Character Creator ---
function openCreatorModal() {
    const modal = document.getElementById("creator-modal");
    modal.classList.remove("hidden");

    // Setup Creator UI (Simplified for MVP)
    const previewArea = document.getElementById("creator-preview");
    previewArea.innerHTML = ""; // Clear

    // We would render a Pixi app here for preview, 
    // but for MVP DOM-based construction let's just use simple config
    // Actually, Project.txt says "Character Creator Modal" with body/hair/color.

    // Let's create simple dropdowns/buttons dynamically since HTML was minimal
    const controls = document.querySelector("#creator-modal .controls");
    controls.innerHTML = `
        <label>Name: <input type="text" id="new-char-name" value="Hero"></label><br>
        <label>Skin Color: <input type="color" id="skin-color" value="#ffe0bd"></label><br>
        <label>Hair Style: <select id="hair-style"><option value="1">Style 1</option></select></label>
    `;

    const saveBtn = document.getElementById("save-char-btn");
    // Remove old listeners to avoid dupes
    const newBtn = saveBtn.cloneNode(true);
    saveBtn.parentNode.replaceChild(newBtn, saveBtn);

    newBtn.onclick = async () => {
        const name = document.getElementById("new-char-name").value;
        const skin = document.getElementById("skin-color").value;

        const newChar = {
            name: name,
            skinColor: skin,
            createdAt: Date.now(),
            // Default parts
            parts: {
                body: "body_basic",
                head: "head_1",
                arm: "arm_basic",
                leg: "leg_basic"
            }
        };

        await createCharacter(newChar);
        modal.classList.add("hidden");
    };
}

async function createCharacter(charData) {
    if (!currentUser) return;
    const dbRef = ref(db);
    const charsListRef = child(dbRef, `users/${currentUser.uid}/characters`);
    // Push new character
    await push(charsListRef, charData);
    // Reload slots
    await loadCharacters();
}

async function deleteCharacter(charId) {
    if (!currentUser) return;
    const dbRef = ref(db);
    await remove(child(dbRef, `users/${currentUser.uid}/characters/${charId}`));
    await loadCharacters();
}

function enterGame(charData) {
    // Hide Lobby
    document.getElementById("lobby-screen").classList.remove("active");
    document.getElementById("lobby-screen").classList.add("hidden");

    // Callback to Main
    if (onEnterGame) onEnterGame(charData);
}
