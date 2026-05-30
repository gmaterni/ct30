/**
 * webuser_id.js - Gestione dell'identificativo utente locale.
 *
 * @module  webuser_id
 * @version 1.0.0
 * @date    2026-05-22
 * @author  Gemini CLI
 */

"use strict";

const WebId = {
    /**
     * Recupera l'ID utente dal localStorage o ne genera uno nuovo.
     * @returns {string} L'ID utente.
     */
    get: function() {
        let id = localStorage.getItem('user_web_id');
        if (!id) {
            id = 'user_' + Math.random().toString(36).substr(2, 9);
            localStorage.setItem('user_web_id', id);
        }
        return id;
    }
};

export { WebId };
