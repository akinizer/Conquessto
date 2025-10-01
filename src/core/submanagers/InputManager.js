import { CursorManager } from './CursorManager.js';
export class InputManager {
    constructor(gameController) {
        this.gameController = gameController;
        this.CursorManager = CursorManager;        
        this.canvasManager = gameController.canvasManager;
    }

    // ========================= MOUSE AND KEYBOARD EVENTS ========================= //

    // Left mouse click operations: object click, map canvas click, placement indicator click
    onCanvasLeftClick(event) {
        if (event.button !== 0) return;

        const mousePos = this.getMousePos(event);
        const mouseX = mousePos.x;
        const mouseY = mousePos.y;

        const clickedObject = this.getObjectAt(mouseX, mouseY);

        if (this.gameController.gameState.pendingBuilding) {
            const { width: buildingWidth, height: buildingHeight, cost: buildingCost } = this.gameController.gameState.pendingBuilding;

            const isLocationClear = this.gameController.buildingManager._isAreaClear(mouseX, mouseY, buildingWidth, buildingHeight);

            // Correctly check if the building can be placed within the current viewport.
            const isWithinViewport = (
                mouseX - buildingWidth / 2 >= this.gameController.viewport.x &&
                mouseX + buildingWidth / 2 <= this.gameController.viewport.x + this.gameController.canvas.width &&
                mouseY - buildingHeight / 2 >= this.gameController.viewport.y &&
                mouseY + buildingHeight / 2 <= this.gameController.viewport.y + this.gameController.canvas.height
            );

            if (isLocationClear && isWithinViewport) {
                //deduct cost
                this.gameController.resourceService.deductCost(buildingCost);

                const newBuilding = this.gameController.buildingManager.buildBuilding("friend", mouseX, mouseY, this.gameController.gameState.pendingBuilding);
                this._selectObject(newBuilding);
                this.gameController.uiController.setStatus(`${this.gameController.gameState.pendingBuilding.name} placed.`);
                this.gameController.gameState.pendingBuilding = null;
            } else {
                this.gameController.uiController.setStatus("Cannot place building here. Ensure it's not on top of another object and is within the visible area.");
            }
            return;
        }

        // Use the new, centralized selection method
        this._selectObject(clickedObject);
    }

    // select a game object on map canvas
    _selectObject(object) {
        // Prevent selecting enemy objects
        if (object && object.team !== 'friend') {
            this.gameController.uiController.setStatus("You cannot select enemy units or buildings.");
            // Ensure nothing is selected
            this.gameController.gameState.selectedUnits = [];
            this.gameController.gameState.productionBuilding = null;
            return;
        }

        // Check if the selected object is the current production building
        const isSameProductionBuilding = this.gameController.gameState.productionBuilding && (object === this.gameController.gameState.productionBuilding);

        // If a different object is selected, deselect everything
        if (!isSameProductionBuilding) {
            this.gameController.gameState.selectedUnits.forEach(unit => unit.deselect());
            this.gameController.gameState.selectedUnits = [];
            if (this.gameController.gameState.productionBuilding) {
                this.gameController.gameState.productionBuilding.deselect();
                this.gameController.gameState.productionBuilding = null;
            }
        }

        if (object && object.itemData) {
            console.log(`Selected object data:`, object);
            this.gameController.uiController.selectedObject = object;

            switch (object.itemData.type) {
                case "Production":
                    if (!isSameProductionBuilding) {
                        this.gameController.gameState.productionBuilding = object;
                        this.gameController.gameState.productionBuilding.select();
                        this.gameController.uiController.setStatus(`${object.itemData.name} selected as primary.`);
                        if (!this.gameController.gameState.productionBuilding.rallyPoint) {
                            this.gameController.gameState.productionBuilding.rallyPoint = { x: object.x, y: object.y };
                        }
                    }
                    const isReadyForCollection =
                        !object.isLocallyProducing &&
                        object.localCountdownEnd > 0 &&
                        object.localCountdownEnd <= Date.now();

                    if (isReadyForCollection && !object.producingItemName) {
                        // If the building is ready but the name got wiped, try to find the item
                        // in the produces list and set the name for the UI draw.
                        // this.gameController IS THE LAST RESORT AGAINST DATA CORRUPTION.
                        // For example, assume the first producible item is the one that finished. 
                        // this.gameController is a defensive coding measure.
                        const producesList = object.itemData.produces || [];
                        if (producesList.length > 0) {
                            object.producingItemName = producesList[0];
                            console.warn(`[DEFENSE] producingItemName was missing for READY building. Set to: ${object.producingItemName}`);
                        }
                    }
                    this.gameController.uiController.fillProducesTab(object);
                    break;
                case "Command":
                case "Economic":
                    this.gameController.uiController.setStatus(`${object.itemData.name} selected.`);
                    this.gameController.uiController.fillProducesTab(object);
                    break;
                case "Infantry":
                case "Offensive Vehicle":
                case "Transport Vehicle":
                case "Support Vehicle":
                case "Entrench Vehicle":
                case "Aircraft":
                case "Naval":
                case "Super Unit":
                    this.gameController.gameState.selectedUnits.push(object);
                    object.select();
                    this.gameController.uiController.setStatus(`Unit ${object.itemData.name} selected.`);
                    this.gameController.uiController.fillProducesTab(null);
                    break;
                default:
                    this.gameController.uiController.setStatus(`${object.itemData.name} selected.`);
                    this.gameController.uiController.fillProducesTab(null);
                    break;
            }
        } else {
            console.log('Nothing selected. All objects deselected.');
            this.gameController.uiController.selectedObject = null;
            this.gameController.uiController.setStatus("Ready.");
            this.gameController.uiController.fillProducesTab(null);
        }
    }

