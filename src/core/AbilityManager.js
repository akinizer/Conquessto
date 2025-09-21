// src/core/AbilityManager.js

import { SelfAbilities } from './SelfAbilities.js';
import { TargetAbilities } from './TargetAbilities.js';
import { EffectManager } from './EffectManager.js';

export class AbilityManager {
    constructor(gameState, effectManager) {
        this.gameState = gameState;
        this.effectManager = effectManager; 
        this.selectedUnit = null; 
        this.self = null;
        this.target = null;
    }

    selectUnit(unit) {
        // Sets the unit the manager should apply abilities to.
        this.selectedUnit = unit;
        if (unit) {
            this.self = new SelfAbilities(unit, this._addTimedAbility.bind(this));
            this.target = new TargetAbilities(unit, this._addTimedAbility.bind(this));
        } else {
            this.self = null;
            this.target = null;
        }
    }
    
    _addTimedAbility(name, key, value, duration) {
        // A helper to apply a timed ability to the selected unit.
        if (!this.selectedUnit) return;
        const timestamp = Date.now();
        if (!this.selectedUnit.specialAbilities) {
            this.selectedUnit.specialAbilities = {};
        }
        this.selectedUnit.specialAbilities[key] = {
            name: name,
            value: value,
            duration: duration,
            startTime: timestamp
        };
        // This is where the ability is linked to its effect.
        this.effectManager.onAbilityAdded(this.selectedUnit, name, key, value, duration);
    }
    
    _removeAbility(key) {
        // A helper to remove an ability from the selected unit.
        if (!this.selectedUnit) return;
        if (this.selectedUnit.specialAbilities) {
            delete this.selectedUnit.specialAbilities[key];
        }
        this.effectManager.onAbilityRemoved(this.selectedUnit, key);
    }

    update() {
        // The manager's update loop remains responsible for ability scheduling and cleanup.
        if (!this.selectedUnit || !this.selectedUnit.specialAbilities) return;
        
        const currentTime = Date.now();
        const unit = this.selectedUnit;

        const abilityCleanupActions = {
            'rage': (ability) => { unit.damage /= ability.value; },
            'immunity': () => { unit.isImmune = false; },
            'speedBoost': (ability) => { unit.speed /= ability.value; },
            'barrier': () => { unit.isShielded = false; delete unit.shieldHealth; },
            'spikes': () => { unit.hasSpikes = false; delete unit.spikeDamage; },
            'dot': () => { delete unit.bulletDamageOverTime; },
            'armorIgnore': () => { delete unit.armorIgnore; },
            'bonusDamage': () => { delete unit.bonusDamage; }
        };
        
        for (const abilityKey in unit.specialAbilities) {
            const ability = unit.specialAbilities[abilityKey];
            
            if (ability.duration > 0 && currentTime - ability.startTime > ability.duration) {
                console.log(`Ability '${ability.name}' on unit ${unit.id} has expired.`);
                
                const cleanupAction = abilityCleanupActions[abilityKey];
                if (cleanupAction) {
                    cleanupAction(ability);
                }

                this._removeAbility(abilityKey);
            }
        }
    }
}