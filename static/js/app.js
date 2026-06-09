/**
 * app.js - Entry point dell'applicazione CT30 static.
 * Coordina l'inizializzazione dei moduli UI e della logica normativa.
 * Segue BEST_PRACTICES_JS.md: no class/this/new/prototype.
 *
 * @module  app
 * @version 1.0.0
 * @date    2026-06-02
 */
"use strict";

import { WebId } from "./infra/webuser_id.js";
import { idbMgr, praticheMgr } from "./infra/idb_mgr.js";
import { UaWindowAdm } from "./ui/lib/uawindow.js";
import "./ui/lib/uadialog.js";
import { WizardManager } from "./wizard_manager.js";

let _wizard = null;

/* ========= AGGIORNAMENTO STATO UI ========= */

const _renderWelcomeScreen = function() {
    const hasPratica = _wizard && _wizard.hasActivePratica();

    let infoBoxHtml = "";
    if (hasPratica) {
        const data = _wizard.getData();
        const p = data.pratica || {};
        const r = data.richiedente || {};
        const ed = data.edificio || {};

        const nomePratica = p.nome || "N/D";
        const codicePratica = p.codice || "";
        const dataIns = p.data_inserimento || "";
        const denominazione = r.denominazione || "N/D";
        const tipoAccesso = p.modalita_accesso || "N/D";
        const indirizzo = ed.indirizzo || "N/D";

        infoBoxHtml = '<div class="pratica-info-box" style="margin-top:30px;padding:20px;border:2px solid #68c8b2;border-radius:8px;background:rgba(104,200,178,0.1);text-align:left;display:inline-block;">'
            + '<div style="font-weight:600;color:#68c8b2;margin-bottom:10px;">PRATICA IN GESTIONE</div>'
            + '<table class="simple-data-table" style="font-size:0.95em;">'
            + (codicePratica ? '<tr><td class="field-label" style="padding:4px 12px 4px 0;">Codice</td><td>' + codicePratica + '</td></tr>' : "")
            + (dataIns ? '<tr><td class="field-label" style="padding:4px 12px 4px 0;">Data ins.</td><td>' + dataIns + '</td></tr>' : "")
            + '<tr><td class="field-label" style="padding:4px 12px 4px 0;">Nome</td><td>' + nomePratica + '</td></tr>'
            + '<tr><td class="field-label" style="padding:4px 12px 4px 0;">Richiedente</td><td>' + denominazione + '</td></tr>'
            + '<tr><td class="field-label" style="padding:4px 12px 4px 0;">Accesso</td><td>' + tipoAccesso + '</td></tr>'
            + '<tr><td class="field-label" style="padding:4px 12px 4px 0;">Edificio</td><td>' + indirizzo + '</td></tr>'
            + '</table>'
            + '</div>';
    }

    const html = '<article><div id="welcome-screen" style="text-align:center;padding-top:60px;">'
        + '<h1>Conto Termico 3.0</h1>'
        + '<p style="color:rgba(255,255,255,0.5);margin-top:8px;">versione 0.1.4 - 09-06-2026</p>'
        + infoBoxHtml
        + '</div></article>';

    return html;
};

const _updateUIState = function() {
    const cmdReset = document.getElementById("cmd-reset");
    const btnPrev = document.getElementById("btn-wiz-prev-global");
    const btnNext = document.getElementById("btn-wiz-next-global");
    const btnStart = document.getElementById("btn-wiz-start-global");
    const btnEnd = document.getElementById("btn-wiz-end-global");
    const stepIndicator = document.getElementById("wizard-step-indicator");

    const stepActive = _wizard && _wizard.isStepActive();

    var navBtns = [cmdReset, btnStart, btnPrev, btnNext, btnEnd];
    navBtns.forEach(function(b) {
        if (b) b.style.display = stepActive ? "" : "none";
    });

    if (!stepActive) {
        if (stepIndicator) stepIndicator.style.display = "none";
    }

    const vp = document.getElementById("wizard-viewport");
    if (!vp) return;

    const welcomeScreen = vp.querySelector("#welcome-screen");
    if (welcomeScreen) {
        const newHtml = _renderWelcomeScreen();
        vp.innerHTML = newHtml;
    }
};

