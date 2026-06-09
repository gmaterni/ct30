/**
 * preventivo_manager.js - Gestore economico dei preventivi per CT30 Advisor.
 * Utilizza PREVENTIVO_VOCI per suggerire e calcolare le voci di spesa.
 *
 * @module  preventivo_manager
 * @version 1.0.0
 * @date    2026-06-02
 */
"use strict";

import { PREVENTIVO_VOCI, RULES } from "./normativa.js";

var COST_TYPES = ["fornitura", "posa", "opere_accessorie", "pratiche", "documentazione"];

var QTY_MAPPING = {
    "II.A": { "Materiale isolante": "superficie_isolata_mq", "Posa sistema isolante": "superficie_isolata_mq" },
    "II.B": { "Fornitura serramenti": "superficie_infissi_mq", "Posa nuovi serramenti": "superficie_infissi_mq" },
    "II.G": { "Fornitura infrastruttura di ricarica": "numero_punti_ricarica" },
    "III.E": { "Fornitura nuovo scaldacqua PDC": "capacita_bollitore_l" }
};

var _generateId = function() {
    var timestamp = Date.now().toString(36);
    var random = Math.random().toString(36).substr(2, 5);
    var id = timestamp + "-" + random;
    return id;
};

var _getSuggestedQty = function(code, desc, techData) {
    if (!techData) return 1;

    var map = QTY_MAPPING[code];
    if (!map) return 1;

    var techKey = map[desc];
    if (!techKey) return 1;

    var val = parseFloat(techData[techKey]) || 1;
    return val;
};

var _getSuggestedAmount = function(code, desc, techData) {
    var meta = RULES.interventi[code];
    if (!meta || !meta.varianti) return 0;

    var descLower = desc.toLowerCase();

    if (descLower.indexOf("fornitura") !== -1 || descLower.indexOf("materiale") !== -1 || descLower.indexOf("posa") !== -1) {
        var varianteKey = techData ? (techData.tipo_superficie_opaca || techData.tipologia_serramento) : null;

        if (varianteKey && meta.varianti[varianteKey]) {
            var amount = meta.varianti[varianteKey].cmax || meta.varianti[varianteKey].cmax_fisso || 0;
            return amount;
        }

        var firstVariante = null;
        for (var vk in meta.varianti) {
            firstVariante = meta.varianti[vk];
            break;
        }
        var fallbackAmount = firstVariante ? (firstVariante.cmax || firstVariante.cmax_fisso || 0) : 0;
        return fallbackAmount;
    }

    return 0;
};

var UaPreventivoManager = function() {

    var getSuggestedItems = function(interventionCode, techData) {
        var data = techData || null;
        var catalog = PREVENTIVO_VOCI[interventionCode];

        if (!catalog || !catalog.voci_suggerite) {
            console.warn("PreventivoManager: nessuna voce suggerita per " + interventionCode);
            return [];
        }

        var items = catalog.voci_suggerite.map(function(v) {
            var qty = _getSuggestedQty(interventionCode, v.descrizione, data);
            var amount = _getSuggestedAmount(interventionCode, v.descrizione, data);

            var item = {
                id: _generateId(),
                codice_intervento: interventionCode,
                descrizione: v.descrizione,
                tipo_costo: [],
                importo: amount,
                quantita: qty,
                unita: "corpo",
                is_custom: false
            };
            return item;
        });

        return items;
    };

    var calculateTotals = function(items) {
        var totals = {
            by_type: {
                fornitura: 0,
                posa: 0,
                opere_accessorie: 0,
                pratiche: 0,
                documentazione: 0,
                altro: 0
            },
            overall: 0,
            count: items.length
        };

        items.forEach(function(item) {
            var qty = parseFloat(item.quantita) || 0;
            var imp = parseFloat(item.importo) || 0;
            var subtotal = qty * imp;

            var type = COST_TYPES.indexOf(item.tipo_costo) !== -1 ? item.tipo_costo : "altro";

            totals.by_type[type] = totals.by_type[type] + subtotal;
            totals.overall = totals.overall + subtotal;
        });

        return totals;
    };

    var createCustomItem = function(desc, type, amount) {
        var description = desc || "";
        var costType = type || "altro";
        var importo = amount || 0;

        var item = {
            id: _generateId(),
            codice_intervento: "CUSTOM",
            descrizione: description,
            tipo_costo: costType,
            importo: importo,
            quantita: 1,
            unita: "corpo",
            is_custom: true
        };
        return item;
    };

    var formatCurrency = function(amount) {
        var val = parseFloat(amount) || 0;
        var formatted = val.toLocaleString("it-IT", {
            style: "currency",
            currency: "EUR",
            minimumFractionDigits: 2
        });
        return formatted;
    };

    var getCostTypes = function() {
        var types = COST_TYPES.slice();
        return types;
    };

    return {
        getSuggestedItems: getSuggestedItems,
        calculateTotals: calculateTotals,
        createCustomItem: createCustomItem,
        formatCurrency: formatCurrency,
        getCostTypes: getCostTypes
    };
};

var PreventivoManager = UaPreventivoManager();
export { PreventivoManager };
