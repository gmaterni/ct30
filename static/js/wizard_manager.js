/**
 * wizard_manager.js - Gestore del processo guidato (Wizard).
 *
 * Coordina la visualizzazione degli step per la creazione di una pratica,
 * raccogliendo i dati e validandoli tramite i motori logici.
 * Segue rigorosamente le specifiche di BEST_PRACTICES_JS.md.
 *
 * @module  wizard_manager
 * @version 1.2.0
 * @date    2026-05-22
 * @author  Gemini CLI
 */

"use strict";

import { RulesEngine } from "./core/rules_engine.js";
import { FormulaEngine } from "./core/formula_engine.js";
import { CrossRuleEngine } from "./core/cross_rule_engine.js";
import { RULES, INTERVENTI, CATASTO, SCHEDE_TECNICHE, SOGGETTI_CONFIG } from "./core/normativa.js";
import { UaWindowAdm } from "./ui/lib/uawindow.js";
import { idbMgr, praticheMgr, documentiMgr } from "./infra/idb_mgr.js";
import { PreventivoManager } from "./core/preventivo_manager.js";
import { ReliabilityEngine } from "./core/reliability_engine.js";
import { QaManager } from "./core/qa_manager.js";

/**
 * Factory per il gestore del Wizard.
 * 
 * @param {string} viewportId - ID dell'elemento DOM dove renderizzare il wizard.
 * @returns {Object} API pubblica del wizard.
 */
