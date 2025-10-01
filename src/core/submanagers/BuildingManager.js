// NOTE: You must update these imports based on the actual file paths
// where your Unit, ProductionBuilding, CommandBuilding, EconomicBuilding, and OtherBuilding classes reside.
import { Unit } from '../../entities/Unit.js';
import { ProductionBuilding } from '../../entities/ProductionBuilding.js';
import { CommandBuilding } from '../../entities/CommandBuilding.js';
import { EconomicBuilding } from '../../entities/EconomicBuilding.js';
import { OtherBuilding } from '../../entities/OtherBuilding.js';

/**
 * BuildingManager handles all logic related to constructing, spawning, queueing,
 * and checking collision for units and buildings.
 */
export class BuildingManager {
    /**
     * @param {GameController} gameController - The main game controller instance.
     */
    constructor(gameController) {
        this.gameController = gameController;
        // Destructure commonly used dependencies for cleaner access within methods
        this.gameState = gameController.gameState;
        this.canvas = gameController.canvas;
        this.uiController = gameController.uiController;
        this.dataManager = gameController.dataManager;

        // Alias GameController methods directly to the manager instance ('this')
        // This allows methods like 'trainItem' to use 'this.isAffordable' 
        // and 'this.deductCost' without needing 'this.gameController.' prefix.
        this.isAffordable = gameController.isAffordable.bind(gameController);
        this.deductCost = gameController.deductCost.bind(gameController);
    }

    // ========================= GAME MECHANISMS ========================= //
    buildBuilding(team, x, y, itemData) {
        const id = this.gameState.getNextId();
        let building;

        // Check the itemData type to create the correct building object.
        if (itemData.type === "Production") {
            building = new ProductionBuilding(id, team, x, y, this.canvas, this.gameController, itemData);
        } else if (itemData.type === "Command") {
            building = new CommandBuilding(id, team, x, y, this.canvas, this.gameController, itemData);
        } else if (itemData.type === "Economic") {
            // Instantiate an EconomicBuilding for economic types.
            building = new EconomicBuilding(id, team, x, y, this.canvas, this.gameController, itemData);
        } else {
            // Default to the specific OtherBuilding class for other types.
            building = new OtherBuilding(id, team, x, y, this.canvas, this.gameController, itemData);
        }

        // Set the initial production time for economic buildings.
        if (building instanceof EconomicBuilding) {
            building.lastProductionTime = performance.now();
        }

        this.gameState.addObject(building);
        return building;
    }

    spawnUnit(team, x, y, itemData) {
        const id = this.gameState.getNextId();
        // Pass the entire itemData object to the Unit constructor
        console.log(itemData)
        const unitWidth = itemData.width || 30;
        const unitHeight = itemData.height || 30;
        const unit = new Unit(id, team, x, y, unitWidth, unitHeight, this.canvas, this.gameController, itemData);
        this.gameState.addObject(unit);
        return unit;
    }

    // 🛠️ Places the building at a location triggered by placement indicator. This is called from main.js to place the starting HQ.
    placeBuilding(itemData, team, x, y) {
        // Build the building and add it to the game state.
        const newBuilding = this.buildBuilding(team, x, y, itemData);

        // Deselect any previous building to avoid conflicts.
        if (this.gameState.productionBuilding) {
            this.gameState.productionBuilding.deselect();
        }

        // Make the newly placed building the primary production building.
        this.gameState.productionBuilding = newBuilding;

        // Select the new building so the UI immediately reflects its production options.
        this.gameState.productionBuilding.select();

        this.uiController.setStatus(`${itemData.name} placed successfully.`);
        return newBuilding;
    }

    // Train a buiilding or unit in produce panel
    trainItem(item, button) {
        const units = this.dataManager.getProductionItems().units;
        const buildings = this.dataManager.getProductionItems().buildings;

        // ✅ check if it's a unit
        if (units.some(u => u.name === item.name)) {
            if (!this.gameState.productionBuilding) {
                this.uiController.setStatus("Select a production building to train units!");
                return;
            }

            const itemToQueue = units.find(u => u.name === item.name);

            if (!this.isAffordable(itemToQueue.cost)) {
                this.uiController.setStatus(`Not enough resources to train ${itemToQueue.name}.`);
                return;
            }

            this.deductCost(itemToQueue.cost);

            this.gameState.productionBuilding.productionQueue.push({ item: itemToQueue, button: button });
            this.uiController.setStatus(`${itemToQueue.name} added to queue.`);
            return;
        }

        // ✅ check if it's a building
        if (buildings.some(b => b.name === item.name)) {
            if (!this.isAffordable(item.cost)) {
                this.uiController.setStatus(`Not enough resources to build ${item.name}.`);
                return;
            }

            this.gameState.pendingBuilding = item;
            this.uiController.setStatus(`Place the ${item.name}.`);
            return;
        }

        // ❌ fallback
        this.uiController.setStatus("Unknown item type.");
    }

