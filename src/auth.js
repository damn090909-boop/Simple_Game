import { db, ref, get, child, onDisconnect, set, update } from "./config.js";

// State
let currentPin = "";
export let currentUser = null;

// Audio Context (must resume on first touch)
let audioContext = null;

// DOM Elements
let loginInputs, loginBtn, createLink;
let popupOverlay, createInputs, confirmInputs, finalCreateBtn, cancelCreateBtn;

export function initAuth(onLoginSuccess) {
    // Selectors
    const screen = document.getElementById("auth-screen");
    loginInputs = Array.from(document.querySelectorAll("#login-pin-wrapper input"));
    loginBtn = document.getElementById("login-btn");
    createLink = document.getElementById("create-link");

    popupOverlay = document.getElementById("auth-popup-overlay");
    createInputs = Array.from(document.querySelectorAll("#create-pin-wrapper input"));
    confirmInputs = Array.from(document.querySelectorAll("#confirm-pin-wrapper input"));
    finalCreateBtn = document.getElementById("final-create-btn");
    cancelCreateBtn = document.getElementById("cancel-create-btn");

    // Initialize AudioContext on first interaction
    document.body.addEventListener('touchstart', resumeAudio, { once: true });
    document.body.addEventListener('click', resumeAudio, { once: true });

    // --- Login Flow ---
    setupPinInputs(loginInputs, () => validateLoginPin());

    loginBtn.addEventListener("click", () => {
        const pin = getPinFromInputs(loginInputs);
        attemptLogin(pin, screen, onLoginSuccess);
    });

    createLink.addEventListener("click", () => {
        openCreationPopup();
    });

    // --- Creation Flow ---
    setupPinInputs(createInputs, () => validateCreation());
    setupPinInputs(confirmInputs, () => validateCreation());

    cancelCreateBtn.addEventListener("click", () => {
        popupOverlay.classList.add("hidden");
        resetInputs(createInputs);
        resetInputs(confirmInputs);
    });

    finalCreateBtn.addEventListener("click", () => {
        const pin = getPinFromInputs(createInputs);
        createNewUser(pin, screen, onLoginSuccess);
    });
}

function setupPinInputs(inputs, onCompleteOrChange) {
    inputs.forEach((input, index) => {
        input.addEventListener("input", (e) => {
            let val = e.target.value;

            // Enforce numeric only
            if (!/^\d*$/.test(val)) {
                input.value = val.replace(/\D/g, "");
                val = input.value;
            }

            // Handle Paste or Auto-fill (length > 1)
            if (val.length > 1) {
                const chars = val.split("");
                input.value = chars[0]; // Keep first char here

                // Distribute remaining chars to subsequent inputs
                let nextIdx = index + 1;
                for (let i = 1; i < chars.length; i++) {
                    if (nextIdx < inputs.length) {
                        inputs[nextIdx].value = chars[i];
                        nextIdx++;
                    }
                }

                // Focus the box after the last filled one
                if (nextIdx < inputs.length) {
                    inputs[nextIdx].focus();
                } else {
                    inputs[inputs.length - 1].focus();
                    inputs[inputs.length - 1].blur(); // Completed
                }
            }
            // Normal Typing (Single Char)
            else if (val.length === 1) {
                if (index < inputs.length - 1) {
                    inputs[index + 1].focus();
                } else {
                    input.blur(); // Hide keyboard on last digit
                }
            }

            onCompleteOrChange();
        });

        input.addEventListener("keydown", (e) => {
            // Backspace moves to prev
            if (e.key === "Backspace" && !e.target.value && index > 0) {
                inputs[index - 1].focus();
            }
        });

        input.addEventListener("focus", () => {
            input.select();
        });
    });
}

function getPinFromInputs(inputs) {
    return inputs.map(input => input.value).join("");
}

function resetInputs(inputs) {
    inputs.forEach(input => input.value = "");
}

function resumeAudio() {
    if (!audioContext) {
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (audioContext.state === 'suspended') {
        audioContext.resume();
    }
}

// Enable "Connect" button based on length only (UX fix)
function validateLoginPin() {
    const pin = getPinFromInputs(loginInputs);
    loginBtn.disabled = (pin.length !== 4);
}

async function attemptLogin(pin, authScreen, onSuccess) {
    console.log("Attempting login with PIN:", pin);
    try {
        const dbRef = ref(db);
        const snapshot = await get(child(dbRef, "users"));

        if (snapshot.exists()) {
            const users = snapshot.val();
            let foundUser = null;
            let userId = null;

            for (const [uid, data] of Object.entries(users)) {
                if (data.pin === pin) {
                    foundUser = data;
                    userId = uid;
                    break;
                }
            }

            if (foundUser) {
                console.log("Login Success:", foundUser.name);
                currentUser = { uid: userId, ...foundUser };
                proceedToGame(authScreen, onSuccess);
            } else {
                alert("User not found with this PIN. Please create a key.");
                loginBtn.disabled = true;
            }
        }
    } catch (error) {
        console.error("Login Error:", error);
        alert("Login failed: " + error.message);
    }
}

// --- Creation Logic ---
function openCreationPopup() {
    popupOverlay.classList.remove("hidden");
    resetInputs(createInputs);
    resetInputs(confirmInputs);
    createInputs[0].focus();
    finalCreateBtn.disabled = true;
}

function validateCreation() {
    const p1 = getPinFromInputs(createInputs);
    const p2 = getPinFromInputs(confirmInputs);

    if (p1.length === 4 && p2.length === 4 && p1 === p2) {
        finalCreateBtn.disabled = false;
    } else {
        finalCreateBtn.disabled = true;
    }
}

async function createNewUser(pin, authScreen, onSuccess) {
    // Check global uniqueness first
    const dbRef = ref(db, "users");
    const snapshot = await get(dbRef);
    let exists = false;
    if (snapshot.exists()) {
        exists = Object.values(snapshot.val()).some(u => u.pin === pin);
    }

    if (exists) {
        alert("This PIN is already in use.");
        resetInputs(createInputs);
        resetInputs(confirmInputs);
        return;
    }

    const newUid = "user_" + Date.now();
    const newUser = {
        name: "FamilyMember_" + pin.slice(-2),
        pin: pin,
        characters: {}
    };

    try {
        await set(ref(db, "users/" + newUid), newUser);
        alert("Auth Key Created! You can now Connect.");

        // Return to Intro
        popupOverlay.classList.add("hidden");
        resetInputs(createInputs);
        resetInputs(confirmInputs);
        resetInputs(loginInputs); // Keep it empty?
        loginInputs[0].focus();

    } catch (e) {
        console.error("Creation failed", e);
        alert("Failed to create user: " + e.message);
    }
}

function proceedToGame(authScreen, onSuccess) {
    authScreen.classList.remove("active");
    authScreen.classList.add("hidden");
    onSuccess(currentUser);
}