const _showHelpWindow = function() {
    var winId = "win-help";
    var win = UaWindowAdm.get(winId);
    if (!win) {
        win = UaWindowAdm.create(winId);
        win.addClassStyle("ua-modal-window");
        win.setStyle({ minWidth: "95vw", minHeight: "95vh" });
        win.setXY(2, 2).setZ(3000);
    }

    var isDark = document.body.classList.contains("dark-theme");
    win.removeClassStyle("dark-theme").removeClassStyle("light-theme");
    win.addClassStyle(isDark ? "dark-theme" : "light-theme");

    var darkFg = "rgba(255,255,255,0.6)";

    var html = '<div class="window-header">'
        + '<span class="title">Guida CT 3.0</span>'
        + '<div class="header-actions"></div>'
        + '<button class="close-btn btn-close-win" title="Chiudi">&times;</button>'
        + '</div>'
        + '<div class="window-body" style="overflow-y:auto;padding:20px 40px 60px;">'
        + '<h1 style="color:#68c8b2;text-align:center;margin-bottom:10px;">HELP — Conto Termico 3.0</h1>'
        + '<p style="text-align:center;color:' + darkFg + ';margin-bottom:40px;">Guida rapida all\'uso dell\'applicativo</p>'

        + '<div class="help-section">'
        + '<h2 style="color:#68c8b2;">Comandi della Pagina Iniziale (Sidebar)</h2>'
        + '<table class="help-table">'
        + '<tr><td><strong>HELP</strong></td><td>Apre questa finestra di guida.</td></tr>'
        + '<tr><td><strong>Gestisci Pratica</strong></td><td>Crea una nuova pratica o apre una esistente. Avvia il wizard a 7 fasi.</td></tr>'
        + '<tr><td><strong>Elenco Pratiche</strong></td><td>Mostra l\'archivio delle pratiche salvate. Da qui puoi visualizzare il report, eliminare o ricaricare una pratica archiviata.</td></tr>'
        + '<tr><td><strong>Pulisci DB</strong></td><td>Cancella tutti i dati del database IndexedDB. Richiede conferma e ricarica la pagina.</td></tr>'
        + '<tr><td><strong>Salva DB</strong></td><td>Esporta l\'intero database in un file JSON (backup).</td></tr>'
        + '<tr><td><strong>Carica DB</strong></td><td>Importa un database da un file JSON precedentemente esportato (ripristino backup).</td></tr>'
        + '<tr><td><strong>pratiche-test</strong></td><td>Carica uno scenario di test predefinito per verificare rapidamente il funzionamento del wizard.</td></tr>'
        + '</table></div>'

        + '<div class="help-section" style="margin-top:40px;">'
        + '<h2 style="color:#68c8b2;">Barra di Navigazione Superiore</h2>'
        + '<table class="help-table">'
        + '<tr><td><strong>RESET</strong></td><td>Reimposta la pratica corrente, cancellando tutti i dati inseriti. Visibile solo durante la compilazione.</td></tr>'
        + '<tr><td><strong>INIZIO</strong></td><td>Torna al primo step (Pratica). Disabilitato se già al primo step.</td></tr>'
        + '<tr><td><strong>INDIETRO</strong></td><td>Torna allo step precedente. Disabilitato se già al primo step.</td></tr>'
        + '<tr><td><strong>AVANTI</strong></td><td>Passa allo step successivo, validando i dati correnti. Disabilitato all\'ultimo step.</td></tr>'
        + '<tr><td><strong>FINE</strong></td><td>Salta direttamente all\'ultimo step (Riepilogo). Abilitato solo se tutti i dati economici sono stati inseriti.</td></tr>'
        + '</table></div>'

        + '<div class="help-section" style="margin-top:40px;">'
        + '<h2 style="color:#68c8b2;">Aiuto Contestuale "?"</h2>'
        + '<p>Su ogni fase del wizard, in alto a destra del form, trovi il pulsante <strong>"?"</strong> (cerchio arancione).</p>'
        + '<p>Cliccalo per aprire una finestra che spiega, per la fase corrente:</p>'
        + '<ul>'
        + '<li><strong>Campi</strong> — cosa inserire</li>'
        + '<li><strong>Vincoli</strong> — cosa è obbligatorio e le regole da rispettare</li>'
        + '<li><strong>Pulsanti</strong> — a cosa servono i comandi disponibili</li>'
        + '</ul></div>'

        + '<div class="help-section" style="margin-top:40px;">'
        + '<h2 style="color:#68c8b2;">Fasi del Wizard e Vincoli</h2>'
        + '<div class="help-step"><h3>Fase 1 — Pratica</h3>'
        + '<p>Inserisci il nome della pratica e seleziona la modalit\u00e0 di accesso (<em>Accesso Diretto</em> o <em>Accesso su Prenotazione</em>).</p>'
        + '<p><strong>Vincolo:</strong> Nome e modalit\u00e0 di accesso sono obbligatori per proseguire.</p></div>'

        + '<div class="help-step"><h3>Fase 2 — Edificio</h3>'
        + '<p>Inserisci i dati catastali e climatici dell\'edificio: indirizzo, categoria catastale, zona climatica, superficie utile, anno di costruzione.</p>'
        + '<p><strong>Vincolo:</strong> Indirizzo, categoria catastale e zona climatica sono obbligatori.</p></div>'

        + '<div class="help-step"><h3>Fase 3 — Anagrafiche</h3>'
        + '<p>Inserisci i tre soggetti obbligatori: <strong>Proprietario</strong> (T1), <strong>Richiedente/SA</strong> (T2), <strong>Responsabile/SR</strong> (T3). Opzionale: <strong>Delegato</strong> (T4).</p>'
        + '<p><strong>Vincoli:</strong></p>'
        + '<ul>'
        + '<li>Proprietario: denominazione obbligatoria.</li>'
        + '<li>SA: tipo soggetto obbligatorio (PA, Privato, ETS, ecc.).</li>'
        + '<li>SR: tipo soggetto obbligatorio (PA, Privato, ESCO, CER, ecc.).</li>'
        + '<li>Se SA = privato residenziale → solo Titolo III (nessun intervento di involucro).</li>'
        + '<li>Se SA = privato con attivit\u00e0 economica → regime Titolo V.</li>'
        + '<li>Se Proprietario \u2260 Richiedente → Atto di Assenso obbligatorio.</li>'
        + '<li>Se SR \u2260 SA e SR = ESCO → contratto EPC obbligatorio.</li>'
        + '<li>Se non-PA → Mandato irrevocabile all\'incasso obbligatorio.</li>'
        + '</ul></div>'

        + '<div class="help-step"><h3>Fase 4 — Interventi</h3>'
        + '<p>Seleziona uno o pi\u00f9 interventi tra quelli disponibili in base al tipo di soggetto SA e all\'ambito dell\'edificio.</p>'
        + '<p><strong>Vincoli:</strong></p>'
        + '<ul>'
        + '<li>II.G e II.H richiedono III.A (pompa di calore elettrica).</li>'
        + '<li>II.C richiede II.B (schermature solo con infissi).</li>'
        + '<li>Almeno un intervento deve essere selezionato.</li>'
        + '<li>La compatibilit\u00e0 viene verificata dal pulsante "Verifica compatibilit\u00e0".</li>'
        + '</ul></div>'

        + '<div class="help-step"><h3>Fase 5 — Dati Tecnici</h3>'
        + '<p>Per ogni intervento selezionato, inserisci i parametri tecnici richiesti. Per alcuni interventi (III.A, III.B, III.C, III.D, III.E, II.H, II.G) \u00e8 disponibile un <strong>catalogo marche/modelli</strong> con auto-compilazione.</p>'
        + '<p><strong>Vincolo:</strong> I parametri contrassegnati come obbligatori devono essere compilati.</p></div>'

        + '<div class="help-step"><h3>Fase 6 — Economico</h3>'
        + '<p>Inserisci l\'importo della spesa per ogni intervento e seleziona eventuali maggiorazioni applicabili. Premi "Calcola incentivo" per ottenere il calcolo dell\'incentivo spettante.</p>'
        + '<p><strong>Vincolo:</strong> Ogni intervento deve avere un importo spesa maggiore di zero. Il pulsante FINE nella barra superiore resta disabilitato finch\u00e9 tutti gli importi non sono inseriti.</p></div>'

        + '<div class="help-step"><h3>Fase 7 — Riepilogo</h3>'
        + '<p>Riepilogo finale di tutti i dati inseriti. Da qui puoi:</p>'
        + '<ul>'
        + '<li><strong>REPORT</strong> — apre una finestra con il report dettagliato, esportabile in formato testo o stampabile.</li>'
        + '<li><strong>CALCOLI</strong> — mostra le formule di calcolo in forma algebrica e numerica per ogni intervento.</li>'
        + '<li><strong>RISULTATI</strong> — mostra i passaggi analitici del calcolo dell\'incentivo.</li>'
        + '<li><strong>DOCUMENTI</strong> — elenca i documenti richiesti per ogni intervento, con lo stato di compilazione.</li>'
        + '<li><strong>ARCHIVIA</strong> — salva la pratica nel database IndexedDB.</li>'
        + '</ul></div>'

        + '<div class="help-section" style="margin-top:40px;">'
        + '<h2 style="color:#68c8b2;">Note Generali</h2>'
        + '<ul>'
        + '<li>Tutti i dati sono salvati localmente nel browser tramite IndexedDB. Non c\'e un server o un database remoto.</li>'
        + '<li>I dati tecnici e gli incentivi calcolati hanno natura indicativa e non costituiscono impegno vincolante del GSE.</li>'
        + '<li>Per l\'accesso su prenotazione (PA/ETS), \u00e8 richiesta una richiesta preliminare prima dell\'avvio lavori.</li>'
        + '<li>L\'incentivo massimo concedibile \u00e8 il 65% della spesa (100% per scuole e PA in Comuni \u2264 15.000 ab.).</li>'
        + '</ul></div>'
        + '</div>';

    win.setHtml(html).show();

    var winEl = win.getElement();
    var closeBtns = winEl.querySelectorAll(".btn-close-win");
    closeBtns.forEach(function(btn) {
        btn.onclick = function() { win.close(); };
    });
};

