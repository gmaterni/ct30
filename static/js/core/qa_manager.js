/**
 * qa_manager.js - Motore di validazione e QA per CT30 Advisor.
 * Esegue gli scenari di test definiti in normativa.js per verificare la coerenza
 * tra RulesEngine, FormulaEngine e risultati attesi.
 *
 * @module  qa_manager
 * @version 1.0.0
 * @date    2026-06-02
 */
"use strict";

import { TEST_SCENARIOS } from "./normativa.js";
import { RulesEngine } from "./rules_engine.js";
import { FormulaEngine } from "./formula_engine.js";
import { CrossRuleEngine } from "./cross_rule_engine.js";

var UaQaManager = function() {

    var _scenarios = TEST_SCENARIOS.scenari || [];

    var _runScenario = function(scenario) {
        var input = scenario.input;
        var atteso = scenario.atteso;

        var result = {
            id: scenario.id,
            nome: scenario.nome,
            success: true,
            dettagli: []
        };

        var validationInput = {
            subjectType: input.soggetto,
            category: input.categoria_catastale,
            buildingStatus: input.edificio_esistente ? "esistente" : "nuovo",
            selectedInterventi: input.interventi || [],
            interventiData: input.dati_tecnici || input.interventiData || {}
        };

        var rulesResult = RulesEngine.validateAmmissibilita(validationInput);

        var esitoAttesoBlocco = atteso.esito === "non_ammissibile_o_blocco_intervento" || atteso.esito === "blocco_calcolo";
        var expectedSuccess = !esitoAttesoBlocco;

        // Se il test si aspetta un blocco, verifica RulesEngine e CrossRuleEngine
        var isEffectivelyBlocked = !rulesResult.success;
        if (!isEffectivelyBlocked && !expectedSuccess && input.interventi) {
            var crossCheck = CrossRuleEngine.validateSelection(input.interventi);
            if (!crossCheck.success) {
                isEffectivelyBlocked = true;
            }
        }

        // Verifica anche canCalculate per interventi con dati_tecnici
        // (copre blocchi in formula_engine.js come III.B rapporto, III.D DEC, ecc.)
        var datiTecnici = input.dati_tecnici || (atteso.esito === "blocco_calcolo" ? input.interventiData : {}) || {};
        var calcContext = {
            soggetto: input.soggetto,
            zonaClimatica: input.zona_climatica || input.ambito || "Zona E",
            edificio_esistente: input.edificio_esistente
        };
        var calcoliFalliti = [];

        if (input.interventi) {
            input.interventi.forEach(function(code) {
                var dt = datiTecnici[code];
                if (dt) {
                    try {
                        var calcResult = FormulaEngine.calculate(code, dt, calcContext);
                        if (calcResult && (calcResult.errors && calcResult.errors.length > 0)) {
                            calcoliFalliti.push(code + ": " + calcResult.errors.join(", "));
                            isEffectivelyBlocked = true;
                        }
                    } catch (e) {
                        calcoliFalliti.push(code + ": errore " + e.message);
                    }
                }
            });
        }

        // Per "blocco_calcolo", verifica che canCalculate abbia effettivamente bloccato
        if (atteso.esito === "blocco_calcolo" && calcoliFalliti.length === 0) {
            result.success = false;
            result.dettagli.push("blocco_calcolo atteso ma canCalculate non ha bloccato nessun intervento.");
        }

        if (isEffectivelyBlocked !== !expectedSuccess && atteso.esito !== "ammissibile_preliminare_o_da_verificare") {
            result.success = false;
            var detailMsg = "Engine: atteso " + (expectedSuccess ? "successo" : "blocco")
                + ", RulesEngine=" + rulesResult.success;
            if (calcoliFalliti.length > 0) {
                detailMsg = detailMsg + ", canCalculate bloccato: " + calcoliFalliti.join("; ");
            }
            result.dettagli.push(detailMsg);
        }

        if (input.interventi) {
            input.interventi.forEach(function(code) {
                var compatibility = RulesEngine.getInterventoCompatibility(code, rulesResult.validTitles);
                var alreadyBlockedByRules = rulesResult.errors.some(function(e) {
                    return e.indexOf(code) !== -1;
                });

                var shouldBeBlockedByRules = atteso.blocchi_attesi && atteso.esito !== "blocco_calcolo" && atteso.blocchi_attesi.some(function(b) {
                    return b.indexOf(code) !== -1 && b.indexOf("senza") === -1;
                });

                if (shouldBeBlockedByRules && compatibility.isCompatible && !alreadyBlockedByRules) {
                    result.success = false;
                    var blockMsg = "RulesEngine: intervento " + code + " non bloccato (atteso blocco).";
                    result.dettagli.push(blockMsg);
                }
            });
        }

        // Per test che si aspettano calcolo_ok, verifica che canCalculate non blocchi
        if (atteso.esito === "calcolo_ok" && calcoliFalliti.length > 0) {
            result.success = false;
            result.dettagli.push("canCalculate ha bloccato intervento: " + calcoliFalliti.join("; "));
        }

        return result;
    };

    var runAllTests = function() {
        var report = {
            timestamp: new Date().toISOString(),
            total: _scenarios.length,
            passed: 0,
            failed: 0,
            results: []
        };

        _scenarios.forEach(function(s) {
            var res = _runScenario(s);
            if (res.success) {
                report.passed = report.passed + 1;
            } else {
                report.failed = report.failed + 1;
            }
            report.results.push(res);
        });

        return report;
    };

    var getScenarios = function() {
        var list = _scenarios.slice();
        return list;
    };

    return {
        runAllTests: runAllTests,
        getScenarios: getScenarios
    };
};

var QaManager = UaQaManager();
export { QaManager };
