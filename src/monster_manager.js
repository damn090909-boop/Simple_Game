import { Character } from "./character.js";
import { app, worldContainer, TILE_SIZE, mySprite, entityLayer, getCurrentMapId } from "./engine.js";
import { findPath } from "./pathfinder.js";

export class MonsterManager {
    constructor(rpgSystem) {
        this.rpgSystem = rpgSystem;
        this.monsters = [];
        this.spawnTimer = 0;

        // Listen for taps handled in engine
    }

    update(delta) {
        // Spawn Logic (Simple: Maintain 5 monsters nearby)
        this.spawnTimer += delta;
        if (this.spawnTimer > 300 && this.monsters.length < 5) { // ~5 seconds
            this.spawnMonster();
            this.spawnTimer = 0;
        }

        // AI Loop
        const playerGridX = Math.floor(mySprite.x / TILE_SIZE);
        const playerGridY = Math.floor(mySprite.y / TILE_SIZE);

        this.monsters.forEach(m => {
            if (m.isDead) return;

            // mapId check
            if (m.mapId !== getCurrentMapId()) {
                m.visible = false;
                return;
            }
            m.visible = true;

            // AI Check Frequency
            m.aiTimer = (m.aiTimer || 0) + delta;
            if (m.aiTimer > 60) { // Update AI every ~1 sec
                m.aiTimer = 0;

                const mGridX = Math.floor(m.x / TILE_SIZE);
                const mGridY = Math.floor(m.y / TILE_SIZE);

                const dist = Math.abs(playerGridX - mGridX) + Math.abs(playerGridY - mGridY);

                if (dist <= 1) {
                    // Attack
                    this.monsterAttack(m);
                } else if (dist < 5) {
                    // Chase
                    const path = findPath(mGridX, mGridY, playerGridX, playerGridY);
                    if (path && path.length > 1) {
                        m.targetPos = { x: path[1].x * TILE_SIZE + 24, y: path[1].y * TILE_SIZE + 48 };
                    }
                } else {
                    // Idle (Random Move)
                    if (Math.random() < 0.3) {
                        const rx = mGridX + (Math.random() < 0.5 ? 1 : -1);
                        const ry = mGridY + (Math.random() < 0.5 ? 1 : -1);
                        m.targetPos = { x: rx * TILE_SIZE + 24, y: ry * TILE_SIZE + 48 };
                    }
                }
            }

            // Movement Lerp
            if (m.targetPos) {
                const dx = m.targetPos.x - m.x;
                const dy = m.targetPos.y - m.y;
                const d = Math.sqrt(dx * dx + dy * dy);
                if (d > 2) {
                    m.x += (dx / d) * 1 * delta; // Speed 1
                    m.y += (dy / d) * 1 * delta;
                    m.zIndex = m.y;

                    if (dx < 0) m.scale.x = -1;
                    else m.scale.x = 1;

                    m.animate(delta, true);
                } else {
                    m.animate(delta, false);
                }
            } else {
                m.animate(delta, false);
            }
        });
    }

    spawnMonster() {
        const mapId = getCurrentMapId();
        if (mapId.startsWith("interior")) return; // Don't spawn inside for now

        const px = Math.floor(mySprite.x / TILE_SIZE);
        const py = Math.floor(mySprite.y / TILE_SIZE);

        // Random pos around player
        const rx = px + Math.floor(Math.random() * 10 - 5);
        const ry = py + Math.floor(Math.random() * 10 - 5);

        // Define Monster Data
        const mData = {
            parts: { body: 'body_basic', head: 'head_1' }, // Reuse basic parts
            skinColor: "#00FF00" // Green Slime-ish
        };

        const monster = new Character(mData);
        monster.x = rx * TILE_SIZE + 24;
        monster.y = ry * TILE_SIZE + 48;
        monster.zIndex = monster.y;
        monster.mapId = mapId;
        monster.hp = 30;
        monster.maxHp = 30;
        monster.xpValue = 20;

        monster.updateHpBar(30, 30);

        entityLayer.addChild(monster);
        this.monsters.push(monster);
    }

    checkTap(x, y) {
        // Find tapped monster
        // Simple distance check
        for (let i = 0; i < this.monsters.length; i++) {
            const m = this.monsters[i];
            const dx = m.x - x;
            const dy = m.y - 24 - y; // Adjust for pivot?
            // Character pivot is bottom. y is feet.
            // Center is around y-24.

            if (Math.abs(dx) < 20 && Math.abs(dy) < 30) {
                this.playerAttack(m);
                return true;
            }
        }
        return false;
    }

    playerAttack(monster) {
        // Player Attack Animation? 
        // Just visual effect for now
        this.rpgSystem.showFloater("POW!", 0xFFFFFF);

        // Dmg
        const dmg = this.rpgSystem.stats.str * 2;
        monster.hp -= dmg;
        monster.updateHpBar(monster.hp, monster.maxHp);

        // Color Flash?
        // monster.flashDamage(); // If implemented

        if (monster.hp <= 0) {
            this.killMonster(monster);
        }
    }

    monsterAttack(monster) {
        if (monster.isDead) return;

        // Cooldown
        if ((monster.attackCooldown || 0) > 0) {
            monster.attackCooldown -= 1;
            return;
        }
        monster.attackCooldown = 60; // 1 sec

        // Attack Player
        this.rpgSystem.takeDamage(5); // Fixed dmg
        // mySprite.flashDamage();
    }

    killMonster(monster) {
        monster.isDead = true;
        entityLayer.removeChild(monster);
        this.monsters = this.monsters.filter(m => m !== monster);

        // Reward
        this.rpgSystem.gainXp(monster.xpValue);
        // Drop Item? (C-4 logic reuse possible)
    }
}
