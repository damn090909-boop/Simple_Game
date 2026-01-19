import * as PIXI from "https://cdnjs.cloudflare.com/ajax/libs/pixi.js/7.2.4/pixi.min.mjs";
import { app, worldContainer, TILE_SIZE, mySprite, movePlayerTo } from "./engine.js";
import { OTHER_PLAYERS } from "./network.js";
import { findPath } from "./pathfinder.js";
import { TradeSystem } from "./trade.js";

export class InteractionSystem {
    constructor(tradeSystem) {
        this.tradeSystem = tradeSystem;
        this.targetUid = null;
        this.actionBubble = null;

        // Listen for movement to hide bubble if moved away
        app.ticker.add(() => this.update());
    }

    checkTap(x, y) {
        // x, y are World Coordinates
        for (const [uid, remote] of Object.entries(OTHER_PLAYERS)) {
            const sprite = remote.sprite;
            // Check bounds (assuming 48x48 approx)
            if (x >= sprite.x - 24 && x <= sprite.x + 24 &&
                y >= sprite.y - 48 && y <= sprite.y) {

                console.log("Tapped on player:", uid);
                this.handlePlayerTap(uid, remote);
                return true;
            }
        }
        return false;
    }

    handlePlayerTap(uid, remote) {
        this.targetUid = uid;

        // 1. Move to Adjacent Tile
        const targetTileX = Math.round(remote.targetX / TILE_SIZE);
        const targetTileY = Math.round(remote.targetY / TILE_SIZE);

        const myTileX = Math.round(mySprite.x / TILE_SIZE);
        const myTileY = Math.round(mySprite.y / TILE_SIZE);

        // Find nearest open neighbor
        const neighbors = [
            { x: 0, y: -1 }, { x: 0, y: 1 }, { x: -1, y: 0 }, { x: 1, y: 0 }
        ];

        let bestTx = -1, bestTy = -1;
        let minDist = 9999;

        for (const n of neighbors) {
            const tx = targetTileX + n.x;
            const ty = targetTileY + n.y;
            // Check distance to me
            const dist = Math.abs(tx - myTileX) + Math.abs(ty - myTileY);
            if (dist < minDist) {
                minDist = dist;
                bestTx = tx;
                bestTy = ty;
            }
        }

        if (bestTx !== -1) {
            // Move there
            // TODO: Call move function in engine or input
            // For now, let's just show bubble if close enough, or simulate move
            // We need a way to trigger movement. 
            // Engine exposes nothing for "MoveTo". 
            // We'll rely on global "moveLocalPlayerTo(x, y)" if checking valid?
            // Or just check distance.

            const distCurrent = Math.sqrt(Math.pow(remote.sprite.x - mySprite.x, 2) + Math.pow(remote.sprite.y - mySprite.y, 2));

            if (distCurrent < TILE_SIZE * 2) {
                this.showActionBubble(uid, remote.sprite);
            } else {
                // Auto-walk to target
                console.log("Moving to target:", bestTx, bestTy);
                movePlayerTo(bestTx, bestTy);

                // Show bubble immediately? Or wait?
                // Let's show it so user knows why they are moving.
                this.showActionBubble(uid, remote.sprite);
            }
        }
    }

    showActionBubble(uid, sprite) {
        if (this.actionBubble) {
            this.actionBubble.destroy();
        }

        const container = new PIXI.Container();

        // Background
        const bg = new PIXI.Graphics();
        bg.beginFill(0xFFFFFF);
        bg.lineStyle(2, 0x000000);
        bg.drawRoundedRect(0, 0, 100, 40, 10);
        bg.endFill();
        container.addChild(bg);

        // Text
        const text = new PIXI.Text("🤝 Trade", {
            fontSize: 16,
            fontWeight: "bold",
            fill: "#333"
        });
        text.anchor.set(0.5);
        text.x = 50;
        text.y = 20;
        container.addChild(text);

        // Interactive
        container.eventMode = 'static';
        container.cursor = 'pointer';
        container.on('pointertap', () => {
            console.log("Requesting Trade with", uid);
            this.tradeSystem.requestTrade(uid);
            this.removeBubble();
        });

        container.x = sprite.x - 50;
        container.y = sprite.y - 80;
        container.zIndex = 99999;

        worldContainer.addChild(container);
        this.actionBubble = container;
        this.bubbleTarget = sprite;
    }

    removeBubble() {
        if (this.actionBubble) {
            this.actionBubble.destroy();
            this.actionBubble = null;
            this.targetUid = null;
        }
    }

    update() {
        if (this.actionBubble && this.bubbleTarget) {
            this.actionBubble.x = this.bubbleTarget.x - 50;
            this.actionBubble.y = this.bubbleTarget.y - 80;

            // If moved away?
            const dist = Math.sqrt(Math.pow(this.bubbleTarget.x - mySprite.x, 2) + Math.pow(this.bubbleTarget.y - mySprite.y, 2));
            if (dist > TILE_SIZE * 3) {
                this.removeBubble();
            }
        }
    }
}
