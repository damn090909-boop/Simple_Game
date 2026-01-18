import { currentUser } from "./auth.js";
import { db, ref, update, onValue } from "./config.js";

// Stats
// Level, XP, HP, MaxHP, Attack

export function initRPG() {
    if (!currentUser) return;

    // Listen to my stats
    /*
    onValue(ref(db, `users/${currentUser.uid}/stats`), (snap) => {
        const stats = snap.val();
        updateHUD(stats);
    });
    */
    // For MVP, if stats missing, init them.
}

export function gainXP(amount) {
    // Logic: fetch current, add, check level up, write back.
}

// Stub for now to allow Monster logic to proceed
