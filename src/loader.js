import * as PIXI from "https://cdnjs.cloudflare.com/ajax/libs/pixi.js/7.2.4/pixi.min.mjs";

export const Assets = {
    textures: {}
};

export async function initLoader() {
    console.log("Initializing Loader...");

    // Manifest of assets to load
    const manifest = {
        bundles: [
            {
                name: "game-screen",
                assets: [
                    { alias: "tile_grass", src: "assets/tile_grass.png" },
                    { alias: "tile_wall", src: "assets/tile_wall.png" },
                    { alias: "body_basic", src: "assets/body_basic.png" },
                    { alias: "head_1", src: "assets/head_1.png" },
                    { alias: "arm_basic", src: "assets/arm_basic.png" },
                    { alias: "leg_basic", src: "assets/leg_basic.png" },
                    { alias: "building_house_01", src: "assets/building_house_01.png" },
                    { alias: "furniture_bed", src: "assets/furniture_bed.png" },
                    { alias: "furniture_table", src: "assets/furniture_table.png" }
                ]
            }
        ]
    };

    // Initialize PIXI Assets
    await PIXI.Assets.init({ manifest });

    // Load Bundle
    console.log("Loading assets...");
    const loadedAssets = await PIXI.Assets.loadBundle("game-screen");

    // Store reference
    Assets.textures = loadedAssets;
    console.log("Assets Loaded:", Object.keys(Assets.textures));

    return loadedAssets;
}
