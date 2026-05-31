/**
 * @fileoverview idb_mgr.js - Gestore IndexedDB basato su Dexie.js (MOD-008)
 * @description Fornisce un'interfaccia CRUD relazionale per la persistenza
 *              locale delle pratiche CT 3.0, allineata allo schema db.txt.
 * @module services/idb_mgr
 */
"use strict";

import Dexie from "./vendor/dexie.js";
import { WebId } from "./webuser_id.js";

// ============================================================================
// CONFIGURAZIONE DATABASE
// ============================================================================

/** 
 * Il nome del database include l'ID utente per garantire l'isolamento dei dati
 * tra account diversi sullo stesso browser.
 */
const userId = WebId.get();
const _db = new Dexie(`RagIndexDB_${userId}`);

// Schema v5 (MOD-008): struttura relazionale allineata a db.txt
_db.version(5).stores({
    kvStore: "id",
    settings: "id",
    pratiche: "id, nome, dataCrea, stato, tipo_accesso",
    edifici: "id, praticaId, zona_climatica, categoria_catastale",
    soggetti: "id, praticaId, tipo",
    interventi_scelti: "id, praticaId, codice_intervento",
    valori_campi: "id, praticaId, interventoId, campo_id",
    preventivo: "id, praticaId, codice_intervento",
    documenti: "id, praticaId, nomeDocumento",
    piano_erogazione: "id, praticaId"
});

// ============================================================================
// FUNZIONI DI SUPPORTO (Private)
// ============================================================================

/**
 * Log degli errori Dexie.
 * @param {string} op  - Operazione fallita.
 * @param {Error}  err - Oggetto errore.
 * @returns {boolean} Sempre false.
 */
const _logErr = function(op, err) { 
    console.error(`idbMgr.${op}:`, err); 
    return false; 
};

// ============================================================================
// API PUBBLICA - idbMgr (Tabella kvStore)
// ============================================================================

export const idbMgr = {
    db: () => _db,

    create: async function(key, val) { 
        if (!key) {
            console.error("idbMgr.create: key mancante");
            return false;
        }

        let success = false;
        try { 
            await _db.kvStore.put({ id: key, value: val }); 
            success = true; 
        } catch (e) { 
            success = _logErr("create", e); 
        } 
        return success;
    },

    read: async function(key) { 
        if (!key) {
            console.error("idbMgr.read: key mancante");
            return undefined;
        }

        let result = undefined;
        try { 
            const record = await _db.kvStore.get(key); 
            if (record) {
                result = record.value;
            }
        } catch (e) { 
            _logErr("read", e); 
            result = undefined;
        } 
        return result;
    },

    update: async function(key, val) { 
        const result = await idbMgr.create(key, val);
        return result;
    },

    delete: async function(key) { 
        if (!key) {
            console.error("idbMgr.delete: key mancante");
            return false;
        }

        let success = false;
        try { 
            await _db.kvStore.delete(key); 
            success = true;
        } catch (e) { 
            success = _logErr("delete", e); 
        } 
        return success;
    },

    exists: async function(key) { 
        if (!key) {
            console.error("idbMgr.exists: key mancante");
            return false;
        }

        let exists = false;
        try { 
            const count = await _db.kvStore.where("id").equals(key).count();
            exists = count > 0;
        } catch (e) { 
            exists = _logErr("exists", e); 
        } 
        return exists;
    },

    getAllKeys: async function() { 
        let keys = [];
        try { 
            keys = await _db.kvStore.toCollection().primaryKeys(); 
        } catch (e) { 
            _logErr("getAllKeys", e);
            keys = [];
        } 
        return keys;
    },

    selectKeys: async function(prefix) { 
        let keys = [];
        try { 
            keys = await _db.kvStore.where("id").startsWith(prefix).primaryKeys(); 
        } catch (e) { 
            _logErr("selectKeys", e); 
            keys = [];
        } 
        return keys;
    },

    getAllRecords: async function() { 
        let records = [];
        try { 
            const all = await _db.kvStore.toArray(); 
            records = all.map(r => ({ key: r.id, value: r.value })); 
        } catch (e) { 
            _logErr("getAllRecords", e);
            records = [];
        } 
        return records;
    },

    selectRecords: async function(prefix) { 
        let records = [];
        try { 
            const found = await _db.kvStore.where("id").startsWith(prefix).toArray(); 
            records = found.map(r => ({ key: r.id, value: r.value })); 
        } catch (e) { 
            _logErr("selectRecords", e);
            records = [];
        } 
        return records;
    },

    clearAll: async function() { 
        let success = false;
        try { 
            await Promise.all(_db.tables.map(t => t.clear())); 
            success = true;
        } catch (e) { 
            success = _logErr("clearAll", e); 
        } 
        return success;
    },

    exportAll: async function() {
        const dump = {};
        try {
            for (const table of _db.tables) {
                dump[table.name] = await table.toArray();
            }
            return dump;
        } catch (e) {
            _logErr("exportAll", e);
            return null;
        }
    },

    importAll: async function(data) {
        if (!data || typeof data !== "object") return false;
        try {
            await _db.transaction('rw', ..._db.tables, async () => {
                for (const table of _db.tables) {
                    await table.clear();
                    const records = data[table.name];
                    if (Array.isArray(records) && records.length) {
                        await table.bulkAdd(records);
                    }
                }
            });
            return true;
        } catch (e) {
            _logErr("importAll", e);
            return false;
        }
    }
};

