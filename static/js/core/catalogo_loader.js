/**
 * catalogo_loader.js - Carica on-demand i cataloghi tecnici (JSON) per
 * popolare dropdown marca/modello e auto-fill parametri tecnici.
 *
 * I file JSON risiedono in static/dati_tecnici/ e vengono fetchati
 * una sola volta (cached in memoria).
 *
 * La mappa codici→file non è hardcoded: viene letta da
 * dati_tecnici/index.json, permettendo di rinominare/aggiungere file
 * senza toccare il codice JS.
 */
const _cache = {};
let _manifest = null;

const BASE = "dati_tecnici/";

async function _fetchJSON(path) {
    const resp = await fetch(path);
    if (!resp.ok) throw new Error("HTTP " + resp.status);
    return resp.json();
}

async function _getManifest() {
    if (_manifest) return _manifest;
    try {
        _manifest = await _fetchJSON(BASE + "index.json");
    } catch {
        console.warn("catalogo_loader: index.json non trovato, nessun catalogo disponibile.");
        _manifest = {};
    }
    return _manifest;
}

/**
 * Normalizza la struttura annidata del catalogo in un array piatto di record.
 * I file JSON hanno struttura: { "III.X": { "MARCA": { "MODELLO": [{...}] } } }
 * Produce: [{ marca, modello, ...fields }]
 */
function _normalizeCatalogo(data, codiceIntervento) {
    if (Array.isArray(data)) return data;
    if (typeof data !== "object" || data === null) return [];

    var inner = data[codiceIntervento] || data;
    if (Array.isArray(inner)) return inner;
    if (typeof inner !== "object" || inner === null) return [];

    var result = [];
    var marche = Object.keys(inner);
    for (var mi = 0; mi < marche.length; mi++) {
        var marca = marche[mi];
        var modelli = inner[marca];
        if (typeof modelli !== "object" || modelli === null) continue;
        var modKeys = Object.keys(modelli);
        for (var mdi = 0; mdi < modKeys.length; mdi++) {
            var modello = modKeys[mdi];
            var variants = modelli[modello];
            if (!Array.isArray(variants)) continue;
            for (var vi = 0; vi < variants.length; vi++) {
                var variant = variants[vi];
                if (typeof variant === "object" && variant !== null) {
                    var record = { marca: marca, modello: modello };
                    var vKeys = Object.keys(variant);
                    for (var ki = 0; ki < vKeys.length; ki++) {
                        record[vKeys[ki]] = variant[vKeys[ki]];
                    }
                    result.push(record);
                }
            }
        }
    }
    return result;
}

/**
 * Carica il catalogo per un dato codice intervento.
 * @param {string} codiceIntervento - Es. "III.A"
 * @returns {Promise<Array>} Array di record del catalogo, oppure [] se non trovato.
 */
export async function loadCatalogo(codiceIntervento) {
    if (_cache[codiceIntervento]) return _cache[codiceIntervento];

    const manifest = await _getManifest();
    const filename = manifest[codiceIntervento];
    if (!filename) {
        _cache[codiceIntervento] = [];
        return [];
    }

    try {
        const data = await _fetchJSON(BASE + filename);
        const normalized = _normalizeCatalogo(data, codiceIntervento);
        _cache[codiceIntervento] = normalized;
        return normalized;
    } catch (err) {
        console.warn("Catalogo non trovato:", filename, err);
        _cache[codiceIntervento] = [];
        return [];
    }
}

/**
 * Restituisce la lista delle marche (uniche, ordinate) presenti nel catalogo.
 */
export function getMarche(catalogo) {
    const marche = new Set();
    catalogo.forEach(function(r) { if (r.marca) marche.add(r.marca); });
    return Array.from(marche).sort();
}

/**
 * Restituisce i modelli per una data marca.
 */
export function getModelliPerMarca(catalogo, marca) {
    return catalogo.filter(function(r) { return r.marca === marca; });
}
