import * as PIXI from "https://cdnjs.cloudflare.com/ajax/libs/pixi.js/7.2.4/pixi.min.mjs";
import { Assets } from "./loader.js";

export class Character extends PIXI.Container {
    constructor(data) {
        super();
        this.data = data;

        // Container for visual parts (center anchor logic)
        this.view = new PIXI.Container();
        this.addChild(this.view);

        // Parts Map
        this.parts = {};

        // Build Skeleton
        this.build();

        // Animation State
        this.animTime = 0;
    }

    build() {
        const { parts, skinColor } = this.data;
        const tint = skinColor ? (skinColor.startsWith("#") ? parseInt(skinColor.replace("#", ""), 16) : skinColor) : 0xFFFFFF;

        // 1. Legs (Behind Body)
        this.parts.legL = this.createPart(parts.leg || 'leg_basic', -6, 20, tint);
        this.parts.legR = this.createPart(parts.leg || 'leg_basic', 6, 20, tint);

        // 2. Body
        this.parts.body = this.createPart(parts.body || 'body_basic', 0, 0, tint);

        // 3. Head
        this.parts.head = this.createPart(parts.head || 'head_1', 0, -26, tint);

        // 4. Arms
        this.parts.armL = this.createPart(parts.arm || 'arm_basic', -14, -8, tint);
        this.parts.armR = this.createPart(parts.arm || 'arm_basic', 14, -8, tint);

        // Add in Z-order
        this.view.addChild(this.parts.legL);
        this.view.addChild(this.parts.legR);
        this.view.addChild(this.parts.body); // Body covers legs
        this.view.addChild(this.parts.head);
        this.view.addChild(this.parts.armL);
        this.view.addChild(this.parts.armR);
    }

    createPart(alias, x, y, tint = 0xFFFFFF) {
        const texture = Assets.textures[alias] || PIXI.Texture.WHITE;
        const sprite = new PIXI.Sprite(texture);
        sprite.anchor.set(0.5, 0.1); // Anchor at top joint usually better for rotation
        sprite.x = x;
        sprite.y = y;
        sprite.tint = tint;
        return sprite;
    }

    animate(delta, isMoving) {
        if (isMoving) {
            this.animTime += delta * 0.2;
            const sin = Math.sin(this.animTime);
            const cos = Math.cos(this.animTime);

            // Walk Cycle
            // Arms swing opposite to legs
            this.parts.armL.rotation = sin * 0.5;
            this.parts.armR.rotation = -sin * 0.5;

            this.parts.legL.rotation = -sin * 0.8;
            this.parts.legR.rotation = sin * 0.8;

            // Bobbing
            this.view.y = Math.abs(cos) * 2 - 24; // Pivot correction
        } else {
            // Reset / Idle
            this.parts.armL.rotation = 0.1; // Relaxed
            this.parts.armR.rotation = -0.1;
            this.parts.legL.rotation = 0;
            this.parts.legR.rotation = 0;
            this.view.y = -24; // Default Y offset if needed
            this.animTime = 0;
        }

        // Chat Bubble Timer
        if (this.chatBubble) {
            this.chatTimer += (delta / 60); // approx seconds
            if (this.chatTimer > 5) {
                this.chatBubble.alpha -= 0.05;
                if (this.chatBubble.alpha <= 0) {
                    this.removeChat();
                }
            }
        }
    }


    // Item 33: Chat Bubble
    showChat(message) {
        // Remove existing bubble if any
        if (this.chatBubble) {
            this.chatBubble.destroy();
            this.chatBubble = null;
        }

        const bubble = new PIXI.Container();

        // Text
        const textStyle = new PIXI.TextStyle({
            fontFamily: "Arial",
            fontSize: 14,
            fill: "black",
            wordWrap: true,
            wordWrapWidth: 120
        });
        const textMetrics = PIXI.TextMetrics.measureText(message, textStyle);
        const text = new PIXI.Text(message, textStyle);
        text.x = 10;
        text.y = 10;

        // Background (Rounded Rect)
        const bg = new PIXI.Graphics();
        const w = textMetrics.width + 20;
        const h = textMetrics.height + 20;

        bg.beginFill(0xFFFFFF);
        bg.lineStyle(2, 0x000000, 1);
        bg.drawRoundedRect(0, 0, w, h, 10);

        // Tail
        bg.moveTo(w / 2 - 5, h);
        bg.lineTo(w / 2, h + 8);
        bg.lineTo(w / 2 + 5, h);
        bg.endFill();

        bg.addChild(text);
        bubble.addChild(bg);

        // Position above head
        bubble.pivot.set(w / 2, h + 8); // Pivot at tail bottom
        bubble.y = -60; // Above sprite
        bubble.x = 0;

        this.addChild(bubble);
        this.chatBubble = bubble;

        // Auto-remove after 5 seconds
        if (this.chatTimer) clearTimeout(this.chatTimer);
        this.chatTimer = setTimeout(() => {
            if (this.chatBubble) {
                this.chatBubble.destroy();
                this.chatBubble = null;
            }
        }, 5000);
    }
}