    // Right mouse click operations: cancel placement indicator, deselect units, set rally point
    onCanvasRightClick(event) {
        event.preventDefault();
        if (event.button !== 2) return;

        const mousePos = this.getMousePos(event);
        const mouseX = mousePos.x;
        const mouseY = mousePos.y;

        if (this.gameController.gameState.pendingBuilding) {
            this.gameController.gameState.pendingBuilding = null;
            this.gameController.uiController.setStatus("Building placement cancelled.");
            return;
        }

        // this.gameController is the correct logical flow. Check if any units are selected first.
        if (this.gameController.gameState.selectedUnits.length > 0) {
            this.gameController.gameState.selectedUnits.forEach(unit => {
                unit.moveTo(mouseX, mouseY);
            });
            this.gameController.uiController.setStatus("Unit(s) moving.");
            return; // ✅ Crucial: Exit the function after handling unit movement.
        }

        // Only if no units are selected, check for a production building to set a rally point.
        if (this.gameController.gameState.productionBuilding) {
            this.gameController.gameState.productionBuilding.rallyPoint.x = mouseX;
            this.gameController.gameState.productionBuilding.rallyPoint.y = mouseY;
            this.gameController.uiController.setStatus("Rally point set.");
        }
    }

    startPanInterval() {
        // If the pan interval is already running, do nothing
        if (this.gameController.panInterval) {
            return;
        }

        const panSpeed = 10;
        const edgeMargin = 100;
        const intervalTime = 16; // Approximately 60 FPS

        // Start a new interval to continuously update the viewport
        this.gameController.panInterval = setInterval(() => {
            let newCursor = 'default';
            const mouseX = this.gameController.mousePosition.x;
            const mouseY = this.gameController.mousePosition.y;

            // Pan horizontally
            if (mouseX < edgeMargin) {
                this.gameController.viewport.x = Math.max(0, this.gameController.viewport.x - panSpeed);
                newCursor = 'w-resize';
            } else if (mouseX > this.gameController.canvas.width - edgeMargin) {
                this.gameController.viewport.x = Math.min(this.gameController.WORLD_WIDTH - this.gameController.canvas.width, this.gameController.viewport.x + panSpeed);
                newCursor = 'e-resize';
            }

            // Pan vertically
            if (mouseY < edgeMargin) {
                this.gameController.viewport.y = Math.max(0, this.gameController.viewport.y - panSpeed);
                if (newCursor === 'w-resize') newCursor = 'nw-resize';
                else if (newCursor === 'e-resize') newCursor = 'ne-resize';
                else newCursor = 'n-resize';
            } else if (mouseY > this.gameController.canvas.height - edgeMargin) {
                this.gameController.viewport.y = Math.min(this.gameController.WORLD_HEIGHT - this.gameController.canvas.height, this.gameController.viewport.y + panSpeed);
                if (newCursor === 'w-resize') newCursor = 'sw-resize';
                else if (newCursor === 'e-resize') newCursor = 'se-resize';
                else newCursor = 's-resize';
            }

            this.gameController.canvas.style.cursor = newCursor;
            CursorManager.loadCursors(this.gameController.canvas, newCursor);
        }, intervalTime);
    }