// ============================================================================
// API PUBBLICA - praticheMgr (Schema Relazionale MOD-008)
// ============================================================================

/**
 * Lista di tutte le tabelle relazionali collegate a una pratica.
 */
const _RELATIONAL_TABLES = ["edifici", "soggetti", "interventi_scelti", "valori_campi", "preventivo", "documenti", "piano_erogazione"];

/**
 * Ricostruisce l'oggetto composito (id, nome, dataCrea, dati) dalle tabelle relazionali.
 * @param {Object} praticaRecord - Record dalla tabella pratiche.
 * @returns {Object|null} Record composito compatibile con wizard_manager.
 */
const _composePratica = async function(praticaRecord) {
    if (!praticaRecord) {
        return null;
    }

    // Legacy: se il record ha già dati (formato blob v4), restituisce inalterato
    if (praticaRecord.dati) {
        return {
            id: praticaRecord.id,
            nome: praticaRecord.nome || "",
            dataCrea: praticaRecord.dataCrea || new Date().toISOString(),
            dati: praticaRecord.dati
        };
    }

    const praticaId = praticaRecord.id;

    // Se non ci sono dati relazionali (pratica vuota o migrazione non ancora avvenuta)
    if (!praticaRecord.stato && !praticaRecord.nome) {
        return null;
    }

    // Carica entità collegate
    const edificio = await _db.edifici.where("praticaId").equals(praticaId).first();
    const soggettiList = await _db.soggetti.where("praticaId").equals(praticaId).toArray();
    const interventiList = await _db.interventi_scelti.where("praticaId").equals(praticaId).toArray();
    const valoriList = await _db.valori_campi.where("praticaId").equals(praticaId).toArray();
    const preventivoItems = await _db.preventivo.where("praticaId").equals(praticaId).toArray();
    const piano = await _db.piano_erogazione.where("praticaId").equals(praticaId).first();

    // Ricostruisce soggetti (SA, SR, Proprietario, Delegato)
    const soggetti = { sa: {}, sr: {}, proprietario: {}, delegato: {} };
    for (const s of soggettiList) {
        soggetti[s.tipo] = s.dati || {};
    }

    // Ricostruisce interventi e valori_campi
    const interventi = [];
    const valoriCampi = {};
    for (const iv of interventiList) {
        interventi.push(iv.codice_intervento);
        valoriCampi[iv.codice_intervento] = iv.dati_tecnici || {};
    }
    // Sovrascrive con valori_campi specifici se presenti
    for (const vc of valoriList) {
        if (!valoriCampi[vc.interventoId]) {
            valoriCampi[vc.interventoId] = {};
        }
        valoriCampi[vc.interventoId][vc.campo_id] = vc.valore;
    }

    // Ricostruisce preventivo
    const preventivo = {
        items: preventivoItems.map(p => ({
            id: p.voce_id,
            codice_intervento: p.codice_intervento,
            descrizione: p.descrizione,
            tipo_costo: p.tipo_costo,
            importo: p.importo,
            quantita: p.quantita,
            unita: p.unita,
            is_custom: p.is_custom
        })),
        totals: praticaRecord.totals || {}
    };

    // Ricostruisce piano erogazione
    let postOperam = null;
    if (piano) {
        postOperam = piano.postOperam || null;
    }

    const dati = {
        pratica: {
            id: praticaId,
            codice_pratica: praticaRecord.codice_pratica || "",
            status: praticaRecord.stato || "Bozza",
            tipo_accesso: praticaRecord.tipo_accesso || "Diretto",
            data_creazione: praticaRecord.dataCrea || new Date().toISOString(),
            nome: praticaRecord.nome
        },
        edificio: edificio ? {
            id: edificio.id,
            indirizzo: edificio.indirizzo || "",
            categoria_catastale: edificio.categoria_catastale || "",
            zona_climatica: edificio.zona_climatica || "Zona E",
            potenza_esistente_kw: edificio.potenza_esistente_kw || 0,
            combustibile_ante: edificio.combustibile_ante || ""
        } : {
            id: null,
            indirizzo: "",
            categoria_catastale: "",
            zona_climatica: "Zona E",
            potenza_esistente_kw: 0,
            combustibile_ante: ""
        },
        soggetti: soggetti,
        interventi: interventi,
        valori_campi: valoriCampi,
        preventivo: preventivo,
        documentiStatus: praticaRecord.documentiStatus || {},
        postOperam: postOperam
    };

    const composed = {
        id: praticaId,
        nome: praticaRecord.nome || "",
        dataCrea: praticaRecord.dataCrea || new Date().toISOString(),
        dati: dati
    };

    return composed;
};

