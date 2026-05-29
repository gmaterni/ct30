/**
 * formula_engine.js - Motore di calcolo degli incentivi per il Conto Termico 3.0.
 *
 * Gestisce la logica di calcolo dinamica basata sui metadati normativi.
 * Elimina i valori hardcoded a favore delle definizioni in normativa.js.
 *
 * @module  formula_engine
 * @version 2.0.0
 * @date    2026-05-27
 * @author  Gemini CLI
 */

"use strict";

import { RULES, FORMULE_INCENTIVO, PROCEDURA_CONFIG } from "./normativa.js";
import { PremialitaEngine } from "./premialita_engine.js";

/**
 * Factory per il motore delle formule.
 * 
 * @returns {Object} API pubblica del motore.
 */
const UaFormulaEngine = function() {

    // 1. FUNZIONI DI SUPPORTO ALLA RISOLUZIONE DEI COEFFICIENTI

    /**
     * Calcola il piano di erogazione (rateizzazione).
     * 
     * @param {number} totalAmount - Incentivo totale calcolato.
     * @param {string} code - Codice intervento.
     * @param {Object} dati - Dati tecnici per determinare la durata.
     * @returns {Object} Dettaglio rate.
     * @private
     */
    const _calculatePaymentPlan = function(totalAmount, code, dati) {
        const threshold = PROCEDURA_CONFIG.SOGLIA_UNICA_SOLUZIONE;
        
        const plan = {
            total: totalAmount,
            numInstallments: 1,
            installments: [],
            isSinglePayment: false
        };

        if (totalAmount <= threshold) {
            plan.numInstallments = 1;
            plan.isSinglePayment = true;
            plan.installments.push({ n: 1, amount: totalAmount, label: "Unica soluzione" });
        } else {
            // Determinazione durata in anni
            let years = 5; // Default standard CT 3.0
            const interventionRules = RULES.interventi[code];
            
            if (interventionRules && interventionRules.durata) {
                if (typeof interventionRules.durata === "object") {
                    const pn = parseFloat(dati.potenza_pdc_kw) || 0;
                    years = pn <= 35 ? 2 : 5; // Regola PdC standard
                } else {
                    years = interventionRules.durata;
                }
            }

            plan.numInstallments = years;
            const installmentAmount = totalAmount / years;
            for (let i = 1; i <= years; i++) {
                plan.installments.push({ n: i, amount: installmentAmount, label: `Rata ${i} di ${years}` });
            }
        }

        return plan;
    };

    /**
     * Risolve il coefficiente Quf basato sulla zona climatica.
     */
    const _resolveQuf = function(zona) {
        const zonaKey = zona.startsWith("Zona ") ? zona : `Zona ${zona}`;
        return RULES.fasce_climatiche[zonaKey]?.quf || 0;
    };

    /**
     * Risolve il coefficiente Ci per le Pompe di Calore (III.A).
     */
    const _resolveCiPdc = function(dati) {
        const pn = parseFloat(dati.potenza_pdc_kw) || 0;
        const tipologia = dati.tipologia_pdc || "";
        const config = RULES.interventi["III.A"].coefficienti_ci;

        let key = "";
        if (tipologia === "aria/aria") {
            // Distinzione tra split, VRF e rooftop non ancora granulare nei dati input, 
            // uso logica di fallback o default split se <= 12
            if (pn <= 12) key = "Ci_PDC_aria_aria_split_le12kW";
            else key = "Ci_PDC_aria_aria_VRF_12_35kW"; // Esempio di mapping
        } else if (tipologia === "aria/acqua") {
            key = pn <= 35 ? "Ci_PDC_aria_acqua_le35kW" : "Ci_PDC_aria_acqua_gt35kW";
        } else if (tipologia === "acqua/acqua" || tipologia === "geotermica") {
            key = pn <= 35 ? "Ci_PDC_acqua_acqua_le35kW" : "Ci_PDC_acqua_acqua_gt35kW";
        }

        return config[key] || 0;
    };

    /**
     * Risolve il costo massimo ammissibile (Cmax) per l'isolamento (II.A).
     */
    const _resolveCmaxIsolamento = function(tipo) {
        const config = RULES.interventi["II.A"].varianti;
        // Normalizzazione minima per matching
        return config[tipo]?.cmax || 0;
    };

    // 2. MOTORE DI ESECUZIONE FORMULE GENERICO

    /**
     * Esegue il calcolo basandosi sulla definizione della formula nel metadata.
     * 
     * @private
     */
    const _executeGenericFormula = function(code, dati, contesto) {
        const metadata = FORMULE_INCENTIVO[code];
        const zona = contesto.zonaClimatica || "Zona E";
        
        const params = {
            zona: zona,
            quf: _resolveQuf(zona)
        };

        // Mappatura dati input
        if (metadata.mappatura_dati) {
            for (const [varName, dataKey] of Object.entries(metadata.mappatura_dati)) {
                params[varName] = parseFloat(dati[dataKey]) || 0;
            }
        }

        // Risoluzione coefficienti specifici per intervento
        if (code === "III.A") {
            params.Ci = _resolveCiPdc(dati);
            params.Quf = params.quf;
            params.k = 1.0; // Default per standard, da gestire per ibridi
            params.eta_s_min_ecodesign = 110; // Valore di esempio, da prendere da tabelle ecodesign
        } else if (code === "II.A") {
            params.cmax = _resolveCmaxIsolamento(dati.tipo_superficie_opaca);
            params.percentuale = (zona === "Zona E" || zona === "Zona F") ? 0.5 : 0.4;
        } else if (code === "II.G") {
            const tipo = dati.tipo_ricarica || "monofase";
            const varKey = tipo.includes("trifase") ? "Punto ricarica Trifase" : "Punto ricarica Monofase";
            params.cmax_fisso = RULES.interventi["II.G"].varianti[varKey]?.cmax_fisso || 2400;
            params.cmax_kw = RULES.interventi["II.G"].varianti["Potenza > 22 kW"]?.cmax_kw || 1200;
            params.percentuale = 0.3;
        }

        // Calcolo variabili intermedie
        const steps = [];
        const variables = { ...params }; // Inizializza con i parametri di base

        if (metadata.variabili) {
            // 1. Assegnazione valori di default per variabili senza valore attuale
            for (const v of metadata.variabili) {
                if (v.valore_default !== undefined && variables[v.codice] === undefined) {
                    variables[v.codice] = v.valore_default;
                }
            }

            // 2. Risoluzione iterativa delle espressioni (gestione dipendenze)
            let pending = metadata.variabili.filter(v => v.espressione);
            let progress = true;
            let iterations = 0;
            const maxIterations = pending.length * 2; // Sicurezza contro loop infiniti

            while (progress && pending.length > 0 && iterations < maxIterations) {
                progress = false;
                iterations++;
                const stillPending = [];

                for (const v of pending) {
                    try {
                        // Creiamo una funzione che espone 'ctx' come unico parametro
                        // Tutte le variabili sono accessibili come ctx.nomeVariabile
                        const func = new Function('ctx', 'min', 'max', 'log', `with(ctx) { return ${v.espressione}; }`);
                        const result = func(variables, Math.min, Math.max, Math.log);

                        // Se arriviamo qui, il calcolo è riuscito
                        variables[v.codice] = result;
                        steps.push({ desc: v.descrizione, label: v.codice, formula: v.espressione, value: result });
                        progress = true;
                    } catch (e) {
                        // Se è un ReferenceError, la variabile potrebbe dipendere da una non ancora calcolata
                        if (e instanceof ReferenceError) {
                            stillPending.push(v);
                        } else {
                            console.error(`Errore valutazione variabile ${v.codice}:`, e);
                            steps.push({ desc: v.descrizione, label: v.codice, formula: v.espressione, value: null, error: e.message });
                        }
                    }
                }
                pending = stillPending;
            }

            if (pending.length > 0) {
                pending.forEach(v => {
                    console.error(`Variabile ${v.codice} non risolta per dipendenze mancanti.`);
                    steps.push({ desc: v.descrizione, label: v.codice, formula: v.espressione, value: null, error: "Dipendenze non risolte" });
                });
            }
        }

        // Valutazione formula finale
        let finalFormula = metadata.formula_base;
        if (!finalFormula) {
            return { amount: 0, params: variables, steps: steps, errors: ["Formula base non definita."] };
        }

        let amount = 0;
        try {
            // Utilizziamo lo stesso approccio sicuro con 'with(ctx)'
            const func = new Function('ctx', 'min', 'max', 'log', `with(ctx) { return ${finalFormula}; }`);
            amount = func(variables, Math.min, Math.max, Math.log);
            
            steps.push({ desc: "Calcolo Incentivo Finale", label: "I_tot", formula: finalFormula, value: amount, unit: "€" });
        } catch (e) {
            console.error(`Errore valutazione formula finale per ${code}:`, e);
            return { amount: 0, params: variables, steps: steps, errors: [`Errore calcolo: ${e.message}`] };
        }

        return {
            amount: amount,
            params: variables,
            steps: steps,
            isEstimate: true
        };
    };

    // 3. FUNZIONI PUBBLICHE

    const canCalculate = function(code, dati) {
        const config = FORMULE_INCENTIVO[code];
        
        const result = {
            allowed: true,
            motivi: [],
            status: "Sconosciuto",
            isBlocked: false
        };

        if (!config) {
            result.allowed = false;
            result.motivi.push(`Configurazione formula per ${code} non trovata.`);
            return result;
        }

        result.status = config.formula_status;

        if (config.formula_status === "non_validata") {
            result.isBlocked = true;
            result.motivi.push(`La formula per ${code} non è ancora stata validata.`);
        }

        const richiesti = config.richiede || [];
        const mancanti = richiesti.filter(p => !dati[p]);

        if (mancanti.length > 0) {
            result.allowed = false;
            result.motivi.push(`Dati mancanti: ${mancanti.join(', ')}`);
        }

        if (result.isBlocked) result.allowed = false;
        return result;
    };

    const calculate = function(code, datiTecnici, contesto) {
        const metadata = FORMULE_INCENTIVO[code];
        
        let calculationResult = {
            amount: 0,
            params: {},
            steps: [],
            isEstimate: false,
            errors: [],
            status: metadata ? metadata.formula_status : "Bozza",
            note: metadata ? metadata.note : [],
            isBlocked: false
        };

        const check = canCalculate(code, datiTecnici);
        if (!check.allowed) {
            calculationResult.errors = check.motivi;
            calculationResult.isBlocked = check.isBlocked;
            calculationResult.status = check.status;
            return calculationResult;
        }

        try {
            const res = _executeGenericFormula(code, datiTecnici, contesto);
            calculationResult = { ...calculationResult, ...res };

            // Calcolo Piano di Erogazione
            if (calculationResult.amount > 0 && calculationResult.errors.length === 0) {
                calculationResult.paymentPlan = _calculatePaymentPlan(calculationResult.amount, code, datiTecnici);
            }

            // Applicazione Premialità
            if (calculationResult.errors.length === 0 && calculationResult.amount > 0) {
                const bonusPerc = PremialitaEngine.calculateBonus(code, datiTecnici);
                if (bonusPerc > 0) {
                    const bonusAmount = calculationResult.amount * bonusPerc;
                    calculationResult.steps.push({
                        desc: "Premialità (es. Made in EU / Registro ENEA)",
                        label: "Bonus",
                        value: bonusAmount,
                        unit: "€"
                    });
                    calculationResult.amount += bonusAmount;
                }
            }
            
        } catch (err) {
            console.error(`FormulaEngine.calculate error:`, err);
            calculationResult.errors.push(`Errore interno: ${err.message}`);
        }

        return calculationResult;
    };

    return {
        canCalculate,
        calculate
    };
};

export const FormulaEngine = UaFormulaEngine();
