/**
 * @fileoverview idb_mgr.js - Gestore IndexedDB basato su Dexie.js (MOD-008)
 * @description Fornisce un'interfaccia CRUD relazionale per la persistenza
 *              locale delle pratiche CT 3.0. Migrazioni non distruttive.
 * @module services/idb_mgr
 *
 * NOTA: copiare static/js/infra/vendor/dexie.js in questo stesso
 *       percorso (static/js/infra/vendor/dexie.js) prima dell'uso.
 */
"use strict";

import Dexie from "./vendor/dexie.js";
import { WebId } from "./webuser_id.js";

// ============================================================================
// CONFIGURAZIONE DATABASE
// ============================================================================

const userId = WebId.get();
const _db = new Dexie(`CT30_${userId}`);

// Schema v6 (legacy, flat): anagrafiche in tabella unica, nessun dettaglio economico.
_db.version(6).stores({
    kvStore: "id",
    settings: "id",
    pratiche: "id, nome, dataCrea",
    anagrafiche: "id, praticaId",
    edifici: "id, praticaId",
    interventi: "id, praticaId"
});

// Schema v7 (legacy): aggiunge campi a pratiche.
_db.version(7).stores({
    kvStore: "id",
    settings: "id",
    pratiche: "id, nome, dataCrea, stato, modalita_accesso"
});

// Schema v8: 4 anagrafiche separate, dati_tecnici JSON, economico, variazioni.
_db.version(8).stores({
    kvStore: "id",
    settings: "id",
    pratiche: "id, nome, dataCrea, stato, modalita_accesso",
    proprietari: "id, praticaId, denominazione",
    richiedenti: "id, praticaId, denominazione, tipo_soggetto",
    responsabili: "id, praticaId, denominazione, tipo_soggetto",
    delegati: "id, praticaId, denominazione",
    edifici: "id, praticaId, zona_climatica, categoria, ambito",
    interventi: "id, praticaId, codice_intervento, is_trainante",
    economico: "id, praticaId, interventoId",
    documenti: "id, praticaId, nome_documento",
    variazioni: "id, praticaId, interventoId"
}).upgrade(async function(tx) {
    const log = [];
    // 1. Migra pratiche: aggiungi campi v8 mancanti
    const oldPratiche = await tx.table('pratiche').toArray();
    if (oldPratiche.length > 0) {
        log.push("Migrazione v6→v8: " + oldPratiche.length + " pratiche trovate.");
        for (const p of oldPratiche) {
            if (!p.stato) p.stato = "Bozza";
            if (!p.modalita_accesso) p.modalita_accesso = "Diretto";
            await tx.table('pratiche').put(p);
        }
    }
    // 2. Migra anagrafiche v6 → tabelle separate v8
    const oldAnag = await tx.table('anagrafiche').toArray();
    for (const rec of oldAnag) {
        const dati = rec.dati || {};
        var targetTable = null;
        var newRec = null;
        if (dati.ruolo === "proprietario" || dati.tipo === "proprietario") {
            targetTable = 'proprietari';
            newRec = { id: "PR_" + rec.praticaId, praticaId: rec.praticaId, denominazione: dati.denominazione || "", dati: dati };
        } else if (dati.ruolo === "richiedente" || dati.tipo === "richiedente") {
            targetTable = 'richiedenti';
            newRec = { id: "RI_" + rec.praticaId, praticaId: rec.praticaId, denominazione: dati.denominazione || "", tipo_soggetto: dati.tipo_soggetto || "", dati: dati };
        } else if (dati.ruolo === "responsabile" || dati.tipo === "responsabile") {
            targetTable = 'responsabili';
            newRec = { id: "RS_" + rec.praticaId, praticaId: rec.praticaId, denominazione: dati.denominazione || "", tipo_soggetto: dati.tipo_soggetto || "", dati: dati };
        } else if (dati.ruolo === "delegato" || dati.tipo === "delegato") {
            targetTable = 'delegati';
            newRec = { id: "DG_" + rec.praticaId, praticaId: rec.praticaId, denominazione: dati.denominazione || "", dati: dati };
        }
        if (targetTable && newRec) {
            await tx.table(targetTable).put(newRec);
        }
    }
    if (oldAnag.length > 0) log.push("Migrate " + oldAnag.length + " anagrafiche.");
    // 3. Migra edifici v6 → v8
    const oldEdifici = await tx.table('edifici').toArray();
    for (const rec of oldEdifici) {
        if (rec.zona_climatica === undefined) rec.zona_climatica = "";
        if (rec.categoria === undefined) rec.categoria = "";
        if (rec.ambito === undefined) rec.ambito = "";
        await tx.table('edifici').put(rec);
    }
    if (oldEdifici.length > 0) log.push("Migrate " + oldEdifici.length + " edifici.");
    // 4. Migra interventi v6 → v8 (aggiungi is_trainante se mancante)
    const oldInterventi = await tx.table('interventi').toArray();
    for (const rec of oldInterventi) {
        if (rec.is_trainante === undefined) rec.is_trainante = false;
        await tx.table('interventi').put(rec);
    }
    if (oldInterventi.length > 0) log.push("Migrate " + oldInterventi.length + " interventi.");
    if (log.length > 0) {
        console.log("[idbMgr] Upgrade v6→v8 completato:", log.join(" "));
    } else {
        console.log("[idbMgr] Upgrade v6→v8: nessun dato legacy trovato.");
    }
});