export const praticheMgr = {
    /**
     * Salva o aggiorna una pratica nello schema relazionale.
     * @param {Object} pratica - Oggetto pratica con id, nome, dataCrea, dati.
     */
    save: async function(pratica) {
        if (!pratica || !pratica.id) {
            console.error("praticheMgr.save: dati pratica non validi", pratica);
            return false;
        }

        const id = pratica.id;
        const d = pratica.dati || {};
        const praticaRecord = {
            id: id,
            nome: pratica.nome || "",
            dataCrea: pratica.dataCrea || new Date().toISOString(),
            stato: d.pratica?.status || "Bozza",
            tipo_accesso: d.pratica?.tipo_accesso || "Diretto",
            codice_pratica: d.pratica?.codice_pratica || "",
            totals: d.preventivo?.totals || {},
            documentiStatus: d.documentiStatus || {}
        };

        let success = false;
        try {
            await _db.transaction('rw', _db.pratiche, ..._RELATIONAL_TABLES.map(t => _db[t]), async () => {

                // 1. Salva pratica
                await _db.pratiche.put(praticaRecord);

                // 2. Salva edificio
                const edificio = d.edificio || {};
                if (edificio.indirizzo || edificio.categoria_catastale) {
                    await _db.edifici.put({
                        id: `ED_${id}`,
                        praticaId: id,
                        indirizzo: edificio.indirizzo || "",
                        categoria_catastale: edificio.categoria_catastale || "",
                        zona_climatica: edificio.zona_climatica || "Zona E",
                        potenza_esistente_kw: edificio.potenza_esistente_kw || 0,
                        combustibile_ante: edificio.combustibile_ante || ""
                    });
                }

                // 3. Salva soggetti (SA, SR, Proprietario, Delegato)
                const soggetti = d.soggetti || {};
                for (const [tipo, dati] of Object.entries(soggetti)) {
                    if (dati && dati.denominazione) {
                        await _db.soggetti.put({
                            id: `SG_${id}_${tipo}`,
                            praticaId: id,
                            tipo: tipo,
                            dati: dati
                        });
                    }
                }

                // 4. Salva interventi_scelti
                const interventi = d.interventi || [];
                const valoriCampi = d.valori_campi || {};
                for (const codice of interventi) {
                    await _db.interventi_scelti.put({
                        id: `IV_${id}_${codice}`,
                        praticaId: id,
                        codice_intervento: codice,
                        dati_tecnici: valoriCampi[codice] || {}
                    });

                    // 5. Salva valori_campi individuali
                    const campi = valoriCampi[codice] || {};
                    for (const [campo, valore] of Object.entries(campi)) {
                        await _db.valori_campi.put({
                            id: `VC_${id}_${codice}_${campo}`,
                            praticaId: id,
                            interventoId: codice,
                            campo_id: campo,
                            valore: valore,
                            fonte_dato: "dichiarato"
                        });
                    }
                }

                // 6. Salva preventivo
                const preventivo = d.preventivo || {};
                const items = preventivo.items || [];
                for (const item of items) {
                    await _db.preventivo.put({
                        id: `PR_${id}_${item.id || Math.random().toString(36).substr(2, 5)}`,
                        praticaId: id,
                        voce_id: item.id,
                        codice_intervento: item.codice_intervento,
                        descrizione: item.descrizione,
                        tipo_costo: item.tipo_costo,
                        importo: item.importo || 0,
                        quantita: item.quantita || 1,
                        unita: item.unita || "corpo",
                        is_custom: item.is_custom || false
                    });
                }

                // 7. Salva piano erogazione e postOperam
                const postOperam = d.postOperam || null;
                if (postOperam) {
                    await _db.piano_erogazione.put({
                        id: `PE_${id}`,
                        praticaId: id,
                        postOperam: postOperam
                    });
                }

                // 8. Salva documenti status
                const documentiStatus = d.documentiStatus || {};
                for (const [nomeDoc, stato] of Object.entries(documentiStatus)) {
                    await _db.documenti.put({
                        id: `DC_${id}_${nomeDoc.replace(/\s+/g, '_')}`,
                        praticaId: id,
                        nomeDocumento: nomeDoc,
                        stato: stato
                    });
                }
            });
            success = true;
        } catch (e) {
            success = _logErr("praticheMgr.save", e);
        }
        return success;
    },

    /**
     * Recupera una pratica per ID (ricostruisce il composito dalle tabelle relazionali).
     * @param {string} id - ID della pratica.
     */
    get: async function(id) {
        if (!id) {
            console.error("praticheMgr.get: id mancante");
            return null;
        }

        try {
            const praticaRecord = await _db.pratiche.get(id);
            if (praticaRecord) {
                return await _composePratica(praticaRecord);
            }
            return null;
        } catch (e) {
            _logErr("praticheMgr.get", e);
            return null;
        }
    },

    /**
     * Recupera tutte le pratiche (sia nuovo formato che legacy).
     */
    getAll: async function() {
        let results = [];
        try {
            const praticaRecords = await _db.pratiche.toArray();
            for (const rec of praticaRecords) {
                const composed = await _composePratica(rec);
                if (composed) {
                    results.push(composed);
                }
            }
            results.sort((a, b) => new Date(b.dataCrea) - new Date(a.dataCrea));
        } catch (e) {
            _logErr("praticheMgr.getAll", e);
            results = [];
        }
        return results;
    },

    /**
     * Elimina una pratica e tutte le entità collegate (cascade).
     * @param {string} id - ID della pratica.
     */
    delete: async function(id) {
        if (!id) {
            console.error("praticheMgr.delete: id mancante");
            return false;
        }

        let success = false;
        try {
            await _db.transaction('rw', _db.pratiche, ..._RELATIONAL_TABLES.map(t => _db[t]), async () => {
                const deletePromises = _RELATIONAL_TABLES.map(t =>
                    _db[t].where("praticaId").equals(id).delete()
                );
                await Promise.all(deletePromises);
                await _db.pratiche.delete(id);
            });
            success = true;
        } catch (e) {
            success = _logErr("praticheMgr.delete", e);
        }
        return success;
    },

    /**
     * Migra una pratica dal vecchio formato (blob unico) al nuovo schema relazionale.
     * @param {Object} praticaRecord - Record legacy da migrare.
     */
    migrate: async function(praticaRecord) {
        if (!praticaRecord || !praticaRecord.id) {
            console.error("praticheMgr.migrate: record non valido");
            return false;
        }

        // Il record legacy ha struttura { id, nome, dataCrea, dati: _praticaData }
        // Il nuovo save() accetta { id, nome, dataCrea, dati }
        const converted = {
            id: praticaRecord.id,
            nome: praticaRecord.nome || "Migrata",
            dataCrea: praticaRecord.dataCrea || new Date().toISOString(),
            dati: praticaRecord.dati || praticaRecord.value || praticaRecord
        };

        const result = await praticheMgr.save(converted);
        return result;
    }
};

