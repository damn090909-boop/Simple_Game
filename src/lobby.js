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

    // Character state
    const characterState = {
        name: "Hero",
        body: "1",
        bodyColor: "#ffe0bd",
        hairStyle: "1",
        hairColor: "#000000",
        eyeShape: "1",
        noseShape: "1",
        mouthShape: "1"
    };

    let currentTab = 0;
    const tabs = [
        { id: "body", label: "몸", samples: ["1", "2", "3"] },
        { id: "bodyColor", label: "바디 컬러", samples: ["#ffe0bd", "#f4c2a0", "#d4a574", "#8d5524"] },
        { id: "hairStyle", label: "헤어스타일", samples: ["1", "2", "3"] },
        { id: "hairColor", label: "헤어 컬러", samples: ["#000000", "#8b4513", "#ffd700", "#ff0000"] },
        { id: "eyeShape", label: "눈 모양", samples: ["1", "2", "3"] },
        { id: "noseShape", label: "코 모양", samples: ["1", "2", "3"] },
        { id: "mouthShape", label: "입 모양", samples: ["1", "2", "3"] }
    ];

    // Setup Creator UI
    const modalContent = modal.querySelector(".modal-content");
    modalContent.innerHTML = ""; // Clear
    modalContent.style.position = "relative";
    modalContent.style.width = "90%";
    modalContent.style.maxWidth = "500px";
    modalContent.style.height = "80vh";
    modalContent.style.display = "flex";
    modalContent.style.flexDirection = "column";

    // Close Button
    const closeBtn = document.createElement("button");
    closeBtn.type = "button";
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
    closeBtn.style.zIndex = "100";
    closeBtn.onclick = () => modal.classList.add("hidden");
    modalContent.appendChild(closeBtn);

    // Top Half: Preview
    const previewArea = document.createElement("div");
    previewArea.className = "creator-preview";
    previewArea.style.flex = "1";
    previewArea.style.display = "flex";
    previewArea.style.alignItems = "center";
    previewArea.style.justifyContent = "center";
    previewArea.style.background = "rgba(0,0,0,0.3)";
    previewArea.style.borderRadius = "10px";
    previewArea.style.margin = "10px";
    previewArea.style.fontSize = "80px";
    previewArea.textContent = "🧙‍♂️";
    modalContent.appendChild(previewArea);

    // Bottom Half: Controls
    const controlsArea = document.createElement("div");
    controlsArea.className = "creator-controls";
    controlsArea.style.flex = "1";
    controlsArea.style.display = "flex";
    controlsArea.style.flexDirection = "column";
    controlsArea.style.padding = "10px";
    controlsArea.style.overflow = "hidden";

    // Name Input
    const nameInput = document.createElement("input");
    nameInput.type = "text";
    nameInput.value = characterState.name;
    nameInput.placeholder = "캐릭터 이름";
    nameInput.style.width = "100%";
    nameInput.style.padding = "10px";
    nameInput.style.marginBottom = "10px";
    nameInput.style.borderRadius = "5px";
    nameInput.style.border = "1px solid #555";
    nameInput.style.background = "#222";
    nameInput.style.color = "white";
    nameInput.oninput = (e) => { characterState.name = e.target.value; };
    controlsArea.appendChild(nameInput);

    // Tab Bar
    const tabBar = document.createElement("div");
    tabBar.className = "tab-bar";
    tabBar.style.display = "flex";
    tabBar.style.overflowX = "auto";
    tabBar.style.gap = "5px";
    tabBar.style.marginBottom = "10px";
    tabBar.style.padding = "5px 0";

    tabs.forEach((tab, index) => {
        const tabBtn = document.createElement("button");
        tabBtn.type = "button";
        tabBtn.className = "tab-item";
        tabBtn.textContent = tab.label;
        tabBtn.style.padding = "8px 15px";
        tabBtn.style.border = "none";
        tabBtn.style.borderRadius = "5px";
        tabBtn.style.background = index === currentTab ? "#4CAF50" : "#444";
        tabBtn.style.color = "white";
        tabBtn.style.cursor = "pointer";
        tabBtn.style.whiteSpace = "nowrap";
        tabBtn.style.fontSize = "14px";
        tabBtn.onclick = () => {
            currentTab = index;
            updateTabUI();
        };
        tabBar.appendChild(tabBtn);
    });
    controlsArea.appendChild(tabBar);

    // Sample Container
    const sampleContainer = document.createElement("div");
    sampleContainer.className = "sample-container";
    sampleContainer.style.display = "flex";
    sampleContainer.style.overflowX = "auto";
    sampleContainer.style.gap = "10px";
    sampleContainer.style.padding = "10px 0";
    sampleContainer.style.flex = "1";
    controlsArea.appendChild(sampleContainer);

    // Save Button
    const saveBtn = document.createElement("button");
    saveBtn.type = "button";
    saveBtn.textContent = "START GAME";
    saveBtn.style.width = "100%";
    saveBtn.style.padding = "15px";
    saveBtn.style.marginTop = "10px";
    saveBtn.style.background = "#2196F3";
    saveBtn.style.border = "none";
    saveBtn.style.borderRadius = "5px";
    saveBtn.style.color = "white";
    saveBtn.style.fontSize = "16px";
    saveBtn.style.fontWeight = "bold";
    saveBtn.style.cursor = "pointer";
    saveBtn.onclick = async () => {
        const newChar = {
            name: characterState.name,
            createdAt: Date.now(),
            parts: {
                body: `body_${characterState.body}`,
                bodyColor: characterState.bodyColor,
                head: `head_${characterState.hairStyle}`,
                hairColor: characterState.hairColor,
                eyeShape: characterState.eyeShape,
                noseShape: characterState.noseShape,
                mouthShape: characterState.mouthShape
            }
        };
        await createCharacter(newChar);
        modal.classList.add("hidden");
    };
    controlsArea.appendChild(saveBtn);

    modalContent.appendChild(controlsArea);

    // Update UI function
    function updateTabUI() {
        // Update tab buttons
        Array.from(tabBar.children).forEach((btn, i) => {
            btn.style.background = i === currentTab ? "#4CAF50" : "#444";
        });

        // Update samples
        sampleContainer.innerHTML = "";
        const currentTabData = tabs[currentTab];
        currentTabData.samples.forEach(sample => {
            const sampleBox = document.createElement("div");
            sampleBox.className = "sample-box";
            sampleBox.style.minWidth = "80px";
            sampleBox.style.height = "80px";
            sampleBox.style.borderRadius = "8px";
            sampleBox.style.display = "flex";
            sampleBox.style.alignItems = "center";
            sampleBox.style.justifyContent = "center";
            sampleBox.style.cursor = "pointer";
            sampleBox.style.border = "2px solid #555";
            sampleBox.style.fontSize = "12px";
            sampleBox.style.fontWeight = "bold";

            // Color samples show color, others show text
            if (currentTabData.id.includes("Color")) {
                sampleBox.style.background = sample;
                sampleBox.textContent = "";
            } else {
                sampleBox.style.background = "#333";
                sampleBox.style.color = "white";
                sampleBox.textContent = sample;
            }

            // Highlight if selected
            if (characterState[currentTabData.id] === sample) {
                sampleBox.style.border = "3px solid #00FF00";
                sampleBox.style.boxShadow = "0 0 10px rgba(0,255,0,0.5)";
            }

            sampleBox.onclick = () => {
                characterState[currentTabData.id] = sample;
                updateTabUI();
            };

            sampleContainer.appendChild(sampleBox);
        });
    }

    // Swipe support for tabs
    let touchStartX = 0;
    tabBar.addEventListener("touchstart", e => {
        touchStartX = e.changedTouches[0].screenX;
    });
    tabBar.addEventListener("touchend", e => {
        const touchEndX = e.changedTouches[0].screenX;
        const diff = touchStartX - touchEndX;
        if (Math.abs(diff) > 50) {
            if (diff > 0 && currentTab < tabs.length - 1) {
                currentTab++;
                updateTabUI();
            } else if (diff < 0 && currentTab > 0) {
                currentTab--;
                updateTabUI();
            }
        }
    });

    // Swipe support for samples
    sampleContainer.addEventListener("touchstart", e => {
        touchStartX = e.changedTouches[0].screenX;
    });
    sampleContainer.addEventListener("touchend", e => {
        const touchEndX = e.changedTouches[0].screenX;
        const diff = touchStartX - touchEndX;
        if (Math.abs(diff) > 30) {
            sampleContainer.scrollLeft += diff > 0 ? 100 : -100;
        }
    });

    // Initial render
    updateTabUI();
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
