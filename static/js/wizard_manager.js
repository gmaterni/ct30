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
import { RULES, INTERVENTI, CATASTO, SCHEDE_TECNICHE, SOGGETTI_CONFIG, CLASSI_ENERGETICHE } from "./core/normativa.js";
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
        _btnPrevGlobal.style.display = (_currentStep > 0 && _currentStep < 7) ? "block" : "none";

        // Visibilità pulsante Avanti (nascosto se siamo ai risultati finali)
        _btnNextGlobal.style.display = (_currentStep < 7) ? "block" : "none";

        // Caso speciale: Step Ammissibilità (Avanti solo se validato) - Ora Step 2 (MOD-004)
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
        // Inserimento dopo il catalogo
        const catalogGroup = navCommands.querySelectorAll(".cmd-group")[1];
        if (catalogGroup) {
            catalogGroup.parentNode.insertBefore(testSection, catalogGroup.nextSibling);
        } else {
            navCommands.appendChild(testSection);
        }

        const TEST_SCENARIOS_LIST = [
            { file: "data/tests/test_01_pdc_privato.json", label: "Privato - PdC Aria/Acqua" },
            { file: "data/tests/test_02_impresa_grande.json", label: "Impresa - PdC Grande + FV" },
            { file: "data/tests/test_03_isolamento_pareti.json", label: "Privato - Isolamento Pareti" },
            { file: "data/tests/test_04_ricarica_auto.json", label: "Condominio - Ricarica Veicoli" },
            { file: "data/tests/test_05_incentivo_massimo.json", label: "Test 05 - Super Pratica (Incentivo Massimo)" },
            { file: "data/tests/test_06_pratica_reale.json", label: "Test 06 - Pratica Reale (Incentivo Calcolato)" },
            { file: "test/impresa_pdc_fv.json", label: "Impresa - PDC + FV (Legacy)" }
        ];

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
                zona_climatica: scenario.edificio?.zona_climatica || scenario.immobile?.zonaClimatica || "Zona E",
                potenza_esistente_kw: scenario.edificio?.potenza_esistente_kw || scenario.immobile?.potenza_esistente_kw || 0,
                combustibile_ante: scenario.edificio?.combustibile_ante || scenario.immobile?.combustibile_ante || ""
            },
            soggetti: scenario.soggetti || {
                sa: { 
                    denominazione: scenario.soggetto?.denominazione || "", 
                    tipo: scenario.soggetto?.tipo || "Privato residenziale", 
                    cf_piva: scenario.soggetto?.codiceFiscale || "",
                    titolo_godimento: "Proprietà" 
                },
                sr: { 
                    denominazione: scenario.soggetto?.denominazione || "", 
                    cf_piva: scenario.soggetto?.codiceFiscale || "", 
                    iban: "", 
                    pec: "", 
                    coincide_con_sa: true 
                },
                proprietario: { 
                    denominazione: scenario.soggetto?.denominazione || "", 
                    cf_piva: scenario.soggetto?.codiceFiscale || "", 
                    coincide_con_sa: true, 
                    atto_assenso: true 
                },
                delegato: { nome: "", cf: "" }
            },
            interventi: scenario.interventi || scenario.selectedInterventi || [],
            valori_campi: scenario.valori_campi || scenario.interventiData || {},
            preventivo: scenario.preventivo || { items: [], totals: {} },
            documentiStatus: {},
            validation: null,
            postOperam: scenario.postOperam || null
        };
        console.debug("DEBUG _loadScenarioData - Pratica caricata:", _praticaData);
        console.debug("DEBUG _loadScenarioData - Preventivo:", _praticaData.preventivo);
        
        // Forza validazione ammissibilità (adattata al nuovo modello)
        const validationInput = {
            subjectType: _praticaData.soggetti.sa.tipo,
            category: _praticaData.edificio.categoria_catastale,
            buildingStatus: "esistente",
            richiestaPreliminareInviata: scenario.richiestaPreliminareInviata || false,
            dataRichiestaPreliminare: scenario.dataRichiestaPreliminare || "",
            dataPrimoImpegno: scenario.dataPrimoImpegno || ""
        };
        _praticaData.validation = RulesEngine.validateAmmissibilita(validationInput);
        
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
        if (_praticaData.soggetti.proprietario.coincide_con_sa === false) {
            allDocs.push("Atto di Assenso Proprietario");
        }
        if (_praticaData.soggetti.sr.coincide_con_sa === false) {
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
        if (_praticaData.soggetti.sa.tipo === "Condominio") {
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
     * Renderizza lo Step 1: Anagrafica Cliente e Dati Immobile.
     * @private
     */
    const _renderStepSoggetto = function() {
        const container = _getDivText();
        const subjectTypes = RulesEngine.getSubjectTypes();
        const catMap = CATASTO.categorie;
        const climateZonesMap = RULES.fasce_climatiche;

        // Generazione opzioni select
        const subjectsHtml = subjectTypes.map(t => {
            const isSelected = t === _praticaData.soggetti.sa.tipo ? 'selected' : '';
            return `<option value="${t}" ${isSelected}>${t}</option>`;
        }).join('');

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
                <h3>Anagrafica Cliente e Immobile</h3>
                <div class="form-grid">
                    <div class="form-group">
                        <label>Tipo Soggetto:</label>
                        <select id="inp-tipo-soggetto">${subjectsHtml}</select>
                    </div>
                    <div class="form-group">
                        <label>Nominativo/Ragione Soc.:</label>
                        <input type="text" id="inp-nome" value="${_praticaData.soggetti.sa.denominazione}" placeholder="Cognome Nome o Azienda">
                    </div>
                    <div class="form-group">
                        <label>Codice Fiscale / P.IVA:</label>
                        <input type="text" id="inp-cf" value="${_praticaData.soggetti.sa.cf_piva}" placeholder="CF o Partita IVA">
                    </div>
                    <div class="form-group">
                        <label>Indirizzo Immobile:</label>
                        <input type="text" id="inp-indirizzo" value="${_praticaData.edificio.indirizzo}" placeholder="Via, Civico, Comune">
                    </div>
                    <div class="form-group">
                        <label>Categoria Catastale:</label>
                        <select id="inp-catasto">${catHtml}</select>
                    </div>
                    <div class="form-group">
                        <label>Zona Climatica:</label>
                        <select id="inp-fascia">${zonesHtml}</select>
                    </div>
                    <div class="form-group" id="group-tipo-accesso" style="display: none;">
                        <label>Tipo Accesso:</label>
                        <select id="inp-tipo-accesso">
                            <option value="Diretto" ${_praticaData.pratica.tipo_accesso === "Diretto" ? 'selected' : ''}>Accesso Diretto</option>
                            <option value="Prenotazione" ${_praticaData.pratica.tipo_accesso === "Prenotazione" ? 'selected' : ''}>Prenotazione (Solo PA)</option>
                        </select>
                    </div>
                </div>

                <!-- Dati Ante Operam -->
                <div class="ante-operam-section" style="margin-top: 20px; padding: 15px; background: rgba(76, 175, 222, 0.05); border: 1px solid #4caf50; border-radius: 4px;">
                    <h4 style="margin-top: 0; color: #2e7d32;">Dati Impianto Esistente (Obbligatori per ammissibilità)</h4>
                    <div class="form-grid">
                        <div class="form-group">
                            <label>Potenza Generatore Esistente (kW):</label>
                            <input type="number" id="inp-potenza-esistente" value="${_praticaData.edificio.potenza_esistente_kw}" step="0.01" min="0" placeholder="0" style="width: 100%;">
                        </div>
                        <div class="form-group">
                            <label>Combustibile Ante:</label>
                            <select id="inp-combustibile-ante" style="width: 100%;">
                                <option value="" ${_praticaData.edificio.combustibile_ante === "" ? 'selected' : ''}>Non specificato</option>
                                <option value="metano" ${_praticaData.edificio.combustibile_ante === "metano" ? 'selected' : ''}>Metano</option>
                                <option value="gasolio" ${_praticaData.edificio.combustibile_ante === "gasolio" ? 'selected' : ''}>Gasolio</option>
                                <option value="gpl" ${_praticaData.edificio.combustibile_ante === "gpl" ? 'selected' : ''}>GPL</option>
                                <option value="biomassa" ${_praticaData.edificio.combustibile_ante === "biomassa" ? 'selected' : ''}>Biomassa</option>
                                <option value="elettrico" ${_praticaData.edificio.combustibile_ante === "elettrico" ? 'selected' : ''}>Elettrico</option>
                                <option value="altro" ${_praticaData.edificio.combustibile_ante === "altro" ? 'selected' : ''}>Altro</option>
                            </select>
                        </div>
                    </div>
                </div>

                <div id="box-effetto-incentivante" style="margin-top: 20px; padding: 15px; background: rgba(255,193,7,0.1); border: 1px solid #ffc107; border-radius: 4px; display: none;">
                    <h4 style="margin-top: 0; color: #856404;">Effetto Incentivante (Obbligatorio per Imprese)</h4>
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
                            <label>Data Primo Impegno (Ordine/Contratto):</label>
                            <input type="date" id="inp-data-impegno" value="${_praticaData.pratica.dataPrimoImpegno}">
                        </div>
                    </div>
                </div>
            </div>
        `;
        _viewport.innerHTML = html;

        // Logica di visibilità condizionale
        const inpTipo = document.getElementById("inp-tipo-soggetto");
        const boxEffetto = document.getElementById("box-effetto-incentivante");

        const updateEffettoVisibility = () => {
            const tipo = inpTipo.value;
            // Visibilità Effetto Incentivante
            if (tipo === "Impresa" || tipo === "ETS economico") {
                boxEffetto.style.display = "block";
            } else {
                boxEffetto.style.display = "none";
            }

            // Visibilità Tipo Accesso (Solo PA o ESCO)
            const groupAccesso = document.getElementById("group-tipo-accesso");
            if (groupAccesso) {
                if (tipo === "Pubblica Amministrazione" || tipo === "ESCO (per conto PA)") {
                    groupAccesso.style.display = "block";
                } else {
                    groupAccesso.style.display = "none";
                    _praticaData.pratica.tipo_accesso = "Diretto"; // Reset se non PA
                }
            }
        };

        inpTipo.addEventListener("change", updateEffettoVisibility);
        updateEffettoVisibility();
    };


    /**
     * Renderizza lo Step 1: Ruoli GSE (SR, Proprietario, Delegato).
     * @private
     */
    const _renderStepRuoliGSE = function() {
        const container = _getDivText();
        const ruoli = _praticaData.soggetti;

        const html = `
            <div class="wizard-step">
                <h3>Definizione Ruoli GSE</h3>
                <p class="step-intro">Specifica i soggetti coinvolti nella pratica come richiesto dal portale GSE.</p>
                
                <section class="ruolo-box" style="margin-bottom: 20px; padding: 15px; background: rgba(63, 81, 181, 0.05); border-radius: 8px; border: 1px solid rgba(63, 81, 181, 0.1);">
                    <h4 style="margin-top: 0; color: #3f51b5; border-bottom: 1px solid #3f51b5; padding-bottom: 5px;">Soggetto Ammesso (SA)</h4>
                    <p class="field-note">Chi ha la disponibilità dell'immobile (già inserito nello step precedente).</p>
                    <div class="form-grid">
                        <div class="form-group">
                            <label>Titolo di Godimento:</label>
                            <select id="inp-sa-titolo">
                                <option value="Proprietà" ${ruoli.sa.titolo_godimento === "Proprietà" ? 'selected' : ''}>Proprietà / Comproprietà</option>
                                <option value="Diritto Reale" ${ruoli.sa.titolo_godimento === "Diritto Reale" ? 'selected' : ''}>Diritto Reale di Godimento (es. Usufrutto)</option>
                                <option value="Personale di Godimento" ${ruoli.sa.titolo_godimento === "Personale di Godimento" ? 'selected' : ''}>Diritto Personale di Godimento (es. Locazione)</option>
                            </select>
                        </div>
                    </div>
                </section>

                <section class="ruolo-box" style="margin-bottom: 20px; padding: 15px; background: rgba(63, 81, 181, 0.05); border-radius: 8px; border: 1px solid rgba(63, 81, 181, 0.1);">
                    <h4 style="margin-top: 0; color: #3f51b5; border-bottom: 1px solid #3f51b5; padding-bottom: 5px;">Soggetto Responsabile (SR)</h4>
                    <p class="field-note">Chi sostiene le spese e riceve l'incentivo sul proprio IBAN.</p>
                    <div class="form-group checkbox-group" style="margin-bottom: 15px;">
                        <input type="checkbox" id="chk-sr-coincide" ${ruoli.sr.coincide_con_sa ? 'checked' : ''}>
                        <label for="chk-sr-coincide" style="font-weight: 600;">Coincide con il Soggetto Ammesso (SA)</label>
                    </div>
                    
                    <div id="box-sr-dettagli" style="display: ${ruoli.sr.coincide_con_sa ? 'none' : 'block'}; margin-bottom: 15px; padding: 15px; border: 1px dashed #3f51b5; border-radius: 4px;">
                        <div class="form-grid">
                            <div class="form-group">
                                <label>Ragione Sociale/Nome SR:</label>
                                <input type="text" id="inp-sr-nome" value="${ruoli.sr.denominazione}">
                            </div>
                            <div class="form-group">
                                <label>CF/P.IVA SR:</label>
                                <input type="text" id="inp-sr-cf" value="${ruoli.sr.cf_piva}">
                            </div>
                        </div>
                    </div>
                    
                    <div class="form-grid">
                        <div class="form-group">
                            <label>IBAN per accredito:</label>
                            <input type="text" id="inp-sr-iban" value="${ruoli.sr.iban}" placeholder="IT00...">
                        </div>
                        <div class="form-group">
                            <label>PEC di riferimento:</label>
                            <input type="email" id="inp-sr-pec" value="${ruoli.sr.pec}">
                        </div>
                    </div>
                </section>

                <section class="ruolo-box" style="margin-bottom: 20px; padding: 15px; background: rgba(63, 81, 181, 0.05); border-radius: 8px; border: 1px solid rgba(63, 81, 181, 0.1);">
                    <h4 style="margin-top: 0; color: #3f51b5; border-bottom: 1px solid #3f51b5; padding-bottom: 5px;">Proprietario dell'Immobile</h4>
                    <div class="form-group checkbox-group" style="margin-bottom: 15px;">
                        <input type="checkbox" id="chk-prop-coincide" ${ruoli.proprietario.coincide_con_sa ? 'checked' : ''}>
                        <label for="chk-prop-coincide" style="font-weight: 600;">Coincide con il Soggetto Ammesso (SA)</label>
                    </div>
                    
                    <div id="box-prop-dettagli" style="display: ${ruoli.proprietario.coincide_con_sa ? 'none' : 'block'}; margin-bottom: 15px; padding: 15px; border: 1px dashed #3f51b5; border-radius: 4px;">
                        <div class="form-grid">
                            <div class="form-group">
                                <label>Nome/Ragione Sociale Proprietario:</label>
                                <input type="text" id="inp-prop-nome" value="${ruoli.proprietario.denominazione}">
                            </div>
                            <div class="form-group">
                                <label>CF/P.IVA Proprietario:</label>
                                <input type="text" id="inp-prop-cf" value="${ruoli.proprietario.cf_piva}">
                            </div>
                        </div>
                        <div class="form-group checkbox-group" style="margin-top: 15px;">
                            <input type="checkbox" id="chk-prop-assenso" ${ruoli.proprietario.atto_assenso ? 'checked' : ''}>
                            <label for="chk-prop-assenso">Atto di assenso del proprietario disponibile</label>
                        </div>
                    </div>
                </section>

                <section class="ruolo-box" style="padding: 15px; background: rgba(63, 81, 181, 0.05); border-radius: 8px; border: 1px solid rgba(63, 81, 181, 0.1);">
                    <h4 style="margin-top: 0; color: #3f51b5; border-bottom: 1px solid #3f51b5; padding-bottom: 5px;">Soggetto Delegato (Opzionale)</h4>
                    <p class="field-note">Tecnico o consulente delegato alla compilazione dell'istanza.</p>
                    <div class="form-grid">
                        <div class="form-group">
                            <label>Nome Delegato:</label>
                            <input type="text" id="inp-delegato-nome" value="${ruoli.delegato.nome}">
                        </div>
                        <div class="form-group">
                            <label>CF Delegato:</label>
                            <input type="text" id="inp-delegato-cf" value="${ruoli.delegato.cf}">
                        </div>
                    </div>
                </section>
            </div>
        `;

        container.innerHTML = html;

        // Toggle visibilità box SR
        document.getElementById("chk-sr-coincide").addEventListener("change", (e) => {
            document.getElementById("box-sr-dettagli").style.display = e.target.checked ? "none" : "block";
        });

        // Toggle visibilità box Proprietario
        document.getElementById("chk-prop-coincide").addEventListener("change", (e) => {
            document.getElementById("box-prop-dettagli").style.display = e.target.checked ? "none" : "block";
        });
    };

    /**
     * Gestisce il salvataggio dei dati dello step Ruoli GSE.
     * @private
     */
    const _handleStepRuoliGSENext = function() {
        try {
            const getVal = (id) => document.getElementById(id)?.value || "";
            const isChecked = (id) => document.getElementById(id)?.checked || false;

            const ruoli = _praticaData.soggetti;

            // SA
            ruoli.sa.titolo_godimento = getVal("inp-sa-titolo");
            // SA è già popolato dallo step 0 in _praticaData.soggetti.sa

            // SR
            ruoli.sr.coincide_con_sa = isChecked("chk-sr-coincide");
            ruoli.sr.iban = getVal("inp-sr-iban").trim().toUpperCase();
            ruoli.sr.pec = getVal("inp-sr-pec").trim();
            if (ruoli.sr.coincide_con_sa) {
                ruoli.sr.denominazione = ruoli.sa.denominazione;
                ruoli.sr.cf_piva = ruoli.sa.cf_piva;
            } else {
                ruoli.sr.denominazione = getVal("inp-sr-nome").trim();
                ruoli.sr.cf_piva = getVal("inp-sr-cf").trim().toUpperCase();
            }

            // Proprietario
            ruoli.proprietario.coincide_con_sa = isChecked("chk-prop-coincide");
            if (ruoli.proprietario.coincide_con_sa) {
                ruoli.proprietario.denominazione = ruoli.sa.denominazione;
                ruoli.proprietario.cf_piva = ruoli.sa.cf_piva;
                ruoli.proprietario.atto_assenso = true; // Implicito
            } else {
                ruoli.proprietario.denominazione = getVal("inp-prop-nome").trim();
                ruoli.proprietario.cf_piva = getVal("inp-prop-cf").trim().toUpperCase();
                ruoli.proprietario.atto_assenso = isChecked("chk-prop-assenso");
            }

            // Delegato
            ruoli.delegato.nome = getVal("inp-delegato-nome").trim();
            ruoli.delegato.cf = getVal("inp-delegato-cf").trim().toUpperCase();

            // Validazione aggiuntiva Ruoli in RulesEngine (MOD-004)
            const roleValidation = RulesEngine.validateRoles(ruoli);
            if (!roleValidation.success) {
                alert(`ERRORE RUOLI:\n${roleValidation.errors.join("\n")}`);
                return;
            }

            _goToStep(2);
        } catch (error) {
            console.error("_handleStepRuoliGSENext:", error);
        }
    };

    /**
     * Step 2: Validazione Ammissibilità Soggetto/Immobile.
     * Mostra l'esito del RulesEngine prima di procedere.
     * @private
     */
    const _renderStepAmmissibilita = function() {
        const container = _getDivText();
        const results = _praticaData.validation;

        const titoliHtml = results.validTitles.map(t => `<span class="tag success">Titolo ${t}</span>`).join(' ');
        const errorsHtml = results.errors.map(e => `<li>${e}</li>`).join('');
        const subjectInfo = results.subjectInfo || { label: "Non riconosciuto", descrizione: "Il soggetto inserito non corrisponde a nessuna categoria prevista.", alert: null };

        const html = `
            <div class="wizard-step">
                <h3>Verifica Ammissibilità Normativa</h3>
                <div class="result-box ${results.success ? 'success' : 'error'}">
                    <p>${results.message || (results.success ? "Soggetto e immobile ammissibili." : "Verifica non superata.")}</p>
                    ${results.success ? `<div class="tags-container">${titoliHtml}</div>` : `<ul>${errorsHtml}</ul>`}
                </div>

                <div class="summary-section">
                    <h4>Inquadramento Soggetto</h4>
                    <p><strong>${subjectInfo.label}</strong></p>
                    <p class="small">${subjectInfo.descrizione}</p>
                    ${subjectInfo.alert ? `<div class="alert-box warning">${subjectInfo.alert}</div>` : ''}
                </div>
            </div>
        `;
        container.innerHTML = html;
    };

    /**
     * Step 3: Selezione degli Interventi.
     * @private
     */
    const _renderStepSelezioneInterventi = function() {
        const container = _getDivText();
        const catalog = INTERVENTI;
        const validTitles = _praticaData.validation.validTitles;

        const cardsHtml = Object.entries(catalog).map(([code, info]) => {
            const isCompatible = RulesEngine.getInterventoCompatibility(code, validTitles);
            const isSelected = _praticaData.interventi.includes(code) ? 'checked' : '';
            
            const card = `
                <div class="intervento-card ${isCompatible.isCompatible ? '' : 'incompatible'} ${isSelected ? 'selected' : ''}" data-code="${code}">
                    <div class="card-header">
                        <input type="checkbox" id="chk-${code}" ${isSelected} ${isCompatible.isCompatible ? '' : 'disabled'}>
                        <strong>${code} - ${info.nome}</strong>
                    </div>
                    <p class="small">${info.descrizione}</p>
                    ${!isCompatible.isCompatible ? `<p class="incompatibility-msg">${isCompatible.reason}</p>` : ''}
                    ${info.vincolo ? `<div class="vincoli-info">Nota: ${info.vincolo}</div>` : ''}
                </div>
            `;
            return card;
        }).join('');

        const html = `
            <div class="wizard-step">
                <h3>Selezione Interventi</h3>
                <p>Seleziona gli interventi da includere nella pratica. Il sistema verificherà automaticamente i vincoli di traino.</p>
                
                <div class="interventi-grid">
                    ${cardsHtml}
                </div>
            </div>
        `;
        container.innerHTML = html;

        // Listener per selezione visuale
        container.querySelectorAll(".intervento-card").forEach(card => {
            card.onclick = (e) => {
                if (card.classList.contains("incompatible")) return;
                const chk = card.querySelector("input");
                if (e.target !== chk) chk.checked = !chk.checked;
                card.classList.toggle("selected", chk.checked);
            };
        });
    };

    /**
     * Step 4: Inserimento Dati Tecnici e Prestazionali.
     * Genera dinamicamente le schede basandosi su normativa.js.
     * @private
     */
    const _renderStepDatiTecnici = function() {
        const container = _getDivText();
        console.log("DEBUG _renderStepDatiTecnici - praticaData:", _praticaData);
        const selected = _praticaData.interventi;
        if (!selected) {
            console.error("DEBUG - selected è undefined!");
            return;
        }
        const schede = SCHEDE_TECNICHE;

        const sheetsHtml = selected.map(code => {
            const scheda = schede[code];
            if (!scheda) return `<div class="tech-sheet error">Scheda tecnica non trovata per ${code}</div>`;

            const currentData = _praticaData.valori_campi[code] || {};

            const campiHtml = scheda.campi.map(campo => {
                const val = currentData[campo.id] || "";
                let inputHtml = "";

                // Generazione Placeholder Semplificato (Template Literal Strict)
                const unitStr = campo.unita || "";
                let rangeStr = "";
                
                if (campo.min !== undefined && campo.max !== undefined) {
                    rangeStr = `${campo.min} - ${campo.max}`;
                } else if (campo.min !== undefined) {
                    rangeStr = `> ${campo.min}`;
                } else if (campo.max !== undefined) {
                    rangeStr = `< ${campo.max}`;
                }

                let placeholderText = "";
                if (unitStr && rangeStr) {
                    placeholderText = `${unitStr} (${rangeStr})`;
                } else if (rangeStr) {
                    placeholderText = rangeStr;
                } else if (unitStr) {
                    placeholderText = unitStr;
                } else {
                    placeholderText = campo.tipo === "number" ? "Valore" : "Testo";
                }

                if (campo.tipo === "select") {
                    const options = campo.opzioni.map(opt => {
                        const isSelected = opt === val ? 'selected' : '';
                        return `<option value="${opt}" ${isSelected}>${opt}</option>`;
                    }).join('');
                    inputHtml = `<select id="field-${code}-${campo.id}">${options}</select>`;
                } else if (campo.tipo === "number") {
                    inputHtml = `<input type="number" id="field-${code}-${campo.id}" value="${val}" step="any" min="${campo.min || ''}" max="${campo.max || ''}" placeholder="${placeholderText}">`;
                } else {
                    inputHtml = `<input type="text" id="field-${code}-${campo.id}" value="${val}" placeholder="${placeholderText}">`;
                }

                return `
                    <div class="form-group">
                        <label>${campo.label} ${campo.unita ? `(${campo.unita})` : ''}:</label>
                        ${inputHtml}
                    </div>
                `;
            }).join('');

            return `
                <div class="tech-sheet" data-code="${code}">
                    <h4>Intervento ${code} - ${scheda.nome}</h4>
                    <p class="small">${scheda.descrizione}</p>
                    <div class="form-grid">${campiHtml}</div>
                </div>
            `;
        }).join('');

        const html = `
            <div class="wizard-step">
                <h3>Dati Tecnici e Prestazionali</h3>
                <p>Inserisci i parametri tecnici richiesti per il calcolo dell'incentivo.</p>
                <div id="tech-data-container">${sheetsHtml}</div>
            </div>
        `;
        container.innerHTML = html;
    };

    /**
     * Step 5: Post Operam e Configurazioni Finali.
     * @private
     */
    const _renderStepPostOperam = function() {
        const container = _getDivText();
        const data = _praticaData.postOperam || { efficienza: "standard", rinnovabili: false };

        const html = `
            <div class="wizard-step">
                <h3>Configurazione Post-Operam</h3>
                <div class="form-grid">
                    <div class="form-group">
                        <label>Efficienza Energetica:</label>
                        <select id="inp-post-eff">
                            <option value="standard" ${data.efficienza === 'standard' ? 'selected' : ''}>Miglioramento Standard</option>
                            <option value="plus" ${data.efficienza === 'plus' ? 'selected' : ''}>Alta Efficienza (Premialità)</option>
                            <option value="nzeb" ${data.efficienza === 'nzeb' ? 'selected' : ''}>Edificio nZEB</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label>Integrazione Rinnovabili:</label>
                        <input type="checkbox" id="inp-post-rinn" ${data.rinnovabili ? 'checked' : ''} style="width: 20px; height: 20px;">
                    </div>
                </div>
            </div>
        `;
        container.innerHTML = html;
    };

    /**
     * Step 6: Risultati Finali, Report e Archivio.
     * Mostra la sintesi completa in una finestra dedicata.
     * @private
     */
    const _renderStepRisultati = function() {
        const winId = "win-wizard-risultati";
        let win = UaWindowAdm.get(winId);

        if (!win) {
            win = UaWindowAdm.create(winId);
            win.addClassStyle("ua-modal-window");
            win.setStyle({ minWidth: "800px" });
            win.setXY(10, 10).setZ(1200).drag();
        }

        const isDark = document.body.classList.contains("dark-theme");
        win.removeClassStyle("dark-theme").removeClassStyle("light-theme");
        win.addClassStyle(isDark ? "dark-theme" : "light-theme");

        // Calcolo Riepilogo con check sicurezza (Fail Safe)
        let totaleIncentivo = 0;
        const selected = _praticaData.interventi || [];
        const techMap = _praticaData.valori_campi || {};
        const docStatusMap = _praticaData.documentiStatus || {};

        const resultsHtml = selected.map(code => {
            const dati = techMap[code] || {};
            const res = FormulaEngine.calculate(code, dati, { zonaClimatica: _praticaData.edificio.zona_climatica });
            totaleIncentivo += res.amount;
            
            const amountStr = PreventivoManager.formatCurrency(res.amount);
            const statusClass = res.isBlocked ? "calc-error" : "calc-success";

            return `
                <div class="result-item" style="margin-bottom: 10px;">
                    <strong>Intervento ${code}</strong>: 
                    <span class="${statusClass}">${res.isBlocked ? 'BLOCCATO' : amountStr}</span>
                    ${res.isBlocked ? `<br><small class="calc-error">${res.errors.join(', ')}</small>` : ''}
                </div>
            `;
        }).join('');

        const rel = ReliabilityEngine.calculateReliability(techMap, docStatusMap);

        // Calcolo Piano di Erogazione Globale (Soglia 15.000€)
        let paymentPlanHtml = "";
        if (totaleIncentivo > 0) {
            const isSingle = totaleIncentivo <= 15000;
            const years = totaleIncentivo > 15000 ? 5 : 1; // Semplificazione: 5 anni se sopra soglia
            const installment = totaleIncentivo / years;
            
            paymentPlanHtml = `
                <div class="payment-plan-box" style="margin-top: 15px; padding: 12px; background: rgba(63,81,181,0.05); border: 1px solid #3f51b5; border-radius: 4px;">
                    <h5 style="margin-top: 0; color: #3f51b5;">Piano di Erogazione CT 3.0</h5>
                    <p style="margin: 5px 0;">Modalità: <strong>${isSingle ? 'Unica Soluzione' : `Erogazione in ${years} anni`}</strong></p>
                    <p style="margin: 5px 0;">Importo ${isSingle ? 'Totale' : 'Rata Annua'}: <strong>${PreventivoManager.formatCurrency(installment)}</strong></p>
                </div>
            `;
        }

        // Aggiorna automaticamente lo stato se valida (MOD-006)
        if (_praticaData.validation && _praticaData.validation.success && _praticaData.status === "Bozza") {
            _updateStatus("Validata");
        }

        const html = `
            <div class="window-header">
                <span class="title">Risultati Analisi CT 3.0</span>
                <span class="status-badge">Stato: ${_praticaData.status}</span>
                <div class="header-actions">
                    <button id="btn-wiz-preview-report" class="cmd-btn">Report</button>
                    <button id="btn-wiz-calcoli" class="sec-btn">Calcoli</button>
                    <button id="btn-wiz-qa" class="sec-btn">Test QA</button>
                    <button id="btn-wiz-archive" class="cmd-btn" ${(_praticaData.status !== "Validata" && _praticaData.status !== "Documentazione_Pronta") ? 'disabled' : ''}>Archivia Pratica</button>
                </div>
                <button class="close-btn btn-close-win tt-bottom" data-tt="Chiudi">×</button>
            </div>
            <div class="window-body">
                <div class="reliability-banner">
                    <strong>Affidabilità Dati: ${rel.label}</strong> (Score: ${rel.score.toFixed(2)})
                    <p class="small">Il sistema sblocca i valori economici solo con affidabilità Media o superiore.</p>
                </div>

                <div class="summary-grid" style="display: grid; grid-template-columns: 1fr 1fr; gap: 24px;">
                    <section class="summary-section" style="max-width: 100%;">
                        <h4>Sintesi Interventi</h4>
                        ${resultsHtml}
                        <div class="totale-box">
                            <strong>TOTALE INCENTIVO: ${PreventivoManager.formatCurrency(totaleIncentivo)}</strong>
                        </div>
                        ${paymentPlanHtml}
                    </section>

                    <section class="summary-section" style="max-width: 100%;">
                        <h4>Checklist Documentale</h4>
                        <p class="small">Spunta i documenti verificati per sbloccare i valori economici nel report.</p>
                        ${_getChecklistHtml()}
                    </section>
                </div>
            </div>
        `;
        
        win.setHtml(html).show();

        // Listener per la Checklist Documentale (Aggiornamento Chirurgico per evitare scroll jump)
        const checklist = win.getElement().querySelector(".ua-checklist");
        if (checklist) {
            checklist.querySelectorAll(".chk-doc-verify").forEach(chk => {
                chk.addEventListener("change", (e) => {
                    const docName = e.target.getAttribute("data-doc");
                    const isChecked = e.target.checked;
                    const li = e.target.closest("li");
                    
                    // 1. Aggiorna Stato Dati
                    _praticaData.documentiStatus[docName] = isChecked ? "verificato" : "mancante";
                    
                    // 2. Aggiorna UI locale (Sottolineatura e Background)
                    if (isChecked) {
                        li.classList.add("verified");
                    } else {
                        li.classList.remove("verified");
                    }

                    // 3. Aggiornamento Silenzioso Affidabilità (senza ricaricare l'intera win)
                    const rel = ReliabilityEngine.calculateReliability(_praticaData.interventiData, _praticaData.documentiStatus);
                    
                    // Aggiorna Banner se presente
                    const banner = win.getElement().querySelector(".reliability-banner");
                    if (banner) {
                        banner.innerHTML = `
                            <strong>Affidabilità Dati: ${rel.label}</strong> (Score: ${rel.score.toFixed(2)})
                            <p class="small" style="margin:5px 0 0 0;">Il sistema sblocca i valori economici solo con affidabilità Media o superiore.</p>
                        `;
                    }

                    console.info("Checklist: stato aggiornato chirurgicamente.", docName, isChecked);
                });
            });
        }

        win.getElement().querySelector(".btn-close-win").addEventListener("click", () => {
            win.close();
            api.showHome();
        });

        const btnArchive = win.getElement().querySelector("#btn-wiz-archive");
        const btnPreview = win.getElement().querySelector("#btn-wiz-preview-report");

        const btnCalcoli = win.getElement().querySelector("#btn-wiz-calcoli");

        if (btnArchive) {
            btnArchive.addEventListener("click", async () => {
                await _archivePratica();
                win.close();
                api.showHome();
            });
        }

        if (btnCalcoli) {
            btnCalcoli.addEventListener("click", () => {
                _showCalculationDetails();
            });
        }

        if (btnPreview) {
            btnPreview.addEventListener("click", () => {
                _showReportPreview();
            });
        }

        const btnQa = win.getElement().querySelector("#btn-wiz-qa");
        if (btnQa) {
            btnQa.addEventListener("click", () => {
                _showQaDashboard();
            });
        }

        // Torna alla schermata iniziale nel viewport principale, mantenendo aperta la modale risultati
        api.showHome();
    };

    /**
     * Salva la pratica corrente su IndexedDB.
     * @private
     */
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
    const _saveSintesi = async function() {
        const dateStr = new Date().toLocaleString('it-IT');
        const denom = _praticaData.soggetti.sa.denominazione;
        const tipo = _praticaData.soggetti.sa.tipo;
        const cf = _praticaData.soggetti.sa.cf_piva;
        const addr = _praticaData.edificio.indirizzo;
        const cat = _praticaData.edificio.categoria_catastale;
        const zone = _praticaData.edificio.zona_climatica;
        const intervs = _praticaData.interventi.map(i => `- ${i}`).join('\n');
        const eff = _praticaData.postOperam ? _praticaData.postOperam.efficienza : "Standard";
        const rinn = (_praticaData.postOperam && _praticaData.postOperam.rinnovabili) ? 'Sì' : 'No';

        const content = `SINTESI PRATICA CONTO TERMICO 3.0\n` +
                      `==================================\n\n` +
                      `DATA: ${dateStr}\n` +
                      `SOGGETTO: ${denom} (${tipo})\n` +
                      `CODICE FISCALE/PIVA: ${cf}\n` +
                      `INDIRIZZO: ${addr}\n\n` +
                      `DATI IMMOBILE:\n` +
                      `- Categoria Catastale: ${cat}\n` +
                      `- Zona Climatica: ${zone}\n\n` +
                      `INTERVENTI SELEZIONATI:\n` +
                      `${intervs}\n\n` +
                      `CONFIGURAZIONE POST-OPERAM:\n` +
                      `- Efficienza: ${eff}\n` +
                      `- Integrazione Rinnovabili: ${rinn}\n\n` +
                      `----------------------------------\n` +
                      `Generato da CT30 Advisor`;

        const fileName = `Sintesi_Pratica_${cf}.txt`;

        if (window.showSaveFilePicker) {
            try {
                const handle = await window.showSaveFilePicker({
                    suggestedName: fileName,
                    types: [{
                        description: 'Documento di Testo',
                        accept: { 'text/plain': ['.txt'] },
                    }],
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
                    <div style="margin-top: 15px; font-size: 0.9em; color: #666;">Data Documento: ${dateStr} | Identificativo: ${_praticaData.id}</div>
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
                            <p style="margin: 5px 0;"><strong>Stato Istanza:</strong> ${_praticaData.status}</p>

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
                            <p style="margin: 5px 0;"><strong>Delegato:</strong> ${_praticaData.soggetti.delegato.nome || "Nessuno"}</p>
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

    // 3. GESTORI EVENTI

    /**
     * Gestisce il salvataggio dei dati dello step Anagrafica/Immobile.
     * @private
     */
    const _handleStepSoggettoNext = function() {
        try {
            const getVal = (id) => document.getElementById(id)?.value || "";
            
            const tipo = getVal("inp-tipo-soggetto");
            const nome = getVal("inp-nome");
            const cf = getVal("inp-cf").trim().toUpperCase();
            const indirizzo = getVal("inp-indirizzo").trim();
            const catasto = getVal("inp-catasto");
            const fascia = getVal("inp-fascia");
            const potenzaEsistente = getVal("inp-potenza-esistente");
            const combustibile = getVal("inp-combustibile-ante");

            // Tipo Accesso
            const inpAccesso = document.getElementById("inp-tipo-accesso");
            const tipoAccesso = (inpAccesso && inpAccesso.offsetParent !== null) ? inpAccesso.value : "Diretto";

            // Dati Effetto Incentivante
            const prelimInviata = document.getElementById("inp-preliminare-inviata")?.value === "si";
            const dataPrelim = getVal("inp-data-preliminare");
            const dataImpegno = getVal("inp-data-impegno");

            // Popolamento struttura relazionale
            _praticaData.soggetti.sa = { ..._praticaData.soggetti.sa, tipo, denominazione: nome, cf_piva: cf };
            _praticaData.edificio = { 
                ..._praticaData.edificio, 
                indirizzo, 
                categoria_catastale: catasto, 
                zona_climatica: fascia,
                potenza_esistente_kw: parseFloat(potenzaEsistente) || 0,
                combustibile_ante: combustibile
            };
            
            // Richiesta preliminare e Tipo Accesso salvata nel contesto pratica
            _praticaData.pratica.tipo_accesso = tipoAccesso;
            _praticaData.pratica.richiestaPreliminareInviata = prelimInviata;
            _praticaData.pratica.dataRichiestaPreliminare = dataPrelim;
            _praticaData.pratica.dataPrimoImpegno = dataImpegno;

            // Validazione
            const validationInput = {
                subjectType: tipo,
                category: catasto,
                buildingStatus: "esistente",
                richiestaPreliminareInviata: prelimInviata,
                dataRichiestaPreliminare: dataPrelim,
                dataPrimoImpegno: dataImpegno
            };

            const validationResults = RulesEngine.validateAmmissibilita(validationInput);
            validationResults.subjectInfo = SOGGETTI_CONFIG[tipo] || { label: "N/A", descrizione: "N/A" };
            _praticaData.validation = validationResults;

            _goToStep(1);
        } catch (error) {
            console.error("_handleStepSoggettoNext:", error);
        }
    };

    /**
     * Naviga verso uno specifico step del wizard.
     * @param {number} stepIndex - Indice dello step.
     * @private
     */
    const _goToStep = function(stepIndex) {
        _currentStep = stepIndex;
        _clearViewport();
        
        switch(_currentStep) {
            case 0: _renderStepSoggetto(); break;
            case 1: _renderStepRuoliGSE(); break;
            case 2: _renderStepAmmissibilita(); break;
            case 3: _renderStepSelezioneInterventi(); break;
            case 4: _renderStepDatiTecnici(); break;
            case 5: _renderStepEconomico(); break;
            case 6: _renderStepPostOperam(); break;
            case 7: _renderStepRisultati(); break;
        }

        // Aggiorna navigazione globale
        _updateNavState(true);

        // Configura i listener globali per questo step specifico
        if (_btnNextGlobal) {
            _btnNextGlobal.onclick = null; // Reset precedente
            
            // Mappatura azioni next
            switch(_currentStep) {
                case 0: _btnNextGlobal.onclick = _handleStepSoggettoNext; break;
                case 1: _btnNextGlobal.onclick = _handleStepRuoliGSENext; break;
                case 2: _btnNextGlobal.onclick = () => _goToStep(3); break;
                case 3: _btnNextGlobal.onclick = _handleStepSelezioneNext; break;
                case 4: _btnNextGlobal.onclick = _handleStepDatiTecniciNext; break;
                case 5: _btnNextGlobal.onclick = () => {
                    _praticaData.preventivo.totals = PreventivoManager.calculateTotals(_praticaData.preventivo.items);
                    _goToStep(6);
                }; break;
                case 6: _btnNextGlobal.onclick = _handleStepPostOperamNext; break;
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
                case 6: _btnPrevGlobal.onclick = () => _goToStep(5); break;
                case 7: _btnPrevGlobal.onclick = () => _goToStep(6); break;
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

    /**
     * Step 4: Gestione dei costi e preventivo.
     * Utilizza PreventivoManager per suggerire le voci di spesa.
     * @private
     */
    const _renderStepEconomico = function() {
        if (!_praticaData.preventivo) _praticaData.preventivo = { items: [], totals: {} };
        console.log("DEBUG _renderStepEconomico - Preventivo.items:", _praticaData.preventivo.items);

        if (_praticaData.preventivo.items.length === 0) {
            _praticaData.interventi.forEach(code => {
                const techData = _praticaData.valori_campi[code] || {};
                const suggestions = PreventivoManager.getSuggestedItems(code, techData);
                _praticaData.preventivo.items.push(...suggestions);
            });
        }

        const items = _praticaData.preventivo.items;
        console.debug("DEBUG _renderStepEconomico - Items:", items);
        const totals = PreventivoManager.calculateTotals(items);
        console.debug("DEBUG _renderStepEconomico - Totals calcolati:", totals);
        _praticaData.preventivo.totals = totals;

        let itemsHtml = items.map((item, index) => {
            return `
                <div class="preventivo-entry" data-index="${index}">
                    <h4>${item.codice_intervento}</h4>
                    <div class="form-grid">
                        <div class="form-group">
                            <label>Descrizione:</label>
                            <input type="text" class="inp-desc" value="${item.descrizione || ''}" style="width: 100%;">
                        </div>
                        <div class="form-group">
                            <label>Dati Economici:</label>
                            <div style="display: flex; gap: 30px; align-items: center; flex: 1;">
                                <div style="display: flex; align-items: center; gap: 10px;">
                                    <span style="font-size: 0.9em; white-space: nowrap;">Importo Unitario:</span>
                                    <input type="number" class="inp-importo" value="${item.importo || 0}" step="0.01" style="width: 100px; text-align: right;">
                                    <span style="font-size: 0.9em;">€</span>
                                </div>
                                <div style="display: flex; align-items: center; gap: 10px;">
                                    <span style="font-size: 0.9em; white-space: nowrap;">Quantità:</span>
                                    <input type="number" class="inp-quantita" value="${item.quantita || 0}" step="1" style="width: 60px; text-align: right;">
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            `;
        }).join('');

        const html = `
            <div class="wizard-step">
                <h3>Analisi Economica e Preventivo</h3>
                <div id="preventivo-list">
                    ${itemsHtml}
                </div>
                
                <div class="preventivo-total">
                    <label style="font-weight: 700; margin-right: 16px;">TOTALE INVESTIMENTO:</label>
                    <span id="overall-total" style="font-size: 1.6em; font-weight: 800; color: inherit;">${PreventivoManager.formatCurrency(totals.overall)}</span>
                </div>

                <div class="step-actions" style="display: flex; justify-content: flex-end; align-items: center; margin-top: 32px;">
                    <button id="btn-add-custom-item" class="sec-btn">+ Aggiungi Voce</button>
                </div>
            </div>
        `;
        _viewport.innerHTML = html;

        // Listener
        const listContainer = document.getElementById("preventivo-list");

        listContainer.addEventListener("focus", (e) => {
            if (e.target.classList.contains("inp-importo") && e.target.value === "0") {
                e.target.value = "";
            }
            if (e.target.classList.contains("inp-quantita") && e.target.value === "1") {
                e.target.value = "";
            }
        }, true);

        listContainer.addEventListener("input", (e) => {
            const entry = e.target.closest(".preventivo-entry");
            const index = entry.getAttribute("data-index");
            const item = _praticaData.preventivo.items[index];
            if (e.target.classList.contains("inp-desc")) item.descrizione = e.target.value;
            if (e.target.classList.contains("inp-importo")) item.importo = parseFloat(e.target.value) || 0;
            if (e.target.classList.contains("inp-quantita")) item.quantita = parseFloat(e.target.value) || 0;

            const newTotals = PreventivoManager.calculateTotals(_praticaData.preventivo.items);
            document.getElementById("overall-total").innerText = PreventivoManager.formatCurrency(newTotals.overall);
        });

        document.getElementById("btn-add-custom-item").onclick = () => {
            _praticaData.preventivo.items.push(PreventivoManager.createCustomItem("Nuova voce", "altro", 0));
            _renderStepEconomico();
        };
    };

    /**
     * Gestisce il salvataggio della selezione interventi e verifica vincoli base.
     * @private
     */
    const _handleStepSelezioneNext = function() {
        const selected = [];
        document.querySelectorAll(".intervento-card input:checked").forEach(chk => {
            const code = chk.id.replace("chk-", "");
            selected.push(code);
        });

        if (selected.length === 0) {
            alert("Selezionare almeno un intervento.");
            return;
        }

        // Validazione tramite Cross-Rule Engine (Step 2.2 / Task Disaccoppiamento)
        const validation = CrossRuleEngine.validateSelection(selected);
        
        if (!validation.success) {
            const errorMsg = validation.errors.join("\n");
            alert(`VINCOLI NORMATIVI:\n${errorMsg}`);
            return;
        }

        _praticaData.interventi = selected;
        const count = selected.length;
        _goToStep(4);
    };

    /**
     * Gestisce il salvataggio dei dati tecnici degli interventi.
     * @private
     */
    const _handleStepDatiTecniciNext = function() {
        try {
            const schede = SCHEDE_TECNICHE;
            const dataContainer = document.getElementById("tech-data-container");
            const sheetElements = dataContainer.querySelectorAll(".tech-sheet");

            sheetElements.forEach(sheet => {
                const code = sheet.getAttribute("data-code");
                const scheda = schede[code];
                const techData = {};

                if (scheda && scheda.campi) {
                    scheda.campi.forEach(campo => {
                        const input = document.getElementById(`field-${code}-${campo.id}`);
                        if (input) {
                            techData[campo.id] = input.value;
                        }
                    });
                }

                _praticaData.valori_campi[code] = techData;
            });

            // Validazione vincoli tecnici con i dati appena inseriti (MOD-002)
            const selected = _praticaData.interventi || [];
            const interventiData = _praticaData.valori_campi || {};
            
            const validation = CrossRuleEngine.validateSelectionWithData(selected, interventiData);
            
            if (!validation.success) {
                const errorMsg = validation.errors.join("\n");
                alert(`VINCOLI TECNICI:\n${errorMsg}`);
                return;
            }

            _goToStep(5);
        } catch (error) {
            console.error("_handleStepDatiTecniciNext:", error);
        }
    };

    /**
     * Gestisce il salvataggio dei dati dello step Post Operam.
     * @private
     */
    const _handleStepPostOperamNext = function() {
        try {
            const eff = document.getElementById("inp-post-eff")?.value || "standard";
            const rinn = document.getElementById("inp-post-rinn")?.checked || false;

            _praticaData.postOperam = { efficienza: eff, rinnovabili: rinn };
            _goToStep(7);
        } catch (error) {
            console.error("_handleStepPostOperamNext:", error);
        }
    };

    // 4. API PUBBLICA
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

            // Migrazione Soggetti (Ruoli)
            _praticaData.soggetti = d.soggetti || d.ruoli || {
                sa: { denominazione: d.anagrafica?.denominazione || "", tipo: d.anagrafica?.tipo || "", cf_piva: d.anagrafica?.codiceFiscale || "", titolo_godimento: "Proprietà" },
                sr: { denominazione: "", cf_piva: "", iban: "", pec: "", coincide_con_sa: true },
                proprietario: { denominazione: "", cf_piva: "", coincide_con_sa: true, atto_assenso: false },
                delegato: { nome: "", cf: "" }
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