// ============================================================================
// API PUBBLICA - documentiMgr (Tabella documenti)
// ============================================================================

export const documentiMgr = {
    /**
     * Salva un documento.
     * @param {Object} docRecord - Record del documento (include Blob fileData).
     */
    save: async function(docRecord) {
        try {
            await _db.documenti.put(docRecord);
            return true;
        } catch (e) {
            return _logErr("documentiMgr.save", e);
        }
    },

    /**
     * Recupera un documento per ID.
     */
    get: async function(id) {
        try {
            return await _db.documenti.get(id);
        } catch (e) {
            _logErr("documentiMgr.get", e);
            return null;
        }
    },

    /**
     * Recupera un documento specifico di una pratica.
     * @param {string} praticaId - ID pratica.
     * @param {string} nomeDoc - Nome logico del documento.
     */
    getByNome: async function(praticaId, nomeDoc) {
        try {
            return await _db.documenti
                .where({ praticaId: praticaId, nomeDocumento: nomeDoc })
                .first();
        } catch (e) {
            _logErr("documentiMgr.getByNome", e);
            return null;
        }
    },

    /**
     * Recupera tutti i documenti di una pratica.
     */
    getAllByPratica: async function(praticaId) {
        try {
            return await _db.documenti.where("praticaId").equals(praticaId).toArray();
        } catch (e) {
            _logErr("documentiMgr.getAllByPratica", e);
            return [];
        }
    },

    /**
     * Elimina un singolo documento.
     */
    delete: async function(id) {
        try {
            await _db.documenti.delete(id);
            return true;
        } catch (e) {
            return _logErr("documentiMgr.delete", e);
        }
    }
};

