/**
 * reliability_engine.js - Algoritmo di affidabilità e Firewall Economico.
 * Calcola il livello di confidenza dei dati e degli incentivi stimati
 * basandosi sulla validazione delle fonti e sullo stato documentale.
 *
 * @module  reliability_engine
 * @version 1.0.0
 * @date    2026-06-02
 */
"use strict";

import { VALIDAZIONE_FONTI, INTERVENTI } from "./normativa.js";

var UaReliabilityEngine = function() {

    var _levels = VALIDAZIONE_FONTI.livelli_affidabilita;

    var _getSourceWeight = function(sourceKey) {
        var statusMap = {
            "mancante": "dichiarato_cliente",
            "verificato": "verificato_documentale",
            "certificato": "certificato"
        };

        var key = statusMap[sourceKey] || sourceKey;
        var level = _levels[key] || _levels["dichiarato_cliente"];
        var weight = level.peso || 1;

        return weight;
    };

    var calculateReliability = function(interventiData, documentsStatus) {
        if (!interventiData || Object.keys(interventiData).length === 0) {
            var emptyRes = {
                score: 1,
                label: "Bassa (Nessun dato)",
                isReliable: false,
                showNumbers: false,
                watermark: "BOZZA"
            };
            return emptyRes;
        }

        var totalWeight = 0;
        var paramsCount = 0;

        for (var code in interventiData) {
            var params = interventiData[code];
            var meta = INTERVENTI[code];
            var docsRichiesti = meta ? meta.documenti_richiesti : [];

            var techDocName = null;
            for (var di = 0; di < docsRichiesti.length; di++) {
                if (docsRichiesti[di].toLowerCase().indexOf("scheda tecnica") !== -1) {
                    techDocName = docsRichiesti[di];
                    break;
                }
            }

            var docStatus = techDocName ? (documentsStatus[techDocName] || "dichiarato_cliente") : "dichiarato_cliente";
            var weight = _getSourceWeight(docStatus);

            for (var paramKey in params) {
                var val = params[paramKey];
                if (val !== undefined && val !== null && val !== "") {
                    totalWeight = totalWeight + weight;
                    paramsCount = paramsCount + 1;
                }
            }
        }

        if (paramsCount === 0) {
            var noParamsRes = { score: 1, label: "Bassa (Dichiarato)", isReliable: false, showNumbers: false };
            return noParamsRes;
        }

        var avgScore = totalWeight / paramsCount;

        var label = "Bassa (Dichiarato)";
        var isReliable = false;

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

        var result = {
            score: avgScore,
            label: label,
            isReliable: isReliable,
            showNumbers: avgScore >= 2.0,
            watermark: avgScore < 3.0 ? "BOZZA INTERNA" : null
        };

        return result;
    };

    var canShowToClient = function(reliabilityResult) {
        var canShow = reliabilityResult.isReliable && reliabilityResult.showNumbers;
        return canShow;
    };

    return {
        calculateReliability: calculateReliability,
        canShowToClient: canShowToClient
    };
};

var ReliabilityEngine = UaReliabilityEngine();
export { ReliabilityEngine };
