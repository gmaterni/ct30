"use strict";

import { INTERVENTI, SOTTO_CATEGORIE_SA } from "./normativa.js";

const UaCrossRuleEngine = function() {

    const _catalog = INTERVENTI;

    const _ELETTRICHE_TIPOLOGIE = [
        "aria/aria",
        "aria/acqua",
        "acqua/aria",
        "acqua/acqua",
        "salamoia/aria",
        "salamoia/acqua",
        "geotermica"
    ];

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

        const obbligatori = metadata.interventi_collegati_obbligatori || [];
        const mancanti = obbligatori.filter(req => !selectedCodes.includes(req));

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

        if (code === "II.C" && !selectedCodes.includes("II.B")) {
            result.isValid = false;
            result.missing.push("II.B");
            result.error = "L'intervento II.C (Schermature) richiede obbligatoriamente II.B (Infissi).";
        }

        return result;
    };

    const _checkTechnicalConstraints = function(code, selectedCodes, interventiData) {
        const result = {
            isValid: true,
            error: ""
        };

        if (!code || !selectedCodes || !Array.isArray(selectedCodes)) {
            result.isValid = false;
            result.error = "Input non valido per validazione tecnica";
            return result;
        }

        const metadata = _catalog[code];
        if (!metadata) {
            return result;
        }

        if (code === "II.H" || code === "II.G") {
            const label = code === "II.H" ? "FV" : "Ricarica veicoli";

            if (!selectedCodes.includes("III.A")) {
                result.isValid = false;
                result.error = `${label} (${code}) richiede abbinamento con pompa di calore (III.A).`;
                return result;
            }

            const iiiADati = interventiData["III.A"] || {};
            const tipologiaPdc = iiiADati.tipologia_pdc || iiiADati.tipologia || "";

            if (!_ELETTRICHE_TIPOLOGIE.includes(tipologiaPdc)) {
                result.isValid = false;
                result.error = `${label} (${code}) richiede PDC ELETTRICA pura. Tipologia '${tipologiaPdc}' non ammissibile.`;
                return result;
            }

            const sostituisceEsistente = iiiADati.sostituisce_esistente || iiiADati.sostituzione_integrale || false;
            const isSostituzioneValida = (sostituisceEsistente === true || sostituisceEsistente === "si" || sostituisceEsistente === "Sì");

            if (!isSostituzioneValida) {
                result.isValid = false;
                result.error = `${label} (${code}) richiede sostituzione integrale del generatore esistente per l'intervento III.A.`;
                return result;
            }
        }

        if (code === "II.B" && selectedCodes.includes("II.B")) {
            const iiBDati = interventiData["II.B"] || {};
            const valvole = (iiBDati.valvole_termostatiche || "").trim();

            if (valvole === "non presenti") {
                result.isValid = false;
                result.error = "II.B (Infissi): valvole termostatiche o termoregolazione evoluta non presenti. Devono essere già presenti o installate contestualmente all'intervento (DM CT 3.0 Art. 5).";
            }
        }

        return result;
    };

    const _checkDivietoFossili = function(codiciSelezionati, interventiData, soggettoData) {
        const result = { isValid: true, errors: [], warnings: [] };

        const isImpresa = soggettoData && (
            soggettoData.sottoCategoria === "impresa" ||
            soggettoData.tipoSoggetto === "Impresa"
        );

        if (!isImpresa) {
            return result;
        }

        if (codiciSelezionati.includes("III.B")) {
            result.isValid = false;
            result.errors.push("IMP-R03: Impresa non può installare sistemi ibridi gas (III.B) — divieto combustibili fossili (Titolo V).");
        }

        if (codiciSelezionati.includes("III.C")) {
            result.warnings.push("IMP-W01: Biomassa (III.C) per Impresa: verificare assenza fossili nel sistema.");
        }

        if (interventiData) {
            Object.entries(interventiData).forEach(([code, dati]) => {
                if (dati && dati.alimentazione && ["gas", "gasolio", "gpl", "metano"].includes(dati.alimentazione)) {
                    result.isValid = false;
                    result.errors.push(`IMP-R04: Intervento ${code} con alimentazione a ${dati.alimentazione} non ammesso per Impresa (divieto fossili).`);
                }
            });
        }

        return result;
    };

    const _checkMultiIntervento = function(codiciSelezionati) {
        return codiciSelezionati && codiciSelezionati.length >= 2;
    };

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

        // Regola mutua esclusività generatori di riscaldamento principale (III.A, III.B, III.C, III.F)
        const riscaldamentoPrincipale = ["III.A", "III.B", "III.C", "III.F"];
        const generatoriSelezionati = selectedCodes.filter(c => riscaldamentoPrincipale.includes(c));
        if (generatoriSelezionati.length > 1) {
            errors.push("Non è consentito selezionare più di un generatore principale per il riscaldamento (" + generatoriSelezionati.join(", ") + ").");
        }

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

    const validateSelectionWithData = function(selectedCodes, interventiData, soggettoData) {
        if (!selectedCodes || !Array.isArray(selectedCodes)) {
            return { success: false, errors: ["Input non valido: selectedCodes deve essere un array"], warnings: [] };
        }

        const errors = [];
        const warnings = [];

        selectedCodes.forEach(code => {
            const check = _checkDependencies(code, selectedCodes);
            if (!check.isValid) {
                errors.push(check.error);
            }
        });

        // Regola mutua esclusività generatori di riscaldamento principale (III.A, III.B, III.C, III.F)
        const riscaldamentoPrincipale = ["III.A", "III.B", "III.C", "III.F"];
        const generatoriSelezionati = selectedCodes.filter(c => riscaldamentoPrincipale.includes(c));
        if (generatoriSelezionati.length > 1) {
            errors.push("Non è consentito selezionare più di un generatore principale per il riscaldamento (" + generatoriSelezionati.join(", ") + ").");
        }

        if (interventiData) {
            selectedCodes.forEach(code => {
                const check = _checkTechnicalConstraints(code, selectedCodes, interventiData);
                if (!check.isValid) {
                    errors.push(check.error);
                }
            });
        }

        if (soggettoData) {
            const fossileCheck = _checkDivietoFossili(selectedCodes, interventiData, soggettoData);
            if (!fossileCheck.isValid) {
                fossileCheck.errors.forEach(e => errors.push(e));
            }
            fossileCheck.warnings.forEach(w => warnings.push(w));
        }

        if (_checkMultiIntervento(selectedCodes)) {
            warnings.push("Multi-intervento: progetto unico con più codici. Verificare durata unificata e intensità cumulativa.");
        }

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
        getSuggestions,
        checkDivietoFossili: _checkDivietoFossili,
        checkMultiIntervento: _checkMultiIntervento
    };
};

export const CrossRuleEngine = UaCrossRuleEngine();
