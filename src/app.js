import { initLoader } from "./loader.js?v=2";
import { initAuth } from "./auth.js";
import { initLobby } from "./lobby.js";
import { initGame } from "./engine.js";

async function startApp() {
    console.log("Starting App...");

    // 1. Load Assets
    try {
        await initLoader();
    } catch (e) {
        console.error("Asset Load Failed:", e);
        alert("Failed to load game assets. Check connection.\n" + e.message);
        return; // Stop execution
    }

    // 2. Init Auth
    // Pass callback for when login is done
    initAuth((user) => {
        console.log("Logged in as:", user.name);

        // 3. Init Lobby - Pass user object and Game Start Callback
        initLobby(user, (charData) => {
            // 4. Start Game (Async)
            initGame(user, charData).catch(err => console.error("Game Start Error:", err));
        });
    });
}

// Start
startApp();
