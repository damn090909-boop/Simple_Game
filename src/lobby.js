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

    // Common style for 50/50 split
    slot.style.display = "flex";
    slot.style.flexDirection = "row";
    slot.style.alignItems = "stretch";
    slot.style.padding = "10px";

    // --- Left Half (50%) : Portrait / Silhouette ---
    const leftCol = document.createElement("div");
    leftCol.className = "slot-left";

    const previewBox = document.createElement("div");
    previewBox.className = "char-preview-box";

    const preview = document.createElement("div");
    preview.className = "char-preview";

    if (charData) {
        slot.classList.add("filled");
        preview.textContent = "🧙‍♂️"; // TODO: Real preview
        // Make preview standard brightness
        preview.style.filter = "none";
    } else {
        slot.classList.add("empty");
        preview.textContent = "👤";
        // Silhouette effect (Dark/Black)
        preview.style.filter = "brightness(0) grayscale(100%)";
        preview.style.opacity = "0.7";
    }

    previewBox.appendChild(preview);
    leftCol.appendChild(previewBox);
    slot.appendChild(leftCol);

    // --- Right Half (50%) : Info + Buttons ---
    const rightCol = document.createElement("div");
    rightCol.className = "slot-right";

    // Top: Info
    const infoDiv = document.createElement("div");

    if (charData) {
        const nameDisplay = document.createElement("div");
        nameDisplay.className = "char-name";
        nameDisplay.textContent = charData.name;
        nameDisplay.style.fontSize = "18px";

        const infoDisplay = document.createElement("div");
        infoDisplay.className = "char-details";
        infoDisplay.innerHTML = `Lv. ${charData.level || 1}<br>Map: Town`;

        infoDiv.appendChild(nameDisplay);
        infoDiv.appendChild(infoDisplay);
    } else {
        // Empty State Info
        const emptyLabel = document.createElement("div");
        emptyLabel.className = "char-name";
        emptyLabel.textContent = "Empty Slot";
        emptyLabel.style.fontSize = "16px";
        emptyLabel.style.color = "#777";
        infoDiv.appendChild(emptyLabel);
    }

    rightCol.appendChild(infoDiv);

    // Bottom: Buttons
    const btnRow = document.createElement("div");
    btnRow.className = "slot-buttons";

    if (charData) {
        // Delete Button
        const delBtn = document.createElement("button");
        delBtn.textContent = "🗑";
        delBtn.className = "slot-btn delete-btn";
        delBtn.onclick = (e) => {
            e.preventDefault();
            e.stopPropagation();
            // Delay confirm to prevent immediate dismissal by browser UI event quirks
            setTimeout(() => {
                if (confirm("Delete this character?")) deleteCharacter(charData.id);
            }, 50);
        };
        btnRow.appendChild(delBtn);

        // Connect Button
        const enterBtn = document.createElement("button");
        enterBtn.textContent = "▶";
        enterBtn.className = "slot-btn play-btn";
        enterBtn.onclick = (e) => {
            e.stopPropagation();
            enterGame(charData);
        };
        btnRow.appendChild(enterBtn);
    } else {
        // Create Button ([+])
        const createBtn = document.createElement("button");
        createBtn.textContent = "+";
        createBtn.className = "slot-btn play-btn"; // Use play-btn style (Green) or maybe Neutral?
        // Let's make it look distinct or just standard Create
        createBtn.style.width = "100%"; // Or same small size? 
        // User said "Consistent small size" for Exists. 
        // For Empty, "Black Silhouette + [+] Button". 
        // Let's keep consistency. A small [+] button in the corner looks neat.
        // But maybe a bit wider for clear action?
        // Let's stick to the styling class. 
        createBtn.onclick = (e) => {
            e.stopPropagation();
            openCreatorModal();
        };
        btnRow.appendChild(createBtn);

        // Make the whole slot clickable for creation too?
        slot.onclick = () => openCreatorModal();
    }

    rightCol.appendChild(btnRow);
    slot.appendChild(rightCol);

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
