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
     * Tipologie di PDC considerate ELETTRICHE per il traino di II.H e II.G.
     * Seconda DM 07/08/2025, solo le PDC elettriche pure possono trainare FV e ricarica.
     * @private
     */
    const _ELETTRICHE_TIPOLOGIE = [
        "aria/aria",
        "aria/acqua", 
        "acqua/aria",
        "acqua/acqua",
        "salamoia/aria",
        "salamoia/acqua",
        "geotermica"
    ];

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

        if (!metadata) {
            return result;
        }

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

    /**
     * Verifica le regole specifiche per interventi che richiedono parametri tecnici.
     * Attualmente gestisce:
     * - II.H (Fotovoltaico): richiede III.A ELETTRICA pura + sostituzione integrale
     * - II.G (Ricarica): richiede III.A ELETTRICA pura + sostituzione integrale
     * 
     * @param {string} code - Codice intervento da validare.
     * @param {Array} selectedCodes - Lista di tutti gli interventi selezionati.
     * @param {Object} interventiData - Dati tecnici per ogni intervento (key: codice, value: dati).
     * @returns {Object} Risultato della validazione.
     * @private
     */
    const _checkTechnicalConstraints = function(code, selectedCodes, interventiData) {
        const result = {
            isValid: true,
            error: ""
        };

        // Fail Fast
        if (!code || !selectedCodes || !Array.isArray(selectedCodes)) {
            result.isValid = false;
            result.error = "Input non valido per validazione tecnica";
            return result;
        }

        const metadata = _catalog[code];
        if (!metadata) {
            return result;
        }

        // Regole specifiche per II.H (Fotovoltaico + Accumulo) e II.G (Ricarica veicoli)
        if (code === "II.H" || code === "II.G") {
            const label = code === "II.H" ? "FV" : "Ricarica veicoli";
            
            // Vincolo 1: Richiede III.A
            if (!selectedCodes.includes("III.A")) {
                result.isValid = false;
                result.error = `${label} (${code}) richiede abbinamento con pompa di calore (III.A).`;
                return result;
            }

            // Vincolo 2: III.A deve essere ELETTRICA pura (non ibrida)
            const iiiADati = interventiData["III.A"] || {};
            const tipologiaPdc = iiiADati.tipologia_pdc || iiiADati.tipologia || "";
            
            if (!_ELETTRICHE_TIPOLOGIE.includes(tipologiaPdc)) {
                result.isValid = false;
                result.error = `${label} (${code}) richiede PDC ELETTRICA pura. Tipologia '${tipologiaPdc}' non ammissibile.`;
                return result;
            }

            // Vincolo 3: Richiede sostituzione integrale dell'impianto esistente
            // Verifica nei dati tecnici di III.A
            const sostituisceEsistente = iiiADati.sostituisce_esistente || iiiADati.sostituzione_integrale || false;
            const isSostituzioneValida = (sostituisceEsistente === true || sostituisceEsistente === "si" || sostituisceEsistente === "Sì");
            
            if (!isSostituzioneValida) {
                result.isValid = false;
                result.error = `${label} (${code}) richiede sostituzione integrale del generatore esistente per l'intervento III.A.`;
                return result;
            }
        }

        return result;
    };

    // 3. FUNZIONI PUBBLICHE

    /**
     * Valida una lista di interventi selezionati rispetto ai vincoli incrociati.
     * Validazione base senza dati tecnici (solo dipendenze tra interventi).
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
     * Valida una lista di interventi selezionati rispetto ai vincoli incrociati e tecnici.
     * Include validazioni che richiedono dati tecnici (es. tipologia PDC per FV).
     * 
     * @param {Array} selectedCodes - Lista dei codici intervento selezionati.
     * @param {Object} interventiData - Dati tecnici per ogni intervento (key: codice, value: dati).
     * @returns {Object} Risultato della validazione completa.
     */
    const validateSelectionWithData = function(selectedCodes, interventiData) {
        if (!selectedCodes || !Array.isArray(selectedCodes)) {
            return { success: false, errors: ["Input non valido: selectedCodes deve essere un array"], warnings: [] };
        }

        const errors = [];
        const warnings = [];

        // 1. Validazione dipendenze base (senza dati tecnici)
        selectedCodes.forEach(code => {
            const check = _checkDependencies(code, selectedCodes);
            if (!check.isValid) {
                errors.push(check.error);
            }
        });

        // 2. Validazione vincoli tecnici (con dati tecnici)
        if (interventiData) {
            selectedCodes.forEach(code => {
                const check = _checkTechnicalConstraints(code, selectedCodes, interventiData);
                if (!check.isValid) {
                    errors.push(check.error);
                }
            });
        }

        // 3. Eventuali warning da metadati
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
        validateSelectionWithData,
        getSuggestions
    };
};

export const CrossRuleEngine = UaCrossRuleEngine();
