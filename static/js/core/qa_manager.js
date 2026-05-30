/**
 * qa_manager.js - Motore di validazione e QA per CT30 Advisor.
 *
 * Esegue gli scenari di test definiti in normativa.js per verificare la coerenza
 * tra la logica implementata (RulesEngine, FormulaEngine) e i risultati attesi.
 *
 * @module  qa_manager
 * @version 1.0.0
 * @date    2026-05-23
 * @author  Gemini CLI
 */

"use strict";

import { TEST_SCENARIOS } from "./normativa.js";
import { RulesEngine } from "./rules_engine.js";
import { FormulaEngine } from "./formula_engine.js";
import { CrossRuleEngine } from "./cross_rule_engine.js";

/**
 * Factory per il manager di QA.
 * 
 * @returns {Object} API pubblica del modulo QA.
 */
const UaQaManager = function() {

    // 1. STATO PRIVATO
    const _scenarios = TEST_SCENARIOS.scenari || [];

    // 2. FUNZIONI PRIVATE

    /**
     * Esegue un singolo scenario di test.
     * 
     * @param {Object} scenario - Oggetto scenario da testare.
     * @returns {Object} Esito del test.
     * @private
     */
    const _runScenario = function(scenario) {
        const input = scenario.input;
        const atteso = scenario.atteso;
        
        const result = {
            id: scenario.id,
            nome: scenario.nome,
            success: true,
            dettagli: []
        };

        // 1. Test Ammissibilità (RulesEngine)
        const validationInput = {
            subjectType: input.soggetto,
            category: input.categoria_catastale,
            buildingStatus: input.edificio_esistente ? "esistente" : "nuovo"
        };

        const rulesResult = RulesEngine.validateAmmissibilita(validationInput);
        
        // Verifica ammissibilità generale
        const expectedSuccess = atteso.esito !== "non_ammissibile_o_blocco_intervento";
        if (rulesResult.success !== expectedSuccess && atteso.esito !== "ammissibile_preliminare_o_da_verificare") {
            // Se lo scenario è ammissibile preliminare, accettiamo sia success true che false se ci sono blocchi successivi
            result.success = false;
            result.dettagli.push(`RulesEngine: atteso ${expectedSuccess}, ottenuto ${rulesResult.success}`);
        }

        // 2. Test Interventi Specifici e Blocchi
        if (input.interventi) {
            // Verifica compatibilità con RulesEngine
            input.interventi.forEach(code => {
                const compatibility = RulesEngine.getInterventoCompatibility(code, rulesResult.validTitles);
                
                // Se l'intervento è incompatibile con il soggetto/catasto, verifichiamo se era atteso
                const shouldBeBlockedByRules = atteso.blocchi_attesi && atteso.blocchi_attesi.some(b => b.includes(code) && !b.includes("senza"));
                
                if (shouldBeBlockedByRules && compatibility.isCompatible) {
                    result.success = false;
                    result.dettagli.push(`RulesEngine: intervento ${code} non bloccato (atteso blocco).`);
                }
            });

            // Verifica dipendenze tramite CrossRuleEngine
            const crossValidation = CrossRuleEngine.validateSelection(input.interventi);
            const shouldHaveCrossBlocks = atteso.blocchi_attesi && atteso.blocchi_attesi.some(b => b.includes("senza"));

            if (shouldHaveCrossBlocks && crossValidation.success) {
                result.success = false;
                result.dettagli.push("CrossRuleEngine: atteso blocco per dipendenze mancanti, ma validazione riuscita.");
            } else if (!shouldHaveCrossBlocks && !crossValidation.success) {
                result.success = false;
                result.dettagli.push(`CrossRuleEngine: validazione fallita inaspettatamente: ${crossValidation.errors.join(', ')}`);
            }
        }

        return result;
    };

    // 3. FUNZIONI PUBBLICHE

    /**
     * Esegue tutti i test scenari disponibili.
     * 
     * @returns {Object} Report complessivo dei test.
     */
    const runAllTests = function() {
        const report = {
            timestamp: new Date().toISOString(),
            total: _scenarios.length,
            passed: 0,
            failed: 0,
            results: []
        };

        _scenarios.forEach(s => {
            const res = _runScenario(s);
            if (res.success) {
                report.passed++;
            } else {
                report.failed++;
            }
            report.results.push(res);
        });

        return report;
    };

    /**
     * Restituisce gli scenari caricati.
     * @returns {Object[]}
     */
    const getScenarios = function() {
        const list = [..._scenarios];
        return list;
    };

    // 4. API PUBBLICA
    return {
        runAllTests,
        getScenarios
    };
};

// Esportazione Singleton
export const QaManager = UaQaManager();
