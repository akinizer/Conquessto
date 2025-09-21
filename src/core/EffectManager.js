// src/core/EffectManager.js

import { ABILITY_KEYS, BUFF_PROPERTIES, ATTACK_EFFECTS } from './constants/battlefield_constants.js';

export class EffectManager {
    constructor(gameState) {
        this.gameState = gameState;
    }

    update() {
        const currentTime = performance.now();

        for (const unit of Object.values(this.gameState.gameObjects)) {
            if (!unit.specialAbilities) continue;

            const abilitiesToRemove = [];

            for (const key in unit.specialAbilities) {
                const ability = unit.specialAbilities[key];

                // --- Apply Effects ---
                switch (key) {
                    case BUFF_PROPERTIES.DAMAGE:
                        // Apply damage buff
                        if (!ability.isApplied) {
                            unit.damage *= ability.value;
                            ability.isApplied = true;
                        }
                        break;
                    case BUFF_PROPERTIES.SPEED:
                        // Apply speed buff
                        if (!ability.isApplied) {
                            unit.speed *= ability.value;
                            ability.isApplied = true;
                        }
                        break;
                    case ABILITY_KEYS.RECOVERY:
                        // Apply continuous health recovery
                        unit.health += ability.amountPerSecond;
                        break;
                    case ABILITY_KEYS.IMMUNITY:
                        // Apply temporary immunity
                        unit.isImmune = true;
                        break;
                    case ABILITY_KEYS.PERMANENT_SHIELD:
                        // Apply permanent shield
                        unit.isShielded = true;
                        break;
                    // --- Target Abilities ---
                    case ABILITY_KEYS.SPIKES:
                        // Logic for spike damage would be in the combat system.
                        break;
                    case ATTACK_EFFECTS.POISONOUS:
                        // Logic for poison damage over time.
                        if (currentTime - ability.lastTick >= ability.tickRate) {
                            unit.health -= ability.damage;
                            ability.lastTick = currentTime;
                        }
                        break;
                }

                // Check for ability expiration and mark for removal
                if (ability.duration && currentTime - ability.startTime > ability.duration) {
                    abilitiesToRemove.push(key);
                }
            }

            // --- Clean Up Expired Abilities ---
            for (const key of abilitiesToRemove) {
                const ability = unit.specialAbilities[key];
                
                // Reverse temporary stat buffs
                if (ability.type === 'multiplier' && ability.isApplied) {
                    unit[key] /= ability.value;
                }
                
                // Reverse other temporary effects
                switch (key) {
                    case ABILITY_KEYS.IMMUNITY:
                        unit.isImmune = false;
                        break;
                }
                
                // Remove the ability from the unit's list
                delete unit.specialAbilities[key];
            }
        }
    }
}