// ============================================================================
// API PUBBLICA - UaDb (Tabella settings)
// ============================================================================

export const UaDb = {
    read: async (id) => {
        try { const r = await _db.settings.get(id); return r ? r.value : ""; }
        catch (e) { return _logErr(`UaDb.read:${id}`, e) || ""; }
    },

    delete: async (id) => {
        try { await _db.settings.delete(id); }
        catch (e) { _logErr(`UaDb.delete:${id}`, e); }
    },

    save: async (id, data) => {
        try { await _db.settings.put({ id, value: data }); }
        catch (e) { _logErr(`UaDb.save:${id}`, e); }
    },

    getAllIds: async () => {
        try { return await _db.settings.toCollection().primaryKeys(); }
        catch (e) { return _logErr("UaDb.getAllIds", e) || []; }
    },

    saveArray: async (id, arr) => await UaDb.save(id, JSON.stringify(arr)),

    readArray: async (id) => {
        const str = await UaDb.read(id);
        try { return str ? JSON.parse(str) : []; }
        catch (e) { return _logErr("UaDb.readArray", e) || []; }
    },

    saveJson: async (id, js) => await UaDb.save(id, JSON.stringify(js)),

    readJson: async (id) => {
        const str = await UaDb.read(id);
        try { return str ? JSON.parse(str) : {}; }
        catch (e) { return _logErr("UaDb.readJson", e) || {}; }
    },

    clear: async () => {
        try { await _db.settings.clear(); }
        catch (e) { _logErr("UaDb.clear", e); }
    }
};
