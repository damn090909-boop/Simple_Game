import { db, ref, get, child, onDisconnect, set, update } from "./config.js";

// State
let currentPin = "";
export let currentUser = null;

// Audio Context (must resume on first touch)
let audioContext = null;

export function initAuth(onLoginSuccess) {
    const pinDisplay = document.getElementById("pin-display");
    const keys = document.querySelectorAll(".key");
    const authScreen = document.getElementById("auth-screen");

    // Initialize AudioContext on first interaction
    document.body.addEventListener('touchstart', resumeAudio, { once: true });
    document.body.addEventListener('click', resumeAudio, { once: true });

    keys.forEach(key => {
        key.addEventListener("click", () => {
            const num = key.dataset.num;

            // Handle Backspace
            if (key.classList.contains("backspace")) {
                currentPin = currentPin.slice(0, -1);
                updateDisplay(pinDisplay);
                return;
            }

            // Ignote empty keys
            if (key.classList.contains("empty")) return;

            // Handle Number Input
            if (currentPin.length < 4) {
                currentPin += num;
                updateDisplay(pinDisplay);

                // Auto-submit on 4 digits
                if (currentPin.length === 4) {
                    attemptLogin(currentPin, authScreen, onLoginSuccess);
                }
            }
        });
    });
}

function updateDisplay(el) {
    // Show dots or numbers? UX says "• • • •" usually, but let's show dots for security
    // The input is type="password" so setting value works
    el.value = currentPin;
}

function resumeAudio() {
    if (!audioContext) {
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (audioContext.state === 'suspended') {
        audioContext.resume();
    }
}

async function attemptLogin(pin, authScreen, onSuccess) {
    console.log("Attempting login with PIN:", pin);

    // In strict security, we shouldn't fetch all users.
    // But for MVP/Family app, we fetch 'users' node and find match.
    // Optimization: In real app, use query logic.

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

                // Transition
                authScreen.classList.remove("active");
                authScreen.classList.add("hidden");

                // Callback to Main App
                onSuccess(currentUser);
            } else {
                alert("Wrong PIN!");
                currentPin = "";
                updateDisplay(document.getElementById("pin-display"));
            }
        } else {
            // First time setup? Or empty DB.
            // For MVP, we might need to seed a user manually or allow creation?
            // Spec says "Search users node". If empty, can't login.
            alert("No users found in Database.");
            currentPin = "";
            updateDisplay(document.getElementById("pin-display"));
        }
    } catch (error) {
        console.error("Login Error:", error);
        alert("Login failed: " + error.message);
    }
}
