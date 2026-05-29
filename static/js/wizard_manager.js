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
        _btnPrevGlobal.style.display = (_currentStep > 0 && _currentStep < 6) ? "block" : "none";

        // Visibilità pulsante Avanti (nascosto se siamo ai risultati finali)
        _btnNextGlobal.style.display = (_currentStep < 6) ? "block" : "none";

        // Caso speciale: Step Ammissibilità (Avanti solo se validato)
        if (_currentStep === 1) {
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
        // Reset e caricamento
        _praticaData = {
            id: _generateTmpId(),
            nome: scenario.nome || "Nuova Pratica Test",
            anagrafica: scenario.soggetto || { tipo: "Privato residenziale", denominazione: "", codiceFiscale: "" },
            immobile: scenario.immobile || { indirizzo: "", zonaClimatica: "Zona E", categoriaCatastale: "A/2", classeEnergeticaAnte: "G" },
            richiestaPreliminareInviata: scenario.richiestaPreliminareInviata || false,
            dataRichiestaPreliminare: scenario.dataRichiestaPreliminare || "",
            dataPrimoImpegno: scenario.dataPrimoImpegno || "",
            selectedInterventi: scenario.selectedInterventi || [],
            interventiData: scenario.interventiData || {},
            preventivo: { items: [], totals: {} },
            documentiStatus: {},
            validation: null,
            postOperam: scenario.postOperam || null
        };

        // Adattamento anagrafica se nel JSON è "soggetto" invece di "anagrafica"
        if (scenario.soggetto && !_praticaData.anagrafica.tipo) {
             _praticaData.anagrafica = { ...scenario.soggetto };
        }

        // Forza validazione ammissibilità per attivare il tasto "Avanti"
        const validationInput = {
            subjectType: _praticaData.anagrafica.tipo,
            category: _praticaData.immobile.categoriaCatastale,
            buildingStatus: "esistente",
            richiestaPreliminareInviata: _praticaData.richiestaPreliminareInviata,
            dataRichiestaPreliminare: _praticaData.dataRichiestaPreliminare,
            dataPrimoImpegno: _praticaData.dataPrimoImpegno
        };
        _praticaData.validation = RulesEngine.validateAmmissibilita(validationInput);
        
        // Ci posizioniamo allo step 0 (Dati Anagrafici) come richiesto
        _goToStep(0);
    };
    
    /**
     * Genera un ID temporaneo per la pratica in corso.
     * @returns {string}
     */
    const _generateTmpId = () => `TMP_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;

    let _praticaData = {
        id: _generateTmpId(),
        anagrafica: { tipo: "", denominazione: "", codiceFiscale: "" },
        immobile: { indirizzo: "", categoriaCatastale: "", zonaClimatica: "Zona E", classeEnergeticaAnte: "G" },
        richiestaPreliminareInviata: false,
        dataRichiestaPreliminare: "",
        dataPrimoImpegno: "",
        selectedInterventi: [],
        interventiData: {},
        preventivo: { items: [], totals: {} },
        documentiStatus: {},
        validation: null,
        postOperam: null
    };

    // Documenti base sempre richiesti
    const BASE_DOCUMENTS = [
        "Documento Identità richiedente",
        "Codice Fiscale / Tessera Sanitaria",
        "Visura Catastale recente (ultimi 6 mesi)",
        "Delega (se soggetto diverso da proprietario)",
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
        
        _praticaData.selectedInterventi.forEach(code => {
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
        const energyClassesMap = CLASSI_ENERGETICHE;

        // Generazione opzioni select (Template Literal Strict)
        const subjectsHtml = subjectTypes.map(t => {
            const isSelected = t === _praticaData.anagrafica.tipo ? 'selected' : '';
            const opt = `<option value="${t}" ${isSelected}>${t}</option>`;
            return opt;
        }).join('');

        const catHtml = Object.entries(catMap).map(([code, info]) => {
            const isSelected = code === _praticaData.immobile.categoriaCatastale ? 'selected' : '';
            const label = `${code} ${info.ambito}`;
            const opt = `<option value="${code}" ${isSelected}>${label}</option>`;
            return opt;
        }).join('');

        const zonesHtml = Object.entries(climateZonesMap).map(([name, info]) => {
            const isSelected = name === _praticaData.immobile.zonaClimatica ? 'selected' : '';
            const label = `${name} - ${info.descrizione}`;
            const opt = `<option value="${name}" ${isSelected}>${label}</option>`;
            return opt;
        }).join('');

        const classesHtml = Object.entries(energyClassesMap).map(([code, info]) => {
            const isSelected = code === _praticaData.immobile.classeEnergeticaAnte ? 'selected' : '';
            const label = `${code} - ${info.descrizione}`;
            const opt = `<option value="${code}" ${isSelected}>${label}</option>`;
            return opt;
        }).join('');

        const nameValue = _praticaData.anagrafica.denominazione;
        const cfValue = _praticaData.anagrafica.codiceFiscale;
        const addrValue = _praticaData.immobile.indirizzo;

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
                        <input type="text" id="inp-nome" value="${nameValue}" placeholder="Cognome Nome o Azienda">
                    </div>
                    <div class="form-group">
                        <label>Codice Fiscale / P.IVA:</label>
                        <input type="text" id="inp-cf" value="${cfValue}" placeholder="CF o Partita IVA">
                    </div>
                    <div class="form-group">
                        <label>Indirizzo Immobile:</label>
                        <input type="text" id="inp-indirizzo" value="${addrValue}" placeholder="Via, Civico, Comune">
                    </div>
                    <div class="form-group">
                        <label>Categoria Catastale:</label>
                        <select id="inp-catasto">${catHtml}</select>
                    </div>
                    <div class="form-group">
                        <label>Zona Climatica:</label>
                        <select id="inp-fascia">${zonesHtml}</select>
                    </div>
                    <div class="form-group">
                        <label>Classe Energetica (Ante):</label>
                        <select id="inp-classe">${classesHtml}</select>
                    </div>
                    </div>

                    <div id="box-effetto-incentivante" style="margin-top: 20px; padding: 15px; background: rgba(255,193,7,0.1); border: 1px solid #ffc107; border-radius: 4px; display: none;">
                    <h4 style="margin-top: 0; color: #856404;">Effetto Incentivante (Obbligatorio per Imprese)</h4>
                    <div class="form-grid">
                        <div class="form-group">
                            <label>Richiesta Preliminare Inviata?</label>
                            <select id="inp-preliminare-inviata">
                                <option value="no" ${_praticaData.richiestaPreliminareInviata ? '' : 'selected'}>No</option>
                                <option value="si" ${_praticaData.richiestaPreliminareInviata ? 'selected' : ''}>Sì</option>
                            </select>
                        </div>
                        <div class="form-group">
                            <label>Data Invio Preliminare:</label>
                            <input type="date" id="inp-data-preliminare" value="${_praticaData.dataRichiestaPreliminare}">
                        </div>
                        <div class="form-group">
                            <label>Data Primo Impegno (Ordine/Contratto):</label>
                            <input type="date" id="inp-data-impegno" value="${_praticaData.dataPrimoImpegno}">
                        </div>
                    </div>
                    <p class="field-note">La Richiesta Preliminare deve essere inviata al GSE prima di assumere impegni vincolanti.</p>
                    </div>
                    </div>
                    `;
                    _viewport.innerHTML = html;

                    // Logica di visibilità condizionale
                    const inpTipo = document.getElementById("inp-tipo-soggetto");
                    const boxEffetto = document.getElementById("box-effetto-incentivante");

                    const updateEffettoVisibility = () => {
                    const tipo = inpTipo.value;
                    if (tipo === "Impresa" || tipo === "ETS economico") {
                    boxEffetto.style.display = "block";
                    } else {
                    boxEffetto.style.display = "none";
                    }
                    };

                    inpTipo.addEventListener("change", updateEffettoVisibility);
                    updateEffettoVisibility(); // Esecuzione iniziale
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
            const isSelected = _praticaData.selectedInterventi.includes(code) ? 'checked' : '';
            
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
        const selected = _praticaData.selectedInterventi;
        const schede = SCHEDE_TECNICHE;

        const sheetsHtml = selected.map(code => {
            const scheda = schede[code];
            if (!scheda) return `<div class="tech-sheet error">Scheda tecnica non trovata per ${code}</div>`;

            const currentData = _praticaData.interventiData[code] || {};

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
        const selected = _praticaData.selectedInterventi || [];
        const techMap = _praticaData.interventiData || {};
        const docStatusMap = _praticaData.documentiStatus || {};

        const resultsHtml = selected.map(code => {
            const dati = techMap[code] || {};
            const res = FormulaEngine.calculate(code, dati, { zonaClimatica: _praticaData.immobile.zonaClimatica });
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

        const html = `
            <div class="window-header">
                <span class="title">Risultati Analisi CT 3.0</span>
                <div class="header-actions">
                    <button id="btn-wiz-preview-report" class="cmd-btn">Report</button>
                    <button id="btn-wiz-calcoli" class="sec-btn">Calcoli</button>
                    <button id="btn-wiz-qa" class="sec-btn">Test QA</button>
                    <button id="btn-wiz-archive" class="cmd-btn">Archivia Pratica</button>
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
        const defaultName = _praticaData.nome || `Pratica_${_praticaData.anagrafica.denominazione.replace(/\s+/g, '_')}`;
        const nomePratica = await prompt("Inserisci un nome per identificare questa pratica:", defaultName);
        
        if (!nomePratica) {
            return;
        }

        try {
            // Se il nome è cambiato o non esiste un ID valido, generiamo un nuovo ID
            const isNewName = nomePratica !== _praticaData.nome;
            const id = (isNewName || !_praticaData.id || !_praticaData.id.startsWith("PRATICA_")) 
                       ? `PRATICA_${Date.now()}` 
                       : _praticaData.id;

            const dataToSave = {
                id: id,
                nome: nomePratica,
                dataCrea: isNewName ? new Date().toISOString() : (_praticaData.dataCrea || new Date().toISOString()),
                dati: JSON.parse(JSON.stringify(_praticaData))
            };

            await praticheMgr.save(dataToSave);
            
            // Aggiorniamo lo stato locale con il nome e ID (nuovi o aggiornati)
            _praticaData.id = id;
            _praticaData.nome = nomePratica;

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
        const denom = _praticaData.anagrafica.denominazione;
        const tipo = _praticaData.anagrafica.tipo;
        const cf = _praticaData.anagrafica.codiceFiscale;
        const addr = _praticaData.immobile.indirizzo;
        const cat = _praticaData.immobile.categoriaCatastale;
        const zone = _praticaData.immobile.zonaClimatica;
        const cls = _praticaData.immobile.classeEnergeticaAnte;
        const intervs = _praticaData.selectedInterventi.map(i => `- ${i}`).join('\n');
        const eff = _praticaData.postOperam.efficienza;
        const rinn = _praticaData.postOperam.rinnovabili ? 'Sì' : 'No';

        const content = `SINTESI PRATICA CONTO TERMICO 3.0\n` +
                      `==================================\n\n` +
                      `DATA: ${dateStr}\n` +
                      `SOGGETTO: ${denom} (${tipo})\n` +
                      `CODICE FISCALE/PIVA: ${cf}\n` +
                      `INDIRIZZO: ${addr}\n\n` +
                      `DATI IMMOBILE:\n` +
                      `- Categoria Catastale: ${cat}\n` +
                      `- Zona Climatica: ${zone}\n` +
                      `- Classe Energetica Ante: ${cls}\n\n` +
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
        const rel = ReliabilityEngine.calculateReliability(_praticaData.interventiData, _praticaData.documentiStatus);
        
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
        
        const summaryRows = _praticaData.selectedInterventi.map(code => {
            const tech = _praticaData.interventiData[code] || {};
            const calc = FormulaEngine.calculate(code, tech, { zonaClimatica: _praticaData.immobile.zonaClimatica });
            
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
        let interventiHtml = _praticaData.selectedInterventi.map(code => {
            const info = INTERVENTI[code] || {};
            const tech = _praticaData.interventiData[code] || {};
            const calc = FormulaEngine.calculate(code, tech, { zonaClimatica: _praticaData.immobile.zonaClimatica });

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
                <span class="title">Consulenza Tecnica CT 3.0 - ${_praticaData.anagrafica.denominazione}</span>
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
                    <h2 style="border-bottom: 1px solid #3f51b5; padding-bottom: 8px;">2. Inquadramento Soggetto e Immobile</h2>
                    <div class="report-grid" style="display: grid; grid-template-columns: 1fr 1fr; gap: 30px; margin-top: 15px;">
                        <div style="background: #f9f9f9; padding: 15px; border-radius: 4px;">
                            <h4 style="margin-top: 0;">Soggetto Richiedente</h4>
                            <p style="margin: 5px 0;"><strong>Nominativo:</strong> ${_praticaData.anagrafica.denominazione}</p>
                            <p style="margin: 5px 0;"><strong>Tipologia:</strong> ${_praticaData.anagrafica.tipo}</p>
                            <p style="margin: 5px 0;"><strong>Codice Fiscale:</strong> ${_praticaData.anagrafica.codiceFiscale}</p>
                        </div>
                        <div style="background: #f9f9f9; padding: 15px; border-radius: 4px;">
                            <h4 style="margin-top: 0;">Ubicazione Intervento</h4>
                            <p style="margin: 5px 0;"><strong>Indirizzo:</strong> ${_praticaData.immobile.indirizzo}</p>
                            <p style="margin: 5px 0;"><strong>Dati Catastali:</strong> ${_praticaData.immobile.categoriaCatastale}</p>
                            <p style="margin: 5px 0;"><strong>Zona Climatica:</strong> ${_praticaData.immobile.zonaClimatica} | Classe Ante: ${_praticaData.immobile.classeEnergeticaAnte}</p>
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
     * Valida il formato del Codice Fiscale (semplificato).
     * @param {string} cf - Il codice fiscale da validare.
     * @returns {boolean}
     * @private
     */
    const _validateCF = function(cf) {
        if (!cf) {
            return false;
        }
        const regex = /^[A-Z0-9]{11,16}$/i;
        const isValid = regex.test(cf);
        return isValid;
    };

    // 3. GESTORI EVENTI

    /**
     * Gestisce il salvataggio dei dati dello step Anagrafica/Immobile.
     * @private
     */
    const _handleStepSoggettoNext = function() {
        try {
            const tipo = document.getElementById("inp-tipo-soggetto").value;
            const nome = document.getElementById("inp-nome").value;
            const cf = document.getElementById("inp-cf").value.trim().toUpperCase();
            const indirizzo = document.getElementById("inp-indirizzo").value.trim();
            const catasto = document.getElementById("inp-catasto").value;
            const fascia = document.getElementById("inp-fascia").value;
            const classe = document.getElementById("inp-classe").value;

            // Dati Effetto Incentivante
            const prelimInviata = document.getElementById("inp-preliminare-inviata")?.value === "si";
            const dataPrelim = document.getElementById("inp-data-preliminare")?.value || "";
            const dataImpegno = document.getElementById("inp-data-impegno")?.value || "";

            _praticaData.anagrafica = { tipo, denominazione: nome, codiceFiscale: cf };
            _praticaData.immobile = { indirizzo, categoriaCatastale: catasto, zonaClimatica: fascia, classeEnergeticaAnte: classe };
            
            _praticaData.richiestaPreliminareInviata = prelimInviata;
            _praticaData.dataRichiestaPreliminare = dataPrelim;
            _praticaData.dataPrimoImpegno = dataImpegno;

            // Corrispondenza campi richiesta da RulesEngine
            const validationInput = {
                subjectType: tipo,
                category: catasto,
                buildingStatus: "esistente",
                richiestaPreliminareInviata: prelimInviata,
                dataRichiestaPreliminare: dataPrelim,
                dataPrimoImpegno: dataImpegno
            };

            // Inietta soggettInfo nel wizard per evitare errori futuri
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
            case 1: _renderStepAmmissibilita(); break;
            case 2: _renderStepSelezioneInterventi(); break;
            case 3: _renderStepDatiTecnici(); break;
            case 4: _renderStepEconomico(); break;
            case 5: _renderStepPostOperam(); break;
            case 6: _renderStepRisultati(); break;
        }

        // Aggiorna navigazione globale
        _updateNavState(true);

        // Configura i listener globali per questo step specifico
        if (_btnNextGlobal) {
            _btnNextGlobal.onclick = null; // Reset precedente
            
            // Mappatura azioni next
            switch(_currentStep) {
                case 0: _btnNextGlobal.onclick = _handleStepSoggettoNext; break;
                case 1: _btnNextGlobal.onclick = () => _goToStep(2); break;
                case 2: _btnNextGlobal.onclick = _handleStepSelezioneNext; break;
                case 3: _btnNextGlobal.onclick = _handleStepDatiTecniciNext; break;
                case 4: _btnNextGlobal.onclick = () => {
                    _praticaData.preventivo.totals = PreventivoManager.calculateTotals(_praticaData.preventivo.items);
                    _goToStep(5);
                }; break;
                case 5: _btnNextGlobal.onclick = _handleStepPostOperamNext; break;
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

    /**
     * Step 4: Gestione dei costi e preventivo.
     * Utilizza PreventivoManager per suggerire le voci di spesa.
     * @private
     */
    const _renderStepEconomico = function() {
        if (!_praticaData.preventivo) _praticaData.preventivo = { items: [], totals: {} };

        if (_praticaData.preventivo.items.length === 0) {
            _praticaData.selectedInterventi.forEach(code => {
                const techData = _praticaData.interventiData[code] || {};
                const suggestions = PreventivoManager.getSuggestedItems(code, techData);
                _praticaData.preventivo.items.push(...suggestions);
            });
        }

        const items = _praticaData.preventivo.items;
        const totals = PreventivoManager.calculateTotals(items);

        let itemsHtml = items.map((item, index) => {
            const costTypes = PreventivoManager.getCostTypes();
            const selectedTypes = item.tipo_costo ? (Array.isArray(item.tipo_costo) ? item.tipo_costo : [item.tipo_costo]) : [];
            
            // Ordiniamo i tipi di costo per seguire lo schema richiesto dall'utente:
            // 1. fornitura (R1C1), 2. posa (R1C2)
            // 3. opere_accessorie (R2C1), 4. pratiche (R2C2)
            // 5. documentazione (R3C1)
            return `
                <div class="preventivo-entry" data-index="${index}">
                    <h4>${item.codice_intervento}</h4>
                    <div class="form-grid">
                        <div class="form-group">
                            <label>Descrizione:</label>
                            <input type="text" class="inp-desc" value="${item.descrizione}" style="width: 100%;">
                        </div>
                        <div class="form-group">
                            <label>Dati Economici:</label>
                            <div style="display: flex; gap: 30px; align-items: center; flex: 1;">
                                <div style="display: flex; align-items: center; gap: 10px;">
                                    <span style="font-size: 0.9em; white-space: nowrap;">Importo Unitario:</span>
                                    <input type="number" class="inp-importo" value="${item.importo}" step="0.01" style="width: 100px; text-align: right;">
                                    <span style="font-size: 0.9em;">€</span>
                                </div>
                                <div style="display: flex; align-items: center; gap: 10px;">
                                    <span style="font-size: 0.9em; white-space: nowrap;">Quantità:</span>
                                    <input type="number" class="inp-quantita" value="${item.quantita}" step="1" style="width: 60px; text-align: right;">
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

        _praticaData.selectedInterventi = selected;
        const count = selected.length;
        _goToStep(3);
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

                _praticaData.interventiData[code] = techData;
            });

            _goToStep(4);
        } catch (error) {
            console.error("_handleStepDatiTecniciNext:", error);
        }
    };

    /**
     * Gestisce il salvataggio dei dati dello step Post Operam.
     * @private
     */
    const _handleStepPostOperamNext = function() {
        const eff = document.getElementById("inp-post-eff").value;
        const rinn = document.getElementById("inp-post-rinn").checked;

        _praticaData.postOperam = { efficienza: eff, rinnovabili: rinn };
        _goToStep(6);
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
                id: _generateTmpId(),
                anagrafica: { tipo: "", denominazione: "", codiceFiscale: "" },
                immobile: { indirizzo: "", categoriaCatastale: "", zonaClimatica: "Zona E", classeEnergeticaAnte: "G" },
                selectedInterventi: [],
                interventiData: {},
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
            _praticaData = JSON.parse(JSON.stringify(data.dati));
            
            // Ripristiniamo esplicitamente il nome e l'id della pratica
            _praticaData.nome = data.nome || "";
            _praticaData.id = data.id || "";

            // Assicuriamo l'esistenza della struttura minima (retrocompatibilità)
            _praticaData.interventiData = _praticaData.interventiData || {};
            _praticaData.documentiStatus = _praticaData.documentiStatus || {};
            _praticaData.preventivo = _praticaData.preventivo || { items: [], totals: {} };
            _praticaData.selectedInterventi = _praticaData.selectedInterventi || [];
            
            console.info(`loadPratica: Caricata pratica ${_praticaData.id} con nome ${_praticaData.nome}`);
            
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
            // Forza il rendering dello step 6 (necessario per inizializzare calcoli e variabili di stato interne)
            _goToStep(6);
            // Chiude la finestra dei risultati (che viene aperta da _goToStep(6)) e apre il report
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

        _praticaData.selectedInterventi.forEach(code => {
            const dati = _praticaData.interventiData[code] || {};
            const calc = FormulaEngine.calculate(code, dati, { zonaClimatica: _praticaData.immobile.zonaClimatica });
            
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
