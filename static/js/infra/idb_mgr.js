/**
 * @fileoverview idb_mgr.js - Gestore IndexedDB basato su Dexie.js
 * @description Fornisce un'interfaccia semplificata per operazioni CRUD
 *              su IndexedDB utilizzando Dexie.js come motore sottostante.
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

_db.version(4).stores({
    kvStore: "id",
    settings: "id",
    pratiche: "id, nome, dataCrea",
    documenti: "id, praticaId, nomeDocumento"
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
    }
};

// ============================================================================
// API PUBBLICA - praticheMgr (Tabella pratiche)
// ============================================================================

export const praticheMgr = {
    /**
     * Salva o aggiorna una pratica.
     * @param {Object} pratica - Oggetto pratica con id, nome, dati, ecc.
     */
    save: async function(pratica) {
        try {
            await _db.pratiche.put(pratica);
            return true;
        } catch (e) {
            return _logErr("praticheMgr.save", e);
        }
    },

    /**
     * Recupera una pratica per ID.
     * @param {string} id - ID della pratica.
     */
    get: async function(id) {
        try {
            return await _db.pratiche.get(id);
        } catch (e) {
            _logErr("praticheMgr.get", e);
            return null;
        }
    },

    /**
     * Recupera tutte le pratiche.
     */
    getAll: async function() {
        try {
            return await _db.pratiche.toArray();
        } catch (e) {
            _logErr("praticheMgr.getAll", e);
            return [];
        }
    },

    /**
     * Elimina una pratica e tutti i suoi documenti associati.
     * @param {string} id - ID della pratica.
     */
    delete: async function(id) {
        try {
            await _db.transaction('rw', _db.pratiche, _db.documenti, async () => {
                await _db.documenti.where("praticaId").equals(id).delete();
                await _db.pratiche.delete(id);
            });
            return true;
        } catch (e) {
            return _logErr("praticheMgr.delete", e);
        }
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
