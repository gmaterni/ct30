/**
 * preventivo_manager.js - Gestore economico dei preventivi per CT30 Advisor.
 *
 * Utilizza i dati normativi (PREVENTIVO_VOCI) per suggerire e calcolare 
 * le voci di spesa relative agli interventi selezionati.
 *
 * @module  preventivo_manager
 * @version 1.2.0
 * @date    2026-05-23
 */

"use strict";

import { PREVENTIVO_VOCI, RULES } from "./normativa.js";

/**
 * Factory per il manager dei preventivi.
 * 
 * @returns {Object} API pubblica del servizio.
 */
const UaPreventivoManager = function() {

    // 1. STATO PRIVATO

    /**
     * Tipi di costo ammessi dal sistema.
     * @constant {string[]}
     * @private
     */
    const _costTypes = ["fornitura", "posa", "opere_accessorie", "pratiche", "documentazione"];

    /**
     * Mappatura dei parametri tecnici che influenzano le quantità del preventivo.
     * @private
     */
    const _qtyMapping = {
        "II.A": { "Materiale isolante": "superficie_isolata_mq", "Posa sistema isolante": "superficie_isolata_mq" },
        "II.B": { "Fornitura serramenti": "superficie_infissi_mq", "Posa nuovi serramenti": "superficie_infissi_mq" },
        "II.G": { "Fornitura infrastruttura di ricarica": "numero_punti_ricarica" },
        "III.E": { "Fornitura nuovo scaldacqua PDC": "capacita_bollitore_l" }
    };

    // 2. FUNZIONI PRIVATE

    /**
     * Genera un ID univoco temporaneo per una voce di preventivo.
     * @returns {string} ID univoco.
     * @private
     */
    const _generateId = function() {
        const timestamp = Date.now().toString(36);
        const random = Math.random().toString(36).substr(2, 5);
        const id = `${timestamp}-${random}`;
        return id;
    };

    /**
     * Tenta di estrarre una quantità predefinita dai dati tecnici.
     * 
     * @param {string} code - Codice intervento.
     * @param {string} desc - Descrizione della voce.
     * @param {Object} techData - Mappa dati tecnici.
     * @returns {number} Quantità suggerita (default 1).
     * @private
     */
    const _getSuggestedQty = function(code, desc, techData) {
        if (!techData) return 1;
        
        const map = _qtyMapping[code];
        if (!map) return 1;

        const techKey = map[desc];
        if (!techKey) return 1;

        const val = parseFloat(techData[techKey]) || 1;
        return val;
    };

    /**
     * Tenta di suggerire un importo unitario basato sui massimali normativi (Cmax).
     * 
     * @param {string} code - Codice intervento.
     * @param {string} desc - Descrizione della voce.
     * @param {Object} techData - Mappa dati tecnici per identificare la variante.
     * @returns {number} Importo suggerito (default 0).
     * @private
     */
    const _getSuggestedAmount = function(code, desc, techData) {
        const meta = RULES.interventi[code];
        if (!meta || !meta.varianti) return 0;

        const descLower = desc.toLowerCase();

        // Se la voce riguarda la fornitura o la posa principale, cerchiamo il Cmax
        if (descLower.includes("fornitura") || descLower.includes("materiale") || descLower.includes("posa")) {
            // Cerchiamo di identificare la variante dai dati tecnici
            const varianteKey = techData ? (techData.tipo_superficie_opaca || techData.tipologia_serramento) : null;
            
            if (varianteKey && meta.varianti[varianteKey]) {
                const amount = meta.varianti[varianteKey].cmax || meta.varianti[varianteKey].cmax_fisso || 0;
                return amount;
            }

            // Fallback: primo Cmax trovato se non c'è variante specifica
            const firstVariante = Object.values(meta.varianti)[0];
            const fallbackAmount = firstVariante ? (firstVariante.cmax || firstVariante.cmax_fisso || 0) : 0;
            return fallbackAmount;
        }

        return 0;
    };

    // 3. FUNZIONI PUBBLICHE

    /**
     * Restituisce le voci di spesa suggerite per un determinato intervento.
     * 
     * @param {string} interventionCode - Codice intervento (es. 'III.A').
     * @param {Object} [techData=null] - Dati tecnici dell'intervento per pre-popolamento.
     * @returns {Object[]} Lista di oggetti voce di preventivo.
     */
    const getSuggestedItems = function(interventionCode, techData = null) {
        const catalog = PREVENTIVO_VOCI[interventionCode];
        
        if (!catalog || !catalog.voci_suggerite) {
            console.warn(`PreventivoManager: nessuna voce suggerita per ${interventionCode}`);
            return [];
        }

        // Mappa le voci grezze in oggetti pronti per la UI
        const items = catalog.voci_suggerite.map(v => {
            const qty = _getSuggestedQty(interventionCode, v.descrizione, techData);
            const amount = _getSuggestedAmount(interventionCode, v.descrizione, techData);
            
            const item = {
                id: _generateId(),
                codice_intervento: interventionCode,
                descrizione: v.descrizione,
                tipo_costo: [], // Inizializziamo vuoto per "ripulire" i flag come richiesto
                importo: amount,
                quantita: qty,
                unita: "corpo",
                is_custom: false
            };
            return item;
        });

        return items;
    };

    /**
     * Calcola i totali del preventivo raggruppati per categoria.
     * 
     * @param {Object[]} items - Lista delle voci del preventivo.
     * @returns {Object} Oggetto con totali per tipo e totale complessivo.
     */
    const calculateTotals = function(items) {
        const totals = {
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

        items.forEach(item => {
            const qty = parseFloat(item.quantita) || 0;
            const imp = parseFloat(item.importo) || 0;
            const subtotal = qty * imp;
            
            // Correzione: item.tipo_costo ora è una stringa (singolo valore)
            const type = _costTypes.includes(item.tipo_costo) ? item.tipo_costo : "altro";
            
            totals.by_type[type] += subtotal;
            totals.overall += subtotal;
        });

        return totals;
    };

    /**
     * Crea una nuova voce di preventivo personalizzata.
     * 
     * @param {string} desc - Descrizione voce.
     * @param {string} type - Tipo costo.
     * @param {number} amount - Importo.
     * @returns {Object} Nuova voce.
     */
    const createCustomItem = function(desc = "", type = "altro", amount = 0) {
        const item = {
            id: _generateId(),
            codice_intervento: "CUSTOM",
            descrizione: desc,
            tipo_costo: type,
            importo: amount,
            quantita: 1,
            unita: "corpo",
            is_custom: true
        };
        return item;
    };

    /**
     * Formatta un importo in valuta Euro.
     * 
     * @param {number} amount - Importo da formattare.
     * @returns {string} Stringa formattata (es. "1.250,00 €").
     */
    const formatCurrency = function(amount) {
        const val = parseFloat(amount) || 0;
        const formatted = val.toLocaleString('it-IT', {
            style: 'currency',
            currency: 'EUR',
            minimumFractionDigits: 2
        });
        return formatted;
    };

    // 4. API PUBBLICA
    return {
        getSuggestedItems,
        calculateTotals,
        createCustomItem,
        formatCurrency,
        getCostTypes: () => [..._costTypes]
    };
};

// Esportazione Singleton
export const PreventivoManager = UaPreventivoManager();