    stopPanInterval() {
        // Clear the interval to stop the continuous panning
        if (this.gameController.panInterval) {
            clearInterval(this.gameController.panInterval);
            this.gameController.panInterval = null;
            this.gameController.canvas.style.cursor = 'default';
        }
    }

    onCanvasMouseMove(event) {
        try {
            const rect = this.gameController.canvas.getBoundingClientRect();
            const mouseX = event.clientX - rect.left;
            const mouseY = event.clientY - rect.top;

            this.gameController.mousePosition = { x: mouseX, y: mouseY };

            const canvasWidth = rect.width;
            const canvasHeight = rect.height;
            const edgeMargin = 100;

            const inHorizontalEdge = mouseX < edgeMargin || mouseX > canvasWidth - edgeMargin;
            const inVerticalEdge = mouseY < edgeMargin || mouseY > canvasHeight - edgeMargin;

            // If the mouse is on an edge, start the continuous panning interval
            if (inHorizontalEdge || inVerticalEdge) {
                this.startPanInterval();
            } else {
                // If the mouse leaves the edge, stop the panning
                this.stopPanInterval();
            }

            // Building Placement Cursor ---
            this.gameController.pendingBuildingCursorPosition = this.getMousePos(event);

            // Delayed Hover Logic ---
            const mousePos = this.getMousePos(event);
            const objectUnderMouse = this.getObjectAt(mousePos.x, mousePos.y);
            const clientX = event.clientX;
            const clientY = event.clientY;

            if (objectUnderMouse !== this.gameController.gameState.hoveredObject) {
                this.gameController.gameState.hoveredObject = objectUnderMouse;
                clearTimeout(this.gameController.gameState.hoverTimeoutId);

                if (objectUnderMouse) {
                    this.gameController.gameState.hoverTimeoutId = setTimeout(() => {
                        if (this.gameController.gameState.hoveredObject === objectUnderMouse) {
                            this.gameController.uiController.updateHoverPopup(objectUnderMouse, clientX, clientY);
                        }
                    }, 1000);
                } else {
                    this.gameController.uiController.updateHoverPopup(null, 0, 0);
                }
            }
        } catch (error) {
            console.error("An error occurred in onCanvasMouseMove:", error);
        }
    }

    // Cursor leave operations: hide popup
    onCanvasMouseLeave() {
        // this.gameController is crucial for stopping the timer and hiding the popup
        this.stopPanInterval(); // this.gameController is the new addition
        clearTimeout(this.gameController.gameState.hoverTimeoutId);
        this.gameController.gameState.hoveredObject = null;
        this.gameController.uiController.updateHoverPopup(null, 0, 0);
        this.gameController.canvas.style.cursor = 'default';
    }

    // Function to correctly calculate mouse position relative to the scaled canvas
    getMousePos(event) {
        const rect = this.gameController.canvas.getBoundingClientRect();
        const mouseX = (event.clientX - rect.left);
        const mouseY = (event.clientY - rect.top);

        return { x: mouseX + this.gameController.viewport.x, y: mouseY + this.gameController.viewport.y };
    }

