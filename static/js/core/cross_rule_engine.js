/**
 * cross_rule_engine.js - Motore per la validazione delle dipendenze tra interventi.
 *
 * Gestisce i vincoli normativi che legano più interventi tra loro 
 * (es. trainanti/trainati) basandosi sui metadati di normativa.js.
 *
 * @module  cross_rule_engine
 * @version 2.0.0
 * @date    2026-05-27
 */

"use strict";

import { INTERVENTI } from "./normativa.js";

/**
 * Factory per il motore delle regole incrociate.
 * 
 * @returns {Object} API pubblica del motore.
 */
const UaCrossRuleEngine = function() {

    // 1. STATO PRIVATO
    const _catalog = INTERVENTI;

    // 2. FUNZIONI PRIVATE

    /**
     * Verifica se un intervento ha tutti i suoi componenti obbligatori presenti nella selezione.
     */
    const _checkDependencies = function(code, selectedCodes) {
        const metadata = _catalog[code];
        const result = {
            isValid: true,
            missing: [],
            error: ""
        };

        if (!metadata) return result;

        // Gestione interventi_collegati_obbligatori (AND - devono esserci tutti)
        const obbligatori = metadata.interventi_collegati_obbligatori || [];
        const mancanti = obbligatori.filter(req => !selectedCodes.includes(req));

        // Gestione richiede_uno_di (OR - deve essercene almeno uno) - Nuova estensione data-driven
        const richiedeUnoDi = metadata.vincoli_logici?.richiede_uno_di || [];
        const haAlmenoUno = richiedeUnoDi.length === 0 || richiedeUnoDi.some(req => selectedCodes.includes(req));

        if (mancanti.length > 0) {
            result.isValid = false;
            result.missing.push(...mancanti);
            result.error = `L'intervento ${code} richiede obbligatoriamente: ${mancanti.join(", ")}. `;
        }

        if (!haAlmenoUno) {
            result.isValid = false;
            result.error += `L'intervento ${code} richiede almeno uno tra: ${richiedeUnoDi.join(", ")}.`;
        }

        return result;
    };

    // 3. FUNZIONI PUBBLICHE

    /**
     * Valida una lista di interventi selezionati rispetto ai vincoli incrociati.
     */
    const validateSelection = function(selectedCodes) {
        if (!selectedCodes || !Array.isArray(selectedCodes)) {
            return { success: false, errors: ["Input non valido"], warnings: [] };
        }

        const errors = [];
        const warnings = [];

        selectedCodes.forEach(code => {
            const check = _checkDependencies(code, selectedCodes);
            if (!check.isValid) {
                errors.push(check.error);
            }
        });

        // Eventuali warning da metadati
        selectedCodes.forEach(code => {
            const metadata = _catalog[code];
            if (metadata && metadata.warning) {
                metadata.warning.forEach(w => warnings.push(`${code}: ${w}`));
            }
        });

        return {
            success: errors.length === 0,
            errors: errors,
            warnings: warnings
        };
    };

    /**
     * Suggerisce interventi correlati.
     */
    const getSuggestions = function(selectedCodes) {
        const suggestionsSet = new Set();
        
        selectedCodes.forEach(code => {
            const metadata = _catalog[code];
            if (metadata && metadata.interventi_collegati_suggeriti) {
                metadata.interventi_collegati_suggeriti.forEach(s => {
                    if (!selectedCodes.includes(s)) {
                        suggestionsSet.add(s);
                    }
                });
            }
        });

        return Array.from(suggestionsSet);
    };

    return {
        validateSelection,
        getSuggestions
    };
};

export const CrossRuleEngine = UaCrossRuleEngine();
