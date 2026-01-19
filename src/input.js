import * as PIXI from "https://cdnjs.cloudflare.com/ajax/libs/pixi.js/7.2.4/pixi.min.mjs";
import { app, worldContainer, TILE_SIZE, mapData } from "./engine.js";
import { findPath } from "./pathfinder.js";
import { updateMyPosition } from "./network.js"; // Will be created
import { centerOn } from "./camera.js";

// Joystick State
let joystickParams = {
    active: false,
    originX: 0,
    originY: 0,
    currentX: 0,
    currentY: 0,
    vectorX: 0,
    vectorY: 0,
    id: null, // Touch ID
    startTime: 0 // For tap detection
};

let joystickBase, joystickKnob;
let onTapCallback = null; // Callback for taps

export function initInput(localPlayer, onMoveStart, onTap) {
    onTapCallback = onTap; // Set callback

    // 1. Create Joystick UI Elements
    const zone = document.createElement("div");
    zone.id = "joystick-zone";
    document.body.appendChild(zone); // attach to body to cover full screen

    joystickBase = document.createElement("div");
    joystickBase.className = "joystick-base";
    zone.appendChild(joystickBase);

    joystickKnob = document.createElement("div");
    joystickKnob.className = "joystick-knob";
    joystickBase.appendChild(joystickKnob);

    // 2. Touch Events
    zone.addEventListener("touchstart", onTouchStart, { passive: false });
    zone.addEventListener("touchmove", onTouchMove, { passive: false });
    zone.addEventListener("touchend", onTouchEnd, { passive: false });
    zone.addEventListener("touchcancel", onTouchEnd, { passive: false });

    // 3. Mouse Fallback (for testing on desktop without touch simulation)
    // Optional, but good for verification.
    zone.addEventListener("mousedown", onMouseDown);
}

// Get Input Vector for Engine
export function getInputVector() {
    if (!joystickParams.active) return null;
    return { x: joystickParams.vectorX, y: joystickParams.vectorY };
}

function onTouchStart(e) {
    e.preventDefault();
    // Only track first touch if not active
    if (joystickParams.active) return;

    const touch = e.changedTouches[0];
    joystickParams.id = touch.identifier;
    startJoystick(touch.clientX, touch.clientY);
}

function onTouchMove(e) {
    e.preventDefault();
    if (!joystickParams.active) return;

    // Find our touch
    for (let i = 0; i < e.changedTouches.length; i++) {
        if (e.changedTouches[i].identifier === joystickParams.id) {
            moveJoystick(e.changedTouches[i].clientX, e.changedTouches[i].clientY);
            break;
        }
    }
}

function onTouchEnd(e) {
    e.preventDefault();
    if (!joystickParams.active) return;

    for (let i = 0; i < e.changedTouches.length; i++) {
        if (e.changedTouches[i].identifier === joystickParams.id) {
            endJoystick(e.changedTouches[i].clientX, e.changedTouches[i].clientY);
            break;
        }
    }
}

// Mouse Handlers
function onMouseDown(e) {
    e.preventDefault();
    startJoystick(e.clientX, e.clientY);

    const onMouseMove = (ev) => {
        ev.preventDefault();
        moveJoystick(ev.clientX, ev.clientY);
    };

    const onMouseUp = (ev) => {
        ev.preventDefault();
        endJoystick(ev.clientX, ev.clientY);
        document.removeEventListener("mousemove", onMouseMove);
        document.removeEventListener("mouseup", onMouseUp);
    };

    document.addEventListener("mousemove", onMouseMove, { passive: false });
    document.addEventListener("mouseup", onMouseUp, { passive: false });
}

// Logic
function startJoystick(x, y) {
    joystickParams.active = true;
    joystickParams.originX = x;
    joystickParams.originY = y;
    joystickParams.currentX = x;
    joystickParams.currentY = y;
    joystickParams.vectorX = 0;
    joystickParams.vectorY = 0;
    joystickParams.startTime = Date.now();

    // Show Visuals
    joystickBase.classList.add("active");
    joystickBase.style.left = x + "px";
    joystickBase.style.top = y + "px";
    joystickKnob.style.transform = `translate(-50%, -50%)`;
}

function moveJoystick(x, y) {
    joystickParams.currentX = x;
    joystickParams.currentY = y;

    const maxRadius = 60; // Half of base width (120px)
    let dx = x - joystickParams.originX;
    let dy = y - joystickParams.originY;
    const dist = Math.sqrt(dx * dx + dy * dy);

    // Normalize
    if (dist > maxRadius) {
        const ratio = maxRadius / dist;
        dx *= ratio;
        dy *= ratio;
    }

    // Move Knob
    joystickKnob.style.transform = `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px))`;

    joystickParams.vectorX = dx / maxRadius;
    joystickParams.vectorY = dy / maxRadius;
}

function endJoystick(endX = 0, endY = 0) {
    joystickParams.active = false;
    joystickParams.vectorX = 0;
    joystickParams.vectorY = 0;
    joystickBase.classList.remove("active");

    // Tap Detection
    const duration = Date.now() - joystickParams.startTime;
    const dx = endX - joystickParams.originX;
    const dy = endY - joystickParams.originY;
    const dist = Math.sqrt(dx * dx + dy * dy);

    // If quick and short movement, it's a Tap
    if (duration < 300 && dist < 10 && onTapCallback) {
        // We pass the screen coordinates of the tap
        onTapCallback(joystickParams.originX, joystickParams.originY);
    }
}