/* ========= EVENT LISTENERS ========= */

const _setupEventListeners = function() {
    const cmdNuova = document.getElementById("cmd-nuova-pratica");
    const cmdElenco = document.getElementById("cmd-elenco-pratiche");
    const cmdReset = document.getElementById("cmd-reset");
    const cmdRules = document.getElementById("cmd-view-rules");
    const cmdCatalog = document.getElementById("cmd-view-catalog");
    const btnNext = document.getElementById("btn-wiz-next-global");
    const btnPrev = document.getElementById("btn-wiz-prev-global");
    const btnStart = document.getElementById("btn-wiz-start-global");
    const btnEnd = document.getElementById("btn-wiz-end-global");

    if (cmdNuova) {
        cmdNuova.addEventListener("click", async function() {
            if (_wizard) {
                const hasActive = _wizard.isStepActive();
                if (!hasActive) {
                    _wizard.reset();
                }
                await _wizard.init();
                _updateUIState();
            }
        });
    }

    if (cmdElenco) {
        cmdElenco.addEventListener("click", async function() {
            let pratiche = [];
            try {
                pratiche = await praticheMgr.getAll();
                pratiche.sort(function(a, b) {
                    var ca = (a.dati && a.dati.pratica && a.dati.pratica.codice) || "";
                    var cb = (b.dati && b.dati.pratica && b.dati.pratica.codice) || "";
                    return ca.localeCompare(cb);
                });
            } catch (err) {
                console.error("cmdElenco: errore getAll", err);
                return;
            }

            const winId = "win-elenco-pratiche";
            let win = UaWindowAdm.get(winId);
            if (win) {
                win.close();
                win = null;
            }

            if (pratiche.length === 0) {
                return;
            }

            if (!win) {
                win = UaWindowAdm.create(winId);
                win.addClassStyle("ua-modal-window");
                win.setStyle({ width: "min(95vw, 1200px)", minWidth: "320px" });
                win.setXY(15, 10).setZ(1200).drag();
            }

            const isDark = document.body.classList.contains("dark-theme");
            win.removeClassStyle("dark-theme").removeClassStyle("light-theme");
            win.addClassStyle(isDark ? "dark-theme" : "light-theme");

            let rowsHtml = "";

            for (const p of pratiche) {
                const dataStr = new Date(p.dataCrea).toLocaleDateString();
                const modalita = (p.dati && p.dati.pratica && p.dati.pratica.modalita_accesso) || "N/D";
                const codice = (p.dati && p.dati.pratica && p.dati.pratica.codice) || "";
                const nome = p.nome || (p.dati && p.dati.pratica && p.dati.pratica.nome) || "N/D";

                rowsHtml = rowsHtml + '<tr>'
                    + '<td class="td-codice">' + codice + '</td>'
                    + '<td class="td-data">' + dataStr + '</td>'
                    + '<td class="td-nome">' + nome + '</td>'
                    + '<td class="td-modalita">' + modalita + '</td>'
                    + '<td class="action-cell">'
                    + '<button class="btn-arch btn-arch-load" data-id="' + p.id + '" title="Carica questa pratica nel wizard">CARICA</button>'
                    + '<span class="act-sep">|</span>'
                    + '<button class="btn-arch btn-arch-report" data-id="' + p.id + '" title="Mostra il report dettagliato">REPORT</button>'
                    + '<span class="act-sep">|</span>'
                    + '<button class="btn-arch btn-arch-del" data-id="' + p.id + '" title="Elimina definitivamente questa pratica">ELIMINA</button>'
                    + '</td>'
                    + '</tr>';
            }

            const html = '<div class="window-header">'
                + '<span class="title">Archivio Pratiche</span>'
                + '<div class="header-actions"></div>'
                + '<button class="close-btn btn-close-win" title="Chiudi">&times;</button>'
                + '</div>'
                + '<div class="window-body">'
                + '<div class="table-wrap">'
                + '<table class="data-table data-table-elenco">'
                + '<thead><tr><th>Codice</th><th>Data</th><th>Nome</th><th>Modalit\u00e0</th><th>Azioni</th></tr></thead>'
                + '<tbody>' + rowsHtml + '</tbody>'
                + '</table>'
                + '</div>'
                + '</div>';

            win.setHtml(html).show();

            const winEl = win.getElement();
            const closeBtn = winEl.querySelector(".btn-close-win");
            if (closeBtn) closeBtn.onclick = function() { win.close(); };

            // CARICA
            winEl.querySelectorAll(".btn-arch-load").forEach(function(btn) {
                btn.addEventListener("click", async function() {
                    const id = btn.getAttribute("data-id");
                    if (!id) return;
                    const p = await praticheMgr.get(id);
                    if (p && _wizard) {
                        _wizard.loadData(p.dati);
                        await _wizard.init();
                        _updateUIState();
                        win.close();
                    }
                });
            });

            // REPORT
            winEl.querySelectorAll(".btn-arch-report").forEach(function(btn) {
                btn.addEventListener("click", async function() {
                    const id = btn.getAttribute("data-id");
                    if (!id) return;
                    const p = await praticheMgr.get(id);
                    if (p && _wizard) {
                        _wizard.showReport(p.dati);
                        win.close();
                    }
                });
            });

            // ESPORTA TXT
            winEl.querySelectorAll(".btn-arch-export").forEach(function(btn) {
                btn.addEventListener("click", async function() {
                    const id = btn.getAttribute("data-id");
                    if (!id) return;
                    const p = await praticheMgr.get(id);
                    if (!p || !p.dati) {
                        alert("Dati pratica non disponibili.");
                        return;
                    }
                    const txt = _wizard.exportPraticaTxt(p.dati);
                    if (!txt) {
                        alert("Errore generazione report.");
                        return;
                    }
                    const nomeFile = p.nome.replace(/[^a-zA-Z0-9]/g, "_") + "_" + new Date().toISOString().slice(0, 10) + ".txt";
                    const blob = new Blob([txt], { type: "text/plain;charset=utf-8" });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement("a");
                    a.href = url;
                    a.download = nomeFile;
                    a.click();
                    URL.revokeObjectURL(url);
                });
            });

            // ELIMINA
            winEl.querySelectorAll(".btn-arch-del").forEach(function(btn) {
                btn.addEventListener("click", async function() {
                    const id = btn.getAttribute("data-id");
                    if (!id) return;
                    const confermato = confirm("Eliminare definitivamente questa pratica?");
                    if (!confermato) return;
                    await praticheMgr.delete(id);
                    cmdElenco.click();
                });
            });
        });
    }

    if (cmdReset) {
        cmdReset.addEventListener("click", async function() {
            const ok = await confirm("Tornare alla pagina iniziale? I dati non salvati andranno persi.");
            if (!ok) return;
            if (!_wizard) return;
            _wizard.reset();
            const vp = document.getElementById("wizard-viewport");
            if (vp) {
                vp.innerHTML = _renderWelcomeScreen();
            }
            _updateUIState();
        });
    }

    if (btnNext) {
        btnNext.addEventListener("click", function() {
            if (_wizard) _wizard.goNext();
        });
    }

    if (btnPrev) {
        btnPrev.addEventListener("click", function() {
            if (_wizard) _wizard.goPrev();
        });
    }

    if (btnStart) {
        btnStart.addEventListener("click", function() {
            if (_wizard) _wizard.goToStart();
        });
    }

    if (btnEnd) {
        btnEnd.addEventListener("click", function() {
            if (_wizard) _wizard.goToEnd();
        });
    }

    const btnHelp = document.getElementById("btn-help");
    if (btnHelp) {
        btnHelp.addEventListener("click", function() {
            _showHelpWindow();
        });
    }

    if (cmdRules) {
        cmdRules.addEventListener("click", function() {
            if (_wizard) _wizard.showRules && _wizard.showRules();
        });
    }

    if (cmdCatalog) {
        cmdCatalog.addEventListener("click", function() {
            if (_wizard) _wizard.showCatalog && _wizard.showCatalog();
        });
    }

    const cmdPulisci = document.getElementById("cmd-pulisci-db");
    if (cmdPulisci) {
        cmdPulisci.addEventListener("click", async function() {
            const ok = await confirm("Eliminare TUTTI i dati?");
            if (!ok) return;
            await idbMgr.clearAll();
            alert("Database pulito. Ricaricare la pagina.");
            location.reload();
        });
    }

    const cmdSalva = document.getElementById("cmd-salva-db");
    if (cmdSalva) {
        cmdSalva.addEventListener("click", async function() {
            const data = await idbMgr.exportAll();
            if (!data) { alert("Errore esportazione."); return; }
            const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = "CT30_backup_" + new Date().toISOString().slice(0, 10) + ".json";
            a.click();
            URL.revokeObjectURL(url);
        });
    }

    const cmdCarica = document.getElementById("cmd-carica-db");
    if (cmdCarica) {
        cmdCarica.addEventListener("click", function() {
            const input = document.createElement("input");
            input.type = "file";
            input.accept = ".json";
            input.onchange = async function(e) {
                const file = e.target.files[0];
                if (!file) return;
                if (!await confirm("Caricare sostituir\u00e0 il database. Continuare?")) return;
                try {
                    const text = await file.text();
                    const data = JSON.parse(text);
                    const ok = await idbMgr.importAll(data);
                    alert(ok ? "Database caricato. Ricaricare." : "Errore caricamento.");
                    if (ok) location.reload();
                } catch (err) {
                    alert("File non valido: " + err.message);
                }
            };
            input.click();
        });
    }
};

const initApp = async function() {
    console.info("CT30 static — avvio");
    const userId = WebId.get();
    console.info("User ID:", userId);

    _wizard = WizardManager("wizard-viewport");
    _wizard.onStateChange = _updateUIState;
    _setupEventListeners();
    _updateUIState();
    console.info("Inizializzazione completata.");
};

document.addEventListener("DOMContentLoaded", initApp);
