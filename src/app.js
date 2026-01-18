import { initLoader } from "./loader.js";
import { initAuth } from "./auth.js";
import { initLobby } from "./lobby.js";
// import { initGame } from "./engine.js"; // Will be created next

async function startApp() {
    console.log("Starting App...");

    // 1. Load Assets
    await initLoader();

    // 2. Init Auth
    // Pass callback for when login is done
    initAuth((user) => {
        console.log("Logged in as:", user.name);

        // 3. Init Lobby
        // Pass callback for when character is selected/created
        initLobby((characterData) => {
            console.log("Character Selected:", characterData);

            // 4. Start Game
            import("./engine.js").then(module => {
                module.initGame(user, characterData);

                // 5. Init Expansion
                import("./housing.js").then(h => h.initHousing());
                import("./portal.js").then(p => p.initPortal());
                import("./ui.js").then(u => u.initUI());
                import("./shop.js").then(s => s.initShop());
                import("./trade.js").then(t => t.initTrade());

                // 6. Init RPG
                import("./rpg_core.js").then(r => r.initRPG());
                import("./monster.js").then(m => m.initMonsters());
            });
        });
    });
}

// Start
startApp();
