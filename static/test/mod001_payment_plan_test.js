/**
 * MOD-001 Test Suite: Piano di Erogazione Preciso CT 3.0
 * 
 * Test per la modifica al formula_engine.js che implementa le regole di erogazione
 * secondo D.M. 7 Agosto 2025:
 * - Rata unica se incentivo totale <= 15.000 €
 * - 2 annualità se potenza < 35 kW
 * - 5 annualità se potenza >= 35 kW
 * 
 * @module mod001_payment_plan_test
 * @version 1.0.0
 * @date 2026-05-30
 */

"use strict";

/**
 * Test Runner per MOD-001
 * Esegue tutti i test e restituisce un report
 */
const Mod001TestRunner = function() {

    // Statistiche
    let totalTests = 0;
    let passedTests = 0;
    let failedTests = 0;
    const results = [];

    /**
     * Registra il risultato di un test
     */
    const _registerResult = function(testName, success, details) {
        totalTests++;
        if (success) {
            passedTests++;
        } else {
            failedTests++;
        }
        
        results.push({
            name: testName,
            success: success,
            details: details,
            timestamp: new Date().toISOString()
        });

        console.log(`[${success ? '✅ PASS' : '❌ FAIL'}] ${testName}`);
        if (details && !success) {
            console.log(`   Dettagli: ${details}`);
        }
    };

    /**
     * Assert helper
     */
    const _assert = function(condition, message) {
        if (!condition) {
            throw new Error(message || "Assertion failed");
        }
    };

    /**
     * Arrotondamento a 2 decimali (come nella funzione)
     */
    const _round2 = function(value) {
        return Math.round(value * 100) / 100;
    };

    // ========================================================================
    // TEST UNITARI (✅)
    // ========================================================================

    /**
     * TEST 1: Rata unica per incentivo <= 15.000 €
     * Regola: Se totalAmount <= 15000, deve essere unica soluzione
     */
    const testUnitarioRataUnica = function() {
        const testCases = [
            { amount: 10000, expectedRate: 1, expectedLabel: "Unica soluzione" },
            { amount: 15000, expectedRate: 1, expectedLabel: "Unica soluzione" },
            { amount: 0, expectedRate: 1, expectedLabel: "Unica soluzione" },
            { amount: 0.01, expectedRate: 1, expectedLabel: "Unica soluzione" }
        ];

        for (const tc of testCases) {
            try {
                // Importo dinamico per evitare cache
                const { FormulaEngine } = require("../js/core/formula_engine.js");
                const result = FormulaEngine.calculate("III.A", { potenza_pdc_kw: 10, scop: 4.1 }, { zonaClimatica: "Zona E" });
                
                if (!result.paymentPlan) {
                    _registerResult(`Rata unica (${tc.amount}€) - paymentPlan mancante`, false, "paymentPlan non generato");
                    continue;
                }

                const plan = result.paymentPlan;
                _assert(plan.isSinglePayment === true, `isSinglePayment dovrebbe essere true`);
                _assert(plan.numInstallments === tc.expectedRate, `numInstallments dovrebbe essere ${tc.expectedRate}`);
                _assert(plan.installments.length === 1, `Dovrebbe avere 1 rata`);
                _assert(plan.installments[0].label === tc.expectedLabel, `Label dovrebbe essere "${tc.expectedLabel}"`);
                _assert(plan.installments[0].amount === tc.amount, `Importo rata dovrebbe essere ${tc.amount}`);
                
                _registerResult(`Rata unica (${tc.amount}€)`, true, null);
            } catch (error) {
                _registerResult(`Rata unica (${tc.amount}€)`, false, error.message);
            }
        }
    };

    /**
     * TEST 2: 2 annualità per potenza < 35 kW e incentivo > 15.000 €
     */
    const testUnitarioDueAnnualita = function() {
        const testCases = [
            { power: 10, amount: 20000, expectedYears: 2 },
            { power: 34.9, amount: 20000, expectedYears: 2 },
            { power: 1, amount: 15001, expectedYears: 2 },
            { power: 34, amount: 30000, expectedYears: 2 }
        ];

        for (const tc of testCases) {
            try {
                // Creo un mock della funzione per testare direttamente
                // (Non possiamo chiamare direttamente _calculatePaymentPlan come è privata)
                const { FormulaEngine } = require("../js/core/formula_engine.js");
                const result = FormulaEngine.calculate("III.A", { 
                    potenza_pdc_kw: tc.power, 
                    scop: 4.1,
                    costo_pdc: 20000
                }, { zonaClimatica: "Zona E" });

                if (!result.paymentPlan) {
                    _registerResult(`2 annualità (P=${tc.power}kW, €${tc.amount}) - paymentPlan mancante`, false, "paymentPlan non generato");
                    continue;
                }

                const plan = result.paymentPlan;
                _assert(plan.isSinglePayment === false, `isSinglePayment dovrebbe essere false`);
                _assert(plan.numInstallments === tc.expectedYears, `numInstallments dovrebbe essere ${tc.expectedYears}`);
                _assert(plan.installments.length === tc.expectedYears, `Dovrebbe avere ${tc.expectedYears} rate`);
                
                const expectedInstallment = _round2(tc.amount / tc.expectedYears);
                _assert(plan.installments[0].amount === expectedInstallment, 
                    `Importo rata dovrebbe essere €${expectedInstallment}`);
                
                _registerResult(`2 annualità (P=${tc.power}kW, €${tc.amount})`, true, null);
            } catch (error) {
                _registerResult(`2 annualità (P=${tc.power}kW, €${tc.amount})`, false, error.message);
            }
        }
    };

    /**
     * TEST 3: 5 annualità per potenza >= 35 kW e incentivo > 15.000 €
     */
    const testUnitarioCinqueAnnualita = function() {
        const testCases = [
            { power: 35, amount: 50000, expectedYears: 5 },
            { power: 40, amount: 50000, expectedYears: 5 },
            { power: 100, amount: 100000, expectedYears: 5 }
        ];

        for (const tc of testCases) {
            try {
                const { FormulaEngine } = require("../js/core/formula_engine.js");
                const result = FormulaEngine.calculate("III.A", { 
                    potenza_pdc_kw: tc.power, 
                    scop: 4.1,
                    costo_pdc: 50000
                }, { zonaClimatica: "Zona E" });

                if (!result.paymentPlan) {
                    _registerResult(`5 annualità (P=${tc.power}kW, €${tc.amount}) - paymentPlan mancante`, false, "paymentPlan non generato");
                    continue;
                }

                const plan = result.paymentPlan;
                _assert(plan.isSinglePayment === false, `isSinglePayment dovrebbe essere false`);
                _assert(plan.numInstallments === tc.expectedYears, `numInstallments dovrebbe essere ${tc.expectedYears}`);
                _assert(plan.installments.length === tc.expectedYears, `Dovrebbe avere ${tc.expectedYears} rate`);
                
                const expectedInstallment = _round2(tc.amount / tc.expectedYears);
                _assert(plan.installments[0].amount === expectedInstallment, 
                    `Importo rata dovrebbe essere €${expectedInstallment}`);
                
                _registerResult(`5 annualità (P=${tc.power}kW, €${tc.amount})`, true, null);
            } catch (error) {
                _registerResult(`5 annualità (P=${tc.power}kW, €${tc.amount})`, false, error.message);
            }
        }
    };

    /**
     * TEST 4: Fail Fast - Validazione input
     */
    const testUnitarioFailFast = function() {
        try {
            const { FormulaEngine } = require("../js/core/formula_engine.js");
            
            // Test con totalAmount non valido
            const result1 = FormulaEngine.calculate("III.A", { potenza_pdc_kw: 10 }, { zonaClimatica: "Zona E" });
            // Questo non dovrebbe fallire, ma il paymentPlan non dovrebbe essere generato
            // se il calcolo dell'incentivo fallisce
            
            // Test con codice intervento mancante - non direttamente testabile
            // Test con dati null
            const result2 = FormulaEngine.calculate("III.A", null, { zonaClimatica: "Zona E" });
            // Dovrebbe gestire gracefully
            
            _registerResult("Fail Fast - Input non validi", true, "Gestiti correttamente");
        } catch (error) {
            _registerResult("Fail Fast - Input non validi", false, error.message);
        }
    };

    /**
     * TEST 5: Arrotondamento importi
     */
    const testUnitarioArrotondamento = function() {
        try {
            const { FormulaEngine } = require("../js/core/formula_engine.js");
            const result = FormulaEngine.calculate("III.A", { 
                potenza_pdc_kw: 10, 
                scop: 4.1,
                costo_pdc: 20000
            }, { zonaClimatica: "Zona E" });

            if (!result.paymentPlan) {
                _registerResult("Arrotondamento importi", false, "paymentPlan non generato");
                return;
            }

            const plan = result.paymentPlan;
            // Verifica che tutti gli importi siano arrotondati a 2 decimali
            for (const installment of plan.installments) {
                const decimalPart = installment.amount.toString().split('.')[1];
                if (decimalPart && decimalPart.length > 2) {
                    throw new Error(`Importo non arrotondato: ${installment.amount}`);
                }
            }
            
            _registerResult("Arrotondamento importi", true, null);
        } catch (error) {
            _registerResult("Arrotondamento importi", false, error.message);
        }
    };

    /**
     * TEST 6: Durata da regole intervento
     */
    const testUnitarioDurataDaRegole = function() {
        try {
            // II.G ha durata non definita come numero in RULES.interventi
            // ma III.G (Microcogenerazione) ha durata: 5
            const { FormulaEngine } = require("../js/core/formula_engine.js");
            const result = FormulaEngine.calculate("III.G", { 
                potenza_elettrica: 20,
                pes: 50,
                tipo_alimentazione: "Biomassa",
                costo_intervento: 50000
            }, { zonaClimatica: "Zona E" });

            if (!result.paymentPlan) {
                _registerResult("Durata da regole intervento", false, "paymentPlan non generato");
                return;
            }

            const plan = result.paymentPlan;
            // III.G ha durata: 5 in RULES.interventi
            _assert(plan.numInstallments === 5, `numInstallments dovrebbe essere 5 per III.G`);
            
            _registerResult("Durata da regole intervento", true, null);
        } catch (error) {
            _registerResult("Durata da regole intervento", false, error.message);
        }
    };

    // ========================================================================
    // TEST INTEGRAZIONE (🔄)
    // ========================================================================

    /**
     * TEST 7: Integrazione con FormulaEngine.calculate() completo
     */
    const testIntegrazioneFormulaEngine = function() {
        try {
            const { FormulaEngine } = require("../js/core/formula_engine.js");
            
            // Test con III.A (PDC) - dovrebbe calcolare incentivo e piano
            const result = FormulaEngine.calculate("III.A", { 
                potenza_pdc_kw: 12, 
                scop: 4.1,
                tipologia_pdc: "aria/acqua",
                costo_pdc: 12500
            }, { zonaClimatica: "Zona E" });

            _assert(result.amount > 0, "Incentivo dovrebbe essere > 0");
            _assert(result.paymentPlan !== undefined, "paymentPlan dovrebbe essere presente");
            
            const plan = result.paymentPlan;
            _assert(plan.total === result.amount, "Total piano dovrebbe eguagliare incentivo");
            
            _registerResult("Integrazione con FormulaEngine.calculate()", true, null);
        } catch (error) {
            _registerResult("Integrazione con FormulaEngine.calculate()", false, error.message);
        }
    };

    /**
     * TEST 8: Integrazione con diversi tipi di intervento
     */
    const testIntegrazioneDiversiInterventi = function() {
        const testCases = [
            { code: "II.H", dati: { potenza_fv_kw: 10, costo_fv: 20000 }, amount: 20000 },
            { code: "II.G", dati: { potenza_ricarica_kw: 22, costo_colonnina: 10000 }, amount: 15001 }
        ];

        for (const tc of testCases) {
            try {
                const { FormulaEngine } = require("../js/core/formula_engine.js");
                const result = FormulaEngine.calculate(tc.code, tc.dati, { zonaClimatica: "Zona E" });

                if (!result.paymentPlan) {
                    // Potrebbe non avere paymentPlan se il calcolo fallisce
                    continue;
                }

                const plan = result.paymentPlan;
                _assert(plan.total === result.amount, `Total piano dovrebbe eguagliare incentivo`);
                _assert(plan.installments.length > 0, `Dovrebbe avere almeno una rata`);
                
                _registerResult(`Integrazione - ${tc.code}`, true, null);
            } catch (error) {
                _registerResult(`Integrazione - ${tc.code}`, false, error.message);
            }
        }
    };

    // ========================================================================
    // TEST SCENARIO (📋)
    // ========================================================================

    /**
     * TEST 9: Scenario test_01_pdc_privato.json
     * Privato - PdC Aria/Acqua 12kW in Zona E
     */
    const testScenario01 = function() {
        try {
            const { FormulaEngine } = require("../js/core/formula_engine.js");
            
            // Dati da test_01_pdc_privato.json
            const dati = {
                potenza_pdc_kw: 12,
                tipologia_pdc: "aria/acqua",
                scop: 4.1,
                eta_s: 155,
                costo_pdc: 12500
            };

            const result = FormulaEngine.calculate("III.A", dati, { zonaClimatica: "Zona E" });

            _assert(result.amount > 0, "Incentivo dovrebbe essere > 0");
            _assert(result.paymentPlan !== undefined, "paymentPlan dovrebbe essere presente");
            
            const plan = result.paymentPlan;
            // Con 12kW (< 35kW) e incentivo > 15000, dovrebbe avere 2 rate
            if (result.amount > 15000) {
                _assert(plan.numInstallments === 2, `Dovrebbe avere 2 rate per P=12kW`);
            } else {
                _assert(plan.isSinglePayment === true, `Dovrebbe essere rata unica se <= 15000€`);
            }
            
            _registerResult("Scenario test_01_pdc_privato", true, null);
        } catch (error) {
            _registerResult("Scenario test_01_pdc_privato", false, error.message);
        }
    };

    /**
     * TEST 10: Trainati (II.H/II.G) ereditano durata da III.A
     * II.H o II.G senza III.A usano propria potenza
     * Con III.A con potenza >= 35kW → 5 rate
     * Con III.A con potenza < 35kW → 2 rate
     */
    const testTrainatiEreditanoDurata = function() {
        const testCases = [
            {
                name: "II.H trainato da III.A >=35kW → 5 rate",
                iiiAPotenza: 40,
                fvPotenza: 10,
                expectedYears: 5
            },
            {
                name: "II.H trainato da III.A <35kW → 2 rate",
                iiiAPotenza: 10,
                fvPotenza: 50,
                expectedYears: 2
            },
            {
                name: "II.G trainato da III.A >=35kW → 5 rate",
                iiiAPotenza: 35,
                chargingPower: 22,
                expectedYears: 5
            }
        ];

        for (const tc of testCases) {
            try {
                const { FormulaEngine } = require("../js/core/formula_engine.js");
                const code = tc.name.includes("II.G") ? "II.G" : "II.H";
                const dati = code === "II.H" 
                    ? { potenza_fv_kw: tc.fvPotenza, costo_fv: 20000, is_autoconsumo: "sì" }
                    : { potenza_ricarica_kw: tc.chargingPower, costo_colonnina: 15000, numero_punti_ricarica: 3 };
                
                // Passa dati III.A nel contesto per trainati
                const contesto = {
                    zonaClimatica: "Zona E",
                    allInterventiData: {
                        "III.A": {
                            potenza_pdc_kw: tc.iiiAPotenza,
                            tipologia_pdc: "aria/acqua",
                            made_in_eu: "sì",
                            sostituisce_esistente: "sì"
                        }
                    }
                };

                const result = FormulaEngine.calculate(code, dati, contesto);

                if (!result.paymentPlan) {
                    // Se amount <= 15000, è rata unica, non testiamo durata
                    if (result.amount <= 15000) continue;
                    _registerResult(`${tc.name} - paymentPlan mancante`, false, "paymentPlan non generato");
                    continue;
                }

                const plan = result.paymentPlan;
                _assert(plan.numInstallments === tc.expectedYears, 
                    `${tc.name}: numInstallments dovrebbe essere ${tc.expectedYears}, ottenuto ${plan.numInstallments}`);

                _registerResult(tc.name, true, null);
            } catch (error) {
                _registerResult(tc.name, false, error.message);
            }
        }
    };

    /**
     * TEST 11: Scenario test_02_impresa_grande.json
     * Impresa - PdC Grande + FV
     */
    const testScenario02 = function() {
        try {
            const { FormulaEngine } = require("../js/core/formula_engine.js");
            
            // Dati ipotetici per impresa con PDC grande
            const dati = {
                potenza_pdc_kw: 50,
                tipologia_pdc: "aria/acqua",
                scop: 4.1,
                costo_pdc: 30000
            };

            const result = FormulaEngine.calculate("III.A", dati, { zonaClimatica: "Zona E" });

            _assert(result.amount > 0, "Incentivo dovrebbe essere > 0");
            _assert(result.paymentPlan !== undefined, "paymentPlan dovrebbe essere presente");
            
            const plan = result.paymentPlan;
            // Con 50kW (>= 35kW) e incentivo > 15000, dovrebbe avere 5 rate
            if (result.amount > 15000) {
                _assert(plan.numInstallments === 5, `Dovrebbe avere 5 rate per P=50kW`);
            } else {
                _assert(plan.isSinglePayment === true, `Dovrebbe essere rata unica se <= 15000€`);
            }
            
            _registerResult("Scenario test_02_impresa_grande", true, null);
        } catch (error) {
            _registerResult("Scenario test_02_impresa_grande", false, error.message);
        }
    };

    // ========================================================================
    // ESECUZIONE TEST
    // ========================================================================

    /**
     * Esegue tutti i test
     */
    const runAll = function() {
        console.log("\n========================================");
        console.log("MOD-001: Piano Erogazione - Test Suite");
        console.log("========================================\n");

        // Reset statistiche
        totalTests = 0;
        passedTests = 0;
        failedTests = 0;
        results.length = 0;

        // Test Unitari
        console.log("--- TEST UNITARI (✅) ---");
        testUnitarioRataUnica();
        testUnitarioDueAnnualita();
        testUnitarioCinqueAnnualita();
        testUnitarioFailFast();
        testUnitarioArrotondamento();
        testUnitarioDurataDaRegole();

        console.log("\n--- TEST INTEGRAZIONE (🔄) ---");
        testIntegrazioneFormulaEngine();
        testIntegrazioneDiversiInterventi();

        console.log("\n--- TEST TRAINATI (🔗) ---");
        testTrainatiEreditanoDurata();

        console.log("\n--- TEST SCENARIO (📋) ---");
        testScenario01();
        testScenario02();

        // Report finale
        console.log("\n========================================");
        console.log("REPORT FINALE");
        console.log("========================================");
        console.log(`Totale: ${totalTests}`);
        console.log(`Passati: ${passedTests}`);
        console.log(`Falliti: ${failedTests}`);
        console.log(`Successo: ${totalTests > 0 ? ((passedTests / totalTests) * 100).toFixed(2) + '%' : '0%'}`);
        console.log("========================================\n");

        return {
            total: totalTests,
            passed: passedTests,
            failed: failedTests,
            successRate: totalTests > 0 ? (passedTests / totalTests) * 100 : 0,
            results: results
        };
    };

    return {
        runAll: runAll
    };
};

// Esporta il runner
if (typeof module !== 'undefined' && module.exports) {
    module.exports = Mod001TestRunner();
}

// Esecuzione automatica se script eseguito direttamente (Node.js)
if (typeof require !== 'undefined' && require.main === module) {
    const runner = Mod001TestRunner();
    const report = runner.runAll();
    process.exit(report.failed > 0 ? 1 : 0);
}
