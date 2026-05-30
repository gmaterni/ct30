/**
 * rules_engine.js - Motore di validazione delle regole del Conto Termico 3.0.
 *
 * Gestisce la logica di ammissibilità basata su tipo di soggetto, 
 * categoria catastale e vincoli normativi generali.
 *
 * @module  rules_engine
 * @version 1.1.0
 * @date    2026-05-22
 * @author  Gemini CLI
 */

"use strict";

import { RULES, CATASTO, SOGGETTI_CONFIG, PROCEDURA_CONFIG } from "./normativa.js";

/**
 * Factory per il motore delle regole.
 * 
 * @returns {Object} API pubblica del motore.
 */
const UaRulesEngine = function() {

    // 1. STATO PRIVATO (Dati normativi iniettati da normativa.js)
    
    /**
     * Recupera le configurazioni correnti.
     * @returns {Object} Oggetto con regole e tabelle catastali.
     * @private
     */
    const _getEngineData = function() {
        return {
            rules: RULES,
            categories: CATASTO,
            soggetti: SOGGETTI_CONFIG,
            procedura: PROCEDURA_CONFIG
        };
    };

    // 2. FUNZIONI PRIVATE

    /**
     * Verifica l'effetto incentivante (Richiesta Preliminare).
     * Obbligatorio per Imprese ed ETS economici.
     * La richiesta deve essere inviata PRIMA di qualunque impegno giuridicamente vincolante (ordine/inizio lavori).
     * 
     * @private
     */
    const _checkEffettoIncentivante = function(input) {
        const data = _getEngineData();
        const obbligati = data.procedura.EFFETTO_INCENTIVANTE_OBBLIGATORIO;
        
        const result = { success: true, error: "" };

        if (obbligati.includes(input.subjectType)) {
            if (!input.richiestaPreliminareInviata) {
                result.success = false;
                result.error = "EFFETTO INCENTIVANTE: Per le imprese è obbligatorio inviare la Richiesta Preliminare PRIMA di firmare contratti o emettere ordini.";
            } else {
                // Se inviata, verifichiamo le date se disponibili
                if (input.dataRichiestaPreliminare && input.dataPrimoImpegno) {
                    const d1 = new Date(input.dataRichiestaPreliminare);
                    const d2 = new Date(input.dataPrimoImpegno);
                    if (d1 >= d2) {
                        result.success = false;
                        result.error = "EFFETTO INCENTIVANTE: La data della Richiesta Preliminare deve essere precedente alla data del primo impegno (ordine/contratto).";
                    }
                }
            }
        }

        return result;
    };

    /**
     * Valida se un soggetto può accedere a un determinato titolo di intervento.
     * 
     * @param {string} subjectType - Tipo di soggetto (es. 'PA', 'Privato', 'Impresa').
     * @param {string} titleCode - Titolo (es. 'II', 'III').
     * @returns {boolean} True se compatibile.
     * @private
     */
    const _isSubjectCompatible = function(subjectType, titleCode) {
        // Fail Fast
        if (!subjectType || !titleCode) {
            return false;
        }

        const data = _getEngineData();
        const soggetti = data.soggetti;
        
        if (!soggetti || !soggetti[subjectType]) {
            console.error(`_isSubjectCompatible: Soggetto '${subjectType}' non trovato in SOGGETTI_CONFIG.`);
            return false;
        }

        const config = soggetti[subjectType];
        const ammessi = config.titoli_ammessi || [];
        
        let isCompatible = false;

        // Verifica se il titolo cercato (II o III) è presente
        if (ammessi.includes(titleCode)) {
            isCompatible = true;
        } else if (titleCode === "II" && ammessi.includes("II_solo_terziario")) {
            // Per ora semplifichiamo: se è solo terziario, lo ammettiamo
            // La validazione dell'ambito edificio avverrà in un altro check
            isCompatible = true;
        } else if (ammessi.includes("dipende_membro")) {
            isCompatible = false; // Richiede input aggiuntivi non ancora gestiti
        }

        return isCompatible;
    };

    /**
     * Valida l'ammissibilità basata sulla categoria catastale.
     * 
     * @param {string} categoryCode - Codice catastale (es. 'A/1', 'C/2').
     * @param {string} subjectType - Tipo di soggetto (opzionale, per validare eccezioni).
     * @returns {Object} Risultato con status e titoli ammessi.
     * @private
     */
    const _checkCatastale = function(categoryCode, subjectType = null) {
        const data = _getEngineData();
        const categories = data.categories ? data.categories.categorie : null;

        const result = {
            isAllowed: false,
            allowedTitles: [],
            reason: ""
        };

        // Fail Fast
        if (!categories) {
            result.reason = "Dati catastali non caricati.";
            return result;
        }

        if (!categoryCode) {
            result.reason = "Categoria catastale mancante.";
            return result;
        }

        const normalizedCode = categoryCode.trim().toUpperCase();
        const catInfo = categories[normalizedCode];

        if (!catInfo) {
            result.reason = `Categoria '${normalizedCode}' non riconosciuta.`;
            return result;
        }

        // Categoriale assolutamente escluse (per tutti i soggetti)
        if (catInfo.ammissibile === false && !catInfo.motivo?.includes("salvo")) {
            result.isAllowed = false;
            result.reason = catInfo.motivo || "Categoria esclusa dagli incentivi.";
            return result;
        }

        // Categoriale condizionatamente escluse (dipende dal soggetto)
        // Secondo D.M. 7 Agosto 2025:
        // - A/1, A/8, A/9 sono escluse SALVO per PA o se aperte al pubblico
        const categoryExcludedForPrivate = ["A/1", "A/8", "A/9"];
        
        if (categoryExcludedForPrivate.includes(normalizedCode)) {
            // Solo PA può accedere a queste categorie
            const paTypes = ["Pubblica Amministrazione", "PA"];
            if (!subjectType || !paTypes.includes(subjectType)) {
                result.isAllowed = false;
                result.reason = `Categoria ${normalizedCode} esclusa per il soggetto ${subjectType || 'non specificato'}. Ammessa solo per Pubblica Amministrazione.`;
                return result;
            }
        }

        // Se arriviamo qui, la categoria è ammissibile
        result.isAllowed = true;
        result.allowedTitles = ["II", "III"];

        return result;
    };

    /**
     * Verifica l'obbligo di sostituzione dell'impianto esistente (Art. 25 D.M. 7 Agosto 2025).
     * Deve esistere un generatore di climatizzazione invernale pre-esistente.
     * 
     * @param {number} potenzaEsistenteKw - Potenza del generatore esistente in kW.
     * @returns {Object} Risultato della validazione.
     * @private
     */
    const _checkSostituzioneObbligatoria = function(potenzaEsistenteKw) {
        const result = { success: true, error: "" };

        // Fail Fast
        if (potenzaEsistenteKw === undefined || potenzaEsistenteKw === null) {
            result.success = false;
            result.error = "OBBLIGO SOSTITUZIONE: Dati sulla potenza esistente mancanti.";
            return result;
        }

        const pn = parseFloat(potenzaEsistenteKw);
        
        if (pn <= 0) {
            result.success = false;
            result.error = "OBBLIGO SOSTITUZIONE: Deve esistere un impianto di climatizzazione invernale pre-esistente (potenza > 0 kW).";
            return result;
        }

        return result;
    };

    /**
     * Verifica se la tipologia di intervento è ammissibile per il soggetto.
     * Gestisce regole specifiche come l'esclusione di PDC a gas per Imprese ed ETS economici.
     * 
     * @param {string} subjectType - Tipo di soggetto (es. 'Impresa', 'ETS economico').
     * @param {string} interventoCode - Codice intervento (es. 'III.A').
     * @param {Object} interventoDati - Dati tecnici dell'intervento.
     * @returns {Object} Risultato della validazione.
     * @private
     */
    const _checkInterventoAmmissibilita = function(subjectType, interventoCode, interventoDati) {
        const result = { success: true, error: "" };

        // Fail Fast
        if (!subjectType || !interventoCode) {
            return result; // Non blocchiamo, ma non validiamo
        }

        // Regola specifica: Esclusione PDC a gas per Imprese ed ETS economici (Art. 25 comma 2)
        // Nota: Le PDC a gas sono ESCLUSE per questi soggetti
        const soggettiEsclusiPdCGas = ["Impresa", "ETS economico"];
        
        if (soggettiEsclusiPdCGas.includes(subjectType) && interventoCode === "III.A") {
            const tipologiaPdc = (interventoDati || {}).tipologia_pdc || 
                                (interventoDati || {}).tipologia || "";
            const combustibileAnte = (interventoDati || {}).combustibile_ante || "";
            
            // Controllo se è PDC a gas
            // Se il combustibile dell'impianto esistente è gas E la nuova PDC non è elettrica,
            // allora è bloccato
            const combustibiliGas = ["gas", "metano", "gasolio", "gpl"];
            const isPdCGas = combustibiliGas.some(c => 
                tipologiaPdc.toLowerCase().includes(c) || 
                combustibileAnte.toLowerCase().includes(c)
            );
            
            // DC: secondo le specifiche, per Imprese ed ETS, le PDC a GAS sono escluse
            // Ma aria/aria e aria/acqua sono ELETTRICHE, non a gas
            // Quindi dobbiamo controllare se la PDC usa combustibile a gas
            // Oppure se è un sistema ibrido gas + elettrico
            
            // Tipologie considerate "a gas" (non elettriche pure)
            const tipologieGas = ["ibrido", "gas", "hybrid"];
            const isTipologiaGas = tipologieGas.some(t => 
                tipologiaPdc.toLowerCase().includes(t)
            );
            
            if (isTipologiaGas) {
                result.success = false;
                result.error = `ESCLUSIONE: Le PDC a gas/ibride non sono ammesse per ${subjectType} (Art. 25 comma 2 D.M. 7/8/2025).`;
            }
        }

        return result;
    };

    // 3. FUNZIONI PUBBLICHE

    /**
     * Esegue una verifica completa di ammissibilità preliminare.
     * 
     * @param {Object} input - Dati della pratica:
     *   - subjectType: Tipo di soggetto
     *   - category: Categoria catastale
     *   - buildingStatus: Stato edificio ('esistente')
     *   - potenzaEsistenteKw: Potenza generatore esistente (opzionale, per obbligo sostituzione)
     *   - selectedInterventi: Interventi selezionati (opzionale, per validazione specifiche)
     *   - interventiData: Dati tecnici interventi (opzionale, per validazione PDC gas)
     * @returns {Object} Esito della validazione.
     */
    const validateAmmissibilita = function(input) {
        // Fail Fast
        if (!input) {
            console.error("validateAmmissibilita: Input mancante.");
            const errRes = { success: false, errors: ["Dati mancanti"] };
            return errRes;
        }

        const errors = [];
        const warnings = [];

        // 1. Verifica Esistenza Edificio (Requisito Fondamentale CT 3.0)
        if (input.buildingStatus !== "esistente") {
            errors.push("L'edificio deve essere esistente (accatastato o con F/2).");
        }

        // 2. Verifica Obbligo Sostituzione (Art. 25 D.M. 7/8/2025) - MOD-003
        if (input.potenzaEsistenteKw !== undefined) {
            const sostituzioneCheck = _checkSostituzioneObbligatoria(input.potenzaEsistenteKw);
            if (!sostituzioneCheck.success) {
                errors.push(sostituzioneCheck.error);
            }
        }

        // 2.5. Warning se potenzaEsistenteKw non fornita
        if (input.potenzaEsistenteKw === undefined && input.buildingStatus === "esistente") {
            warnings.push("Attenzione: Dati sulla potenza del generatore esistente non forniti. Validazione obbligo sostituzione non eseguita.");
        }

        // 3. Verifica Categoria Catastale (con soggetto per eccezioni)
        const category = input.category || "";
        const subjectType = input.subjectType || null;
        const catCheck = _checkCatastale(category, subjectType);
        if (!catCheck.isAllowed) {
            const catError = `Incompatibilità catastale: ${catCheck.reason}`;
            errors.push(catError);
        }

        // 4. Incrocio Soggetto / Titoli potenziali
        const potentialTitles = catCheck.allowedTitles;
        const validTitles = potentialTitles.filter(title => _isSubjectCompatible(input.subjectType, title));

        if (validTitles.length === 0 && errors.length === 0) {
            const subject = input.subjectType;
            const subError = `Il soggetto '${subject}' non può accedere ai titoli previsti per la categoria '${category}'.`;
            errors.push(subError);
        }

        // 5. Verifica Effetto Incentivante (Specifico CT 3.0 per Imprese)
        const effettoCheck = _checkEffettoIncentivante(input);
        if (!effettoCheck.success) {
            errors.push(effettoCheck.error);
        }

        // 6. Validazione interventi specifici (se forniti) - MOD-003
        if (input.selectedInterventi && Array.isArray(input.selectedInterventi)) {
            const interventiData = input.interventiData || {};
            
            input.selectedInterventi.forEach(interventoCode => {
                const interventoDati = interventiData[interventoCode] || {};
                const interventoCheck = _checkInterventoAmmissibilita(
                    input.subjectType, 
                    interventoCode, 
                    interventoDati
                );
                
                if (!interventoCheck.success) {
                    errors.push(interventoCheck.error);
                }
            });
        }

        // 7. Warning se selectedInterventi fornito ma senza dati tecnici
        if (input.selectedInterventi && !input.interventiData) {
            warnings.push("Attenzione: Validazione interventi specifici non completata (dati tecnici mancanti).");
        }

        const validationResult = {
            success: errors.length === 0,
            validTitles: validTitles,
            errors: errors,
            warnings: warnings,
            timestamp: new Date().toISOString()
        };

        return validationResult;
    };

    /**
     * Restituisce la lista dei soggetti ammissibili configurati.
     * @returns {string[]} Lista tipi soggetto.
     */
    const getSubjectTypes = function() {
        const data = _getEngineData();
        const soggetti = data.soggetti;
        
        let types = [];
        if (soggetti) {
            types = Object.keys(soggetti);
        }
        
        return types;
    };

    /**
     * Verifica la compatibilità di un singolo intervento basandosi sul suo codice (Titolo).
     * 
     * @param {string} interventoCode - Codice intervento (es. 'III.A', 'II.H').
     * @param {string[]} allowedTitles - Lista titoli ammessi (es. ['III']).
     * @returns {Object} Oggetto con status e motivo eventuale.
     */
    const getInterventoCompatibility = function(interventoCode, allowedTitles) {
        const result = { isCompatible: false, reason: "" };
        
        // Fail Fast
        if (!interventoCode || !allowedTitles) {
            result.reason = "Dati per verifica compatibilità mancanti.";
            return result;
        }

        // Estrazione Titolo (es. 'III' da 'III.A')
        const codeParts = interventoCode.split('.');
        const titleOfIntervento = codeParts[0];
        
        if (allowedTitles.includes(titleOfIntervento)) {
            result.isCompatible = true;
        } else {
            result.isCompatible = false;
            result.reason = `Questo intervento appartiene al Titolo ${titleOfIntervento}, non ammesso per il tuo profilo.`;
        }

        return result;
    };

    // 4. API PUBBLICA
    const api = {
        validateAmmissibilita: validateAmmissibilita,
        getSubjectTypes: getSubjectTypes,
        getInterventoCompatibility: getInterventoCompatibility
    };

    return api;
};

// Esportazione Singleton
export const RulesEngine = UaRulesEngine();