    // You'll likely call this from your main game loop (e.g., inside GameController.update(deltaTime))
    checkCompletedProduction() {
        const producingBuildings = Object.values(this.gameState.gameObjects).filter(
            // Filter for any object that is currently tracked for production
            obj => obj.type === 'Building' && (obj.isLocallyProducing || obj.localCountdownEnd > 0)
        );

        producingBuildings.forEach(building => {
            // Condition: Production has finished AND the building is still marked as actively producing
            if (building.isLocallyProducing && building.localCountdownEnd > 0 && Date.now() >= building.localCountdownEnd) {
                // 1. Transition to the persistent 'Ready' state
                building.isLocallyProducing = false;

                // 2. 🔥 NOTIFY THE UI CONTROLLER IMMEDIATELY. Tell the UI that this specific building is now ready for collection.
                this.uiController.onProductionReady(building);
            }
        });
    }

    // ========================= BUILDING PLACEMENT ========================= //

    _isAreaClear(x, y, width, height) {
        // The padding is a fixed value, but this function will now work with the scaled coordinates.
        const padding = 10;
        const paddedWidth = width + padding * 2;
        const paddedHeight = height + padding * 2;

        const newObjLeft = x - paddedWidth / 2;
        const newObjRight = x + paddedWidth / 2;
        const newObjTop = y - paddedHeight / 2;
        const newObjBottom = y + paddedHeight / 2;

        for (const id in this.gameState.gameObjects) {
            const obj = this.gameState.gameObjects[id];

            // Calculate existing object's bounding box
            const objLeft = obj.x - obj.width / 2;
            const objRight = obj.x + obj.width / 2;
            const objTop = obj.y - obj.height / 2;
            const objBottom = obj.y + obj.height / 2;

            if (
                newObjRight > objLeft &&
                newObjLeft < objRight &&
                newObjBottom > objTop &&
                newObjTop < objBottom
            ) {
                return false; // Collision detected
            }
        }
        return true; // No collisions found
    }

    isLocationClearForUnit(x, y, ignoreObject = null) {
        const { width, height } = this.dataManager.getProductionItems().units[0];
        return this._isAreaClear(x, y, width, height, ignoreObject);
    }
    isLocationClear(x, y, dimensions, ignoreObject = null) {
        const tempUnit = {
            x: x,
            y: y,
            width: dimensions.width,
            height: dimensions.height
        };
        const unitRadius = tempUnit.width / 2;

        for (const objId in this.gameState.gameObjects) {
            const otherObj = this.gameState.gameObjects[objId];
            console.log(otherObj)

            // Skip ignored object (the building itself) or non-solid objects
            if (otherObj === ignoreObject) continue;
            if (!Array.isArray(otherObj.tags) || !otherObj.tags.includes('solid')) {
                continue;
            }

            // Check for collision based on the other object's shape
            if (otherObj.tags.includes('structure')) {
                // Circle-to-Rectangle collision check
                const distX = Math.abs(tempUnit.x - otherObj.x);
                const distY = Math.abs(tempUnit.y - otherObj.y);

                const halfOtherWidth = otherObj.width / 2;
                const halfOtherHeight = otherObj.height / 2;

                if (distX > (halfOtherWidth + unitRadius) || distY > (halfOtherHeight + unitRadius)) {
                    continue; // No collision
                }
                if (distX <= halfOtherWidth || distY <= halfOtherHeight) {
                    return false; // Collision
                }

                const dx = distX - halfOtherWidth;
                const dy = distY - halfOtherHeight;
                if ((dx * dx + dy * dy) <= (unitRadius * unitRadius)) {
                    return false; // Collision at the corner
                }
            } else {
                // Circle-to-Circle collision check
                const distance = Math.sqrt(Math.pow(tempUnit.x - otherObj.x, 2) + Math.pow(tempUnit.y - otherObj.y, 2));
                const otherRadius = otherObj.width / 2;
                if (distance < unitRadius + otherRadius) {
                    return false; // Collision
                }
            }
        }
        return true; // No collisions found
    }
}