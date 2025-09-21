// src/core/abilities/SelfAbilities.js

import { ABILITY_KEYS, BUFF_PROPERTIES } from '../constants/battlefield_constants.js';

export class SelfAbilities {
    constructor(unit) {
        this.unit = unit;
        if (!this.unit.specialAbilities) {
            this.unit.specialAbilities = {};
        }
    }

    setBuff(name, property, value, duration) {
        // Sets a generic stat buff flag on the unit.
        // The effect is applied by the AbilityController.
        this.unit.specialAbilities[property] = {
            name: name,
            type: 'multiplier',
            value: value,
            duration: duration,
            startTime: performance.now()
        };
    }

    setImmunity(name, duration) {
        // Sets a temporary immunity flag.
        this.unit.specialAbilities[ABILITY_KEYS.IMMUNITY] = {
            name: name,
            value: true,
            duration: duration,
            startTime: performance.now()
        };
    }
    
    setRecovery(name, amountPerSecond, duration) {
        // Sets a recovery flag.
        this.unit.specialAbilities[ABILITY_KEYS.RECOVERY] = {
            name: name,
            amountPerSecond: amountPerSecond,
            duration: duration,
            startTime: performance.now()
        };
    }

    setPermanentShield(name, health) {
        // Sets a permanent shield flag.
        this.unit.specialAbilities[ABILITY_KEYS.PERMANENT_SHIELD] = { 
            name: name,
            health: health
        };
    }

    setBossStature(name) {
        // Grants multiple permanent abilities at once by calling the individual methods.
        this.setPermanentShield('Boss Shield', 200);
        this.unit.specialAbilities.revive = { name: 'Boss Revive', value: true };
        this.unit.specialAbilities.aura = { name: 'Boss Aura', value: true };
    }
}