// ============================================================================
// FUNZIONI DI SUPPORTO (Private)
// ============================================================================

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
// API PUBBLICA - praticheMgr (Schema v6)
// ============================================================================

/**
 * Lista di tutte le tabelle relazionali collegate a una pratica.
 */
const _RELATIONAL_TABLES = [
    "proprietari", "richiedenti", "responsabili", "delegati",
    "edifici", "interventi", "economico", "documenti", "variazioni"
];

/**
 * Ricostruisce l'oggetto composito (id, nome, dataCrea, dati) dalle tabelle v6.
 * @param {Object} praticaRecord - Record dalla tabella pratiche.
 * @returns {Object|null} Record composito allineato a ct30_schema.json.
 */
const _composePratica = async function(praticaRecord) {
    if (!praticaRecord) {
        return null;
    }

    const praticaId = praticaRecord.id;

    const proprietario = await _db.proprietari.where("praticaId").equals(praticaId).first();
    const richiedente = await _db.richiedenti.where("praticaId").equals(praticaId).first();
    const responsabile = await _db.responsabili.where("praticaId").equals(praticaId).first();
    const delegato = await _db.delegati.where("praticaId").equals(praticaId).first();
    const edificio = await _db.edifici.where("praticaId").equals(praticaId).first();
    const interventiList = await _db.interventi.where("praticaId").equals(praticaId).toArray();
    const economicoList = await _db.economico.where("praticaId").equals(praticaId).toArray();
    const variazioniList = await _db.variazioni.where("praticaId").equals(praticaId).toArray();

    // Raggruppa economico per interventoId
    const economicoByIntervento = {};
    for (const ec of economicoList) {
        economicoByIntervento[ec.interventoId] = ec.dati || {};
    }

    // Raggruppa variazioni per interventoId
    const variazioniByIntervento = {};
    for (const vz of variazioniList) {
        if (!variazioniByIntervento[vz.interventoId]) {
            variazioniByIntervento[vz.interventoId] = [];
        }
        variazioniByIntervento[vz.interventoId].push(vz.dati || {});
    }

    // Ricostruisce array interventi
    const interventi = [];
    for (const iv of interventiList) {
        interventi.push({
            id_intervento: iv.id,
            codice_intervento: iv.codice_intervento,
            is_trainante: iv.is_trainante || false,
            dati_tecnici: iv.dati_tecnici || {},
            economico: economicoByIntervento[iv.codice_intervento] || {},
            variazioni: variazioniByIntervento[iv.codice_intervento] || []
        });
    }

        const storedPratica = praticaRecord.pratica_data || {};
        const dati = {
            pratica: {
                ...storedPratica,
                id: praticaId,
                nome: praticaRecord.nome || storedPratica.nome || "",
                stato: storedPratica.stato || praticaRecord.stato || "Bozza",
                modalita_accesso: storedPratica.modalita_accesso || praticaRecord.modalita_accesso || "Diretto",
                date: storedPratica.date || { creazione: praticaRecord.dataCrea || new Date().toISOString() }
            },
            proprietario: proprietario ? proprietario.dati || {} : {},
            richiedente: richiedente ? richiedente.dati || {} : {},
            responsabile: responsabile ? responsabile.dati || {} : {},
            delegato: delegato ? delegato.dati || {} : {},
            edificio: edificio ? edificio.dati || {} : {},
            interventi: interventi,
            dati_tecnici: praticaRecord.dati_tecnici || {},
            economico: praticaRecord.economico || {}
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
     * Salva o aggiorna una pratica nello schema v6.
     * @param {Object} pratica - Oggetto pratica con id, nome, dataCrea, dati.
     */
    save: async function(pratica) {
        if (!pratica || !pratica.id) {
            console.error("praticheMgr.save: dati pratica non validi", pratica);
            return false;
        }

        const id = pratica.id;
        const d = pratica.dati || {};
        const p = d.pratica || {};

        const praticaRecord = {
            id: id,
            nome: pratica.nome || "",
            dataCrea: pratica.dataCrea || new Date().toISOString(),
            stato: p.stato || "Bozza",
            modalita_accesso: p.modalita_accesso || "Diretto",
            pratica_data: p,
            dati_tecnici: d.dati_tecnici || {},
            economico: d.economico || {}
        };

        let success = false;
        try {
            await _db.transaction('rw', _db.pratiche, ..._RELATIONAL_TABLES.map(t => _db[t]), async () => {

                // 1. Salva pratica
                await _db.pratiche.put(praticaRecord);

                // 2. Salva proprietario
                const proprietario = d.proprietario || {};
                if (proprietario.denominazione || proprietario.codice_fiscale) {
                    await _db.proprietari.put({
                        id: `PR_${id}`,
                        praticaId: id,
                        denominazione: proprietario.denominazione || "",
                        dati: proprietario
                    });
                }

                // 3. Salva richiedente
                const richiedente = d.richiedente || {};
                if (richiedente.denominazione || richiedente.codice_fiscale) {
                    await _db.richiedenti.put({
                        id: `RI_${id}`,
                        praticaId: id,
                        denominazione: richiedente.denominazione || "",
                        tipo_soggetto: richiedente.tipo_soggetto || "",
                        dati: richiedente
                    });
                }

                // 4. Salva responsabile
                const responsabile = d.responsabile || {};
                if (responsabile.denominazione || responsabile.codice_fiscale) {
                    await _db.responsabili.put({
                        id: `RS_${id}`,
                        praticaId: id,
                        denominazione: responsabile.denominazione || "",
                        tipo_soggetto: responsabile.tipo_soggetto || "",
                        dati: responsabile
                    });
                }

                // 5. Salva delegato
                const delegato = d.delegato || {};
                if (delegato.denominazione || delegato.codice_fiscale) {
                    await _db.delegati.put({
                        id: `DG_${id}`,
                        praticaId: id,
                        denominazione: delegato.denominazione || "",
                        dati: delegato
                    });
                }

                // 6. Salva edificio
                const edificio = d.edificio || {};
                if (edificio.indirizzo || (edificio.dati_catastali && edificio.dati_catastali.comune)) {
                    await _db.edifici.put({
                        id: `ED_${id}`,
                        praticaId: id,
                        zona_climatica: edificio.zona_climatica || "",
                        categoria: (edificio.dati_catastali && edificio.dati_catastali.categoria) || "",
                        ambito: edificio.ambito || "",
                        dati: edificio
                    });
                }

                // 7. Salva interventi (dati_tecnici JSON, economico, variazioni)
                const interventi = d.interventi || [];
                for (const iv of interventi) {
                    await _db.interventi.put({
                        id: iv.id_intervento || `IV_${id}_${iv.codice_intervento}`,
                        praticaId: id,
                        codice_intervento: iv.codice_intervento || "",
                        is_trainante: iv.is_trainante || false,
                        dati_tecnici: iv.dati_tecnici || {}
                    });

                    // 7a. Salva economico per intervento
                    const eco = iv.economico || {};
                    if (eco.totale_spese || Object.keys(eco).length > 0) {
                        await _db.economico.put({
                            id: `EC_${id}_${iv.codice_intervento}`,
                            praticaId: id,
                            interventoId: iv.codice_intervento || "",
                            dati: eco
                        });
                    }

                    // 7b. Salva variazioni per intervento
                    const variazioni = iv.variazioni || [];
                    for (let vi = 0; vi < variazioni.length; vi++) {
                        await _db.variazioni.put({
                            id: `VZ_${id}_${iv.codice_intervento}_${vi}`,
                            praticaId: id,
                            interventoId: iv.codice_intervento || "",
                            dati: variazioni[vi]
                        });
                    }
                }
            });
            success = true;
        } catch (e) {
            success = _logErr("praticheMgr.save", e);
        }
        return success;
    },

    /**
     * Recupera una pratica per ID (ricostruisce il composito dalle tabelle v6).
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
     * Recupera tutte le pratiche ordinate per dataCrea decrescente.
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
     * Cerca pratiche per nome (esatto).
     * @param {string} nome - Nome della pratica da cercare.
     * @returns {Array} Array di pratiche con quel nome.
     */
    findByNome: async function(nome) {
        if (!nome) {
            return [];
        }
        let results = [];
        try {
            const praticaRecords = await _db.pratiche.where("nome").equals(nome).toArray();
            for (const rec of praticaRecords) {
                const composed = await _composePratica(rec);
                if (composed) {
                    results.push(composed);
                }
            }
        } catch (e) {
            _logErr("praticheMgr.findByNome", e);
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
    }
};

// ============================================================================
// API PUBBLICA - documentiMgr (Tabella documenti)
// ============================================================================

export const documentiMgr = {
    save: async function(docRecord) {
        try {
            await _db.documenti.put(docRecord);
            return true;
        } catch (e) {
            return _logErr("documentiMgr.save", e);
        }
    },

    get: async function(id) {
        try {
            return await _db.documenti.get(id);
        } catch (e) {
            _logErr("documentiMgr.get", e);
            return null;
        }
    },

    getByNome: async function(praticaId, nomeDoc) {
        try {
            return await _db.documenti
                .where({ praticaId: praticaId, nome_documento: nomeDoc })
                .first();
        } catch (e) {
            _logErr("documentiMgr.getByNome", e);
            return null;
        }
    },

    getAllByPratica: async function(praticaId) {
        try {
            return await _db.documenti.where("praticaId").equals(praticaId).toArray();
        } catch (e) {
            _logErr("documentiMgr.getAllByPratica", e);
            return [];
        }
    },

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

// ============================================================================
// API PUBBLICA - budgetMgr (Monitoraggio plafond contingenti)
// ============================================================================

const _BUDGET_KEY = "CT30_budget_usage";

export const budgetMgr = {
    loadUsage: async function() {
        const raw = await UaDb.readJson(_BUDGET_KEY);
        return raw && typeof raw === "object" ? raw : {};
    },

    saveUsage: async function(usage) {
        await UaDb.saveJson(_BUDGET_KEY, usage);
    },

    addIncentivo: async function(soggettoCategoria, importo) {
        const usage = await budgetMgr.loadUsage();
        const current = parseFloat(usage[soggettoCategoria]) || 0;
        usage[soggettoCategoria] = current + importo;
        await budgetMgr.saveUsage(usage);
    },

    removeIncentivo: async function(soggettoCategoria, importo) {
        const usage = await budgetMgr.loadUsage();
        const current = parseFloat(usage[soggettoCategoria]) || 0;
        usage[soggettoCategoria] = Math.max(0, current - importo);
        await budgetMgr.saveUsage(usage);
    },

    getTotaleByCategoria: async function(soggettoCategoria) {
        const usage = await budgetMgr.loadUsage();
        return parseFloat(usage[soggettoCategoria]) || 0;
    },

    getUsageReport: async function(plafondMap) {
        const usage = await budgetMgr.loadUsage();
        const report = {};
        for (const [cat, budget] of Object.entries(plafondMap || {})) {
            const used = parseFloat(usage[cat]) || 0;
            report[cat] = {
                budget: budget,
                used: used,
                residuo: Math.max(0, budget - used),
                percentuale: budget > 0 ? parseFloat((used / budget * 100).toFixed(1)) : 0
            };
        }
        return report;
    },

    ricaricaDaArchivio: async function(plafondMap) {
        const usage = {};
        const all = await praticheMgr.getAll();
        for (const p of all) {
            const soggetto = p.dati?.richiedente?.tipo_soggetto || "";
            if (!soggetto || !plafondMap || !(soggetto in plafondMap)) continue;
            const eco = p.dati?.economico || {};
            let totale = 0;
            for (const key of Object.keys(eco)) {
                const amt = parseFloat(eco[key]?.incentivo_totale) || 0;
                totale = totale + amt;
            }
            if (totale > 0) {
                usage[soggetto] = (usage[soggetto] || 0) + totale;
            }
        }
        await budgetMgr.saveUsage(usage);
        return usage;
    }
};
