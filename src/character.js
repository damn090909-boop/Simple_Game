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
    }
}
