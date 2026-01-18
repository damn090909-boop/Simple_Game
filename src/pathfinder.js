import { mapData } from "./engine.js";

// Node class for A*
class Node {
    constructor(x, y, parent = null) {
        this.x = x;
        this.y = y;
        this.parent = parent;
        this.g = 0; // Cost from start
        this.h = 0; // Heuristic to end
        this.f = 0; // Total cost
    }
}

export function findPath(startX, startY, endX, endY) {
    // Validate bounds
    if (!isValid(endX, endY)) return null;

    // Validate collision (Can't move to wall)
    // Note: mapData[y][x]
    if (mapData[endY][endX] === 1) return null; // blocked

    const openList = [];
    const closedList = [];

    openList.push(new Node(startX, startY));

    while (openList.length > 0) {
        // Find lowest f
        let lowestIndex = 0;
        for (let i = 1; i < openList.length; i++) {
            if (openList[i].f < openList[lowestIndex].f) {
                lowestIndex = i;
            }
        }

        let currentNode = openList[lowestIndex];

        // Remove current from open, add to closed
        openList.splice(lowestIndex, 1);
        closedList.push(currentNode);

        // Found destination
        if (currentNode.x === endX && currentNode.y === endY) {
            let path = [];
            let curr = currentNode;
            while (curr.parent) {
                path.push({ x: curr.x, y: curr.y });
                curr = curr.parent;
            }
            return path.reverse(); // Return path from start to end (excluding start)
        }

        // Neighbors
        let neighbors = [
            { x: 0, y: -1 },
            { x: 0, y: 1 },
            { x: -1, y: 0 },
            { x: 1, y: 0 }
            // No diagonal for now
        ];

        for (let i = 0; i < neighbors.length; i++) {
            const nx = currentNode.x + neighbors[i].x;
            const ny = currentNode.y + neighbors[i].y;

            if (!isValid(nx, ny)) continue;
            if (mapData[ny][nx] === 1) continue; // Blocked

            // Check if in closed list
            if (closedList.find(node => node.x === nx && node.y === ny)) continue;

            // G cost: +1 for orthogonal
            const gScore = currentNode.g + 1;
            let gScoreIsBest = false;

            let neighborNode = openList.find(node => node.x === nx && node.y === ny);

            if (!neighborNode) {
                // New node
                gScoreIsBest = true;
                neighborNode = new Node(nx, ny, currentNode);
                neighborNode.h = Math.abs(nx - endX) + Math.abs(ny - endY); // Manhattan
                openList.push(neighborNode);
            } else if (gScore < neighborNode.g) {
                gScoreIsBest = true;
            }

            if (gScoreIsBest) {
                neighborNode.parent = currentNode;
                neighborNode.g = gScore;
                neighborNode.f = neighborNode.g + neighborNode.h;
            }
        }
    }

    return null; // No path found
}

function isValid(x, y) {
    if (!mapData || mapData.length === 0) return false;
    const h = mapData.length;
    const w = mapData[0].length;
    return x >= 0 && x < w && y >= 0 && y < h;
}
