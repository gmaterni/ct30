/**
 * app.js - Entry point dell'applicazione CT30 Advisor.
 *
 * Coordina l'inizializzazione dei moduli, della UI e della logica normativa.
 * Segue rigorosamente le specifiche di BEST_PRACTICES_JS.md.
 *
 * @module  app
 * @version 1.1.0
 * @date    2026-05-22
 * @author  Gemini CLI
 */

"use strict";

import { WebId } from "./infra/webuser_id.js";
import { idbMgr, praticheMgr } from "./infra/idb_mgr.js";
import { UaWindowAdm } from "./ui/lib/uawindow.js";
import "./ui/lib/uadialog.js"; // Attiva sovrascritture alert/confirm/prompt
import { UaWizardManager } from "./wizard_manager.js";

// Istanza globale del wizard
let _wizard = null;

/**
 * Gestione del Tema (Light/Dark).
 * @private
 */
const _initTheme = function() {
    const btnTheme = document.getElementById("btn-theme-toggle");
    if (!btnTheme) {
        return;
    }

    const sunIcon = btnTheme.querySelector(".icon-sun");
    const moonIcon = btnTheme.querySelector(".icon-moon");

    /**
     * Sincronizza tutte le finestre aperte con il tema corrente.
     * @param {boolean} isDark 
     */
    const _syncAllWindowsTheme = (isDark) => {
        const themeToAdd = isDark ? "dark-theme" : "light-theme";
        const themeToRemove = isDark ? "light-theme" : "dark-theme";
        
        // Aggiorna finestre registrate in UaWindowAdm
        for (const id in UaWindowAdm.ws) {
            const win = UaWindowAdm.ws[id];
            if (win && win.getElement()) {
                win.removeClassStyle(themeToRemove).addClassStyle(themeToAdd);
            }
        }
    };

    /**
     * Applica il tema scelto.
     * @param {boolean} isDark - True per tema scuro.
     */
    const toggleTheme = (isDark) => {
        document.body.classList.toggle("dark-theme", isDark);
        document.body.classList.toggle("light-theme", !isDark);
        
        if (sunIcon && moonIcon) {
            sunIcon.style.display = isDark ? "block" : "none";
            moonIcon.style.display = isDark ? "none" : "block";
        }
        
        const themeName = isDark ? "dark" : "light";
        localStorage.setItem("theme", themeName);
        
        _syncAllWindowsTheme(isDark);
    };

    const savedTheme = localStorage.getItem("theme") || "light";
    const isSavedDark = savedTheme === "dark";
    
    toggleTheme(isSavedDark);

    btnTheme.addEventListener("click", () => {
        const isCurrentlyDark = document.body.classList.contains("dark-theme");
        toggleTheme(!isCurrentlyDark);
    });
};


/**
 * Inizializzazione globale dell'applicazione.
 * @returns {Promise<void>}
 */
const initAppAsync = async function() {
    console.info("initAppAsync: Avvio CT30 Advisor...");
    const userId = WebId.get();
    console.info(`initAppAsync: User ID ${userId}`);

    try {
        _initTheme();
        
        const spinner = document.getElementById("spinner");
        if (spinner) {
            spinner.style.display = "none";
        }

        _wizard = UaWizardManager("wizard-viewport");

        _setupBaseEventListeners();

        console.info("initAppAsync: Inizializzazione completata.");

    } catch (error) {
        console.error("initAppAsync:", error);
    }
};

/**
 * Configura gli event listener fondamentali della pagina.
 * @private
 */
