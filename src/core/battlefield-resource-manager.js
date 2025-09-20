// core/battlefield-resource-manager.js
export class ResourceManager {
    /**
     * @param {Object} initialResources An object defining the starting resource values.
     */
    constructor(initialResources = { energy: 100, minerals: 100, population: 0, food: 0 }) {
        // The main resource store
        this.resources = initialResources;
        // A callback function to update the UI whenever resources change.
        this.uiUpdateCallback = null;
    }

    /**
     * Adds a specified amount of a resource.
     * @param {string} resource The name of the resource (e.g., 'energy', 'minerals').
     * @param {number} amount The amount to add.
     */
    add(resource, amount) {
        if (this.resources.hasOwnProperty(resource)) {
            this.resources[resource] += amount;
            this._updateUI(); // Trigger UI update
        } else {
            console.warn(`Resource "${resource}" does not exist.`);
        }
    }

    /**
     * Subtracts a specified amount of a resource. Returns true if successful, false otherwise.
     * @param {string} resource The name of the resource.
     * @param {number} amount The amount to subtract.
     * @returns {boolean} True if the subtraction was successful, false if not enough resources.
     */
    subtract(resource, amount) {
        if (this.resources.hasOwnProperty(resource) && this.resources[resource] >= amount) {
            this.resources[resource] -= amount;
            this._updateUI(); // Trigger UI update
            return true;
        }
        console.warn(`Not enough "${resource}" to subtract.`);
        return false;
    }

    /**
     * Checks if the player can afford a given cost.
     * @param {Object} cost An object with resource names as keys and costs as values.
     * @returns {boolean} True if the cost can be afforded, false otherwise.
     */
    canAfford(cost) {
        for (const resource in cost) {
            if (this.resources[resource] < cost[resource]) {
                return false;
            }
        }
        return true;
    }

    /**
     * Sets the UI update callback function.
     * @param {Function} callback The function to call when resources change. It will receive the updated resources object as an argument.
     */
    setUIUpdateCallback(callback) {
        this.uiUpdateCallback = callback;
        // Immediately trigger an initial update to show starting values
        this._updateUI(); 
    }

    // Private method to call the UI update callback if it exists
    _updateUI() {
        if (this.uiUpdateCallback) {
            this.uiUpdateCallback(this.resources);
        }
    }
}
