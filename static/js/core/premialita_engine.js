/**
 * premialita_engine.js - Motore per il calcolo delle maggiorazioni (Bonus).
 *
 * Gestisce le premialità in modo dinamico basandosi su PREMIALITA_CONFIG.
 *
 * @module  premialita_engine
 * @version 2.0.0
 * @date    2026-05-27
 */

"use strict";

import { PREMIALITA_CONFIG } from "./normativa.js";

/**
 * Factory per il motore delle premialità.
 * 
 * @returns {Object} API pubblica del motore.
 */
const UaPremialitaEngine = function() {

    /**
     * Calcola la maggiorazione percentuale per un intervento.
     * 
     * @param {string} code - Codice intervento (es. 'II.H', 'II.A').
     * @param {Object} data - Dati tecnici dell'intervento.
     * @returns {number} Percentuale di maggiorazione (es. 0.05 per 5%).
     */
    const calculateBonus = function(code, data) {
        let maxBonus = 0;

        if (!data) return 0;

        for (const [key, config] of Object.entries(PREMIALITA_CONFIG)) {
            // Verifica se il bonus è applicabile a questo intervento
            const isApplicable = config.applicabile_a.some(prefix => code.startsWith(prefix));
            if (!isApplicable) continue;

            let currentBonus = 0;

            // Caso bonus semplice (campo diretto)
            if (config.bonus_perc && config.campo_attivazione) {
                if (data[config.campo_attivazione] === "sì" || data[config.campo_attivazione] === true || data[config.campo_attivazione] === 1) {
                    currentBonus = config.bonus_perc;
                }
            }
            // Caso bonus con varianti (es. Registro ENEA)
            else if (config.varianti) {
                for (const variant of Object.values(config.varianti)) {
                    if (data[variant.campo] === "sì" || data[variant.campo] === true || data[variant.campo] === 1) {
                        // Spesso questi bonus non sono cumulativi ma si prende il maggiore
                        currentBonus = Math.max(currentBonus, variant.bonus_perc);
                    }
                }
            }

            // Assumiamo che i diversi tipi di bonus (EU vs ENEA) siano cumulabili, 
            // ma le varianti dello stesso tipo no.
            maxBonus += currentBonus;
        }

        return maxBonus;
    };

    /**
     * Calcola la maggiorazione percentuale per un intervento con dettaglio.
     * 
     * @param {string} code - Codice intervento (es. 'II.H', 'II.A').
     * @param {Object} data - Dati tecnici dell'intervento.
     * @returns {Object} with { totalBonus, items: [{ label, perc, enabled }] }
     */
    const calculateBonusDetailed = function(code, data) {
        const items = [];
        let totalBonus = 0;

        if (!data) return { totalBonus: 0, items: [] };

        for (const [key, config] of Object.entries(PREMIALITA_CONFIG)) {
            const isApplicable = config.applicabile_a.some(prefix => code.startsWith(prefix));
            if (!isApplicable) continue;

            let currentBonus = 0;
            let enabled = false;

            if (config.bonus_perc && config.campo_attivazione) {
                if (data[config.campo_attivazione] === "sì" || data[config.campo_attivazione] === true || data[config.campo_attivazione] === 1) {
                    currentBonus = config.bonus_perc;
                    enabled = true;
                }
            } else if (config.varianti) {
                for (const [vkey, variant] of Object.entries(config.varianti)) {
                    if (data[variant.campo] === "sì" || data[variant.campo] === true || data[variant.campo] === 1) {
                        currentBonus = Math.max(currentBonus, variant.bonus_perc);
                    }
                }
                enabled = currentBonus > 0;
            }

            if (currentBonus > 0) {
                items.push({
                    label: config.label,
                    perc: currentBonus,
                    enabled
                });
                totalBonus += currentBonus;
            }
        }

        return { totalBonus, items };
    };

    return {
        calculateBonus,
        calculateBonusDetailed
    };
};

export const PremialitaEngine = UaPremialitaEngine();