const UaWizardManager = function(viewportId) {

    // 1. STATO PRIVATO
    const _viewport = document.getElementById(viewportId);
    const _btnNextGlobal = document.getElementById("btn-wiz-next-global");
    const _btnPrevGlobal = document.getElementById("btn-wiz-prev-global");
    const _btnResetGlobal = document.getElementById("cmd-reset");
    let _currentStep = 0;

    /**
     * Aggiorna lo stato dei pulsanti globali.
     * @param {boolean} isPraticaActive - Se una pratica è in corso.
     * @private
     */
    const _updateNavState = function(isPraticaActive) {
        if (_btnResetGlobal) _btnResetGlobal.style.display = isPraticaActive ? "block" : "none";
        
        if (!_btnNextGlobal || !_btnPrevGlobal) return;
        
        if (!isPraticaActive) {
            _btnNextGlobal.style.display = "none";
            _btnPrevGlobal.style.display = "none";
            return;
        }

        // Visibilità pulsante Indietro (nascosto solo al primo step o ai risultati finali)
        _btnPrevGlobal.style.display = (_currentStep > 0 && _currentStep < 5) ? "block" : "none";

        // Visibilità pulsante Avanti (nascosto se siamo ai risultati finali)
        _btnNextGlobal.style.display = (_currentStep < 5) ? "block" : "none";

        // Caso speciale: Screening (Avanti solo se validato) - Ora Step 2
        if (_currentStep === 2) {
            const results = _praticaData.validation;
            _btnNextGlobal.style.display = (results && results.success) ? "block" : "none";
        }
    };

    // Inizializzazione visibilità
    _updateNavState(false);

    // Inserimento pulsante Test nella sidebar
    const navCommands = document.querySelector(".side-commands");
    if (navCommands) {
        const testSection = document.createElement("section");
        testSection.className = "cmd-group";
        testSection.innerHTML = `
            <h2>TEST</h2>
            <ul>
                <li><button id="btn-load-test" class="cmd-btn" style="background:#455a64;">Carica Scenario</button></li>
            </ul>
        `;
        // Inserimento dopo l'ultima sezione (NORMATIVA)
        const groups = navCommands.querySelectorAll(".cmd-group");
        const lastGroup = groups[groups.length - 1];
        if (lastGroup) {
            lastGroup.parentNode.insertBefore(testSection, lastGroup.nextSibling);
        } else {
            navCommands.appendChild(testSection);
        }

const TEST_SCENARIOS_LIST = [
    { file: "data/tests/test_01_pdc_privato.json", label: "Privato - PdC Aria/Acqua" },
    { file: "data/tests/test_02_impresa_grande.json", label: "Impresa - PdC Grande + FV" },
    { file: "data/tests/test_03_isolamento_pareti.json", label: "Privato - Isolamento Pareti" },
    { file: "data/tests/test_04_ricarica_auto.json", label: "Condominio - Ricarica Veicoli" },
    { file: "data/tests/test_05_incentivo_massimo.json", label: "Super Pratica (Incentivo Massimo)" },
    { file: "data/tests/test_06_pratica_reale.json", label: "Pratica Reale (Incentivo Calcolato)" },
    { file: "data/tests/test_07_completo.json", label: "Full Electric 5x (Massima Completezza)" }
];

        // MOD-008: beforeunload — avvisa se la pratica ha dati modificati NON archiviati
        window.addEventListener("beforeunload", (e) => {
            const sa = _praticaData.soggetti?.sa;
            const hasData = sa?.denominazione || _praticaData.interventi?.length > 0;
            const isArchived = _praticaData.pratica.id?.startsWith("PRATICA_");
            if (hasData && !isArchived) {
                e.preventDefault();
                e.returnValue = "";
            }
        });

        // MOD-008: migrazione automatica pratiche legacy all'avvio
        (async () => {
            try {
                const all = await praticheMgr.getAll();
                for (const p of all) {
                    if (p.dati && p.dati.pratica?.id && !p.dati.edificio) {
                        console.info(`Migrazione pratica legacy: ${p.id}`);
                        await praticheMgr.migrate(p);
                    }
                }
            } catch (e) {
                console.warn("Migrazione legacy non eseguita:", e);
            }
        })();

        document.getElementById("btn-load-test").onclick = () => {
            const winId = "win-test-selector";
            let win = UaWindowAdm.get(winId);
            if (!win) {
                win = UaWindowAdm.create(winId);
                win.addClassStyle("ua-modal-window");
                win.setStyle({ width: "450px", padding: "0", overflow: "hidden", border: "1px solid #455a64" });
                win.setXY(50, 50).setZ(2000).drag();
            }
            
            let html = `
                <div class="window-header" style="background:#455a64; color:white; padding:10px 15px; display:flex; justify-content:space-between; align-items:center; cursor:move;">
                    <strong>Seleziona Scenario di Test</strong>
                    <button class="win-close-btn" style="background:transparent; border:none; color:white; cursor:pointer; font-size:1.2rem;">&times;</button>
                </div>
                <div style="padding:20px; background: var(--bg-primary);">
                    <p style="margin-bottom:15px; font-size:0.9rem;">Scegli uno scenario predefinito:</p>
                    <div style="display:flex; flex-direction:column; gap:8px; border: 1px solid var(--border-color); padding: 10px; border-radius: 4px; background: rgba(0,0,0,0.05);">`;
            
            TEST_SCENARIOS_LIST.forEach(scenario => {
                html += `<button class="scenario-btn" data-file="${scenario.file}" 
                    style="text-align:left; padding:10px; background:rgba(255,255,255,0.05); color:inherit; border:1px solid rgba(0,0,0,0.1); border-radius:4px; cursor:pointer; font-size:0.9rem; transition: background 0.2s;">
                    ${scenario.label}
                </button>`;
            });
            
            html += `</div></div>`;
            win.setHtml(html);
            win.show();

            const dom = win.getElement();
            dom.querySelector(".win-close-btn").onclick = () => win.hide();

            dom.querySelectorAll(".scenario-btn").forEach(btn => {
                btn.onmouseover = (e) => e.currentTarget.style.background = "rgba(69, 90, 100, 0.1)";
                btn.onmouseout = (e) => e.currentTarget.style.background = "rgba(255,255,255,0.05)";
                
                btn.onclick = async (e) => {
                    const fetchPath = e.currentTarget.getAttribute("data-file");
                    try {
                        const response = await fetch(fetchPath);
                        if (!response.ok) throw new Error(`HTTP ${response.status}`);
                        const testPratica = await response.json();
                        
                        _loadScenarioData(testPratica);
                        win.hide();
                    } catch (err) {
                        console.error("Errore caricamento test:", err);
                        alert("Errore nel caricamento: file non trovato o JSON corrotto.");
                    }
                };
            });
        };
    }

    /**
     * Carica i dati di uno scenario nella pratica corrente.
     * @param {Object} scenario 
     */
    const _mergeSoggetti = (scenario) => {
        const src = scenario.soggetti || {};
        return {
            sa: Object.assign({
                denominazione: scenario.soggetto?.denominazione || "",
                tipo: scenario.soggetto?.tipo || "Privato residenziale",
                cf_piva: scenario.soggetto?.codiceFiscale || "",
                titolo_godimento: "Proprietà"
            }, src.sa || {}),
            sr: Object.assign({
                denominazione: scenario.soggetto?.denominazione || "",
                cf_piva: scenario.soggetto?.codiceFiscale || "",
                iban: "",
                pec: "",
                coincide_con_sa: true
            }, src.sr || {}),
            proprietario: Object.assign({
                denominazione: scenario.soggetto?.denominazione || "",
                cf_piva: scenario.soggetto?.codiceFiscale || "",
                coincide_con_sa: true,
                atto_assenso: true
            }, src.proprietario || {}),
            delegato: Object.assign({ nome: "", cf: "" }, src.delegato || {})
        };
    };

    const _normalizeZona = (z) => {
        if (!z) return "Zona E";
        const m = String(z).match(/^([A-F])$/);
        return m ? "Zona " + m[1] : z;
    };

    const _loadScenarioData = (scenario) => {
        // Mappatura scenario verso struttura relazionale (MOD-007)
        _praticaData = {
            pratica: {
                id: _generateTmpId(),
                codice_pratica: "",
                status: "Bozza",
                data_creazione: new Date().toISOString()
            },
            edificio: {
                id: null,
                indirizzo: scenario.edificio?.indirizzo || scenario.immobile?.indirizzo || "",
                categoria_catastale: scenario.edificio?.categoria_catastale || scenario.immobile?.categoriaCatastale || "",
                zona_climatica: _normalizeZona(scenario.edificio?.zona_climatica || scenario.immobile?.zonaClimatica),
                potenza_esistente_kw: scenario.edificio?.potenza_esistente_kw || scenario.immobile?.potenza_esistente_kw || 0,
                combustibile_ante: scenario.edificio?.combustibile_ante || scenario.immobile?.combustibile_ante || ""
            },
            soggetti: _mergeSoggetti(scenario),
            interventi: scenario.interventi || scenario.selectedInterventi || [],
            valori_campi: scenario.valori_campi || scenario.interventiData || {},
            preventivo: scenario.preventivo || { items: [], totals: {} },
            documentiStatus: scenario.documentiStatus || {},
            validation: null,
            postOperam: scenario.postOperam || null
        };
        _praticaData.pratica.richiestaPreliminareInviata = scenario.richiestaPreliminareInviata || false;
        _praticaData.pratica.dataRichiestaPreliminare = scenario.dataRichiestaPreliminare || "";
        _praticaData.pratica.dataPrimoImpegno = scenario.dataPrimoImpegno || "";
        console.debug("DEBUG _loadScenarioData - Pratica caricata:", _praticaData);
        console.debug("DEBUG _loadScenarioData - Preventivo:", _praticaData.preventivo);
        
        // Forza validazione ammissibilità (adattata al nuovo modello)
        _praticaData.validation = RulesEngine.validateAmmissibilita({
            subjectType: _praticaData.soggetti.sa.tipo,
            category: _praticaData.edificio.categoria_catastale,
            buildingStatus: "esistente",
            richiestaPreliminareInviata: _praticaData.pratica.richiestaPreliminareInviata,
            dataRichiestaPreliminare: _praticaData.pratica.dataRichiestaPreliminare,
            dataPrimoImpegno: _praticaData.pratica.dataPrimoImpegno
        });
        
        _goToStep(0);
    };
    
    /**
     * Genera un ID temporaneo per la pratica in corso.
     * @returns {string}
     */
    const _generateTmpId = () => `TMP_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;

    let _praticaData = {
        pratica: {
            id: _generateTmpId(),
            codice_pratica: "",
            status: "Bozza",
            tipo_accesso: "Diretto",
            data_creazione: new Date().toISOString()
        },
        edificio: {
            id: null,
            indirizzo: "",
            categoria_catastale: "",
            zona_climatica: "Zona E",
            potenza_esistente_kw: 0,
            combustibile_ante: ""
        },
        soggetti: {
            sa: { id: null, denominazione: "", tipo: "", cf_piva: "", titolo_godimento: "Proprietà" },
            sr: { id: null, denominazione: "", cf_piva: "", iban: "", pec: "", coincide_con_sa: true },
            proprietario: { id: null, denominazione: "", cf_piva: "", coincide_con_sa: true, atto_assenso: false },
            delegato: { id: null, nome: "", cf: "" }
        },
        interventi: [], 
        valori_campi: {}, 
        preventivo: { items: [], totals: {} },
        documentiStatus: {},
        validation: null,
        postOperam: null
    };

    // Documenti base sempre richiesti (Soggetto Ammesso ed Edificio)
    const BASE_DOCUMENTS = [
        "Documento Identità richiedente (SA)",
        "Codice Fiscale / Tessera Sanitaria (SA)",
        "Visura Catastale recente (ultimi 6 mesi)",
        "Titolo di possesso (atto, contratto locazione, ecc.)"
    ];

    // 2. FUNZIONI PRIVATE DI RENDERING

    /**
     * Genera l'HTML della checklist documentale dinamica.
     * @returns {string} HTML della checklist.
     * @private
     */
    const _getChecklistHtml = function() {
        const catalog = INTERVENTI;
        if (!catalog) {
            return "<p>Errore caricamento catalogo interventi.</p>";
        }

        const allDocs = [...BASE_DOCUMENTS];
        
        // 1. Regole Ruoli (MOD-005)
        if (_praticaData.soggetti.proprietario?.coincide_con_sa === false) {
            allDocs.push("Atto di Assenso Proprietario");
        }
        if (_praticaData.soggetti.sr?.coincide_con_sa === false) {
            allDocs.push("Copia documento identità Soggetto Responsabile");
            allDocs.push("IBAN (documento di conferma conto)");
            allDocs.push("PEC del Soggetto Responsabile");
        }
        if (_praticaData.soggetti.delegato && _praticaData.soggetti.delegato.nome && _praticaData.soggetti.delegato.nome !== "") {
            allDocs.push("Delega alla compilazione");
        }
        
        // 2. Regole Tipo Accesso (MOD-005)
        if (_praticaData.pratica.tipo_accesso === "Prenotazione") {
            allDocs.push("Delibera di approvazione del progetto");
            allDocs.push("Relazione tecnica illustrativa del progetto");
        }

        // 3. Regole Soggetto (Condominio)
        if (_praticaData.soggetti.sa?.tipo === "Condominio") {
            allDocs.push("Verbale Assemblea Condominiale");
            allDocs.push("Tabella Millesimale");
        }

        // 3. Regole Interventi Specifici
        _praticaData.interventi.forEach(code => {
            // Aggiunta automatica documenti base per interventi specifici
            if (code === "III.A") {
                allDocs.push("Scheda Tecnica PDC");
                allDocs.push("Dichiarazione Conformità");
            }

            const intervention = catalog[code];
            if (intervention && intervention.documenti_richiesti) {
                intervention.documenti_richiesti.forEach(doc => {
                    if (!allDocs.includes(doc)) {
                        allDocs.push(doc);
                    }
                });
            }
        });

        const listItemsHtml = allDocs.map(doc => {
            const status = _praticaData.documentiStatus[doc];
            const isChecked = status === "verificato";
            const checkedAttr = isChecked ? 'checked' : '';
            const verifiedClass = isChecked ? 'verified' : '';
            
            const item = `
                <li class="checklist-item ${verifiedClass}" data-doc="${doc}">
                    <input type="checkbox" class="chk-doc-verify" data-doc="${doc}" ${checkedAttr}>
                    <span class="doc-name">${doc}</span>
                </li>`;
            return item;
        }).join('');

        const html = `
            <div class="checklist-container">
                <ul class="ua-checklist">
                    ${listItemsHtml}
                </ul>
            </div>
        `;
        return html;
    };

    /**
     * Pulisce il viewport principale.
     * @private
     */
    const _clearViewport = function() {
        if (_viewport) _viewport.innerHTML = "";
    };

    /**
     * Restituisce l'elemento div-text interno al viewport o lo crea.
     * @returns {HTMLElement}
     * @private
     */
    const _getDivText = function() {
        let div = _viewport.querySelector(".div-text");
        if (!div) {
            div = document.createElement("div");
            div.className = "div-text";
            _viewport.appendChild(div);
        }
        return div;
    };

    /**
     * STATO 0: CENSIMENTO EDIFICIO (MOD-006)
     * Focus solo sui dati dell'immobile ante-operam.
     */
    const _renderStep0_CensimentoEdificio = function() {
        const container = _getDivText();
        const catMap = CATASTO.categorie;
        const climateZonesMap = RULES.fasce_climatiche;

        const catHtml = Object.entries(catMap).map(([code, info]) => {
            const isSelected = code === _praticaData.edificio.categoria_catastale ? 'selected' : '';
            const label = `${code} ${info.ambito}`;
            return `<option value="${code}" ${isSelected}>${label}</option>`;
        }).join('');

        const zonesHtml = Object.entries(climateZonesMap).map(([name, info]) => {
            const isSelected = name === _praticaData.edificio.zona_climatica ? 'selected' : '';
            const label = `${name} - ${info.descrizione}`;
            return `<option value="${name}" ${isSelected}>${label}</option>`;
        }).join('');

        const html = `
            <div class="wizard-step">
                <h3>Stato 0: Censimento Edificio</h3>
                <p class="step-intro">Identificazione dell'immobile oggetto dell'intervento.</p>
                <div class="form-grid">
                    <div class="form-group" style="grid-column: span 2;">
                        <label>Indirizzo Immobile:</label>
                        <input type="text" id="inp-indirizzo" value="${_praticaData.edificio.indirizzo}">
                    </div>
                    <div class="form-group">
                        <label>Categoria Catastale:</label>
                        <select id="inp-catasto">${catHtml}</select>
                    </div>
                    <div class="form-group">
                        <label>Zona Climatica:</label>
                        <select id="inp-fascia">${zonesHtml}</select>
                    </div>
                </div>
                <div class="ante-operam-section" style="margin-top: 25px; padding: 20px; background: rgba(76, 175, 222, 0.05); border: 1px solid #4caf50; border-radius: 8px;">
                    <h4 style="margin-top: 0; color: #2e7d32; border-bottom: 1px solid #4caf50; padding-bottom: 10px;">Stato di Fatto (Ante Operam)</h4>
                    <div class="form-grid">
                        <div class="form-group">
                            <label>Potenza Generatore Esistente (kW):</label>
                            <input type="number" id="inp-potenza-esistente" value="${_praticaData.edificio.potenza_esistente_kw}" step="0.01">
                        </div>
                        <div class="form-group">
                            <label>Combustibile Pre-esistente:</label>
                            <select id="inp-combustibile-ante">
                                <option value="" ${_praticaData.edificio.combustibile_ante === "" ? 'selected' : ''}>Non specificato</option>
                                <option value="metano" ${_praticaData.edificio.combustibile_ante === "metano" ? 'selected' : ''}>Metano</option>
                                <option value="gasolio" ${_praticaData.edificio.combustibile_ante === "gasolio" ? 'selected' : ''}>Gasolio</option>
                                <option value="gpl" ${_praticaData.edificio.combustibile_ante === "gpl" ? 'selected' : ''}>GPL</option>
                                <option value="biomassa" ${_praticaData.edificio.combustibile_ante === "biomassa" ? 'selected' : ''}>Biomassa</option>
                                <option value="elettrico" ${_praticaData.edificio.combustibile_ante === "elettrico" ? 'selected' : ''}>Elettrico</option>
                            </select>
                        </div>
                    </div>
                </div>
            </div>
        `;
        container.innerHTML = html;
    };

    const _handleStep0Next = function() {
        const getVal = (id) => document.getElementById(id)?.value || "";
        _praticaData.edificio.indirizzo = getVal("inp-indirizzo").trim();
        _praticaData.edificio.categoria_catastale = getVal("inp-catasto");
        _praticaData.edificio.zona_climatica = getVal("inp-fascia");
        _praticaData.edificio.potenza_esistente_kw = parseFloat(getVal("inp-potenza-esistente")) || 0;
        _praticaData.edificio.combustibile_ante = getVal("inp-combustibile-ante");
        _goToStep(1);
    };

    /**
     * STATO 1: NUOVA RICHIESTA E RUOLI GSE
     */
    const _renderStep1_RichiestaRuoli = function() {
        const container = _getDivText();
        const subjects = _praticaData.soggetti;
        const subjectTypes = RulesEngine.getSubjectTypes();
        const subjectsHtml = subjectTypes.map(t => `<option value="${t}" ${t === subjects.sa.tipo ? 'selected' : ''}>${t}</option>`).join('');

        const html = `
            <div class="wizard-step">
                <h3>Stato 1: Nuova Richiesta e Ruoli GSE</h3>
                <section class="ruolo-box" style="margin-bottom: 20px; padding: 15px; background: rgba(63, 81, 181, 0.05); border-radius: 8px; border: 1px solid rgba(63, 81, 181, 0.1);">
                    <h4 style="margin-top: 0; color: #3f51b5; border-bottom: 1px solid #3f51b5; padding-bottom: 5px;">Soggetto Ammesso (SA)</h4>
                    <div class="form-grid">
                        <div class="form-group">
                            <label>Tipo Soggetto:</label>
                            <select id="inp-tipo-soggetto">${subjectsHtml}</select>
                        </div>
                        <div class="form-group">
                            <label>Nominativo/Ragione Soc.:</label>
                            <input type="text" id="inp-nome" value="${subjects.sa.denominazione}">
                        </div>
                        <div class="form-group">
                            <label>Codice Fiscale / P.IVA:</label>
                            <input type="text" id="inp-cf" value="${subjects.sa.cf_piva}">
                        </div>
                        <div class="form-group">
                            <label>Titolo di Godimento:</label>
                            <select id="inp-sa-titolo">
                                <option value="Proprietà" ${subjects.sa.titolo_godimento === "Proprietà" ? 'selected' : ''}>Proprietà</option>
                                <option value="Diritto Reale" ${subjects.sa.titolo_godimento === "Diritto Reale" ? 'selected' : ''}>Diritto Reale</option>
                                <option value="Personale di Godimento" ${subjects.sa.titolo_godimento === "Personale di Godimento" ? 'selected' : ''}>Diritto Personale</option>
                            </select>
                        </div>
                    </div>
                    <div class="form-group" id="group-tipo-accesso" style="margin-top: 15px; display: none;">
                        <label>Tipo Accesso al Portale:</label>
                        <select id="inp-tipo-accesso">
                            <option value="Diretto" ${_praticaData.pratica.tipo_accesso === "Diretto" ? 'selected' : ''}>Accesso Diretto</option>
                            <option value="Prenotazione" ${_praticaData.pratica.tipo_accesso === "Prenotazione" ? 'selected' : ''}>Prenotazione</option>
                        </select>
                    </div>
                </section>
                <div id="box-effetto-incentivante" style="margin-bottom: 20px; padding: 15px; background: rgba(255,193,7,0.1); border: 1px solid #ffc107; border-radius: 4px; display: none;">
                    <h4 style="margin-top: 0; color: #856404;">Effetto Incentivante</h4>
                    <div class="form-grid">
                        <div class="form-group">
                            <label>Richiesta Preliminare Inviata?</label>
                            <select id="inp-preliminare-inviata">
                                <option value="no" ${_praticaData.pratica.richiestaPreliminareInviata ? '' : 'selected'}>No</option>
                                <option value="si" ${_praticaData.pratica.richiestaPreliminareInviata ? 'selected' : ''}>Sì</option>
                            </select>
                        </div>
                        <div class="form-group">
                            <label>Data Invio Preliminare:</label>
                            <input type="date" id="inp-data-preliminare" value="${_praticaData.pratica.dataRichiestaPreliminare}">
                        </div>
                        <div class="form-group">
                            <label>Data Primo Impegno:</label>
                            <input type="date" id="inp-data-impegno" value="${_praticaData.pratica.dataPrimoImpegno}">
                        </div>
                    </div>
                </div>
                <section class="ruolo-box" style="margin-bottom: 20px; padding: 15px; background: rgba(63, 81, 181, 0.05); border-radius: 8px; border: 1px solid rgba(63, 81, 181, 0.1);">
                    <h4 style="margin-top: 0; color: #3f51b5; border-bottom: 1px solid #3f51b5; padding-bottom: 5px;">Soggetto Responsabile (SR)</h4>
                    <div class="form-group checkbox-group">
                        <input type="checkbox" id="chk-sr-coincide" ${subjects.sr.coincide_con_sa ? 'checked' : ''}>
                        <label for="chk-sr-coincide">Coincide con SA</label>
                    </div>
                    <div id="box-sr-dettagli" style="display: ${subjects.sr.coincide_con_sa ? 'none' : 'block'}; margin-top:15px;">
                        <div class="form-grid">
                            <div class="form-group"><label>Nome SR:</label><input type="text" id="inp-sr-nome" value="${subjects.sr.denominazione}"></div>
                            <div class="form-group"><label>CF/P.IVA SR:</label><input type="text" id="inp-sr-cf" value="${subjects.sr.cf_piva}"></div>
                        </div>
                    </div>
                    <div class="form-grid" style="margin-top:15px;">
                        <div class="form-group"><label>IBAN:</label><input type="text" id="inp-sr-iban" value="${subjects.sr.iban}"></div>
                        <div class="form-group"><label>PEC:</label><input type="email" id="inp-sr-pec" value="${subjects.sr.pec}"></div>
                    </div>
                </section>
                <section class="ruolo-box" style="margin-bottom: 20px; padding: 15px; background: rgba(63, 81, 181, 0.05); border-radius: 8px; border: 1px solid rgba(63, 81, 181, 0.1);">
                    <h4 style="margin-top: 0; color: #3f51b5; border-bottom: 1px solid #3f51b5; padding-bottom: 5px;">Proprietario / Delegato</h4>
                    <div class="form-group checkbox-group">
                        <input type="checkbox" id="chk-prop-coincide" ${subjects.proprietario.coincide_con_sa ? 'checked' : ''}>
                        <label for="chk-prop-coincide">Proprietario coincide con SA</label>
                    </div>
                    <div id="box-prop-dettagli" style="display: ${subjects.proprietario.coincide_con_sa ? 'none' : 'block'}; margin-top:15px;">
                        <div class="form-group"><label>Nome Proprietario:</label><input type="text" id="inp-prop-nome" value="${subjects.proprietario.denominazione}"></div>
                        <div class="form-group checkbox-group" style="margin-top:10px;"><input type="checkbox" id="chk-prop-assenso" ${subjects.proprietario.atto_assenso ? 'checked' : ''}><label for="chk-prop-assenso">Atto di assenso disponibile</label></div>
                    </div>
                    <div class="form-grid" style="margin-top:15px;">
                        <div class="form-group"><label>Delegato:</label><input type="text" id="inp-delegato-nome" value="${subjects.delegato.nome}"></div>
                        <div class="form-group"><label>CF Delegato:</label><input type="text" id="inp-delegato-cf" value="${subjects.delegato.cf}"></div>
                    </div>
                </section>
            </div>
        `;
        container.innerHTML = html;
        const inpTipo = document.getElementById("inp-tipo-soggetto");
        const updateVisibility = () => {
            document.getElementById("box-effetto-incentivante").style.display = (inpTipo.value === "Impresa" || inpTipo.value === "ETS economico") ? "block" : "none";
            document.getElementById("group-tipo-accesso").style.display = (inpTipo.value === "Pubblica Amministrazione" || inpTipo.value === "ESCO (per conto PA)") ? "block" : "none";
        };
        inpTipo.onchange = updateVisibility;
        document.getElementById("chk-sr-coincide").onchange = (e) => document.getElementById("box-sr-dettagli").style.display = e.target.checked ? "none" : "block";
        document.getElementById("chk-prop-coincide").onchange = (e) => document.getElementById("box-prop-dettagli").style.display = e.target.checked ? "none" : "block";
        updateVisibility();
    };

    const _handleStep1Next = function() {
        const getVal = (id) => document.getElementById(id)?.value || "";
        const isChecked = (id) => document.getElementById(id)?.checked || false;
        const s = _praticaData.soggetti;
        s.sa.tipo = getVal("inp-tipo-soggetto");
        s.sa.denominazione = getVal("inp-nome");
        s.sa.cf_piva = getVal("inp-cf").trim().toUpperCase();
        s.sa.titolo_godimento = getVal("inp-sa-titolo");
        _praticaData.pratica.tipo_accesso = getVal("inp-tipo-accesso") || "Diretto";
        _praticaData.pratica.richiestaPreliminareInviata = getVal("inp-preliminare-inviata") === "si";
        _praticaData.pratica.dataRichiestaPreliminare = getVal("inp-data-preliminare");
        _praticaData.pratica.dataPrimoImpegno = getVal("inp-data-impegno");
        s.sr.coincide_con_sa = isChecked("chk-sr-coincide");
        s.sr.iban = getVal("inp-sr-iban").trim().toUpperCase();
        s.sr.pec = getVal("inp-sr-pec");
        if (s.sr.coincide_con_sa) { s.sr.denominazione = s.sa.denominazione; s.sr.cf_piva = s.sa.cf_piva; }
        else { s.sr.denominazione = getVal("inp-sr-nome"); s.sr.cf_piva = getVal("inp-sr-cf").toUpperCase(); }
        s.proprietario.coincide_con_sa = isChecked("chk-prop-coincide");
        if (s.proprietario.coincide_con_sa) { s.proprietario.denominazione = s.sa.denominazione; s.proprietario.cf_piva = s.sa.cf_piva; s.proprietario.atto_assenso = true; }
        else { s.proprietario.denominazione = getVal("inp-prop-nome"); s.proprietario.atto_assenso = isChecked("chk-prop-assenso"); }
        s.delegato.nome = getVal("inp-delegato-nome");
        s.delegato.cf = getVal("inp-delegato-cf").toUpperCase();

        // MOD-004: Validazione Ruoli GSE
        const roleValidation = RulesEngine.validateRoles(_praticaData.soggetti);
        if (!roleValidation.success) {
            alert("Errori nei ruoli GSE:\n- " + roleValidation.errors.join("\n- "));
            return;
        }

        _praticaData.validation = RulesEngine.validateAmmissibilita({
            subjectType: s.sa.tipo, category: _praticaData.edificio.categoria_catastale, buildingStatus: "esistente",
            richiestaPreliminareInviata: _praticaData.pratica.richiestaPreliminareInviata,
            dataRichiestaPreliminare: _praticaData.pratica.dataRichiestaPreliminare, dataPrimoImpegno: _praticaData.pratica.dataPrimoImpegno
        });
        _praticaData.validation.subjectInfo = SOGGETTI_CONFIG[s.sa.tipo];
        _goToStep(2);
    };

    /**
     * STATO 2: SCREENING AMMISSIBILITA'
     */
    const _renderStep2_Screening = function() {
        const container = _getDivText();
        const results = _praticaData.validation;
        if (!results) {
            container.innerHTML = `<div class="wizard-step"><h3>Stato 2: Screening Ammissibilità</h3><p class="field-note">Eseguire prima la validazione.</p></div>`;
            return;
        }
        const html = `
            <div class="wizard-step">
                <h3>Stato 2: Screening Ammissibilità</h3>
                <div class="result-box ${results.success ? 'success' : 'error'}">
                    <p>${results.message || (results.success ? 'Pratica ammissibile.' : 'Pratica non ammissibile.')}</p>
                    ${results.success ? `<div class="tags-container">${results.validTitles.map(t => `<span class="tag success">Titolo ${t}</span>`).join(' ')}</div>` : `<ul>${results.errors.map(e => `<li>${e}</li>`).join('')}</ul>`}
                </div>
            </div>
        `;
        container.innerHTML = html;
    };

    /**
     * STATO 3: CONFIGURAZIONE PROGETTO
     */
    const _renderStep3_Configurazione = function() {
        const container = _getDivText();
        const catalog = INTERVENTI;
        const validTitles = _praticaData.validation.validTitles;
        container.innerHTML = `
            <div class="wizard-step">
                <h3>Stato 3: Configurazione Progetto</h3>
                <div class="config-layout" style="display: grid; grid-template-columns: 350px 1fr; gap: 20px; align-items: stretch; margin-top: 20px;">
                    <aside class="interv-sidebar">
                        <h4>1. Selezione Interventi</h4>
                        <div id="box-interventi-list" style="display: flex; flex-direction: column; gap: 10px;"></div>
                    </aside>
                    <main class="tech-data-main">
                        <h4>2. Dati Tecnici</h4>
                        <div id="box-tech-forms"><p class="field-note">Seleziona uno o più interventi a sinistra.</p></div>
                    </main>
                </div>
            </div>
        `;
        const listContainer = document.getElementById("box-interventi-list");
        const formsContainer = document.getElementById("box-tech-forms");

        Object.entries(catalog).forEach(([code, info]) => {
            const isCompatible = RulesEngine.getInterventoCompatibility(code, validTitles);
            const isSelected = _praticaData.interventi.includes(code);
            
            const btn = document.createElement("div");
            btn.className = `intervento-card ${isCompatible.isCompatible ? '' : 'incompatible'} ${isSelected ? 'selected' : ''}`;
            
            btn.innerHTML = `
                <div class="card-header">
                    <input type="checkbox" ${isSelected ? 'checked' : ''} ${isCompatible.isCompatible ? '' : 'disabled'}>
                    <strong>${code}</strong>
                </div>
                <div style="font-size: 0.85em; margin-top:4px;">${info.nome}</div>
                ${!isCompatible.isCompatible ? `<div class="incompatibility-msg">${isCompatible.reason}</div>` : ''}
            `;

            if (isCompatible.isCompatible) {
                btn.onclick = (e) => {
                    const chk = btn.querySelector("input");
                    if (e.target !== chk) chk.checked = !chk.checked;
                    btn.classList.toggle("selected", chk.checked);
                    
                    if (chk.checked) { if (!_praticaData.interventi.includes(code)) _praticaData.interventi.push(code); }
                    else { _praticaData.interventi = _praticaData.interventi.filter(c => c !== code); }
                    _refreshTechForms();
                };
            }
            listContainer.appendChild(btn);
        });

        const _refreshTechForms = () => {
            const selected = _praticaData.interventi;
            if (selected.length === 0) { formsContainer.innerHTML = '<p class="field-note">Nessun intervento selezionato.</p>'; return; }
            formsContainer.innerHTML = selected.map(code => {
                const scheda = SCHEDE_TECNICHE[code]; if (!scheda) return `<div class="error">Scheda tecnica non trovata per ${code}</div>`;
                const currentData = _praticaData.valori_campi[code] || {};
                const fieldsHtml = scheda.campi.filter(f => f.categoria === "tecnico").map(f => {
                    const val = currentData[f.id] || "";
                    let inputHtml = f.tipo === "select" ? `<select class="inp-tech-auto" data-code="${code}" data-id="${f.id}">${f.opzioni.map(o => `<option value="${o}" ${o === val ? 'selected' : ''}>${o}</option>`).join('')}</select>` : `<input type="${f.tipo}" class="inp-tech-auto" data-code="${code}" data-id="${f.id}" value="${val}" step="any" placeholder="${f.unita || ''}">`;
                    return `<div class="form-group"><label>${f.label} ${f.unita ? `(${f.unita})` : ''}:</label>${inputHtml}</div>`;
                }).join('');
                return `
                    <div class="form-section">
                        <h5>Configurazione ${code}</h5>
                        <div class="form-grid">${fieldsHtml}</div>
                    </div>
                `;
            }).join('');
            formsContainer.querySelectorAll(".inp-tech-auto").forEach(inp => inp.onchange = (e) => {
                const code = e.target.getAttribute("data-code"), id = e.target.getAttribute("data-id");
                if (!_praticaData.valori_campi[code]) _praticaData.valori_campi[code] = {};
                _praticaData.valori_campi[code][id] = e.target.value;
            });
        };
        _refreshTechForms();
    };

    const _handleStep3Next = function() {
        if (_praticaData.interventi.length === 0) { alert("Seleziona almeno un intervento."); return; }
        const crossRes = CrossRuleEngine.validateSelection(_praticaData.interventi, _praticaData.valori_campi);
        if (!crossRes.success) { alert(`VINCOLO NORMATIVO:\n${crossRes.error}`); return; }
        _goToStep(4);
    };

    /**
     * STATO 4: VERIFICA CONFORMITA' E ECONOMICO
     */
    const _renderStep4_Conformita = function() {
        const container = _getDivText();
        if (!_praticaData.preventivo) _praticaData.preventivo = { items: [], totals: {} };
        if (_praticaData.preventivo.items.length === 0) {
            _praticaData.interventi.forEach(code => {
                const techData = _praticaData.valori_campi[code] || {};
                const suggestions = PreventivoManager.getSuggestedItems(code, techData);
                _praticaData.preventivo.items.push(...suggestions);
            });
        }
        const items = _praticaData.preventivo.items;
        const totals = PreventivoManager.calculateTotals(items);
        _praticaData.preventivo.totals = totals;
        const postData = _praticaData.postOperam || { efficienza: "standard", rinnovabili: false };

        const html = `
            <div class="wizard-step">
                <h3>Stato 4: Verifica Conformità e Quadro Economico</h3>
                <div class="conformita-layout" style="display: grid; grid-template-columns: 1fr 350px; gap: 30px;">
                    <section class="budget-area">
                        <h4>1. Analisi Economica</h4><div id="preventivo-list"></div><button id="btn-add-item" class="sec-btn" style="margin-top: 10px;">+ Aggiungi Voce</button>
                        <div class="totale-box" style="margin-top: 20px; text-align: right; font-size: 1.2em;">TOTALE: <strong id="overall-total">${PreventivoManager.formatCurrency(totals.overall)}</strong></div>
                    </section>
                    <aside class="post-operam-area" style="background: rgba(63, 81, 181, 0.05); padding: 20px; border-radius: 8px;">
                        <h4>2. Requisiti Post-Operam</h4>
                        <div class="form-group"><label>Efficienza:</label><select id="inp-post-eff" style="width: 100%;"><option value="standard" ${postData.efficienza === 'standard' ? 'selected' : ''}>Standard</option><option value="plus" ${postData.efficienza === 'plus' ? 'selected' : ''}>Alta (+Bonus)</option><option value="nzeb" ${postData.efficienza === 'nzeb' ? 'selected' : ''}>nZEB</option></select></div>
                        <div class="form-group checkbox-group" style="margin-top: 15px;"><input type="checkbox" id="inp-post-rinn" ${postData.rinnovabili ? 'checked' : ''}><label for="inp-post-rinn">Rinnovabili</label></div>
                    </aside>
                </div>
            </div>
        `;
        container.innerHTML = html;
        const list = document.getElementById("preventivo-list");
        const refreshList = () => {
            list.innerHTML = _praticaData.preventivo.items.map((item, index) => `
                <div class="preventivo-entry" data-index="${index}">
                    <div style="display:flex; justify-content:space-between; margin-bottom: 5px;">
                        <strong>${item.codice_intervento}</strong>
                        <button class="btn-del-item" data-index="${index}" style="color:red; background:none; border:none; cursor:pointer;">&times;</button>
                    </div>
                    <div class="form-grid">
                        <div class="form-group" style="grid-column: span 2;">
                            <input type="text" class="inp-desc" value="${item.descrizione || ''}" placeholder="Descrizione spesa">
                        </div>
                        <div class="form-group">
                            <input type="number" class="inp-importo" value="${item.importo}" step="0.01" placeholder="Importo (€)">
                        </div>
                        <div class="form-group">
                            <input type="number" class="inp-quantita" value="${item.quantita}" placeholder="Quantità">
                        </div>
                    </div>
                </div>
            `).join('');
            list.querySelectorAll(".inp-desc, .inp-importo, .inp-quantita").forEach(inp => inp.onchange = (e) => {
                const idx = e.target.closest(".preventivo-entry").dataset.index;
                const item = _praticaData.preventivo.items[idx];
                if (e.target.classList.contains("inp-desc")) item.descrizione = e.target.value;
                if (e.target.classList.contains("inp-importo")) item.importo = parseFloat(e.target.value) || 0;
                if (e.target.classList.contains("inp-quantita")) item.quantita = parseFloat(e.target.value) || 0;
                const t = PreventivoManager.calculateTotals(_praticaData.preventivo.items);
                document.getElementById("overall-total").innerText = PreventivoManager.formatCurrency(t.overall);
            });
            list.querySelectorAll(".btn-del-item").forEach(btn => btn.onclick = () => { _praticaData.preventivo.items.splice(btn.dataset.index, 1); refreshList(); });
        };
        refreshList();
        document.getElementById("btn-add-item").onclick = () => { _praticaData.preventivo.items.push(PreventivoManager.createCustomItem("Nuova voce", "altro", 0)); refreshList(); };
    };

    const _handleStep4Next = function() {
        _praticaData.postOperam = { efficienza: document.getElementById("inp-post-eff").value, rinnovabili: document.getElementById("inp-post-rinn").checked };
        _praticaData.preventivo.totals = PreventivoManager.calculateTotals(_praticaData.preventivo.items);
        _goToStep(5);
    };

    /**
     * STATO 5: EROGAZIONE E CHIUSURA
     */
    const _renderStep5_Erogazione = function() {
        const winId = "win-wizard-risultati";
        let win = UaWindowAdm.get(winId) || UaWindowAdm.create(winId);
        win.addClassStyle("ua-modal-window").setStyle({ minWidth: "800px" }).setXY(10, 10).setZ(1200).drag();
        const isDark = document.body.classList.contains("dark-theme");
        win.removeClassStyle("dark-theme").removeClassStyle("light-theme").addClassStyle(isDark ? "dark-theme" : "light-theme");

        let totaleIncentivo = 0;
        const resultsHtml = _praticaData.interventi.map(code => {
            const res = FormulaEngine.calculate(code, _praticaData.valori_campi[code] || {}, { zonaClimatica: _praticaData.edificio.zona_climatica });
            totaleIncentivo += res.amount;
            return `<div class="result-item" style="margin-bottom: 10px; padding: 10px; border-left: 4px solid #3f51b5; background: rgba(0,0,0,0.02);"><strong>${code}</strong>: <span class="${res.isBlocked ? 'calc-error' : 'calc-success'}">${res.isBlocked ? 'BLOCCATO' : PreventivoManager.formatCurrency(res.amount)}</span>${res.isBlocked ? `<br><small class="calc-error">${res.errors.join(', ')}</small>` : ''}</div>`;
        }).join('');

        const rel = ReliabilityEngine.calculateReliability(_praticaData.valori_campi, _praticaData.documentiStatus);
        const isSingle = totaleIncentivo <= 15000;
        const years = totaleIncentivo > 15000 ? 5 : 1;

        win.setHtml(`
            <div class="window-header"><span class="title">Stato 5: Erogazione e Chiusura</span><div class="header-actions"><button id="btn-wiz-preview-report" class="cmd-btn">Report</button><button id="btn-wiz-calcoli" class="sec-btn">Calcoli</button><button id="btn-wiz-archive" class="cmd-btn green">Archivia</button></div><button class="win-close-btn">×</button></div>
            <div class="window-body">
                <div class="reliability-banner"><strong>Affidabilità Dati: ${rel.label}</strong> (Score: ${rel.score.toFixed(2)})</div>
                <div class="summary-grid" style="display: grid; grid-template-columns: 1fr 1fr; gap: 24px;">
                    <section><h4>Riepilogo Incentivi</h4>${resultsHtml}<div class="totale-box" style="margin-top: 15px; font-size: 1.2em; border-top: 2px solid #3f51b5; padding-top: 10px;"><strong>TOTALE: ${PreventivoManager.formatCurrency(totaleIncentivo)}</strong></div><div class="payment-plan-box" style="margin-top: 15px; padding: 10px; background: rgba(63,81,181,0.05); border: 1px solid #3f51b5;">Modalità: <strong>${isSingle ? 'Rata Unica' : `Erogazione in ${years} anni`}</strong><br>Importo: <strong>${PreventivoManager.formatCurrency(totaleIncentivo / years)}</strong></div></section>
                    <section><h4>Checklist Documentale</h4>${_getChecklistHtml()}</section>
                </div>
            </div>
        `).show();

        const dom = win.getElement();
        dom.querySelector(".win-close-btn").onclick = () => { win.close(); api.showHome(); };
        dom.querySelector("#btn-wiz-preview-report").onclick = () => _showReportPreview();
        dom.querySelector("#btn-wiz-calcoli").onclick = () => _showCalculationDetails();
        dom.querySelector("#btn-wiz-archive").onclick = () => _archivePratica();
        dom.querySelectorAll(".chk-doc-verify").forEach(chk => chk.onchange = (e) => { _praticaData.documentiStatus[e.target.dataset.doc] = e.target.checked ? "verificato" : "mancante"; _renderStep5_Erogazione(); });
        api.showHome();
    };

    const _archivePratica = async function() {
        // Suggeriamo il nome esistente
        const currentNome = _praticaData.pratica.nome || _praticaData.nome || "";
        const saDenominazione = _praticaData.soggetti.sa.denominazione || "nuova";
        const defaultName = currentNome || `Pratica_${saDenominazione.replace(/\s+/g, '_')}`;
        const nomePratica = await prompt("Inserisci un nome per identificare questa pratica:", defaultName);
        
        if (!nomePratica) {
            return;
        }

        try {
            // Se il nome è cambiato o non esiste un ID valido, generiamo un nuovo ID
            const isNewName = nomePratica !== currentNome;
            const id = (isNewName || !_praticaData.pratica.id || !_praticaData.pratica.id.startsWith("PRATICA_")) 
                       ? `PRATICA_${Date.now()}` 
                       : _praticaData.pratica.id;

            const dataToSave = {
                id: id,
                nome: nomePratica,
                dataCrea: isNewName ? new Date().toISOString() : (_praticaData.pratica.data_creazione || new Date().toISOString()),
                dati: JSON.parse(JSON.stringify(_praticaData))
            };

            await praticheMgr.save(dataToSave);
            
            // Aggiorniamo lo stato locale con il nome e ID (nuovi o aggiornati)
            _praticaData.pratica.id = id;
            _praticaData.pratica.nome = nomePratica;
            _praticaData.nome = nomePratica; // Per compatibilità temporanea

            const btn = document.getElementById("btn-wiz-archive");
            if (btn) {
                btn.disabled = true;
                btn.innerText = "Pratica Archiviata";
            }
        } catch (error) {
            console.error("_archivePratica: Errore nel salvataggio", error);
        }
    };

    /**
     * Gestisce il salvataggio della sintesi, permettendo di scegliere la cartella (se supportato).
     * @private
     */
    const _exportPraticaTxt = function(dati) {
        if (!dati) dati = _praticaData;
        const sogg = dati.soggetti || {};
        const lines = [];

        lines.push("=".repeat(60));
        lines.push("  REPORT DETTAGLIATO PRATICA");
        lines.push("=".repeat(60));
        lines.push("");
        lines.push("DATI GENERALI");
        lines.push("-".repeat(40));
        lines.push(`  ID:              ${dati.pratica?.id || "N/D"}`);
        lines.push(`  Nome:            ${dati.pratica?.nome || dati.nome || ""}`);
        lines.push(`  Data creazione:  ${dati.pratica?.data_creazione || ""}`);
        lines.push(`  Stato:           ${dati.pratica?.status || "N/D"}`);
        if (dati.pratica?.richiestaPreliminareInviata) {
            lines.push(`  Rich. Preliminare: Sì (${dati.pratica.dataRichiestaPreliminare || ""})`);
            lines.push(`  Primo impegno:     ${dati.pratica.dataPrimoImpegno || ""}`);
        }
        lines.push("");

        lines.push("EDIFICIO");
        lines.push("-".repeat(40));
        const ed = dati.edificio || {};
        lines.push(`  Indirizzo:             ${ed.indirizzo || "N/D"}`);
        lines.push(`  Categoria catastale:   ${ed.categoria_catastale || "N/D"}`);
        lines.push(`  Zona climatica:        ${ed.zona_climatica || "N/D"}`);
        lines.push(`  Potenza esistente kW:  ${ed.potenza_esistente_kw || 0}`);
        lines.push(`  Combustibile ante:     ${ed.combustibile_ante || "N/D"}`);
        lines.push("");

        lines.push("SOGGETTI");
        lines.push("-".repeat(40));
        for (const [ruolo, info] of Object.entries(sogg)) {
            if (!info || (!info.denominazione && !info.nome)) continue;
            lines.push(`  ${ruolo.toUpperCase()}:`);
            for (const [k, v] of Object.entries(info)) {
                if (v) lines.push(`    ${k}: ${v}`);
            }
        }
        lines.push("");

        const interventi = dati.interventi || [];
        const vc = dati.valori_campi || {};
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

        if (dati.postOperam) {
            lines.push("POST OPERAM");
            lines.push("-".repeat(40));
            for (const [code, vals] of Object.entries(dati.postOperam)) {
                if (!vals) continue;
                lines.push(`  ${code}:`);
                for (const [k, v] of Object.entries(vals)) {
                    if (v !== null && v !== undefined) lines.push(`    ${k}: ${v}`);
                }
            }
            lines.push("");
        }

        const prev = dati.preventivo || {};
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

        if (dati.documentiStatus) {
            lines.push("DOCUMENTI");
            lines.push("-".repeat(40));
            for (const [nome, status] of Object.entries(dati.documentiStatus)) {
                lines.push(`  ${status ? "[OK]" : "[  ]"} ${nome}`);
            }
            lines.push("");
        }

        if (dati.validation) {
            lines.push("VALIDAZIONE");
            lines.push("-".repeat(40));
            const v = dati.validation;
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

        return lines.join("\n");
    };

    const _saveSintesi = async function() {
        const content = _exportPraticaTxt();
        const denom = _praticaData.soggetti?.sa?.denominazione || "pratica";
        const fileName = `${denom.replace(/[^a-zA-Z0-9]/g, "_")}_${new Date().toISOString().slice(0, 10)}.txt`;

        if (window.showSaveFilePicker) {
            try {
                const handle = await window.showSaveFilePicker({
                    suggestedName: fileName,
                    types: [{ description: 'Documento di Testo', accept: { 'text/plain': ['.txt'] } }],
                });
                const writable = await handle.createWritable();
                await writable.write(content);
                await writable.close();
                return;
            } catch (err) {
                if (err.name === 'AbortError') return;
                console.error("_saveSintesi: showSaveFilePicker fallito, uso fallback", err);
            }
        }

        const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = fileName;
        link.click();
    };

    /**
     * Utilizza la funzione di stampa del browser per generare un PDF reale con layout.
     * @private
     */
    const _printSintesi = function() {
        const winId = "win-report-preview";
        const win = UaWindowAdm.get(winId);
        if (!win) {
            return;
        }

        const bodyEl = win.getElement().querySelector(".window-body");
        const printContent = bodyEl.innerHTML;
        const printWindow = window.open('', '_blank');
        
        const docHtml = `
            <html>
                <head>
                    <title>Sintesi Pratica CT 3.0</title>
                    <style>
                        body { font-family: sans-serif; padding: 40px; color: #333; }
                        h1, h2, h3, h4 { color: #3f51b5; }
                        h2 { border-bottom: 2px solid #3f51b5; padding-bottom: 8px; margin-top: 40px; }
                        .report-header { text-align: center; margin-bottom: 30px; border-bottom: 3px solid #3f51b5; padding-bottom: 20px; }
                        .report-section { margin-bottom: 25px; }
                        .report-item { margin-bottom: 25px; padding: 20px; border: 1px solid #eee; border-left: 5px solid #3f51b5; border-radius: 4px; }
                        .data-table { width: 100%; border-collapse: collapse; margin-top: 15px; }
                        .data-table th, .data-table td { padding: 12px; border: 1px solid #eee; text-align: left; }
                        .data-table th { background: #f5f5f5; font-weight: 600; text-transform: uppercase; font-size: 0.85em; }
                        .simple-data-table { width: 100%; border-collapse: collapse; font-size: 0.9em; }
                        .simple-data-table td { padding: 4px 8px; border-bottom: 1px solid #eee; }
                        .field-label { font-weight: 600; color: #666; width: 50%; }
                        .clean-list { list-style: none; padding: 0; margin: 0; font-size: 0.9em; }
                        .clean-list li { margin-bottom: 5px; }
                        .clean-list li:before { content: "• "; color: #3f51b5; font-weight: bold; }
                        .tag { display: inline-block; padding: 4px 8px; background: #e8f5e9; color: #2e7d32; border-radius: 4px; font-size: 0.8em; font-weight: 600; }
                        .nav-actions, .watermark-overlay, button, .header-actions { display: none !important; }
                        .report-grid { display: block; } // Fallback per stampa se grid non supportato bene
                    </style>
                </head>
                <body>
                    ${printContent}
                    <script>
                        setTimeout(() => { window.print(); window.close(); }, 500);
                    </script>
                </body>
            </html>
        `;
        
        printWindow.document.write(docHtml);
        printWindow.document.close();
    };

    /**
     * Visualizza l'anteprima del report finale in una finestra dedicata.
     * @private
     */
    const _showReportPreview = function() {
        const winId = "win-report-preview";
        let win = UaWindowAdm.get(winId);

        if (!win) {
            win = UaWindowAdm.create(winId);
            win.addClassStyle("ua-modal-window");
            win.setStyle({ minWidth: "900px", minHeight: "80vh" });
            win.setXY(5, 5).setZ(1500).drag();
        }

        const isDark = document.body.classList.contains("dark-theme");
        win.removeClassStyle("dark-theme").removeClassStyle("light-theme");
        win.addClassStyle(isDark ? "dark-theme" : "light-theme");

        const dateStr = new Date().toLocaleDateString('it-IT');
        const rel = ReliabilityEngine.calculateReliability(_praticaData.valori_campi, _praticaData.documentiStatus);
        
        // --- HELPER PER ETICHETTE TECNICHE ---
        const getLabel = (code, key) => {
            const scheda = SCHEDE_TECNICHE[code];
            if (!scheda) return key;
            const campo = scheda.campi.find(c => c.id === key);
            return campo ? campo.label : key;
        };

        // --- CALCOLO AGGREGATO PER EXECUTIVE SUMMARY ---
        let totalInvestment = 0;
        let totalBaseIncentive = 0;
        let totalBonuses = 0;
        
        const summaryRows = _praticaData.interventi.map(code => {
            const tech = _praticaData.valori_campi[code] || {};
            const calc = FormulaEngine.calculate(code, tech, { zonaClimatica: _praticaData.edificio.zona_climatica });
            
            // Estrazione Spesa (cerca campo economico nella scheda)
            const scheda = SCHEDE_TECNICHE[code];
            const spesaField = scheda ? scheda.campi.find(c => c.categoria === "economico") : null;
            const spesa = spesaField ? parseFloat(tech[spesaField.id]) || 0 : 0;

            // Estrazione Bonus dai passi del calcolo
            const bonusStep = calc.steps.find(s => s.label === "Bonus");
            const bonus = bonusStep ? bonusStep.value : 0;
            const base = calc.amount - bonus;

            totalInvestment += spesa;
            totalBaseIncentive += base;
            totalBonuses += bonus;

            return `
                <tr>
                    <td><strong>${code}</strong></td>
                    <td style="text-align: right;">${PreventivoManager.formatCurrency(spesa)}</td>
                    <td style="text-align: right;">${PreventivoManager.formatCurrency(base)}</td>
                    <td style="text-align: right; color: #2e7d32;">${bonus > 0 ? `+${PreventivoManager.formatCurrency(bonus)}` : '-'}</td>
                    <td style="text-align: right; font-weight: 700;">${rel.showNumbers ? PreventivoManager.formatCurrency(calc.amount) : "[RISERVATO]"}</td>
                </tr>
            `;
        }).join('');

        // --- GENERAZIONE DETTAGLIO INTERVENTI ---
        let interventiHtml = _praticaData.interventi.map(code => {
            const info = INTERVENTI[code] || {};
            const tech = _praticaData.valori_campi[code] || {};
            const calc = FormulaEngine.calculate(code, tech, { zonaClimatica: _praticaData.edificio.zona_climatica });

            // Dati Tecnici con Label
            const techRows = Object.entries(tech).map(([k, v]) => {
                if (k.startsWith('costo_') || k.startsWith('spesa_')) return ''; // Saltiamo i costi qui
                return `<tr><td class="field-label">${getLabel(code, k)}</td><td>${v}</td></tr>`;
            }).join('');

            // Lavorazioni Comprese
            const lavorazioni = (info.lavorazioni_comprese || []).map(l => `<li>${l}</li>`).join('');
            
            // Vincoli Normativi
            const vincoli = (info.vincoli || []).map(v => `<li>${v}</li>`).join('');

            return `
                <div class="report-item" style="border-left: 5px solid #3f51b5;">
                    <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 15px;">
                        <div>
                            <h3 style="margin: 0; color: #3f51b5;">Intervento ${code}</h3>
                            <div style="font-weight: 600; font-size: 1.1em;">${info.nome}</div>
                        </div>
                        <div class="tag success" style="font-size: 0.8em;">${calc.status}</div>
                    </div>
                    
                    <div class="report-grid" style="display: grid; grid-template-columns: 1fr 1fr; gap: 30px;">
                        <section>
                            <h4 class="section-title">Parametri Tecnici Verificati</h4>
                            <table class="simple-data-table">${techRows}</table>
                        </section>
                        <section>
                            <h4 class="section-title">Lavorazioni Ammesse (D.M. 2025)</h4>
                            <ul class="clean-list">${lavorazioni}</ul>
                        </section>
                    </div>

                    <div style="margin-top: 20px; padding-top: 15px; border-top: 1px dashed #ccc;">
                        <h4 class="section-title">Vincoli e Requisiti Normativi</h4>
                        <ul class="clean-list" style="columns: 2;">${vincoli}</ul>
                    </div>
                </div>
            `;
        }).join('');

        const watermarkHtml = rel.watermark ? `<div class="watermark-overlay" style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%) rotate(-45deg); font-size: 80px; opacity: 0.05; pointer-events: none; white-space: nowrap; color: #d32f2f; font-weight: 900; z-index: 10;">${rel.watermark}</div>` : '';

        const html = `
            <div class="window-header">
                <span class="title">Consulenza Tecnica CT 3.0 - ${_praticaData.soggetti.sa.denominazione}</span>
                <div class="header-actions">
                    <button id="btn-save-report-txt" class="cmd-btn">💾 Esporta Dati</button>
                    <button id="btn-save-report-pdf" class="cmd-btn">🖨️ Stampa Report</button>
                </div>
                <button class="close-btn btn-close-win tt-bottom" data-tt="Chiudi">×</button>
            </div>
            <div class="window-body" style="position: relative; background: #fff; color: #333;">
                ${watermarkHtml}
                
                <header class="report-print-header" style="text-align: center; margin-bottom: 40px; border-bottom: 3px solid #3f51b5; padding-bottom: 20px;">
                    <h1 style="margin: 0; color: #3f51b5; font-size: 2.2em;">REPORT DI ANALISI PRELIMINARE</h1>
                    <div style="text-transform: uppercase; letter-spacing: 2px; font-weight: 600; margin-top: 5px;">Conto Termico 3.0 (D.M. 7 Agosto 2025)</div>
                    <div style="margin-top: 15px; font-size: 0.9em; color: #666;">Data Documento: ${dateStr} | Identificativo: ${_praticaData.pratica.id}</div>
                </header>

                <div class="report-section">
                    <h2 style="border-bottom: 1px solid #3f51b5; padding-bottom: 8px;">1. Riepilogo Economico (Executive Summary)</h2>
                    <table class="data-table" style="margin-top: 15px;">
                        <thead>
                            <tr>
                                <th>Codice Intervento</th>
                                <th style="text-align: right;">Investimento Stimato</th>
                                <th style="text-align: right;">Incentivo Base</th>
                                <th style="text-align: right;">Premialità/Bonus</th>
                                <th style="text-align: right;">Incentivo Finale</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${summaryRows}
                        </tbody>
                        <tfoot>
                            <tr style="background: #f5f5f5; font-size: 1.1em;">
                                <td><strong>TOTALE COMPLESSIVO</strong></td>
                                <td style="text-align: right; font-weight: 700;">${PreventivoManager.formatCurrency(totalInvestment)}</td>
                                <td style="text-align: right;">${PreventivoManager.formatCurrency(totalBaseIncentive)}</td>
                                <td style="text-align: right; color: #2e7d32;">+${PreventivoManager.formatCurrency(totalBonuses)}</td>
                                <td style="text-align: right; font-weight: 800; color: #3f51b5; font-size: 1.2em;">
                                    ${rel.showNumbers ? PreventivoManager.formatCurrency(totalBaseIncentive + totalBonuses) : "[DA VERIFICARE]"}
                                </td>
                            </tr>
                        </tfoot>
                    </table>
                    <div style="margin-top: 10px; font-size: 0.85em; font-style: italic; color: #666;">
                        Grado di affidabilità dei calcoli: <strong>${rel.label}</strong> (Basato sulla documentazione verificata).
                    </div>
                </div>

                <div class="report-section" style="margin-top: 40px;">
                    <h2 style="border-bottom: 1px solid #3f51b5; padding-bottom: 8px;">2. Inquadramento Soggetti e Immobile (GSE Roles)</h2>
                    <div class="report-grid" style="display: grid; grid-template-columns: 1fr 1fr; gap: 30px; margin-top: 15px;">
                        <div style="background: #f9f9f9; padding: 15px; border-radius: 4px;">
                            <h4 style="margin-top: 0; color: #3f51b5;">Dati Pratica</h4>
                            <p style="margin: 5px 0;"><strong>Tipo Accesso:</strong> ${_praticaData.pratica.tipo_accesso || 'Diretto'}</p>
                            <p style="margin: 5px 0;"><strong>Stato Istanza:</strong> ${_praticaData.pratica.status}</p>

                            <h4 style="margin-top: 15px; color: #3f51b5;">Soggetto Ammesso (SA)</h4>
                            <p style="margin: 5px 0;"><strong>Nominativo:</strong> ${_praticaData.soggetti.sa.denominazione}</p>
                            <p style="margin: 5px 0;"><strong>Tipologia:</strong> ${_praticaData.soggetti.sa.tipo}</p>
                            <p style="margin: 5px 0;"><strong>CF/P.IVA:</strong> ${_praticaData.soggetti.sa.cf_piva}</p>
                            <p style="margin: 5px 0;"><strong>Titolo Godimento:</strong> ${_praticaData.soggetti.sa.titolo_godimento}</p>
                            
                            <h4 style="margin-top: 15px; color: #3f51b5;">Soggetto Responsabile (SR)</h4>
                            <p style="margin: 5px 0;"><strong>Nominativo:</strong> ${_praticaData.soggetti.sr.denominazione}</p>
                            <p style="margin: 5px 0;"><strong>CF/P.IVA:</strong> ${_praticaData.soggetti.sr.cf_piva}</p>
                            <p style="margin: 5px 0;"><strong>IBAN:</strong> ${_praticaData.soggetti.sr.iban}</p>
                        </div>
                        <div style="background: #f9f9f9; padding: 15px; border-radius: 4px;">
                            <h4 style="margin-top: 0; color: #3f51b5;">Ubicazione e Catasto</h4>
                            <p style="margin: 5px 0;"><strong>Indirizzo:</strong> ${_praticaData.edificio.indirizzo}</p>
                            <p style="margin: 5px 0;"><strong>Catasto:</strong> ${_praticaData.edificio.categoria_catastale} | Zona: ${_praticaData.edificio.zona_climatica}</p>
                            
                            <h4 style="margin-top: 15px; color: #3f51b5;">Proprietario e Delegato</h4>
                            <p style="margin: 5px 0;"><strong>Proprietario:</strong> ${_praticaData.soggetti.proprietario.denominazione}</p>
                            <p style="margin: 5px 0;"><strong>Assenso:</strong> ${_praticaData.soggetti.proprietario.atto_assenso ? "Sì" : "No"}</p>
                            <p style="margin: 5px 0;"><strong>Delegato:</strong> ${_praticaData.soggetti.delegato?.nome || "Nessuno"}</p>
                        </div>
                    </div>
                </div>

                <div class="report-section" style="margin-top: 40px;">
                    <h2 style="border-bottom: 1px solid #3f51b5; padding-bottom: 8px;">3. Dettaglio Analitico Interventi</h2>
                    <div style="margin-top: 15px;">
                        ${interventiHtml}
                    </div>
                </div>

                <footer class="report-legal-footer" style="margin-top: 50px; padding-top: 20px; border-top: 2px solid #eee; font-size: 0.8em; color: #777; text-align: justify;">
                    <p><strong>DISCLAIMER E NOTE LEGALI:</strong> Il presente Report di Analisi Preliminare è generato dal sistema CT30 Advisor sulla base dei dati tecnici ed economici forniti dall'utente e delle regole applicative del D.M. 7 Agosto 2025 (Conto Termico 3.0). I valori riportati hanno natura puramente indicativa e non costituiscono in alcun modo impegno vincolante al riconoscimento dell'incentivo da parte del GSE (Gestore Servizi Energetici). L'ammissibilità definitiva e l'importo esatto dell'incentivo saranno determinati esclusivamente dal GSE a seguito dell'istruttoria ufficiale della pratica. Si raccomanda la verifica di tutta la documentazione tecnica da parte di un professionista abilitato prima di procedere con l'investimento.</p>
                </footer>
            </div>
        `;

        win.setHtml(html).show();
        
        // Listener interni all'anteprima
        win.getElement().querySelector(".btn-close-win").onclick = () => win.close();
        win.getElement().querySelector("#btn-save-report-txt").onclick = () => _saveSintesi();
        win.getElement().querySelector("#btn-save-report-pdf").onclick = () => _printSintesi();
    };

    /**
     * Visualizza la Dashboard QA con i risultati dei test normativi.
     * @private
     */
    const _showQaDashboard = function() {
        
        const report = QaManager.runAllTests();
        const winId = "win-qa-dashboard";
        let win = UaWindowAdm.get(winId);

        if (!win) {
            win = UaWindowAdm.create(winId);
            win.addClassStyle("ua-modal-window");
            win.setStyle({ minWidth: "800px" });
            win.setXY(12, 12).setZ(1400).drag();
        }

        const isDark = document.body.classList.contains("dark-theme");
        win.removeClassStyle("dark-theme").removeClassStyle("light-theme");
        win.addClassStyle(isDark ? "dark-theme" : "light-theme");

        const resultsHtml = report.results.map(res => {
            const statusIcon = res.success ? "✅" : "❌";
            const statusClass = res.success ? "success" : "error";
            const detailsHtml = res.dettagli.map(d => `<li>${d}</li>`).join('');
            
            const row = `
                <div class="qa-result-item ${statusClass}">
                    <strong>${statusIcon} ${res.id} - ${res.nome}</strong>
                    ${detailsHtml ? `<ul>${detailsHtml}</ul>` : ''}
                </div>
            `;
            return row;
        }).join('');

        const timestamp = new Date(report.timestamp).toLocaleString('it-IT');
        const summaryText = `Test eseguiti: ${report.total} | Superati: ${report.passed} | Falliti: ${report.failed}`;

        const html = `
            <div class="window-header">
                <span class="title">Dashboard Validazione Normativa (QA)</span>
                <div class="header-actions"></div>
                <button class="close-btn btn-close-win tt-bottom" data-tt="Chiudi">×</button>
            </div>
            <div class="window-body">
                <div class="reliability-banner">
                    <strong>Report del ${timestamp}</strong><br>
                    <span>${summaryText}</span>
                </div>
                <div class="qa-results-container" style="max-height: 50vh; overflow-y: auto;">
                    ${resultsHtml}
                </div>
                <div class="nav-actions" style="margin-top: 24px;">
                    <p class="field-note">Questi test confrontano la logica corrente con gli scenari standard definiti dal D.M. 7 agosto 2025.</p>
                </div>
            </div>
        `;

        win.setHtml(html).show();
        win.getElement().querySelector(".btn-close-win").addEventListener("click", () => win.close());
        
    };

    /**
     * Aggiorna lo stato della pratica con validazione.
     * @param {string} newStatus 
     */
    const _updateStatus = function(newStatus) {
        const allowedTransitions = {
            "Bozza": ["Validata"],
            "Validata": ["Bozza", "Documentazione_Pronta"],
            "Documentazione_Pronta": ["Validata", "Archiviata"],
            "Archiviata": ["Inviata_GSE"],
            "Inviata_GSE": ["Incentivata"]
        };

        const current = _praticaData.status;
        if (allowedTransitions[current] && allowedTransitions[current].includes(newStatus)) {
            _praticaData.status = newStatus;
            console.info(`Stato pratica aggiornato: ${current} -> ${newStatus}`);
            return true;
        } else {
            console.warn(`Transizione stato non permessa: ${current} -> ${newStatus}`);
            return false;
        }
    };

    // 3. GESTORI EVENTI (MOD-006)
    // I gestori per gli stati 0-4 sono definiti sopra insieme ai relativi renderers.

    /**
     * Naviga verso uno specifico step del wizard (Workflow a 6 Stati MOD-006).
     * @param {number} stepIndex - Indice dello step (0-5).
     * @private
     */
    const _goToStep = function(stepIndex) {
        _currentStep = stepIndex;
        _clearViewport();
        
        switch(_currentStep) {
            case 0: _renderStep0_CensimentoEdificio(); break;
            case 1: _renderStep1_RichiestaRuoli(); break;
            case 2: _renderStep2_Screening(); break;
            case 3: _renderStep3_Configurazione(); break;
            case 4: _renderStep4_Conformita(); break;
            case 5: _renderStep5_Erogazione(); break;
        }

        // Aggiorna navigazione globale
        _updateNavState(true);

        // Configura i listener globali per questo step specifico
        if (_btnNextGlobal) {
            _btnNextGlobal.onclick = null; // Reset precedente
            
            // Mappatura azioni next (Nuova numerazione MOD-006)
            switch(_currentStep) {
                case 0: _btnNextGlobal.onclick = _handleStep0Next; break;
                case 1: _btnNextGlobal.onclick = _handleStep1Next; break;
                case 2: _btnNextGlobal.onclick = () => _goToStep(3); break;
                case 3: _btnNextGlobal.onclick = _handleStep3Next; break;
                case 4: _btnNextGlobal.onclick = _handleStep4Next; break;
            }
        }

        if (_btnPrevGlobal) {
            _btnPrevGlobal.onclick = null;
            
            // Mappatura azioni prev
            switch(_currentStep) {
                case 1: _btnPrevGlobal.onclick = () => _goToStep(0); break;
                case 2: _btnPrevGlobal.onclick = () => _goToStep(1); break;
                case 3: _btnPrevGlobal.onclick = () => _goToStep(2); break;
                case 4: _btnPrevGlobal.onclick = () => _goToStep(3); break;
                case 5: _btnPrevGlobal.onclick = () => _goToStep(4); break;
            }
        }

        // Fix aggressivo: forziamo lo scroll al termine del ciclo di rendering
        setTimeout(() => {
            const mainWorkArea = document.getElementById('main-work-area');
            if (mainWorkArea) {
                mainWorkArea.scrollTop = 0;
            }
            if (_viewport) {
                _viewport.scrollTop = 0;
            }
        }, 50);
    };

    const api = {
        /**
         * Avvia il wizard dall'inizio.
         */
        start: function() {
            _goToStep(0);
        },

        /**
         * Resetta i dati della pratica corrente.
         */
        reset: function() {
            _praticaData = {
                pratica: {
                    id: _generateTmpId(),
                    codice_pratica: "",
                    status: "Bozza",
                    data_creazione: new Date().toISOString()
                },
                edificio: {
                    id: null,
                    indirizzo: "",
                    categoria_catastale: "",
                    zona_climatica: "Zona E",
                    potenza_esistente_kw: 0,
                    combustibile_ante: ""
                },
                soggetti: {
                    sa: { id: null, denominazione: "", tipo: "", cf_piva: "", titolo_godimento: "Proprietà" },
                    sr: { id: null, denominazione: "", cf_piva: "", iban: "", pec: "", coincide_con_sa: true },
                    proprietario: { id: null, denominazione: "", cf_piva: "", coincide_con_sa: true, atto_assenso: false },
                    delegato: { id: null, nome: "", cf: "" }
                },
                interventi: [],
                valori_campi: {},
                preventivo: { items: [], totals: {} },
                documentiStatus: {},
                validation: null,
                postOperam: null
            };
        },

        /**
         * Mostra le regole base in una finestra.
         */
        showRules: function() {
            const rules = RULES;
            const winId = "win-view-rules";
            let win = UaWindowAdm.get(winId);

            if (!win) {
                win = UaWindowAdm.create(winId);
                win.addClassStyle("ua-modal-window");
                win.setStyle({ minWidth: "500px" });
                win.setXY(50, 50).setZ(2000).drag();
            }

            // Sync Tema
            const isDark = document.body.classList.contains("dark-theme");
            win.removeClassStyle("dark-theme").removeClassStyle("light-theme");
            win.addClassStyle(isDark ? "dark-theme" : "light-theme");
            win.setZ(2000); // Forza primo piano

            const climateHtml = Object.entries(rules.fasce_climatiche).map(([name, f]) => {
                return `<li><strong>${name}</strong>: Quf=${f.quf}</li>`;
            }).join('');

            const html = `
                <div class="window-header">
                    <span class="title">Regole Base CT 3.0</span>
                    <div class="header-actions"></div>
                    <button class="close-btn btn-close-win tt-bottom" data-tt="Chiudi">×</button>
                </div>
                <div class="window-body">
                    <div class="summary-section">
                        <h4>Fasce Climatiche</h4>
                        <ul>${climateHtml}</ul>
                        <hr>
                        <p class="small">Dati estratti dalle Regole Applicative D.M. 7 agosto 2025.</p>
                    </div>
                </div>
            `;
            win.setHtml(html).show();
            win.getElement().querySelector(".btn-close-win").addEventListener("click", () => win.close());
        },

        /**
         * Mostra il catalogo interventi in una finestra.
         */
        showCatalog: function() {
            const catalog = INTERVENTI;
            if (!catalog) {
                return;
            }

            const winId = "win-view-catalog";
            let win = UaWindowAdm.get(winId);

            if (!win) {
                win = UaWindowAdm.create(winId);
                win.addClassStyle("ua-modal-window");
                win.setStyle({ minWidth: "600px" });
                win.setXY(80, 80).setZ(2000).drag();
            }

            // Sync Tema e Colori dedicati
            const isDark = document.body.classList.contains("dark-theme");
            win.removeClassStyle("dark-theme").removeClassStyle("light-theme");
            win.addClassStyle(isDark ? "dark-theme" : "light-theme");
            win.setZ(2000);

            const listHtml = Object.entries(catalog).map(([code, info]) => {
                return `
                    <div class="catalog-item">
                        <strong class="title">${code} - ${info.nome}</strong><br>
                        <p class="description">${info.descrizione}</p>
                    </div>
                `;
            }).join('');

            const html = `
                <div class="window-header">
                    <span class="title">Catalogo Interventi</span>
                    <div class="header-actions"></div>
                    <button class="close-btn btn-close-win tt-bottom" data-tt="Chiudi">×</button>
                </div>
                <div class="window-body">
                    <div class="summary-section">
                        ${listHtml}
                    </div>
                </div>
            `;
            win.setHtml(html).show();
            win.getElement().querySelector(".btn-close-win").addEventListener("click", () => win.close());
        },

        /**
         * Visualizza la schermata iniziale nel viewport.
         */
        showHome: function() {
            _clearViewport();
            _updateNavState(false);
            const container = _getDivText();
            container.innerHTML = `
                <div id="welcome-screen">
                    <h2>Conto Termico 3.0</h2>
                </div>
            `;
        },

        /**
         * Carica i dati di una pratica esistente nel wizard.
         * 
         * @param {Object} data - I dati della pratica da caricare.
         */
        loadPratica: function(data) {
            if (!data) {
                console.error("loadPratica: dati non validi.");
                return;
            }
            
            // Ripristino profondo dei dati (clonazione per sicurezza)
            // L'oggetto 'data' contiene il record completo dal DB (id, nome, dati, ecc.)
            const d = JSON.parse(JSON.stringify(data.dati));
            
            // Migrazione verso struttura relazionale (MOD-007)
            _praticaData.pratica = {
                id: data.id || _generateTmpId(),
                codice_pratica: data.codice_pratica || "",
                status: d.status || d.pratica?.status || "Bozza",
                data_creazione: d.data_creazione || new Date().toISOString()
            };

            // Migrazione Edificio
            _praticaData.edificio = d.edificio || {
                indirizzo: d.immobile?.indirizzo || "",
                categoria_catastale: d.immobile?.categoriaCatastale || "",
                zona_climatica: d.immobile?.zonaClimatica || "Zona E",
                potenza_esistente_kw: d.immobile?.potenza_esistente_kw || 0,
                combustibile_ante: d.immobile?.combustibile_ante || ""
            };

            // Migrazione Soggetti (Ruoli) — merge profondo
            const src = d.soggetti || d.ruoli || {};
            _praticaData.soggetti = {
                sa: Object.assign({
                    denominazione: d.anagrafica?.denominazione || "",
                    tipo: d.anagrafica?.tipo || "",
                    cf_piva: d.anagrafica?.codiceFiscale || "",
                    titolo_godimento: "Proprietà"
                }, src.sa || {}),
                sr: Object.assign({
                    denominazione: "", cf_piva: "", iban: "", pec: "", coincide_con_sa: true
                }, src.sr || {}),
                proprietario: Object.assign({
                    denominazione: "", cf_piva: "", coincide_con_sa: true, atto_assenso: false
                }, src.proprietario || {}),
                delegato: Object.assign({ nome: "", cf: "" }, src.delegato || {})
            };

            _praticaData.interventi = d.interventi || d.selectedInterventi || [];
            _praticaData.valori_campi = d.valori_campi || d.interventiData || {};
            _praticaData.preventivo = d.preventivo || { items: [], totals: {} };
            _praticaData.documentiStatus = d.documentiStatus || {};
            _praticaData.postOperam = d.postOperam || null;
            
            console.info(`loadPratica: Caricata pratica ${_praticaData.pratica.id} [Stato: ${_praticaData.pratica.status}]`);
            
            // Avviamo dal primo step per permettere la revisione dei dati
            _goToStep(0);
        },

        /**
         * Carica i dati di una pratica esistente e mostra direttamente la finestra di anteprima report.
         * 
         * @param {Object} data - I dati della pratica da visualizzare.
         */
        showReport: function(data) {
            if (!data) {
                console.error("showReport: dati non validi.");
                return;
            }
            // Carica i dati
            _praticaData = JSON.parse(JSON.stringify(data));
            // Forza il rendering dello step 7 (necessario per inizializzare calcoli e variabili di stato interne)
            _goToStep(7);
            // Chiude la finestra dei risultati (che viene aperta da _goToStep(7)) e apre il report
            const winRes = UaWindowAdm.get("win-wizard-risultati");
            if (winRes) winRes.close();
            
            _showReportPreview();
        },

        exportPraticaTxt: function(dati) {
            return _exportPraticaTxt(dati);
        }
    };

    /**
     * Mostra il dettaglio tecnico dei calcoli eseguiti per ogni intervento.
     * @private
     */
    const _showCalculationDetails = function() {
        const winId = "win-wizard-calcoli";
        let win = UaWindowAdm.get(winId);
        if (!win) {
            win = UaWindowAdm.create(winId);
            win.addClassStyle("ua-modal-window");
            win.setStyle({ minWidth: "900px" });
            win.setXY(5, 5).setZ(2100).drag();
        }

        const isDark = document.body.classList.contains("dark-theme");
        win.removeClassStyle("dark-theme").removeClassStyle("light-theme");
        win.addClassStyle(isDark ? "dark-theme" : "light-theme");

        let contentHtml = "";

        _praticaData.interventi.forEach(code => {
            const dati = _praticaData.valori_campi[code] || {};
            const calc = FormulaEngine.calculate(code, dati, { zonaClimatica: _praticaData.edificio.zona_climatica });
            
            let stepsHtml = "";
            if (calc.steps && calc.steps.length > 0) {
                stepsHtml = `
                    <table class="data-table">
                        <thead>
                            <tr>
                                <th>Descrizione Passaggio</th>
                                <th>Parametro</th>
                                <th>Valori / Operazione</th>
                                <th style="text-align: right;">Risultato Parziale</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${calc.steps.map(s => {
                                const valStr = (typeof s.value === 'number' && s.unit === '€') ? PreventivoManager.formatCurrency(s.value) : `${s.value} ${s.unit || ''}`;
                                return `
                                    <tr>
                                        <td>${s.desc} ${s.detail ? `<br><small class="field-note">${s.detail}</small>` : ''}</td>
                                        <td><strong>${s.label}</strong></td>
                                        <td>${s.calc || s.value}</td>
                                        <td style="text-align: right; font-weight: 600;">${valStr}</td>
                                    </tr>
                                `;
                            }).join('')}
                        </tbody>
                    </table>
                `;
            } else {
                stepsHtml = `<p class="small">Nessun dettaglio disponibile per questo intervento.</p>`;
            }

            contentHtml += `
                <div class="summary-section" style="max-width: 100%; margin-bottom: 32px;">
                    <h3>Intervento ${code}</h3>
                    ${stepsHtml}
                </div>
            `;
        });

        const html = `
            <div class="window-header">
                <span class="title">Dettaglio Tecnico Calcoli e Formule</span>
                <div class="header-actions"></div>
                <button class="close-btn btn-close-win tt-bottom" data-tt="Chiudi">×</button>
            </div>
            <div class="window-body">
                <div class="reliability-banner">
                    <p class="small">In questa finestra sono riportati i passaggi analitici eseguiti dal motore di calcolo basati sul D.M. 7 agosto 2025.</p>
                </div>
                ${contentHtml}
            </div>
        `;

        win.setHtml(html).show();
        win.getElement().querySelectorAll(".btn-close-win").forEach(btn => {
            btn.addEventListener("click", () => win.close());
        });
    };

    return api;
};

export { UaWizardManager };
