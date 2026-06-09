/**
 * uajtfh.js - Justify text / format helper.
 * Crea un buffer di righe di testo che possono essere unite con separatore.
 * Segue BEST_PRACTICES_JS.md: factory/closure pattern.
 *
 * @module  uajtfh
 * @version 1.0.0
 * @date    2026-06-02
 */
"use strict";

var UaJtfh = function() {
    var _rows = [];

    var api = {};

    api.init = function() {
        _rows = [];
        return api;
    };

    api.insert = function(s) {
        _rows.unshift(s);
        return api;
    };

    api.append = function(s) {
        _rows.push(s);
        return api;
    };

    api.text = function(ln) {
        var separator = ln !== undefined ? ln : "";
        var result = _rows.join(separator);
        return result;
    };

    api.html = function(ln) {
        var separator = ln !== undefined ? ln : "";
        var joined = _rows.join(separator);
        var cleaned = joined.replace(/\s+|\[rn\]/g, " ");
        return cleaned;
    };

    return api;
};

export { UaJtfh };
