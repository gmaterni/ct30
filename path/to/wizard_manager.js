/**
 * wizard_manager.js - Gestore del wizard per la pratica CT 3.0
 *
 * Gestisce il flusso di lavoro, la validazione e la navigazione tra gli step.
 *
 * @module wizard_manager
 * @version 1.2.0
 * @date 2026-05-23
 * @author Gemini CLI
 */

"use strict";

import { RulesEngine } from "./core/rules_engine.js";
import { UaLogger } from "./utils/logger.js";

/**
 * Factory per il manager del wizard.
 * 
 * @returns {Object} API pubblica del wizard.
 */
const UaWizardManager = function() {

    // 1. STATO PRIVATO
    let _praticaData = {
        // Dati Edificio (t_edificio)
        edificio: {
            edificio_id: null,
            codice_edificio: "",
            descrizione_edificio: "",
            comune_codice_catastale: "",
            foglio: "",
            particella: "",
            sub_presenti_dichiarati: 0,
            sub_elenco: "",
            categoria_catastale: "",
            tipo_immobile: "Edificio singolo",
            destinazione_uso: ""
        },
        
        // Dati Pratica (t_pratica)
        pratica: {
            pratica_id: "",
            edificio_id: null,
            operatore_id: null,
            stato_istanza: "Bozza",
            tipo_accesso: "Diretto"
        },
        
        // Ruoli GSE (t_anagrafica_istanza)
        anagrafica_istanza: {
            sa_nome_rs: "",
            sa_titolo_godimento: "",
            sr_nome_rs: "",
            sr_iban: "",
            sr_pec: "",
            sr_coincide_con_sa: false,
            delegato_nome: "",
            delegato_cf: ""
        },
        
        // Proprietario (t_proprietario_immobile)
        proprietario: {
            nome_rs: "",
            cf_piva: "",
            atto_assenso_presente: false
        },
        
        // Dati Ante Operam (t_immobile_ante)
        immobile_ante: {
            superficie_utile_mq: 0,
            potenza_esistente_kw: 0,
            combustibile_ante: "",
            data_installazione_ante: ""
        },
        
        // Interventi (t_interventi_scelti + t_dati_tecnici_intervento)
        interventi_scelti: [],
        interventi_data: {},
        
        // Preventivo (t_preventivo_voci)
        preventivo: {
            voci: [],
            totals: {}
        },
        
        // Piano Erogazione (t_piano_erogazione)
        piano_erogazione: null
    };

    // 2. FUNZIONI PRIVATE

    /**
     * Inizializza i dati della pratica.
     * 
     * @param {Object} data - Dati iniziali della pratica.
     */
    const _initPraticaData = function(data) {
        // Implementazione per inizializzare i dati
    };

    /**
     * Aggiorna i dati della pratica.
     * 
     * @param {string} key - Chiave del campo da aggiornare.
     * @param {any} value - Nuovo valore.
     */
    const _updateData = function(key, value) {
        if (_praticaData[key]) {
            _praticaData[key] = value;
        }
    };

    /**
     * Genera la checklist dinamica basata sui ruoli.
     * 
     * @returns {string} HTML della checklist.
     */
    const _generateChecklist = function() {
        const checklistItems = [];
        
        // Documenti base
        const baseDocuments = [
            "Documento Identità richiedente",
            "Codice Fiscale / Tessera Sanitaria",
            "Visura Catastale recente (ultimi 6 mesi)"
        ];
        
        // Documenti per ruoli
        const roleDocuments = {
            "sa": ["Titolo di possesso (atto, contratto locazione, ecc.)"],
            "sr": ["IBAN (conta corrente dedicata)", "PEC"],
            "proprietario": ["Atto di Assenso (se SA ≠ Proprietario)"],
            "delegato": ["Delega firmata"]
        };
        
        // Aggiungi documenti base
        checklistItems.push(...baseDocuments);
        
        // Aggiungi documenti per ruoli attivi
        const activeRoles = Object.keys(_praticaData.anagrafica_istanza).filter(role => 
            _praticaData.anagrafica_istanza[role].nome_rs || 
            _praticaData.anagrafica_istanza[role].cf_piva
        );
        
        activeRoles.forEach(role => {
            if (roleDocuments[role]) {
                checklistItems.push(...roleDocuments[role]);
            }
        });
        
        return checklistItems.join("<br>");
    };

    /**
     * Mostra la checklist nella UI.
     */
    const _showChecklist = function() {
        const checklist = _generateChecklist();
        // Implementazione per mostrare la checklist nell'interfaccia
        UaLogger.info("Checklist generata:", checklist);
    };

    /**
     * Validazione dei ruoli GSE.
     * 
     * @returns {Object} Risultato della validazione.
     */
    const _validateRoles = function() {
        const errors = [];
        
        // 1. Verifica Proprietario ed Atto Assenso
        if (!_praticaData.anagrafica_istanza.sa.coincide_con_sa && 
            !_praticaData.proprietario.atto_assenso_presente) {
            errors.push("PROPRIETARIO: Se il proprietario è diverso dal SA, è obbligatorio disporre dell'Atto di Assenso.");
        }
        
        // 2. Verifica CF/P.IVA SR (se diverso da SA)
        if (!_praticaData.anagrafica_istanza.sa.coincide_con_sa && 
            (!_praticaData.anagrafica_istanza.sr.cf_piva || 
             _praticaData.anagrafica_istanza.sr.cf_piva.length < 11)) {
            errors.push("SR: Codice Fiscale o Partita IVA del Soggetto Responsabile non valido.");
        }
        
        // 3. Verifica IBAN (molto semplificata)
        if (_praticaData.anagrafica_istanza.sr.iban && 
            _praticaData.anagrafica_istanza.sr.iban.length < 27) {
            errors.push("SR: Formato IBAN non valido (troppo corto).");
        }
        
        // 4. Verifica Titolo di Godimento per Privati
        if (_praticaData.anagrafica_istanza.sa.titolo_godimento === "" && 
            _praticaData.anagrafica_istanza.sa.tipo === "Privato residenziale") {
            errors.push("SA: È obbligatorio specificare il titolo di godimento dell'immobile.");
        }
        
        return {
            success: errors.length === 0,
            errors: errors
        };
    };

    /**
     * Esegue una verifica completa di ammissibilità.
     * 
     * @param {Object} input - Dati della pratica.
     * @returns {Object} Esito della validazione.
     */
    const _validateAmmissibilita = function(input) {
        // Implementazione della validazione
    };

    // 3. FUNZIONI PUBBLICHE
    const api = {
        init: function(data) {
            _initPraticaData(data);
        },
        update: function(key, value) {
            _updateData(key, value);
        },
        validateRoles: _validateRoles,
        showChecklist: _showChecklist,
        getPraticaData: function() {
            return _praticaData;
        }
    };

    return api;
};

// Esportazione Singleton
export const WizardManager = UaWizardManager();
