import { db, ref, update, onValue } from "./config.js";
import { app } from "./engine.js";

export class RPGSystem {
    constructor(myUid, mySprite) {
        this.uid = myUid;
        this.sprite = mySprite;
        this.stats = {
            level: 1,
            xp: 0,
            maxXp: 100,
            hp: 100,
            maxHp: 100,
            str: 5,
            vit: 5,
            int: 5,
            agi: 5,
            freePoints: 0
        };

        // Listen to remote stats if exists
        this.initSync();
    }

    initSync() {
        const statsRef = ref(db, `players/${this.uid}/stats`);
        onValue(statsRef, (snapshot) => {
            const data = snapshot.val();
            if (data) {
                this.stats = { ...this.stats, ...data };
                console.log("Stats synced:", this.stats);
                this.updateVisuals();
            } else {
                // Init default on server
                this.saveStats();
            }
        });
    }

    saveStats() {
        update(ref(db, `players/${this.uid}/stats`), this.stats);
    }

    gainXp(amount) {
        this.stats.xp += amount;
        if (this.stats.xp >= this.stats.maxXp) {
            this.levelUp();
        } else {
            this.saveStats();
        }
        // Show XP Floater?
        this.showFloater(`+${amount} XP`, 0x00FFFF);
    }

    levelUp() {
        this.stats.level++;
        this.stats.xp -= this.stats.maxXp;
        this.stats.maxXp = Math.floor(this.stats.maxXp * 1.2);
        this.stats.maxHp += 10;
        this.stats.hp = this.stats.maxHp;
        this.stats.freePoints += 3;

        this.saveStats();
        this.showFloater("LEVEL UP!", 0xFFD700);
        // Effect?
    }

    takeDamage(amount) {
        this.stats.hp -= amount;
        if (this.stats.hp <= 0) {
            this.stats.hp = 0;
            this.faint();
        }
        this.saveStats();
        this.updateVisuals(); // Update HP Bar
        this.showFloater(`-${amount}`, 0xFF0000);
    }

    faint() {
        console.log("Player Fainted!");
        // Logic handled in Engine usually (Fade out, Respawn)
        // Emit event or call engine method?
        // Let's dispatch a custom event on window
        window.dispatchEvent(new CustomEvent("playerFainted"));
    }

    updateVisuals() {
        if (this.sprite && this.sprite.updateHpBar) {
            this.sprite.updateHpBar(this.stats.hp, this.stats.maxHp);
        }
    }

    showFloater(text, color) {
        if (!this.sprite) return;
        // Simple text floating up
        const style = new PIXI.TextStyle({
            fontFamily: "Arial", fontSize: 20, fill: color, stroke: 0x000000, strokeThickness: 3
        });
        const txt = new PIXI.Text(text, style);
        txt.anchor.set(0.5);
        txt.x = 0;
        txt.y = -60;
        this.sprite.addChild(txt);

        let time = 0;
        const animate = (delta) => {
            time += delta;
            txt.y -= 1 * delta;
            txt.alpha -= 0.02 * delta;
            if (time > 60) {
                txt.destroy();
                app.ticker.remove(animate);
            }
        };
        app.ticker.add(animate);
    }
}
