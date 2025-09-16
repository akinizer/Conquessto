// core/data-manager.js

export class DataManager {
  constructor() {
    this.data = {};
  }

  async loadProductionData() {
    try {
      const response = await fetch('data/production-items.json');
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      this.data = await response.json();
      console.log('Production data loaded successfully:', this.data);
    } catch (error) {
      console.error("Could not load production data:", error);
    }
  }

  getProductionItems() {
    return this.data;
  }
}