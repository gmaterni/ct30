/**
 * reliability_engine.js - Algoritmo di affidabilità e Firewall Economico.
 *
 * Calcola il livello di confidenza dei dati e degli incentivi stimati
 * basandosi sulla validazione delle fonti e sullo stato documentale.
 *
 * @module  reliability_engine
 * @version 1.0.0
 * @date    2026-05-23
 * @author  Gemini CLI
 */

"use strict";

import { VALIDAZIONE_FONTI, INTERVENTI } from "./normativa.js";

/**
 * Factory per il motore di affidabilità.
 * 
 * @returns {Object} API pubblica del motore.
 */
const UaReliabilityEngine = function() {

    // 1. STATO PRIVATO
    const _levels = VALIDAZIONE_FONTI.livelli_affidabilita;

    // 2. FUNZIONI PRIVATE

    /**
     * Restituisce il peso di affidabilità per una singola fonte.
     * 
     * @param {string} sourceKey - Chiave della fonte o dello stato documento.
     * @returns {number} Peso (1-4).
     * @private
     */
    const _getSourceWeight = function(sourceKey) {
        // Mappatura stati documenti IndexedDB/Wizard verso pesi affidabilità
        const statusMap = {
            "mancante": "dichiarato_cliente",
            "verificato": "verificato_documentale",
            "certificato": "certificato"
        };

        const key = statusMap[sourceKey] || sourceKey;
        const level = _levels[key] || _levels["dichiarato_cliente"];
        const weight = level.peso || 1;
        
        return weight;
    };

    // 3. FUNZIONI PUBBLICHE

    /**
     * Calcola il punteggio di affidabilità per un set di dati tecnici, 
     * correlando i parametri ai documenti che li validano.
     * 
     * @param {Object} interventiData - Mappa dei dati tecnici per intervento.
     * @param {Object} documentsStatus - Mappa dello stato dei documenti caricati.
     * @returns {Object} Oggetto con score, label e indicatori di affidabilità.
     */
    const calculateReliability = function(interventiData, documentsStatus) {
        // Fail Fast
        if (!interventiData || Object.keys(interventiData).length === 0) {
            const emptyRes = { 
                score: 1, 
                label: "Bassa (Nessun dato)", 
                isReliable: false, 
                showNumbers: false, 
                watermark: "BOZZA" 
            };
            return emptyRes;
        }

        let totalWeight = 0;
        let paramsCount = 0;

        // Analisi per ogni intervento selezionato
        for (const [code, params] of Object.entries(interventiData)) {
            // Cerchiamo i documenti richiesti per questo intervento
            const meta = INTERVENTI[code];
            const docsRichiesti = meta ? meta.documenti_richiesti : [];
            
            // Troviamo il documento tecnico principale (es. "scheda tecnica...")
            const techDocName = docsRichiesti.find(d => d.toLowerCase().includes("scheda tecnica"));
            const docStatus = techDocName ? (documentsStatus[techDocName] || "dichiarato_cliente") : "dichiarato_cliente";
            
            const weight = _getSourceWeight(docStatus);
            
            // Ogni parametro inserito per questo intervento eredita il peso del documento
            for (const paramKey in params) {
                const val = params[paramKey];
                if (val !== undefined && val !== null && val !== "") {
                    totalWeight += weight;
                    paramsCount++;
                }
            }
        }

        if (paramsCount === 0) {
            const noParamsRes = { score: 1, label: "Bassa (Dichiarato)", isReliable: false, showNumbers: false };
            return noParamsRes;
        }

        const avgScore = totalWeight / paramsCount;
        
        let label = "Bassa (Dichiarato)";
        let isReliable = false;

        if (avgScore >= 3.0) {
            label = "Massima (Certificato/Verificato)";
            isReliable = true;
        } else if (avgScore >= 2.0) {
            label = "Media (Documentale)";
            isReliable = true;
        } else if (avgScore >= 1.5) {
            label = "Sufficiente (Caricato)";
            isReliable = false;
        }

        const result = {
            score: avgScore,
            label: label,
            isReliable: isReliable,
            showNumbers: avgScore >= 2.0, // Firewall Economico: sblocca a livello 'Media'
            watermark: avgScore < 3.0 ? "BOZZA INTERNA" : null
        };

        return result;
    };

    /**
     * Determina se un report può essere mostrato al cliente con cifre definitive.
     * 
     * @param {Object} reliabilityResult - Risultato di calculateReliability.
     * @returns {boolean}
     */
    const canShowToClient = function(reliabilityResult) {
        const canShow = reliabilityResult.isReliable && reliabilityResult.showNumbers;
        return canShow;
    };

    // 4. API PUBBLICA
    return {
        calculateReliability,
        canShowToClient
    };
};

// Esportazione Singleton
export const ReliabilityEngine = UaReliabilityEngine();
