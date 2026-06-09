/**
 * premialita_engine.js - Motore per il calcolo delle maggiorazioni (Bonus).
 * Gestisce le premialità in modo dinamico basandosi su PREMIALITA_CONFIG.
 *
 * @module  premialita_engine
 * @version 1.0.0
 * @date    2026-06-02
 */
"use strict";

import { PREMIALITA_CONFIG } from "./normativa.js";

var UaPremialitaEngine = function() {

    var calculateBonus = function(code, data) {
        if (!data) return 0;

        var maxBonus = 0;

        for (var key in PREMIALITA_CONFIG) {
            var config = PREMIALITA_CONFIG[key];
            var isApplicable = config.applicabile_a.some(function(prefix) {
                return code.startsWith(prefix);
            });
            if (!isApplicable) continue;

            var currentBonus = 0;

            if (config.bonus_perc && config.campo_attivazione) {
                var val = data[config.campo_attivazione];
                if (val === "s\u00ec" || val === true || val === 1) {
                    currentBonus = config.bonus_perc;
                }
            } else if (config.varianti) {
                for (var vkey in config.varianti) {
                    var variant = config.varianti[vkey];
                    var vVal = data[variant.campo];
                    if (vVal === "s\u00ec" || vVal === true || vVal === 1) {
                        currentBonus = Math.max(currentBonus, variant.bonus_perc);
                    }
                }
            }

            maxBonus = maxBonus + currentBonus;
        }

        return maxBonus;
    };

    var calculateBonusDetailed = function(code, data) {
        var items = [];
        var totalBonus = 0;

        if (!data) {
            var emptyResult = { totalBonus: 0, items: [] };
            return emptyResult;
        }

        for (var key in PREMIALITA_CONFIG) {
            var config = PREMIALITA_CONFIG[key];
            var isApplicable = config.applicabile_a.some(function(prefix) {
                return code.startsWith(prefix);
            });
            if (!isApplicable) continue;

            var currentBonus = 0;
            var enabled = false;

            if (config.bonus_perc && config.campo_attivazione) {
                var val = data[config.campo_attivazione];
                if (val === "s\u00ec" || val === true || val === 1) {
                    currentBonus = config.bonus_perc;
                    enabled = true;
                }
            } else if (config.varianti) {
                for (var vkey in config.varianti) {
                    var variant = config.varianti[vkey];
                    var vVal = data[variant.campo];
                    if (vVal === "s\u00ec" || vVal === true || vVal === 1) {
                        currentBonus = Math.max(currentBonus, variant.bonus_perc);
                    }
                }
                enabled = currentBonus > 0;
            }

            if (currentBonus > 0) {
                var item = {
                    label: config.label,
                    perc: currentBonus,
                    enabled: enabled
                };
                items.push(item);
                totalBonus = totalBonus + currentBonus;
            }
        }

        var result = { totalBonus: totalBonus, items: items };
        return result;
    };

    return {
        calculateBonus: calculateBonus,
        calculateBonusDetailed: calculateBonusDetailed
    };
};

var PremialitaEngine = UaPremialitaEngine();
export { PremialitaEngine };