    // Replace your existing getObjectAt function with this.gameController revised version
    getObjectAt(x, y) {
        // Loop through game objects in reverse order to check top-most objects first (this.gameController is useful if you have a drawing order where units are drawn on top of buildings)
        const objectIds = Object.keys(this.gameController.gameState.gameObjects);
        for (let i = objectIds.length - 1; i >= 0; i--) {
            const obj = this.gameController.gameState.gameObjects[objectIds[i]];

            // Get the dimensions, prioritizing direct properties over itemData
            const objWidth = obj.width || (obj.itemData ? obj.itemData.width : 0);
            const objHeight = obj.height || (obj.itemData ? obj.itemData.height : 0);

            // If dimensions are not available, skip the object
            if (objWidth === 0 || objHeight === 0) continue;

            const objLeft = obj.x - objWidth / 2;
            const objRight = obj.x + objWidth / 2;
            const objTop = obj.y - obj.height / 2;
            const objBottom = obj.y + obj.height / 2;

            // Perform a simple rectangle-to-point collision check
            if (x >= objLeft && x <= objRight && y >= objTop && y <= objBottom) {
                // Found a match, return the object
                return obj;
            }
        }

        // No object was found at the given coordinates
        return null;
    }

    // Handle keyboard input for camera movement
    handleKeyboardInput() {
        // Map canvas panning ----
        const panSpeed = 10;
        if (this.gameController.keys['w'] || this.gameController.keys['ArrowUp']) {
            this.gameController.viewport.y = Math.max(0, this.gameController.viewport.y - panSpeed);
        }
        if (this.gameController.keys['s'] || this.gameController.keys['ArrowDown']) {
            this.gameController.viewport.y = Math.min(this.gameController.WORLD_HEIGHT - this.gameController.canvas.height, this.gameController.viewport.y + panSpeed);
        }
        if (this.gameController.keys['a'] || this.gameController.keys['ArrowLeft']) {
            this.gameController.viewport.x = Math.max(0, this.gameController.viewport.x - panSpeed);
        }
        if (this.gameController.keys['d'] || this.gameController.keys['ArrowRight']) {
            this.gameController.viewport.x = Math.min(this.gameController.WORLD_WIDTH - this.gameController.canvas.width, this.gameController.viewport.x + panSpeed);
        }

        // Focus HQ when 'h' is pressed ---
        if (this.gameController.keys['h']) {
            const hq = Object.values(this.gameController.gameState.gameObjects).find(obj =>
                obj.team === 'friend' && obj.itemData.type === 'Command'
            );

            if (hq) {
                // Calculate potential viewport coordinates to center on the HQ
                let newViewportX = hq.x - this.gameController.canvas.width / 2;
                let newViewportY = hq.y - this.gameController.canvas.height / 2;

                // Clamp the new coordinates to the world boundaries
                this.gameController.viewport.x = Math.max(0, Math.min(this.gameController.WORLD_WIDTH - this.gameController.canvas.width, newViewportX));
                this.gameController.viewport.y = Math.max(0, Math.min(this.gameController.WORLD_HEIGHT - this.gameController.canvas.height, newViewportY));

                this.gameController.uiController.setStatus("Camera moved to HQ.");
            }
        }

        // Focus on next HQ when 't' key is pressed --- 
        if (this.gameController.keys['t']) {
            const hqs = Object.values(this.gameController.gameState.gameObjects).filter(obj =>
                obj.itemData && obj.itemData.type === 'Command'
            );


            if (hqs.length > 0) {
                let currentIndex = this.gameController.gameState.focusedHqIndex || 0;
                let nextIndex = (currentIndex + 1) % hqs.length;
                this.gameController.gameState.focusedHqIndex = nextIndex;

                const nextHq = hqs[nextIndex];
                this.gameController.canvasManager.focusCameraOnObject(nextHq);
                this.gameController.uiController.setStatus(`Camera moved to ${nextHq.team}'s HQ.`);
            }

            this.gameController.keys['t'] = false; // Reset the key state to prevent continuous jumping
        }

        // Destroy action onunit
        if (this.gameController.keys['k']) {
            this.gameController.canvasManager.destroySelectedPlayerUnit();
        }
    }
}