const _setupBaseEventListeners = function() {
    const cmdNuova = document.getElementById("cmd-nuova-pratica");
    const cmdElenco = document.getElementById("cmd-elenco-pratiche");
    const cmdRules = document.getElementById("cmd-view-rules");
    const cmdCatalog = document.getElementById("cmd-view-catalog");
    const cmdReset = document.getElementById("cmd-reset");

    if (cmdNuova) {
        cmdNuova.addEventListener("click", () => {
            if (_wizard) {
                _wizard.reset();
                _wizard.start();
            }
        });
    }

    if (cmdElenco) {
        /**
         * Gestisce l'apertura dell'elenco pratiche archiviate.
         */
        const handleElenco = async () => {
            try {
                const pratiche = await praticheMgr.getAll();
                const winId = "win-elenco-pratiche";
                let win = UaWindowAdm.get(winId);

                if (pratiche.length === 0) {
                    console.warn("handleElenco: Nessuna pratica archiviata trovata.");
                    if (win) win.close();
                    return;
                }

                if (!win) {
                    win = UaWindowAdm.create(winId);
                    win.addClassStyle("ua-modal-window");
                    win.setStyle({ minWidth: "1000px" });
                    win.setXY(15, 10).setZ(1200).drag();
                }

                const isDark = document.body.classList.contains("dark-theme");
                const themeClass = isDark ? "dark-theme" : "light-theme";
                win.removeClassStyle("dark-theme").removeClassStyle("light-theme");
                win.addClassStyle(themeClass);

                const rowsHtml = pratiche.map(p => {
                    const dataStr = new Date(p.dataCrea).toLocaleDateString();
                    const row = `
                        <tr>
                            <td>${dataStr}</td>
                            <td>${p.nome}</td>
                            <td>${p.dati.soggetti?.sa?.denominazione || p.dati.anagrafica?.denominazione || 'N/D'}</td>
                            <td>
                                <button class="cmd-btn small btn-load" data-id="${p.id}">Carica</button>
                                <button class="cmd-btn small btn-view" data-id="${p.id}">Visualizza</button>
                                <button class="cmd-btn small btn-export export" data-id="${p.id}">Esporta TXT</button>
                                <button class="cmd-btn small danger btn-del" data-id="${p.id}">Elimina</button>
                            </td>
                        </tr>
                    `;
                    return row;
                }).join('');

                const html = `
                    <div class="window-header">
                        <span class="title">Archivio Pratiche</span>
                        <div class="header-actions"></div>
                        <button class="close-btn btn-close-win tt-bottom" data-tt="Chiudi">×</button>
                    </div>
                    <div class="window-body">
                        <table class="data-table">
                            <thead>
                                <tr>
                                    <th>Data</th>
                                    <th>Nome Pratica</th>
                                    <th>Soggetto</th>
                                    <th>Azioni</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${rowsHtml}
                            </tbody>
                        </table>
                    </div>
                `;
                win.setHtml(html).show();

                win.getElement().querySelector(".btn-close-win").addEventListener("click", () => win.close());

                win.getElement().querySelectorAll(".btn-load").forEach(btn => {
                    btn.addEventListener("click", async () => {
                        const id = btn.getAttribute("data-id");
                        const p = await praticheMgr.get(id);
                        if (p && _wizard) {
                            _wizard.loadPratica(p);
                            win.close();
                        }
                    });
                });

                win.getElement().querySelectorAll(".btn-view").forEach(btn => {
                    btn.addEventListener("click", async () => {
                        const id = btn.getAttribute("data-id");
                        const p = await praticheMgr.get(id);
                        if (p && _wizard) {
                            _wizard.showReport(p.dati);
                            win.close();
                        }
                    });
                });

                win.getElement().querySelectorAll(".btn-del").forEach(btn => {
                    btn.addEventListener("click", async () => {
                        const id = btn.getAttribute("data-id");
                        if (!id) {
                            console.error("handleElenco.btn-del: ID mancante");
                            return;
                        }

                        const confermato = confirm("Eliminare definitivamente questa pratica?");
                        if (!confermato) {
                            return;
                        }

                        await praticheMgr.delete(id);
                        handleElenco();
                    });
                });

                win.getElement().querySelectorAll(".btn-export").forEach(btn => {
                    btn.addEventListener("click", async () => {
                        const id = btn.getAttribute("data-id");
                        if (!id) return;
                        const p = await praticheMgr.get(id);
                        if (!p || !p.dati) { alert("Dati pratica non disponibili."); return; }
                        const d = p.dati;
                        const sogg = d.soggetti || {};
                        const lines = [];

                        lines.push("=".repeat(60));
                        lines.push("  REPORT DETTAGLIATO PRATICA");
                        lines.push("=".repeat(60));
                        lines.push("");
                        lines.push("DATI GENERALI");
                        lines.push("-".repeat(40));
                        lines.push(`  ID:              ${p.id}`);
                        lines.push(`  Nome:            ${p.nome}`);
                        lines.push(`  Data creazione:  ${p.dataCrea}`);
                        lines.push(`  Stato:           ${d.pratica?.status || "N/D"}`);
                        lines.push(`  Codice pratica:  ${d.pratica?.codice_pratica || "N/D"}`);
                        if (d.pratica?.richiestaPreliminareInviata) {
                            lines.push(`  Rich. Preliminare: Sì (${d.pratica.dataRichiestaPreliminare || ""})`);
                            lines.push(`  Primo impegno:     ${d.pratica.dataPrimoImpegno || ""}`);
                        }
                        lines.push("");

                        lines.push("EDIFICIO");
                        lines.push("-".repeat(40));
                        const ed = d.edificio || {};
                        lines.push(`  Indirizzo:             ${ed.indirizzo || "N/D"}`);
                        lines.push(`  Categoria catastale:   ${ed.categoria_catastale || "N/D"}`);
                        lines.push(`  Zona climatica:        ${ed.zona_climatica || "N/D"}`);
                        lines.push(`  Potenza esistente kW:  ${ed.potenza_esistente_kw || 0}`);
                        lines.push(`  Combustibile ante:     ${ed.combustibile_ante || "N/D"}`);
                        lines.push("");

                        lines.push("SOGGETTI");
                        lines.push("-".repeat(40));
                        for (const [ruolo, info] of Object.entries(sogg)) {
                            if (!info || !info.denominazione && !info.nome) continue;
                            lines.push(`  ${ruolo.toUpperCase()}:`);
                            for (const [k, v] of Object.entries(info)) {
                                if (v) lines.push(`    ${k}: ${v}`);
                            }
                        }
                        lines.push("");

                        const interventi = d.interventi || [];
                        const vc = d.valori_campi || {};
                        if (interventi.length) {
                            lines.push("INTERVENTI SELEZIONATI");
                            lines.push("-".repeat(40));
                            interventi.forEach(code => {
                                lines.push(`  ${code}`);
                                const campi = vc[code];
                                if (campi) {
                                    for (const [k, v] of Object.entries(campi)) {
                                        if (v) lines.push(`    ${k}: ${v}`);
                                    }
                                }
                            });
                            lines.push("");
                        }

                        if (d.postOperam) {
                            lines.push("POST OPERAM");
                            lines.push("-".repeat(40));
                            for (const [code, vals] of Object.entries(d.postOperam)) {
                                if (!vals) continue;
                                lines.push(`  ${code}:`);
                                for (const [k, v] of Object.entries(vals)) {
                                    if (v !== null && v !== undefined) lines.push(`    ${k}: ${v}`);
                                }
                            }
                            lines.push("");
                        }

                        const prev = d.preventivo || {};
                        if (prev.items && prev.items.length) {
                            lines.push("PREVENTIVO");
                            lines.push("-".repeat(40));
                            let tot = 0;
                            prev.items.forEach(item => {
                                const imp = (item.importo || 0) * (item.quantita || 1);
                                tot += imp;
                                lines.push(`  ${item.codice_intervento} | ${item.descrizione} | ${item.tipo_costo} | ${imp.toFixed(2)} €`);
                            });
                            lines.push(`  ${"-".repeat(30)}`);
                            lines.push(`  TOTALE: ${tot.toFixed(2)} €`);
                            lines.push("");
                        }

                        if (d.documentiStatus) {
                            lines.push("DOCUMENTI");
                            lines.push("-".repeat(40));
                            for (const [nome, status] of Object.entries(d.documentiStatus)) {
                                lines.push(`  ${status ? "[OK]" : "[  ]"} ${nome}`);
                            }
                            lines.push("");
                        }

                        if (d.validation) {
                            lines.push("VALIDAZIONE");
                            lines.push("-".repeat(40));
                            const v = d.validation;
                            lines.push(`  Esito:              ${v.success ? "AMMISSIBILE" : "NON AMMISSIBILE"}`);
                            if (v.message) lines.push(`  Messaggio:          ${v.message}`);
                            if (v.validTitles?.length) lines.push(`  Titoli validi:      ${v.validTitles.join(", ")}`);
                            if (v.errors?.length) lines.push(`  Errori:             ${v.errors.join("; ")}`);
                            if (v.warnings?.length) lines.push(`  Warning:            ${v.warnings.join("; ")}`);
                            if (v.subjectInfo) {
                                const si = v.subjectInfo;
                                lines.push(`  Soggetto:           ${si.descrizione || ""}`);
                                if (si.titoli?.length) lines.push(`  Titoli accessibili: ${si.titoli.join(", ")}`);
                            }
                            lines.push("");
                        }

                        lines.push("=".repeat(60));
                        lines.push(`  Generato il ${new Date().toLocaleString()}`);
                        lines.push("=".repeat(60));

                        const txt = lines.join("\n");
                        const blob = new Blob([txt], { type: "text/plain;charset=utf-8" });
                        const url = URL.createObjectURL(blob);
                        const a = document.createElement("a");
                        a.href = url;
                        a.download = `${p.nome.replace(/[^a-zA-Z0-9]/g, "_")}_${new Date().toISOString().slice(0, 10)}.txt`;
                        a.click();
                        URL.revokeObjectURL(url);
                    });
                });

            } catch (error) {
                console.error("_setupBaseEventListeners.handleElenco:", error);
            }
        };

        cmdElenco.addEventListener("click", handleElenco);
    }

    if (cmdReset) {
        /**
         * Il pulsante "RESET" riporta alla pagina iniziale.
         */
        const tooltipBox = document.getElementById("reset-tooltip-box");
        
        cmdReset.addEventListener("mouseenter", () => {
            if (tooltipBox) {
                tooltipBox.innerText = cmdReset.getAttribute("data-tt");
                tooltipBox.style.display = "block";
            }
        });

        cmdReset.addEventListener("mouseleave", () => {
            if (tooltipBox) {
                tooltipBox.style.display = "none";
            }
        });

        cmdReset.addEventListener("click", async () => {
            const msg = "Sicuro di voler tornare alla pagina iniziale? I dati non salvati della pratica corrente andranno persi.";
            const confermato = await confirm(msg);
            if (confermato && _wizard) {
                _wizard.reset();
                _wizard.showHome();
            }
        });
    }

    if (cmdRules) {
        cmdRules.addEventListener("click", () => {
            if (_wizard) {
                _wizard.showRules();
            }
        });
    }

    if (cmdCatalog) {
        cmdCatalog.addEventListener("click", () => {
            if (_wizard) {
                _wizard.showCatalog();
            }
        });
    }

    const cmdPulisci = document.getElementById("cmd-pulisci-db");
    if (cmdPulisci) {
        cmdPulisci.addEventListener("click", async () => {
            const ok = await confirm("Eliminare TUTTI i dati dal database? Operazione irreversibile.");
            if (!ok) return;
            const ok2 = await confirm("Sei sicuro? Verranno cancellate tutte le pratiche, le impostazioni e i documenti.");
            if (!ok2) return;
            await idbMgr.clearAll();
            alert("Database pulito. Ricaricare la pagina.");
            location.reload();
        });
    }

    const cmdSalva = document.getElementById("cmd-salva-db");
    if (cmdSalva) {
        cmdSalva.addEventListener("click", async () => {
            const data = await idbMgr.exportAll();
            if (!data) { alert("Errore nell'esportazione del database."); return; }
            const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = `CT30_${new Date().toISOString().slice(0, 10)}.json`;
            a.click();
            URL.revokeObjectURL(url);
            alert("Database salvato correttamente.");
        });
    }

    const cmdCarica = document.getElementById("cmd-carica-db");
    if (cmdCarica) {
        cmdCarica.addEventListener("click", () => {
            const input = document.createElement("input");
            input.type = "file";
            input.accept = ".json";
            input.onchange = async (e) => {
                const file = e.target.files[0];
                if (!file) return;
                const ok = await confirm("Caricare questo file sostituirà COMPLETAMENTE il database corrente. Continuare?");
                if (!ok) return;
                try {
                    const text = await file.text();
                    const data = JSON.parse(text);
                    const success = await idbMgr.importAll(data);
                    if (success) {
                        alert("Database caricato con successo. Ricaricare la pagina.");
                        location.reload();
                    } else {
                        alert("Errore durante il caricamento del database.");
                    }
                } catch (err) {
                    alert("File non valido: " + err.message);
                }
            };
            input.click();
        });
    }
};

document.addEventListener("DOMContentLoaded", initAppAsync);
