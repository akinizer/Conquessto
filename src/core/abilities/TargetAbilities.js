// src/core/TargetAbilities.js

import { ABILITY_KEYS } from './constants/battlefield_constants.js';

export class TargetAbilities {
    constructor(unit) {
        this.unit = unit;
    }

    setAbilityPoisonous(name, damage, duration) {
        this.unit.specialAbilities[ABILITY_KEYS.POISONOUS] = { name, damage, duration, startTime: performance.now() };
    }

    setAbilityMelting(name, armorReduction, duration) {
        this.unit.specialAbilities[ABILITY_KEYS.MELTING] = { name, armorReduction, duration, startTime: performance.now() };
    }

    setAbilityFreezer(name, speedReduction, duration) {
        this.unit.specialAbilities[ABILITY_KEYS.FREEZER] = { name, speedReduction, duration, startTime: performance.now() };
    }

    setAbilityBurner(name, damageOverTime, duration) {
        this.unit.specialAbilities[ABILITY_KEYS.BURNER] = { name, damageOverTime, duration, startTime: performance.now() };
    }
}