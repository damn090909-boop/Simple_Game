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

let selectedSlotId = null;

function createSlotElement(charData) {
    const slot = document.createElement("div");
    slot.className = "slot";

    // Selection Logic: Green Border
    slot.onclick = () => {
        document.querySelectorAll(".slot").forEach(s => s.classList.remove("selected"));
        slot.classList.add("selected");
        selectedSlotId = charData ? charData.id : "new";
        if (!charData) openCreatorModal();
    };

    // Common style
    slot.style.display = "flex";
    slot.style.flexDirection = "row";
    slot.style.padding = "10px";

    // --- Left Half (50%) : Portrait ---
    const leftCol = document.createElement("div");
    leftCol.className = "slot-left";

    const previewBox = document.createElement("div");
    previewBox.className = "char-preview-box";

    const preview = document.createElement("div");
    preview.className = "char-preview";

    if (charData) {
        slot.classList.add("filled");
        preview.textContent = "🧙‍♂️";
        preview.style.filter = "none";
    } else {
        slot.classList.add("empty");
        preview.textContent = "👤";
        preview.style.filter = "brightness(0) grayscale(100%)";
        preview.style.opacity = "0.7";

        // Create Button Overlay (+)
        const createOverlay = document.createElement("div");
        createOverlay.className = "create-overlay";
        createOverlay.textContent = "+";
        previewBox.appendChild(createOverlay);
    }

    previewBox.appendChild(preview);
    leftCol.appendChild(previewBox);
    slot.appendChild(leftCol);

    // --- Right Half (50%) : Info + Buttons ---
    const rightCol = document.createElement("div");
    rightCol.className = "slot-right";

    if (charData) {
        // 1. Top Info: Name & Spec
        const infoDiv = document.createElement("div");
        infoDiv.className = "char-info-block";

        const nameDisplay = document.createElement("div");
        nameDisplay.className = "char-name";
        nameDisplay.textContent = charData.name;

        const infoDisplay = document.createElement("div");
        infoDisplay.className = "char-details";
        infoDisplay.innerHTML = `Lv. ${charData.level || 1}<br>Map: Town`;

        infoDiv.appendChild(nameDisplay);
        infoDiv.appendChild(infoDisplay);
        rightCol.appendChild(infoDiv);

        // 2. Bottom Buttons: Row, Side-by-Side
        const btnRow = document.createElement("div");
        btnRow.className = "slot-buttons-row";

        // Delete Button
        const delBtn = document.createElement("button");
        delBtn.type = "button"; // Explicit type to prevent form submission
        delBtn.textContent = "캐릭터삭제";
        delBtn.className = "slot-btn delete-btn";
        delBtn.onclick = (e) => {
            e.stopPropagation(); // Prevent slot selection
            // Small delay to ensure event bubbling is clean
            setTimeout(() => {
                if (confirm("이 캐릭터를 삭제하시겠습니까?")) deleteCharacter(charData.id);
            }, 50);
        };

        // Connect Button
        const enterBtn = document.createElement("button");
        enterBtn.type = "button"; // Explicit type
        enterBtn.textContent = "모험시작";
        enterBtn.className = "slot-btn play-btn";
        enterBtn.onclick = (e) => {
            e.stopPropagation();
            enterGame(charData);
        };

        btnRow.appendChild(delBtn);
        btnRow.appendChild(enterBtn);
        rightCol.appendChild(btnRow);

    } else {
        // Empty Slot Right Side
        const emptyInfo = document.createElement("div");
        emptyInfo.className = "empty-info-right";
        emptyInfo.innerHTML = "새로운 캐릭터<br>생성하기";
        rightCol.appendChild(emptyInfo);
    }

    slot.appendChild(rightCol);

    return slot;
}

// --- Character Creator ---
// --- Character Creator ---
function openCreatorModal() {
    const modal = document.getElementById("creator-modal");
    modal.classList.remove("hidden");

    // Setup Creator UI
    const previewArea = document.getElementById("creator-preview");
    previewArea.innerHTML = ""; // Clear

    // Close Button (Item 11)
    // Avoid duplicate buttons if re-opened
    let closeBtn = modal.querySelector(".close-modal-btn");
    if (!closeBtn) {
        closeBtn = document.createElement("button");
        closeBtn.type = "button"; // Explicit type
        closeBtn.className = "close-modal-btn";
        closeBtn.innerHTML = "X";
        closeBtn.style.position = "absolute";
        closeBtn.style.top = "10px";
        closeBtn.style.right = "10px";
        closeBtn.style.background = "transparent";
        closeBtn.style.border = "none";
        closeBtn.style.color = "white";
        closeBtn.style.fontSize = "24px";
        closeBtn.style.cursor = "pointer";
        closeBtn.onclick = () => {
            modal.classList.add("hidden");
        };
        modal.querySelector(".modal-content").appendChild(closeBtn);
        // Ensure relative positioning for absolute child
        modal.querySelector(".modal-content").style.position = "relative";
    }

    // Dynamic Controls (Item 10)
    const controls = document.querySelector("#creator-modal .controls");
    controls.innerHTML = `
        <div style="text-align: left; width: 100%; margin-top: 20px;">
            <label style="display:block; margin-bottom:5px;">Name:</label>
            <input type="text" id="new-char-name" value="Hero" style="width:100%; padding:8px; margin-bottom:15px; border-radius:5px; border:none;">
            
            <label style="display:block; margin-bottom:5px;">Skin Color:</label>
            <div style="display:flex; gap:10px; margin-bottom:15px;">
                <input type="color" id="skin-color" value="#ffe0bd" style="border:none; width:40px; height:40px; cursor:pointer;">
                <span style="line-height:40px; color:#aaa;">Pick a tone</span>
            </div>

            <label style="display:block; margin-bottom:5px;">Hair Style:</label>
            <select id="hair-style" style="width:100%; padding:8px; border-radius:5px; margin-bottom:15px;">
                <option value="1">Short</option>
                <option value="2">Long</option>
                <option value="3">Bald</option>
            </select>
        </div>
    `;

    const saveBtn = document.getElementById("save-char-btn");
    const newBtn = saveBtn.cloneNode(true);
    saveBtn.parentNode.replaceChild(newBtn, saveBtn);

    newBtn.onclick = async () => {
        const nameInput = document.getElementById("new-char-name");
        const name = nameInput.value.trim() || "Hero";
        const skin = document.getElementById("skin-color").value;
        const hair = document.getElementById("hair-style").value;

        const newChar = {
            name: name,
            skinColor: skin,
            createdAt: Date.now(),
            parts: {
                body: "body_basic",
                head: `head_${hair}`, // map hair logic later
                arm: "arm_basic",
                leg: "leg_basic"
            }
        };

        // Create & Close
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
