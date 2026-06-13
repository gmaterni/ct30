/**
 * wizard_manager.js - Gestore del processo guidato (Wizard) a 7 fasi CT3.0.
 *
 * @module  wizard_manager
 * @version 2.0.0
 * @date    2026-06-02
 */

"use strict";

import { RulesEngine } from "./core/rules_engine.js";
import { FormulaEngine } from "./core/formula_engine.js";
import { CrossRuleEngine } from "./core/cross_rule_engine.js";
import { ReliabilityEngine } from "./core/reliability_engine.js";
import { PreventivoManager } from "./core/preventivo_manager.js";
import { UaWindowAdm } from "./ui/lib/uawindow.js";
import { praticheMgr, budgetMgr } from "./infra/idb_mgr.js";
import {
  SOGGETTI_CONFIG,
  MATRICE_SA_INTERVENTI,
  INTERVENTI,
  RULES,
  CATASTO,
  SCHEDE_TECNICHE,
  FORMULE_INCENTIVO,
} from "./core/normativa.js";
import { loadCatalogo } from "./core/catalogo_loader.js";

const STEP_LABELS = [
  "Pratica",
  "Edificio",
  "Anagrafiche",
  "Interventi",
  "Dati Tecnici",
  "Economico",
  "Riepilogo",
];
const MODALITA_ACCESSO = ["diretto", "prenotazione"];
const AMBITO_OPTIONS = ["residenziale", "terziario", "entrambi"];
const ZONE_CLIMATICHE = ["A", "B", "C", "D", "E", "F"];
const TIPO_SOGGETTO_SA = [
  "Pubblica Amministrazione",
  "Privato residenziale",
  "Condominio",
  "Privato terziario",
  "Impresa",
  "ETS non economico",
  "ETS economico",
  "Cooperativa edilizia",
  "IAP",
];
const TIPO_SOGGETTO_SR = [
  "Pubblica Amministrazione",
  "Privato",
  "ETS non economico",
  "ETS economico",
  "Cooperativa edilizia",
  "ESCO",
  "CER",
  "AUC",
];
const TITOLO_DISPONIBILITA = [
  "Propriet\u00e0",
  "Usufrutto",
  "Diritto superficie",
  "Locazione",
  "Comodato",
];
const CATEGORIE_CATASTALI = Object.keys(CATASTO.categorie).sort();

const TEST_SCENARIOS_LIST = [
  { group: "Privato Residenziale" },
  {
    file: "data/tests/test_01_pdc_privato.json",
    label: "PdC Aria/Acqua III.A — sostituzione caldaia esistente",
  },
  {
    file: "data/tests/test_09_infissi_schermature.json",
    label: "Infissi II.B + Schermature II.C — abbinamento obbligatorio",
  },
  {
    file: "data/tests/test_11_ibrido_bivalente.json",
    label: "Sistema Ibrido III.B (bivalente) + Scaldacqua III.E",
  },
  {
    file: "data/tests/test_13_privato_isolamento_pdc.json",
    label: "Isolamento II.A + PdC III.A — perc_multi 55%",
  },

  { group: "Impresa" },
  {
    file: "data/tests/test_02_impresa_grande.json",
    label: "PdC Grande III.A + Fotovoltaico II.H",
  },
  {
    file: "data/tests/test_12_impresa_piccola_multi.json",
    label: "Isolamento II.A + PdC III.A — maggioraz. piccola impresa",
  },
  {
    file: "data/tests/test_20_azion10_iiiG_microcogenerazione.json",
    label: "Microcogenerazione III.G — catalogo GSE",
  },
  {
    file: "data/tests/test_19_azion9_iva_impresa.json",
    label: "III.A + IVA non ammissibile (2.640€ sottratti)",
  },

  { group: "Terziario" },
  {
    file: "data/tests/test_03_isolamento_pareti.json",
    label: "Isolamento Pareti II.A — superficie opaca",
  },
  {
    file: "data/tests/test_04_ricarica_auto.json",
    label: "Colonnine Ricarica II.G — veicoli elettrici",
  },
  {
    file: "data/tests/test_07_completo.json",
    label: "Full Electric — 5 interventi (II.A+II.B+II.F+III.A+III.D)",
  },
  {
    file: "data/tests/test_06_pratica_reale.json",
    label: "Pratica Reale — incentivo calcolato completo",
  },

  { group: "Pubblica Amministrazione / ETS" },
  {
    file: "data/tests/test_08_pa_comune.json",
    label: "PA <15.000ab — Isolamento II.A + PdC III.A",
  },
  {
    file: "data/tests/test_14_check_azion1_1.json",
    label: "PA <15.000ab — III.A PdC 100% (comune sotto soglia)",
  },
  {
    file: "data/tests/test_10_ets_biomassa_solare.json",
    label: "ETS non econ — Biomassa III.C + Solare III.D",
  },
  {
    file: "data/tests/test_16_azion5_ets_non_economico.json",
    label: "ETS non econ — Isolamento II.A 100%",
  },
  {
    file: "data/tests/test_17_azion6_ets_unica_rata.json",
    label: "ETS non econ — Unica rata (importo >15.000€)",
  },

  { group: "Massimali e Pratiche Complete" },
  {
    file: "data/tests/test_05_incentivo_massimo.json",
    label: "Super Pratica — incentivo massimo erogabile",
  },

  { group: "Blocchi e Validazioni" },
  {
    file: "data/tests/test_15_azion4_valvole_non_presenti.json",
    label: "Blocco — II.B senza valvole termostatiche",
  },
  {
    file: "data/tests/test_21_azion11_mantenimento_5anni.json",
    label: "Blocco — obbligo mantenimento 5 anni non accettato",
  },
  {
    file: "data/tests/test_23_azion15_nzeb_volumetrico.json",
    label: "Blocco — II.D ampliamento volumetrico eccede 25%",
  },
  {
    file: "data/tests/test_24_azion14_iiid_prestazionale.json",
    label: "III.D Solare termico — formula prestazionale Ci*Qu*Sl",
  },
  {
    file: "data/tests/test_28_iiib_rapporto_pdc_caldaia_blocco.json",
    label: "Blocco — III.B ibrido rapporto PdC/caldaia ≤50%",
  },
  {
    file: "data/tests/test_29_iiid_solar_cooling_blocco.json",
    label: "Blocco — III.D Solar Cooling DEC<8",
  },

  { group: "Aggiornamento CT3.0" },
  {
    file: "data/tests/test_25_iiif_teleriscaldamento_fasce.json",
    label: "III.F Teleriscaldamento — 3 fasce potenza (80kW)",
  },
  {
    file: "data/tests/test_26_iiic_biomassa_prestazionale.json",
    label: "III.C Caldaia biomassa — formula prestazionale",
  },
  {
    file: "data/tests/test_27_iiic_stufa_logaritmica.json",
    label: "III.C Stufa pellet — formula logaritmica",
  },
  {
    file: "data/tests/test_30_iiif_fascia_alta.json",
    label: "III.F Teleriscaldamento — fascia >150kW",
  },
  {
    file: "data/tests/test_31_iiic_caldaia_legna_logaritmica_d.json",
    label: "III.C Caldaia legna tipo D — log/lineare",
  },

  { group: "Funzionalità Specifiche" },
  {
    file: "data/tests/test_18_azion7_made_in_eu_iii.json",
    label: "Premialità — Made in EU esteso a Titolo III",
  },
  {
    file: "data/tests/test_22_azion12_iia_interno_30percento.json",
    label: "Maggioraz. — II.A Parete Interna +30% cmax",
  },

  { group: "Problematiche (R1–R10)" },
  {
    file: "data/tests/test_p01_privato_titolo3.json",
    label: "R1 — Privato resid. solo Titolo III (PdC aria/acqua)",
  },
  {
    file: "data/tests/test_p02_impresa_titolo_v.json",
    label: "R2 — Impresa Titolo V (richiesta prelim. + III.A 45%)",
  },
  {
    file: "data/tests/test_p03_ets_non_economico.json",
    label: "R3 — ETS non econ assimilato PA (II.A isol. 100%)",
  },
  {
    file: "data/tests/test_p04_iiH_iiiA_pairing.json",
    label: "R4 — II.H trainato da III.A elettrica pura",
  },
  {
    file: "data/tests/test_p05_iiB_iiC_pairing.json",
    label: "R5 — II.C schermature + II.B infissi obbligatorio",
  },
  {
    file: "data/tests/test_p06_esco_epc.json",
    label: "R6 — SR=ESCO ≠ SA → EPC (UNI CEI EN 17669)",
  },
  {
    file: "data/tests/test_p07_pa_comune_100percento.json",
    label: "R7 — PA ≤15k → 100% (II.A isolamento pareti)",
  },
  {
    file: "data/tests/test_p10_mandato_atto_assenso.json",
    label: "R10 — Mandato incasso (non-PA) + atto assenso",
  },
];

const UaWizardManager = function (viewportId) {
  const _viewport = document.getElementById(viewportId);
  const _rulesEngine = RulesEngine;
  const _formulaEngine = FormulaEngine;
  const _crossRuleEngine = CrossRuleEngine;

  let _currentStep = 0;
  let _praticaData = {
    pratica: {
      id: "",
      codice: "",
      data_inserimento: "",
      data_richiesta: "",
      data_fine_lavori: "",
      nome: "",
      modalita_accesso: "diretto",
      note: "",
    },
    proprietario: {},
    richiedente: {},
    responsabile: {},
    delegato: {},
    edificio: {
      indirizzo: "",
      categoria_catastale: "",
      ambito: "",
      zona_climatica: "",
      anno_costruzione: null,
      superficie_utile_mq: null,
      impianto_esistente: {
        tipo: "",
        potenza_kw: 0,
        combustibile: "",
        libretto: false,
        libretto_codice: "",
      },
      ape: {},
    },
    interventi: [],
    dati_tecnici: {},
    economico: { preventivo: [], maggiorazioni: [], incentivo: null },
    documenti: {},
  };
  let _isDirty = false;

  if (!_viewport) {
    console.error("UaWizardManager: viewport element not found: " + viewportId);
    return null;
  }

  _viewport.addEventListener("click", function (e) {
    var btn = e.target.closest(".step-help-btn");
    if (btn) {
      var stepNum = parseInt(btn.getAttribute("data-step"), 10);
      if (!isNaN(stepNum)) _showContextHelp(stepNum);
    }
  });

  const _bindFormData = function (formElement, dataObject) {
    if (!formElement || !dataObject) return;
    const inputs = formElement.querySelectorAll("[name]");
    inputs.forEach(function (input) {
      const name = input.name;
      var value = null;
      if (input.type === "checkbox") {
        value = !!input.checked;
      } else if (input.type !== "radio" || input.checked) {
        value = input.value;
      } else {
        return;
      }
      // Prova a matchare con uno dei codici intervento noti (es. "III.A_tipologia_pdc")
      var codici = _praticaData.interventi || [];
      var matched = false;
      for (var ci = 0; ci < codici.length; ci++) {
        var codePrefix = codici[ci] + "_";
        if (name.indexOf(codePrefix) === 0) {
          if (
            typeof dataObject[codici[ci]] !== "object" ||
            dataObject[codici[ci]] === null
          ) {
            dataObject[codici[ci]] = {};
          }
          dataObject[codici[ci]][name.substring(codePrefix.length)] = value;
          matched = true;
          break;
        }
      }
      if (!matched) {
        var foundKey = null;
        for (var key in dataObject) {
          if (typeof dataObject[key] === "object" && dataObject[key] !== null) {
            if (name.indexOf(key + "_") === 0) {
              foundKey = key;
              break;
            }
          }
        }
        if (foundKey) {
          var fieldKey = name.substring(foundKey.length + 1);
          dataObject[foundKey][fieldKey] = value;
        } else {
          var underscoreIdx = name.indexOf("_");
          if (
            underscoreIdx > 0 &&
            dataObject[name.substring(0, underscoreIdx)] !== undefined &&
            typeof dataObject[name.substring(0, underscoreIdx)] === "object"
          ) {
            var objKey = name.substring(0, underscoreIdx);
            var fieldKey = name.substring(underscoreIdx + 1);
            dataObject[objKey][fieldKey] = value;
          } else {
            dataObject[name] = value;
          }
        }
      }
    });
  };

  const _calculateOverallPaymentPlan = function (results, soggettoType) {
    let total = 0;
    let hasErrors = false;
    Object.keys(results).forEach(function (code) {
      var r = results[code];
      if (r.errors && r.errors.length > 0) {
        hasErrors = true;
      } else {
        total += r.amount || 0;
      }
    });

    if (hasErrors || total === 0) {
      return null;
    }

    // PA/ETS non economico: sempre unica rata
    if (
      soggettoType === "Pubblica Amministrazione" ||
      soggettoType === "ETS non economico"
    ) {
      const plan = {
        total: parseFloat(total.toFixed(2)),
        numInstallments: 1,
        installments: [],
        isSinglePayment: true,
      };
      plan.installments.push({
        n: 1,
        amount: parseFloat(total.toFixed(2)),
        label: "Unica soluzione",
      });
      return plan;
    }

    const plan = {
      total: parseFloat(total.toFixed(2)),
      numInstallments: 1,
      installments: [],
      isSinglePayment: false,
    };

    if (total <= 15000) {
      plan.numInstallments = 1;
      plan.isSinglePayment = true;
      plan.installments.push({
        n: 1,
        amount: parseFloat(total.toFixed(2)),
        label: "Unica soluzione",
      });
      return plan;
    }

    const yearlySums = {};
    let maxYear = 1;

    Object.keys(results).forEach(function (code) {
      var r = results[code];
      if (r.paymentPlan && r.paymentPlan.installments) {
        r.paymentPlan.installments.forEach(function (inst) {
          const yearNum = inst.n;
          yearlySums[yearNum] = (yearlySums[yearNum] || 0) + inst.amount;
          if (yearNum > maxYear) {
            maxYear = yearNum;
          }
        });
      } else if (r.amount > 0) {
        yearlySums[1] = (yearlySums[1] || 0) + r.amount;
      }
    });

    plan.numInstallments = maxYear;
    for (let i = 1; i <= maxYear; i++) {
      const amount = yearlySums[i] || 0;
      if (amount > 0) {
        plan.installments.push({
          n: i,
          amount: parseFloat(amount.toFixed(2)),
          label: "Rata " + i + " di " + maxYear,
        });
      }
    }

    return plan;
  };

  const _field = function (labelText, inputHtml, helpText) {
    const div = document.createElement("div");
    div.className = "form-row";
    var html = "<label>" + labelText + "</label>" + inputHtml;
    if (helpText) {
      html += '<div class="form-help">' + helpText + "</div>";
    }
    div.innerHTML = html;
    return div;
  };

  const _fieldHtml = function (labelText, inputHtml) {
    var result =
      '<div class="form-row"><label>' +
      labelText +
      "</label>" +
      inputHtml +
      "</div>";
    return result;
  };

  const _sel = function (name, options, val) {
    const v = val || "";
    let html = '<select name="' + name + '"><option value="">--</option>';
    options.forEach(function (o) {
      html +=
        '<option value="' +
        o +
        '"' +
        (o === v ? " selected" : "") +
        ">" +
        o +
        "</option>";
    });
    var result = html + "</select>";
    return result;
  };

  const _txt = function (name, type, val, ph) {
    var safeVal = val || "";
    var safePh = ph || "";
    var result =
      '<input type="' +
      type +
      '" name="' +
      name +
      '" value="' +
      safeVal +
      '" placeholder="' +
      safePh +
      '">';
    return result;
  };

  const _num = function (name, val, min, max) {
    var safeVal = val !== undefined && val !== null ? val : "";
    var safeMin = min !== undefined ? ' min="' + min + '"' : "";
    var safeMax = max !== undefined ? ' max="' + max + '"' : "";
    var safePh = "";
    if (min !== undefined && max !== undefined) {
      safePh = " " + min + " – " + max;
    } else if (min !== undefined) {
      safePh = " \u2265 " + min;
    } else if (max !== undefined) {
      safePh = " \u2264 " + max;
    }
    var phAttr = safePh ? ' placeholder="' + safePh + '"' : "";
    var focusClean =
      " onfocus=\"if(this.value==='0'||this.value==='0.00')this.value=''\"";
    var result =
      '<input type="number" name="' +
      name +
      '" value="' +
      safeVal +
      '"' +
      safeMin +
      safeMax +
      phAttr +
      focusClean +
      ">";
    return result;
  };

  const _chk = function (name, label, checked) {
    var checkedAttr = checked ? " checked" : "";
    var result =
      '<label class="checkbox-inline"><input type="checkbox" name="' +
      name +
      '"' +
      checkedAttr +
      "> " +
      label +
      "</label>";
    return result;
  };

  const _updateStepIndicator = function () {
    const indicator = document.getElementById("wizard-step-indicator");
    if (!indicator) return;
    indicator.innerHTML = "";
    STEP_LABELS.forEach(function (label, index) {
      const span = document.createElement("span");
      span.className =
        "step-dot" +
        (index === _currentStep ? " active" : "") +
        (index < _currentStep ? " done" : "");
      span.textContent = index + 1 + ". " + label;
      indicator.appendChild(span);
    });
  };

  const _renderCard = function (title, dataKey, tipoOptions, extraHtml) {
    const card = document.createElement("article");
    card.className = "anagrafica-card";
    const d = _praticaData[dataKey] || {};
    card.innerHTML = '<div class="card-title">' + title + "</div>";
    card.appendChild(
      _field(
        "Denominazione",
        _txt(dataKey + "_denominazione", "text", d.denominazione),
      ),
    );
    card.appendChild(
      _field(
        "Codice Fiscale / P.IVA",
        _txt(dataKey + "_cf_piva", "text", d.cf_piva),
      ),
    );
    card.appendChild(
      _field(
        "Partita IVA",
        _txt(dataKey + "_partita_iva", "text", d.partita_iva),
      ),
    );
    card.appendChild(
      _field("Indirizzo", _txt(dataKey + "_indirizzo", "text", d.indirizzo)),
    );
    if (tipoOptions) {
      card.appendChild(
        _field(
          "Tipo soggetto",
          _sel(dataKey + "_tipo_soggetto", tipoOptions, d.tipo_soggetto),
        ),
      );
    }
    if (extraHtml) {
      card.insertAdjacentHTML("beforeend", extraHtml(d, dataKey));
    }
    return card;
  };

  const _generateNewCodice = async function () {
    var maxNum = 0;
    try {
      var all = await praticheMgr.getAll();
      all.forEach(function (p) {
        var c = (p.dati && p.dati.pratica && p.dati.pratica.codice) || "";
        var match = c.match(/^CT30-(\d+)$/);
        if (match) {
          var n = parseInt(match[1], 10);
          if (n > maxNum) maxNum = n;
        }
      });
    } catch (e) {
      console.error("_generateNewCodice: errore scan DB", e);
    }
    var next = maxNum + 1;
    var padded = String(next).padStart(3, "0");
    return "CT30-" + padded;
  };

  const _renderStep0 = function () {
    const section = document.createElement("section");
    section.className = "wizard-step step0";
    const p = _praticaData.pratica;
    section.innerHTML = '<div class="section-title">Dati della Pratica</div>';
    section.appendChild(
      _field("Codice pratica", _txt("codice", "text", p.codice || "")),
    );
    section.appendChild(
      _field(
        "Data inserimento",
        '<input type="date" name="data_inserimento" value="' +
          (p.data_inserimento || "") +
          '">',
      ),
    );
    section.appendChild(
      _field(
        "Nome pratica",
        _txt("nome", "text", p.nome, "Es. Ristrutturazione Villa Rossi"),
      ),
    );
    section.appendChild(
      _field(
        "Data richiesta",
        '<input type="date" name="data_richiesta" value="' +
          (p.data_richiesta || "") +
          '">',
      ),
    );
    section.appendChild(
      _field(
        "Data fine lavori",
        '<input type="date" name="data_fine_lavori" value="' +
          (p.data_fine_lavori || "") +
          '">',
      ),
    );
    section.appendChild(
      _field(
        "Modalit\u00e0 accesso",
        _sel("modalita_accesso", MODALITA_ACCESSO, p.modalita_accesso),
      ),
    );
    section.appendChild(
      _field(
        "Note",
        '<textarea name="note" rows="3">' + (p.note || "") + "</textarea>",
      ),
    );
    return section;
  };

  const _renderStep1 = function () {
    const section = document.createElement("section");
    section.className = "wizard-step step1";
    const e = _praticaData.edificio;
    section.innerHTML = '<div class="section-title">Dati Edificio</div>';
    section.appendChild(
      _field("Indirizzo", _txt("indirizzo", "text", e.indirizzo)),
    );
    section.appendChild(
      _field(
        "Categoria catastale",
        _sel("categoria_catastale", CATEGORIE_CATASTALI, e.categoria_catastale),
      ),
    );
    section.appendChild(
      _field("Ambito", _sel("ambito", AMBITO_OPTIONS, e.ambito)),
    );
    section.appendChild(
      _field(
        "Zona climatica",
        _sel("zona_climatica", ZONE_CLIMATICHE, e.zona_climatica),
      ),
    );
    var row2 = document.createElement("div");
    row2.className = "form-row-duo";
    row2.innerHTML =
      '<div class="duo-field"><label>Anno costruzione</label>' +
      _num("anno_costruzione", e.anno_costruzione, 1800, 2026) +
      '</div><div class="duo-field"><label>Superficie utile (mq)</label>' +
      _num("superficie_utile_mq", e.superficie_utile_mq, 1) +
      "</div>";
    section.appendChild(row2);

    // Sezione Impianto Esistente / Generatore Sostituito
    const impianto = e.impianto_esistente || {};
    const fieldset = document.createElement("fieldset");
    fieldset.style.marginTop = "20px";
    fieldset.style.border = "1px solid rgba(255,255,255,0.15)";
    fieldset.style.borderRadius = "6px";
    fieldset.style.padding = "15px";
    fieldset.innerHTML =
      '<legend style="padding:0 10px; font-weight:600; color:#68c8b2;">Impianto Esistente / Generatore Sostituito</legend>';

    const tipiImpianto = [
      "Caldaia",
      "Pompa di Calore",
      "Biomassa",
      "Sistema Ibrido",
      "Altro / Nessuno",
    ];
    const combustibili = [
      "Metano",
      "GPL",
      "Gasolio",
      "Biomassa",
      "Elettricità",
      "Altro",
    ];

    fieldset.appendChild(
      _field(
        "Tipo impianto esistente",
        _sel("impianto_esistente_tipo", tipiImpianto, impianto.tipo),
      ),
    );
    fieldset.appendChild(
      _field(
        "Potenza termica (kW)",
        _num("impianto_esistente_potenza_kw", impianto.potenza_kw, 0),
      ),
    );
    fieldset.appendChild(
      _field(
        "Combustibile",
        _sel(
          "impianto_esistente_combustibile",
          combustibili,
          impianto.combustibile,
        ),
      ),
    );

    const librettoRow = document.createElement("div");
    librettoRow.className = "form-row";
    librettoRow.innerHTML =
      "<label>Libretto d'impianto</label>" +
      _chk("impianto_esistente_libretto", "Presente", impianto.libretto);
    fieldset.appendChild(librettoRow);

    fieldset.appendChild(
      _field(
        "Codice Catasto / Libretto",
        _txt(
          "impianto_esistente_libretto_codice",
          "text",
          impianto.libretto_codice,
          "Es. IT0123456789",
        ),
      ),
    );

    section.appendChild(fieldset);

    // Sezione Flag PA (comune <15.000ab, scuola/ospedale)
    const paFlags = document.createElement("fieldset");
    paFlags.style.marginTop = "15px";
    paFlags.style.border = "1px solid rgba(255,255,255,0.15)";
    paFlags.style.borderRadius = "6px";
    paFlags.style.padding = "15px";
    paFlags.innerHTML =
      '<legend style="padding:0 10px; font-weight:600; color:#68c8b2;">Opzioni PA (solo per Pubblica Amministrazione)</legend>';

    const paRow1 = document.createElement("div");
    paRow1.className = "form-row";
    paRow1.innerHTML =
      "<label>Comune con popolazione &lt; 15.000 abitanti</label>" +
      _chk("comune_sotto_15k", "Sì (100% intensità)", e.comune_sotto_15k);
    paFlags.appendChild(paRow1);

    const paRow2 = document.createElement("div");
    paRow2.className = "form-row";
    paRow2.innerHTML =
      "<label>Edificio scolastico o ospedaliero</label>" +
      _chk("scuola_ospedale", "Sì (100% intensità)", e.scuola_ospedale);
    paFlags.appendChild(paRow2);

    section.appendChild(paFlags);

    return section;
  };

  const _renderStep2 = function () {
    const section = document.createElement("section");
    section.className = "wizard-step step2";
    section.innerHTML = '<div class="section-title">Anagrafiche</div>';
    section.appendChild(
      _renderCard(
        "Proprietario (T1)",
        "proprietario",
        TIPO_SOGGETTO_SA,
        function (d, k) {
          var html = _fieldHtml(
            "Titolo propriet\u00e0",
            _sel(
              k + "_titolo_proprieta",
              TITOLO_DISPONIBILITA,
              d.titolo_proprieta,
            ),
          );
          return html;
        },
      ),
    );
    var copyBtn = document.createElement("button");
    copyBtn.className = "cmd-btn copy-btn";
    copyBtn.setAttribute("data-copy-from", "proprietario");
    copyBtn.setAttribute("data-copy-to", "richiedente");
    copyBtn.textContent = "Richiedente = Proprietario";
    copyBtn.title = "Copia i dati del proprietario nel richiedente";
    section.appendChild(copyBtn);
    section.appendChild(
      _renderCard(
        "Richiedente / SA (T2)",
        "richiedente",
        TIPO_SOGGETTO_SA,
        function (d, k) {
          var html =
            _fieldHtml(
              "Titolo disponibilit\u00e0",
              _sel(
                k + "_titolo_disponibilita",
                TITOLO_DISPONIBILITA,
                d.titolo_disponibilita,
              ),
            ) +
            _fieldHtml("PEC", _txt(k + "_pec", "email", d.pec)) +
            _fieldHtml("Email", _txt(k + "_email", "email", d.email)) +
            _fieldHtml("Telefono", _txt(k + "_telefono", "tel", d.telefono)) +
            "<fieldset><legend>Condominio</legend>" +
            _chk(
              k + "_verbale_assemblea",
              "Verbale assemblea",
              d.verbale_assemblea,
            ) +
            _chk(
              k + "_tabella_millesimale",
              "Tabella millesimale",
              d.tabella_millesimale,
            ) +
            "</fieldset>";
          return html;
        },
      ),
    );
    var copyBtn2 = document.createElement("button");
    copyBtn2.className = "cmd-btn copy-btn";
    copyBtn2.setAttribute("data-copy-from", "richiedente");
    copyBtn2.setAttribute("data-copy-to", "responsabile");
    copyBtn2.textContent = "Responsabile = Richiedente";
    copyBtn2.title = "Copia i dati del richiedente nel responsabile";
    section.appendChild(copyBtn2);
    section.appendChild(
      _renderCard(
        "Responsabile / SR (T3)",
        "responsabile",
        TIPO_SOGGETTO_SR,
        function (d, k) {
          var html =
            _fieldHtml("IBAN", _txt(k + "_iban", "text", d.iban)) +
            _chk(
              k + "_mandato_incasso",
              "Mandato irrevocabile incasso",
              d.mandato_incasso,
            ) +
            _fieldHtml("PEC", _txt(k + "_pec", "email", d.pec)) +
            _fieldHtml("Email", _txt(k + "_email", "email", d.email)) +
            _chk(
              k + "_certificazione_11352",
              "Cert. UNI CEI 11352 (ESCO)",
              d.certificazione_11352,
            ) +
            '<div class="coincide-flags">' +
            _chk(
              k + "_coincide_con_proprietario",
              "Coincide con Proprietario",
              d.coincide_con_proprietario,
            ) +
            _chk(
              k + "_coincide_con_richiedente",
              "Coincide con Richiedente",
              d.coincide_con_richiedente,
            ) +
            "</div>";
          return html;
        },
      ),
    );
    const dd = _praticaData.delegato || {};
    section.insertAdjacentHTML(
      "beforeend",
      '<details class="delegato-section"><summary>Delegato (opzionale)</summary>' +
        _fieldHtml(
          "Denominazione",
          _txt("delegato_denominazione", "text", dd.denominazione),
        ) +
        _fieldHtml("CF", _txt("delegato_cf", "text", dd.cf)) +
        _fieldHtml(
          "Qualifica",
          _txt("delegato_qualifica", "text", dd.qualifica),
        ) +
        _fieldHtml("Email", _txt("delegato_email", "email", dd.email)) +
        "</details>",
    );

    section.addEventListener("click", function (e) {
      var btn = e.target.closest(".copy-btn");
      if (!btn) return;
      var fromKey = btn.getAttribute("data-copy-from");
      var toKey = btn.getAttribute("data-copy-to");
      if (!fromKey || !toKey) return;
      var fromData = {};
      ["denominazione", "cf_piva", "partita_iva", "indirizzo"].forEach(
        function (field) {
          var inp = section.querySelector(
            '[name="' + fromKey + "_" + field + '"]',
          );
          fromData[field] = inp ? inp.value : "";
        },
      );
      ["denominazione", "cf_piva", "partita_iva", "indirizzo"].forEach(
        function (field) {
          var inp = section.querySelector(
            '[name="' + toKey + "_" + field + '"]',
          );
          if (inp) inp.value = fromData[field] || "";
        },
      );
      var toData = _praticaData[toKey] || {};
      toData.denominazione = fromData.denominazione;
      toData.cf_piva = fromData.cf_piva;
      toData.partita_iva = fromData.partita_iva;
      toData.indirizzo = fromData.indirizzo;
      if (toKey === "richiedente") toData.coincide_con_proprietario = true;
      if (toKey === "responsabile") toData.coincide_con_richiedente = true;
      _praticaData[toKey] = toData;
    });

    return section;
  };

  const _renderStep3 = function () {
    const section = document.createElement("section");
    section.className = "wizard-step step3";
    section.innerHTML = '<div class="section-title">Selezione Interventi</div>';
    const selezionati = _praticaData.interventi || [];
    const tipoSA = _praticaData.richiedente.tipo_soggetto || "";
    var matriceKey = null;
    var mapSaKey = {
      "Pubblica Amministrazione": "pa",
      "Privato residenziale": "privato_residenziale",
      Condominio: "privato_residenziale",
      "Privato terziario": "privato_terziario",
      Impresa: "privato_terziario",
      "ETS non economico": "ets_non_economico",
      "ETS economico": "ets_economico",
    };
    matriceKey = mapSaKey[tipoSA] || null;
    var titoloIIAmmesso = false;
    var titoloIIIAmmesso = false;
    if (matriceKey && MATRICE_SA_INTERVENTI[matriceKey]) {
      titoloIIAmmesso = MATRICE_SA_INTERVENTI[matriceKey].titolo_ii === true;
      titoloIIIAmmesso = MATRICE_SA_INTERVENTI[matriceKey].titolo_iii === true;
    }
    var gruppi = { "II.": [], "III.": [] };
    Object.keys(INTERVENTI)
      .sort()
      .forEach(function (code) {
        var meta = INTERVENTI[code];
        var prefix = code.startsWith("II.") ? "II." : "III.";
        var titoloAmmesso =
          prefix === "II." ? titoloIIAmmesso : titoloIIIAmmesso;
        var checked = selezionati.indexOf(code) !== -1;
        var disabled = !titoloAmmesso;
        var disabledAttr = disabled ? " disabled" : "";
        var checkedAttr = checked && !disabled ? " checked" : "";
        var liClass = "intervento-item" + (disabled ? " disabled" : "");
        var html =
          '<li class="' +
          liClass +
          '"><label><input type="checkbox" name="intervento" value="' +
          code +
          '"' +
          checkedAttr +
          disabledAttr +
          '><span class="int-code">' +
          code +
          '</span><span class="int-name">' +
          (meta ? meta.nome : code) +
          "</span></label></li>";
        if (gruppi[prefix]) gruppi[prefix].push(html);
      });
    var gruppiHtml =
      '<div class="card-title">Titolo II</div><ul class="interventi-lista">' +
      gruppi["II."].join("") +
      '</ul><div class="card-title">Titolo III</div><ul class="interventi-lista">' +
      gruppi["III."].join("") +
      "</ul>";
    section.insertAdjacentHTML("beforeend", gruppiHtml);

    // Mutua esclusività generatori di riscaldamento principale (III.A, III.B, III.C, III.F)
    const riscaldamentoPrincipale = ["III.A", "III.B", "III.C", "III.F"];

    const updateExclusivity = function () {
      const checkedGenerator = Array.from(
        section.querySelectorAll("input[name=intervento]:checked"),
      ).find(function (cb) {
        return riscaldamentoPrincipale.includes(cb.value);
      });

      section.querySelectorAll("input[name=intervento]").forEach(function (cb) {
        if (riscaldamentoPrincipale.includes(cb.value)) {
          if (checkedGenerator && cb.value !== checkedGenerator.value) {
            cb.disabled = true;
            cb.closest("li").classList.add("disabled");
          } else {
            var prefix = cb.value.startsWith("II.") ? "II." : "III.";
            var titoloAmmesso =
              prefix === "II." ? titoloIIAmmesso : titoloIIIAmmesso;
            if (titoloAmmesso) {
              cb.disabled = false;
              cb.closest("li").classList.remove("disabled");
            }
          }
        }
      });
    };

    section.addEventListener("change", function (e) {
      if (
        e.target &&
        e.target.name === "intervento" &&
        riscaldamentoPrincipale.includes(e.target.value)
      ) {
        updateExclusivity();
      }
    });

    setTimeout(updateExclusivity, 0);
    var validateBtn = document.createElement("button");
    validateBtn.id = "btn-validate-interventi";
    validateBtn.className = "cmd-btn";
    validateBtn.textContent = "Verifica compatibilit\u00e0";
    validateBtn.title =
      "Verifica la compatibilità degli interventi selezionati";
    validateBtn.addEventListener("click", function () {
      var checkboxes = section.querySelectorAll(
        "input[name=intervento]:checked",
      );
      var selected = [];
      checkboxes.forEach(function (cb) {
        selected.push(cb.value);
      });
      _praticaData.interventi = selected;
      var tipoSA = _praticaData.richiedente.tipo_soggetto || "";
      var ambito = _praticaData.edificio.ambito || "";
      var soggettoData = _praticaData.richiedente || {};
      var interventiData = _praticaData.dati_tecnici || {};
      var cre = _crossRuleEngine.validateSelectionWithData(
        selected,
        interventiData,
        soggettoData,
      );
      var re = _rulesEngine.validateInterventiPerSoggetto(
        tipoSA,
        ambito,
        selected,
      );
      var dv = document.getElementById("interventi-validation");
      if (!dv) return;
      dv.innerHTML = "";
      if (cre.errors.length > 0 || re.errors.length > 0) {
        var errorsHtml =
          '<div class="alert alert-error"><strong>Errori:</strong><ul>' +
          cre.errors
            .concat(re.errors)
            .map(function (e) {
              return "<li>" + e + "</li>";
            })
            .join("") +
          "</ul></div>";
        dv.innerHTML = errorsHtml;
      }
      if (cre.warnings.length > 0 || re.warnings.length > 0) {
        var warnsHtml =
          '<div class="alert alert-warning"><strong>Avvisi:</strong><ul>' +
          cre.warnings
            .concat(re.warnings)
            .map(function (w) {
              return "<li>" + w + "</li>";
            })
            .join("") +
          "</ul></div>";
        dv.innerHTML += warnsHtml;
      }
      if (cre.success && re.success) {
        var successHtml =
          '<div class="alert alert-success">Combinazione interventi compatibile.</div>';
        dv.innerHTML = successHtml;
      }
    });
    section.appendChild(validateBtn);
    var dv = document.createElement("div");
    dv.id = "interventi-validation";
    dv.className = "validation-results";
    section.appendChild(dv);
    return section;
  };

  const _renderStep4 = function () {
    const section = document.createElement("section");
    section.className = "wizard-step step4";
    section.innerHTML =
      '<div class="section-title">Dati Tecnici per Intervento</div>';
    const selezionati = _praticaData.interventi || [];
    if (selezionati.length === 0) {
      section.innerHTML += '<p class="info">Nessun intervento selezionato.</p>';
      return section;
    }
    selezionati.forEach(function (code) {
      const scheda = SCHEDE_TECNICHE[code];
      if (!scheda) {
        section.innerHTML += "<p>" + code + ": nessuna scheda.</p>";
        return;
      }
      const card = document.createElement("article");
      card.className = "tecnica-card";
      card.innerHTML =
        '<div class="card-title">' +
        code +
        " \u2014 " +
        scheda.nome +
        "</div>" +
        (scheda.descrizione ? "<p>" + scheda.descrizione + "</p>" : "");
      const datiTecnici = _praticaData.dati_tecnici || {};
      const datiCorrenti = datiTecnici[code] || {};

      // Carica il catalogo tecnico per codici che hanno un catalogo
      var catalogoData = loadCatalogo(code).then(function (cat) {
        if (cat && cat.length > 0) {
          _injectCatalogo(card, code, datiCorrenti, cat);
        }
      });

      (scheda.campi || []).forEach(function (campo) {
        const name = code + "_" + campo.id;
        const val = datiCorrenti[campo.id] || "";
        if (campo.tipo === "select") {
          card.appendChild(
            _field(
              campo.label,
              _sel(name, campo.opzioni || [], val),
              campo.note,
            ),
          );
        } else if (campo.tipo === "number") {
          card.appendChild(
            _field(
              campo.label + (campo.unita ? " (" + campo.unita + ")" : ""),
              _num(name, val, campo.min, campo.max),
              campo.note,
            ),
          );
        } else {
          card.appendChild(
            _field(campo.label, _txt(name, "text", val), campo.note),
          );
        }
      });
      section.appendChild(card);
    });
    return section;
  };

  var CATALOGO_CONFIG = {
    "III.A": {
      marcaLabel: "Marca PDC",
      modelloLabel: "Modello PDC",
      marcaField: "marca_pdc",
      modelloField: "modello_pdc",
      formatModello: function (r) {
        return (
          (r.modello || "") +
          " (" +
          (r.potenza_termica_kw || "?") +
          " kW, ηs " +
          (r.efficienza_stagionale || "?") +
          ")"
        );
      },
      fills: [
        { from: "potenza_termica_kw", to: "potenza_pdc_kw" },
        { from: "scop_cop", to: "scop" },
        { from: "efficienza_stagionale", to: "eta_s" },
      ],
      clears: ["modello_pdc", "potenza_pdc_kw", "scop", "eta_s"],
    },
    "III.B": {
      marcaLabel: "Marca sistema ibrido",
      modelloLabel: "Modello sistema",
      marcaField: "marca_ibrido",
      modelloField: "modello_ibrido",
      formatModello: function (r) {
        return (
          (r.modello || "") +
          " (" +
          (r.potenza_pdc_kw || "?") +
          " kW, ηs " +
          (r.efficienza_stagionale || "?") +
          ")"
        );
      },
      fills: [
        { from: "potenza_pdc_kw", to: "potenza_pdc_kw" },
        { from: "scop_cop", to: "scop" },
        { from: "efficienza_stagionale", to: "eta_s" },
      ],
      clears: ["modello_ibrido", "potenza_pdc_kw", "scop", "eta_s"],
    },
    "III.C": {
      marcaLabel: "Marca generatore",
      modelloLabel: "Modello generatore",
      marcaField: "marca_biomassa",
      modelloField: "modello_biomassa",
      formatModello: function (r) {
        return (
          (r.modello || "") +
          " (" +
          (r.potenza_termica_kw || "?") +
          " kW, " +
          (r.alimentazione || "?") +
          ")"
        );
      },
      fills: [
        { from: "potenza_termica_kw", to: "potenza_nominale_kw" },
        { from: "classe_ambientale", to: "classe_emissiva" },
        { from: "alimentazione", to: "tipo_biomassa" },
      ],
      clears: [
        "modello_biomassa",
        "potenza_nominale_kw",
        "classe_emissiva",
        "tipo_biomassa",
      ],
    },
    "III.D": {
      marcaLabel: "Marca pannello",
      modelloLabel: "Modello pannello",
      marcaField: "marca_solare",
      modelloField: "modello_solare",
      formatModello: function (r) {
        return (r.modello || "") + " (" + (r.area_lorda_m2 || "?") + " m²)";
      },
      fills: [{ from: "area_lorda_m2", to: "superficie_lorda_mq" }],
      clears: ["modello_solare", "superficie_lorda_mq"],
    },
    "III.E": {
      marcaLabel: "Marca scaldacqua",
      modelloLabel: "Modello scaldacqua",
      marcaField: "marca_scaldacqua",
      modelloField: "modello_scaldacqua",
      formatModello: function (r) {
        return (
          (r.modello || "") +
          " (" +
          (r.capacita_accumulo_litri || "?") +
          " L, classe " +
          (r.classe_energetica || "?") +
          ")"
        );
      },
      fills: [
        { from: "capacita_accumulo_litri", to: "capacita_litri" },
        { from: "classe_energetica", to: "classe_energetica" },
      ],
      clears: ["modello_scaldacqua", "capacita_litri", "classe_energetica"],
    },
    "III.G": {
      marcaLabel: "Marca microcogeneratore",
      modelloLabel: "Modello microcogeneratore",
      marcaField: "marca_cogen",
      modelloField: "modello_cogen",
      formatModello: function (r) {
        return (
          (r.modello || "") +
          " (" +
          (r.potenza_elettrica_kwe || "?") +
          " kWe, PES " +
          (r.pes_pct || "?") +
          "%)"
        );
      },
      fills: [
        { from: "potenza_elettrica_kwe", to: "potenza_elettrica" },
        { from: "potenza_termica_kwt", to: "potenza_termica" },
        { from: "rendimento_elettrico_pct", to: "rendimento_elettrico" },
        { from: "rendimento_termico_pct", to: "rendimento_termico" },
        { from: "pes_pct", to: "pes" },
      ],
      clears: [
        "modello_cogen",
        "potenza_elettrica",
        "potenza_termica",
        "rendimento_elettrico",
        "rendimento_termico",
        "pes",
      ],
    },
  };

  var _injectCatalogo = function (card, code, datiCorrenti, catalogo) {
    var cfg = CATALOGO_CONFIG[code];
    if (!cfg || !catalogo || catalogo.length === 0) return;

    var marca = datiCorrenti[cfg.marcaField] || "";
    var modello = datiCorrenti[cfg.modelloField] || "";

    var marche = [];
    var marcheSet = {};
    catalogo.forEach(function (r) {
      if (r.marca && !marcheSet[r.marca]) {
        marcheSet[r.marca] = true;
        marche.push(r.marca);
      }
    });
    marche.sort();

    var marcaName = code + "_" + cfg.marcaField;
    var modelloName = code + "_" + cfg.modelloField;

    var marcaOpts = '<option value="">-- Seleziona marca --</option>';
    marche.forEach(function (m) {
      marcaOpts +=
        '<option value="' + m.replace(/"/g, "&quot;") + '">' + m + "</option>";
    });

    var catHtml =
      '<div class="catalogo-pdc">' +
      '<div class="form-row"><label>' +
      cfg.marcaLabel +
      '</label><select class="cat-marca" name="' +
      marcaName +
      '">' +
      marcaOpts +
      "</select></div>" +
      '<div class="form-row"><label>' +
      cfg.modelloLabel +
      '</label><select class="cat-modello" name="' +
      modelloName +
      '"><option value="">-- Seleziona modello --</option></select></div>' +
      '<hr class="cat-sep">' +
      "</div>";

    var firstField = card.querySelector(".form-row");
    if (firstField) {
      firstField.insertAdjacentHTML("beforebegin", catHtml);
    } else {
      card.insertAdjacentHTML("beforeend", catHtml);
    }

    var marcaSel = card.querySelector(".cat-marca");
    var modSel = card.querySelector(".cat-modello");

    var _aggiornaModelli = function () {
      var selectedMarca = marcaSel.value;
      var filtered = [];
      catalogo.forEach(function (r) {
        if (r.marca === selectedMarca) filtered.push(r);
      });
      var opts = '<option value="">-- Seleziona modello --</option>';
      filtered.forEach(function (r) {
        opts +=
          '<option value="' +
          (r.modello || "").replace(/"/g, "&quot;") +
          '">' +
          cfg.formatModello(r) +
          "</option>";
      });
      modSel.innerHTML = opts;
      cfg.clears.forEach(function (f) {
        _setFieldValue(card, code + "_" + f, "");
      });
    };

    var _applicaModello = function () {
      var selectedMarca = marcaSel.value;
      var selectedMod = modSel.value;
      var found = null;
      for (var i = 0; i < catalogo.length; i++) {
        if (
          catalogo[i].marca === selectedMarca &&
          catalogo[i].modello === selectedMod
        ) {
          found = catalogo[i];
          break;
        }
      }
      if (found) {
        cfg.fills.forEach(function (f) {
          _setFieldValue(card, code + "_" + f.to, found[f.from]);
        });
      } else {
        cfg.clears.forEach(function (f) {
          _setFieldValue(card, code + "_" + f, "");
        });
      }
    };

    marcaSel.addEventListener("change", _aggiornaModelli);
    modSel.addEventListener("change", _applicaModello);

    // Ripristino valori salvati (solo se marca esiste nel catalogo)
    if (marca && marche.indexOf(marca) !== -1) {
      marcaSel.value = marca;
      _aggiornaModelli();
      if (modello) {
        var modelloEsiste = catalogo.some(function (r) {
          return r.marca === marca && r.modello === modello;
        });
        if (modelloEsiste) {
          modSel.value = modello;
          _applicaModello();
        }
      }
    }
  };

  var formatNum = function (val) {
    if (val === null || val === undefined || val === "") return "";
    if (typeof val === "string") {
      val = parseFloat(val.replace(",", "."));
      if (isNaN(val)) return val;
    }
    if (typeof val !== "number") return String(val);
    return val.toLocaleString("it-IT", {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    });
  };
  var _formatNum2 = function (val) {
    if (val === null || val === undefined || val === "") return "";
    if (typeof val === "string") {
      val = parseFloat(val.replace(",", "."));
      if (isNaN(val)) return val;
    }
    if (typeof val !== "number") return String(val);
    return val.toLocaleString("it-IT", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };

  var _fmtPerc = function (val) {
    if (val === null || val === undefined) return "";
    return (val * 100).toFixed(1) + "%";
  };

  var _setFieldValue = function (card, name, val) {
    var input = card.querySelector('[name="' + name + '"]');
    if (!input) return;
    if (val === null || val === undefined) val = "";
    input.value = val;
  };

  /* ========= GESTIONE DATI ECONOMICI ========= */

  var MAGGIORAZIONI_LIST = [
    ["piccola_impresa", "Piccola impresa (+20%)"],
    ["media_impresa", "Media impresa (+10%)"],
    ["zona_assistita_a", "Zona ass. Art.107.3.a (+15%)"],
    ["zona_assistita_c", "Zona ass. Art.107.3.c (+5%)"],
  ];

  var _syncEconomicoDaFlatKeys = function () {
    if (!_praticaData.economico) {
      _praticaData.economico = {};
    }
    var eco = _praticaData.economico;
    var selezionati = _praticaData.interventi || [];

    // Spese: converti solo se ci sono flat key nel DOM
    var hasSpeseKeys = selezionati.some(function (code) {
      return eco["eco_spesa_" + code] !== undefined;
    });
    if (hasSpeseKeys) {
      var newSpese = {};
      selezionati.forEach(function (code) {
        var flatKey = "eco_spesa_" + code;
        if (eco[flatKey] !== undefined && eco[flatKey] !== "") {
          newSpese[code] = parseFloat(eco[flatKey]) || 0;
        } else if (eco.spese && eco.spese[code] !== undefined) {
          newSpese[code] = eco.spese[code];
        }
      });
      eco.spese = newSpese;
    }

    // IVA: converti flat key in object per codice
    var hasIvaKeys = selezionati.some(function (code) {
      return eco["eco_iva_" + code] !== undefined;
    });
    if (hasIvaKeys) {
      var newIva = {};
      selezionati.forEach(function (code) {
        var flatKey = "eco_iva_" + code;
        if (eco[flatKey] !== undefined && eco[flatKey] !== "") {
          newIva[code] = parseFloat(eco[flatKey]) || 0;
        } else if (eco.iva && eco.iva[code] !== undefined) {
          newIva[code] = eco.iva[code];
        }
      });
      eco.iva = newIva;
    }

    // Maggiorazioni: converti solo se ci sono flat key nel DOM
    var hasMaggKeys = MAGGIORAZIONI_LIST.some(function (m) {
      return eco["magg_" + m[0]] !== undefined;
    });
    if (hasMaggKeys) {
      var newMagg = [];
      MAGGIORAZIONI_LIST.forEach(function (m) {
        if (eco["magg_" + m[0]]) {
          newMagg.push("magg_" + m[0]);
        }
      });
      eco.maggiorazioni = newMagg;
    }

    var flatKeys = Object.keys(eco).filter(function (k) {
      return (
        k.indexOf("eco_spesa_") === 0 ||
        k.indexOf("eco_iva_") === 0 ||
        k.indexOf("magg_") === 0
      );
    });
    flatKeys.forEach(function (k) {
      delete eco[k];
    });
  };

  const _renderStep5 = function () {
    const section = document.createElement("section");
    section.className = "wizard-step step5";
    section.innerHTML = '<div class="section-title">Dati Economici</div>';
    const selezionati = _praticaData.interventi || [];
    _syncEconomicoDaFlatKeys();
    var spese = _praticaData.economico.spese || {};
    var ivaValues = _praticaData.economico.iva || {};
    selezionati.forEach(function (code) {
      const meta = INTERVENTI[code];
      var spesa = spese[code] || 0;
      section.appendChild(
        _field(
          (meta ? code + " \u2014 " + meta.nome : code) +
            " \u2014 Importo (\u20ac)",
          _num("eco_spesa_" + code, spesa, 0),
        ),
      );
      var iva = ivaValues[code] || 0;
      section.appendChild(
        _field(
          (meta ? code + " \u2014 " + meta.nome : code) +
            " \u2014 IVA (\u20ac)",
          _num("eco_iva_" + code, iva, 0),
        ),
      );
    });
    var attive = _praticaData.economico.maggiorazioni || [];
    var maggiorazioniHtml =
      '<div class="card-title">Maggiorazioni</div><div class="maggiorazioni-list">';
    MAGGIORAZIONI_LIST.forEach(function (m) {
      var checked = attive.indexOf("magg_" + m[0]) !== -1;
      maggiorazioniHtml +=
        '<div class="maggiorazione-row">' +
        _chk("magg_" + m[0], m[1], checked) +
        "</div>";
    });
    maggiorazioniHtml += "</div>";
    section.insertAdjacentHTML("beforeend", maggiorazioniHtml);
    const calcBtn = document.createElement("button");
    calcBtn.id = "btn-calc-incentivo";
    calcBtn.className = "cmd-btn";
    calcBtn.textContent = "Calcola incentivo";
    calcBtn.title = "Calcola l'incentivo per gli interventi selezionati";
    calcBtn.addEventListener("click", function () {
      _bindFormData(section, _praticaData.economico);
      _syncEconomicoDaFlatKeys();
      const results = {};
      const richiedente = _praticaData.richiedente || {};
      const edificio = _praticaData.edificio || {};
      selezionati.forEach(function (code) {
        const dtMap = _praticaData.dati_tecnici || {};
        var datiTecnici = Object.assign({}, dtMap[code] || {});
        var ivaMap = _praticaData.economico.iva || {};
        if (richiedente.tipo_soggetto === "Impresa" && ivaMap[code]) {
          datiTecnici.importo_iva = ivaMap[code];
        }
        var ecoMagg = _praticaData.economico.maggiorazioni || [];
        var contesto = {
          soggetto: richiedente.tipo_soggetto,
          zonaClimatica: edificio.zona_climatica,
          isMultiIntervento: selezionati.length > 1,
          codiciSelezionati: selezionati,
          comuneSotto15k: !!edificio.comune_sotto_15k,
          scuolaOspedale: !!edificio.scuola_ospedale,
        };
        var mapMagg = {
          piccola_impresa: "piccolaImpresa",
          media_impresa: "mediaImpresa",
        };
        ecoMagg.forEach(function (m) {
          var key = m.replace("magg_", "");
          var camelKey = mapMagg[key];
          if (camelKey) contesto[camelKey] = true;
        });
        results[code] = _formulaEngine.calculate(code, datiTecnici, contesto);
      });
      const rd = document.getElementById("calcolo-risultati");
      if (!rd) return;
      var html = '<div class="card-title">Risultati Calcolo</div>';
      var totale = 0;
      Object.keys(results).forEach(function (code) {
        var r = results[code];
        html +=
          '<div class="result-card"><div class="card-title">' + code + "</div>";
        if (r.errors && r.errors.length > 0) {
          var errorHtml = '<p class="error">' + r.errors.join("<br>") + "</p>";
          html += errorHtml;
        } else {
          if (r.warnings && r.warnings.length > 0) {
            var warnHtml =
              '<div class="alert alert-warning" style="padding:8px;margin:8px 0;background:rgba(255,193,7,0.1);border:1px solid rgba(255,193,7,0.3);border-radius:4px;font-size:0.85rem;">';
            warnHtml += r.warnings
              .map(function (w) {
                return "<div>" + w + "</div>";
              })
              .join("");
            warnHtml += "</div>";
            html += warnHtml;
          }
          var ib = r.params && r.params._intensitaBreakdown;
          if (ib) {
            html +=
              '<div style="font-size:0.8rem;margin:6px 0;padding:6px;background:rgba(104,200,178,0.06);border-radius:4px;">';
            html += "<div><strong>Intensità:</strong></div>";
            html +=
              '<div style="display:grid;grid-template-columns:1fr 1fr;gap:2px 12px;">';
            html +=
              '<span>Base</span><span style="text-align:right;">' +
              _fmtPerc(ib.base) +
              "</span>";
            if (ib.madeInEuBonus > 0) {
              html +=
                '<span>Made in EU</span><span style="text-align:right;color:#68c8b2;">+' +
                _fmtPerc(ib.madeInEuBonus) +
                "</span>";
            }
            if (ib.maggiorazioneTotale > 0) {
              html +=
                '<span>Maggiorazioni</span><span style="text-align:right;color:#68c8b2;">+' +
                _fmtPerc(ib.maggiorazioneTotale) +
                "</span>";
            }
            if (ib.premialitaTotale > 0 && ib.madeInEuBonus > 0) {
              var altrePremialita = ib.premialitaTotale - ib.madeInEuBonus;
              if (altrePremialita > 0) {
                html +=
                  '<span>Altre premialità</span><span style="text-align:right;color:#68c8b2;">+' +
                  _fmtPerc(altrePremialita) +
                  "</span>";
              }
            }
            html +=
              '<span style="border-top:1px solid #ccc;">Ante-cap</span><span style="text-align:right;border-top:1px solid #ccc;">' +
              _fmtPerc(ib.anteCap) +
              "</span>";
            html +=
              "<span>Cap (" +
              _fmtPerc(ib.cap) +
              ')</span><span style="text-align:right;">' +
              (ib.anteCap > ib.cap
                ? '<span style="color:#e74c3c;">cappato</span>'
                : '<span style="color:#27ae60;">ok</span>') +
              "</span>";
            if (ib.capped30) {
              html +=
                '<span>Cap II.D/G/H</span><span style="text-align:right;color:#e74c3c;">30%</span>';
            }
            html +=
              '<span style="font-weight:600;border-top:2px solid #68c8b2;">Finale</span><span style="font-weight:600;text-align:right;border-top:2px solid #68c8b2;color:#68c8b2;">' +
              _fmtPerc(ib.valore) +
              "</span>";
            html += "</div></div>";
          }
          html +=
            "<p>Incentivo: <strong>" +
            PreventivoManager.formatCurrency(r.amount || 0) +
            "</strong></p>";
          if (r.incentivoNetto !== undefined) {
            html +=
              "<p>Netto: " +
              PreventivoManager.formatCurrency(r.incentivoNetto) +
              "</p>";
          }
          if (r.corrispettivoGSE) {
            html +=
              "<p>GSE: " +
              PreventivoManager.formatCurrency(r.corrispettivoGSE.importo) +
              "</p>";
          }
          if (r.paymentPlan) {
            html +=
              "<p>Rate: " + formatNum(r.paymentPlan.numInstallments) + "</p>";
          }
          totale += r.amount || 0;
        }
        html += "</div>";
      });
      if (Object.keys(results).length > 0) {
        var totaleHtml =
          '<div class="result-totale"><strong>Incentivo totale complessivo: ' +
          PreventivoManager.formatCurrency(totale) +
          "</strong></div>";

        const overallPlan = _calculateOverallPaymentPlan(
          results,
          richiedente.tipo_soggetto,
        );
        if (overallPlan) {
          let planHtml =
            '<div class="payment-plan-overall" style="margin-top:15px;padding:12px;border:1px dashed #68c8b2;border-radius:6px;background:rgba(104,200,178,0.05);">';
          planHtml +=
            '<div style="font-weight:600;color:#68c8b2;margin-bottom:8px;">Piano di Erogazione Incentivo Complessivo</div>';
          if (overallPlan.isSinglePayment) {
            planHtml +=
              '<p style="margin:4px 0;">Modalità: <strong>Unica annualità (Soluzione unica)</strong></p>';
            planHtml +=
              '<p style="margin:4px 0;">Importo: <strong>' +
              PreventivoManager.formatCurrency(overallPlan.total) +
              "</strong></p>";
          } else {
            planHtml +=
              '<p style="margin:4px 0;">Ripartizione in <strong>' +
              overallPlan.numInstallments +
              " rate annuali</strong>:</p>";
            planHtml +=
              '<table style="width:100%;font-size:0.9em;margin-top:5px;">';
            overallPlan.installments.forEach(function (inst) {
              planHtml +=
                "<tr><td>" +
                inst.label +
                '</td><td style="text-align:right;font-weight:600;">' +
                PreventivoManager.formatCurrency(inst.amount) +
                "</td></tr>";
            });
            planHtml += "</table>";
          }
          planHtml += "</div>";
          totaleHtml += planHtml;
        }
        // Acconto PA/ETS per prenotazione
        if (
          richiedente.tipo_soggetto === "Pubblica Amministrazione" ||
          richiedente.tipo_soggetto === "ETS non economico"
        ) {
          if (_praticaData.pratica.modalita_accesso === "prenotazione") {
            var maxDurata = 2;
            for (var keyAcc in results) {
              if (results.hasOwnProperty(keyAcc)) {
                var rP = results[keyAcc];
                if (
                  rP.paymentPlan &&
                  rP.paymentPlan.numInstallments > maxDurata
                ) {
                  maxDurata = rP.paymentPlan.numInstallments;
                }
              }
            }
            var accontoPerc = maxDurata > 2 ? 0.4 : 0.5;
            var accontoMax = totale * accontoPerc;
            var accontoLabel =
              maxDurata > 2
                ? "40% (2/5 per durata 5 anni)"
                : "50% (per durata 2 anni)";
            var accontoHtml =
              '<div class="payment-plan-overall" style="margin-top:15px;padding:12px;border:1px dashed #ff9800;border-radius:6px;background:rgba(255,152,0,0.05);">' +
              '<div style="font-weight:600;color:#ff9800;margin-bottom:8px;">Acconto PA (Prenotazione)</div>' +
              '<p style="margin:4px 0;">Acconto massimo erogabile: <strong>' +
              PreventivoManager.formatCurrency(accontoMax) +
              "</strong> (" +
              accontoLabel +
              ")</p>" +
              "<p style=\"margin:4px 0;font-size:0.85em;color:rgba(255,255,255,0.5);\">L'acconto è richiedibile all'avvio lavori. L'importo effettivo viene determinato dal GSE in fase di prenotazione.</p>" +
              '<div style="margin-top:8px;">' +
              "<label>Importo acconto richiesto (€):</label>" +
              '<input type="number" id="eco-importo-acconto" name="importo_acconto" value="' +
              (_praticaData.economico.importo_acconto ||
                Math.min(accontoMax, totale * (accontoPerc - 0.1))) +
              '" min="0" max="' +
              accontoMax +
              '" step="0.01" style="width:180px;margin-left:10px;padding:6px;background:rgba(255,255,255,0.1);border:1px solid rgba(255,255,255,0.2);border-radius:4px;color:#fff;">' +
              "</div></div>";
            totaleHtml += accontoHtml;
          }
        }
        html += totaleHtml;
      } else {
        html += "<p>Nessun calcolo.</p>";
      }
      rd.innerHTML = html;
    });
    section.appendChild(calcBtn);
    const rd = document.createElement("div");
    rd.id = "calcolo-risultati";
    rd.className = "calcolo-risultati";
    section.appendChild(rd);
    return section;
  };

  /* ========= REPORT, EXPORT, ARCHIVIAZIONE ========= */

  /**
   * Ricostruisce dati_tecnici ed economico a livello superiore
   * a partire dai dati per-intervento (backward compat per archivi vecchi).
   * @param {Object} dati - Oggetto dati pratica (modificato in-place).
   */
  const _normalizeFromComposed = function (dati) {
    if (!dati || !Array.isArray(dati.interventi)) return;
    if (typeof dati.interventi[0] !== "object") return;
    const dt = {};
    const spese = {};
    const preventivo = [];
    let maggiorazioni = [];
    let incentivo = null;
    dati.interventi.forEach(function (iv) {
      const code = iv.codice_intervento || "";
      if (!code) return;
      if (iv.dati_tecnici) dt[code] = iv.dati_tecnici;
      const eco = iv.economico || {};
      if (eco.spese !== undefined) spese[code] = eco.spese;
      if (Array.isArray(eco.preventivo)) {
        eco.preventivo.forEach(function (p) {
          preventivo.push(p);
        });
      }
      if (eco.maggiorazioni) maggiorazioni = eco.maggiorazioni;
      if (eco.incentivo) incentivo = eco.incentivo;
    });
    dati.dati_tecnici = dt;
    dati.economico = {
      spese: spese,
      preventivo: preventivo,
      maggiorazioni: maggiorazioni,
      incentivo: incentivo,
    };
  };

  /**
   * Genera il testo del report dettagliato della pratica.
   * @param {Object} [dati] - Se omesso, usa _praticaData.
   * @returns {string|null} Report formattato o null se dati non validi.
   */
  const _exportPraticaTxt = function (dati) {
    if (!dati) {
      dati = _praticaData;
    }
    _normalizeFromComposed(dati);

    if (!dati || !dati.pratica) {
      console.error("_exportPraticaTxt: dati pratica non validi");
      return null;
    }

    let interventi = dati.interventi || [];
    if (interventi.length > 0 && typeof interventi[0] === "object") {
      interventi = interventi
        .map(function (iv) {
          return iv.codice_intervento || "";
        })
        .filter(function (code) {
          return code !== "";
        });
    }
    interventi = interventi.slice().sort();

    const r = dati.richiedente || {};
    const p = dati.proprietario || {};
    const sr = dati.responsabile || {};
    const d = dati.delegato || {};
    const ed = dati.edificio || {};
    const dt = dati.dati_tecnici || {};
    const eco = dati.economico || {};
    const lines = [];

    const SEPARATOR = "-".repeat(40);
    const EQUAL = "=".repeat(60);

    const add = function (t) {
      lines.push(t);
    };

    add(EQUAL);
    add("  REPORT DETTAGLIATO PRATICA");
    add(EQUAL);
    add("");

    const praticaId = dati.pratica.id || "N/D";
    const praticaNome = dati.pratica.nome || "";
    const praticaDataCrea = dati.pratica.data_creazione || "";
    const praticaStatus = dati.pratica.status || "N/D";

    add("DATI GENERALI");
    add(SEPARATOR);
    add("  Codice:          " + (dati.pratica.codice || "N/D"));
    add("  ID:              " + praticaId);
    add("  Nome:            " + praticaNome);
    add("  Data creazione:  " + praticaDataCrea);
    add("  Data inserimento:" + (dati.pratica.data_inserimento || "N/D"));
    add("  Data richiesta:  " + (dati.pratica.data_richiesta || "N/D"));
    add("  Data fine lavori:" + (dati.pratica.data_fine_lavori || "N/D"));
    add("  Modalit\u00e0 accesso:" + (dati.pratica.modalita_accesso || "N/D"));
    add("  Stato:           " + praticaStatus);
    if (dati.pratica.richiestaPreliminareInviata) {
      const dataRich = dati.pratica.dataRichiestaPreliminare || "";
      const dataImpegno = dati.pratica.dataPrimoImpegno || "";
      add("  Rich. Preliminare: S\u00ec (" + dataRich + ")");
      add("  Primo impegno:     " + dataImpegno);
    }
    add("");

    const edIndirizzo = ed.indirizzo || "N/D";
    const edCatasto = ed.categoria_catastale || "N/D";
    const edZona = ed.zona_climatica || "N/D";
    const edSuperficie = ed.superficie_utile_mq || "N/D";
    const edAnno = ed.anno_costruzione || "N/D";

    const impianto = ed.impianto_esistente || {};
    const impiantoTipo = impianto.tipo || "Non specificato";
    const impiantoPot = impianto.potenza_kw
      ? impianto.potenza_kw + " kW"
      : "N/D";
    const impiantoComb = impianto.combustibile || "N/D";
    const impiantoLib = impianto.libretto ? "Sì" : "No";
    const impiantoLibCod = impianto.libretto_codice || "N/D";

    add("EDIFICIO");
    add(SEPARATOR);
    add("  Indirizzo:             " + edIndirizzo);
    add("  Categoria catastale:   " + edCatasto);
    add("  Zona climatica:        " + edZona);
    add("  Superficie utile mq:   " + edSuperficie);
    add("  Anno costruzione:      " + edAnno);
    add("  Impianto Esistente:");
    add("    Tipo:                " + impiantoTipo);
    add("    Potenza termica:     " + impiantoPot);
    add("    Combustibile:        " + impiantoComb);
    add("    Libretto presente:   " + impiantoLib);
    add("    Codice Libretto:     " + impiantoLibCod);
    add("");

    add("SOGGETTI");
    add(SEPARATOR);
    add("  SA (Richiedente):");
    add("    denominazione: " + (r.denominazione || "N/D"));
    add("    tipo: " + (r.tipo_soggetto || "N/D"));
    add("    cf_piva: " + (r.cf_piva || "N/D"));
    add("    email: " + (r.email || "N/D"));
    add("    telefono: " + (r.telefono || "N/D"));
    add("  SR (Responsabile):");
    add("    denominazione: " + (sr.denominazione || "N/D"));
    add("    cf_piva: " + (sr.cf_piva || "N/D"));
    add("    iban: " + (sr.iban || "N/D"));
    add("    pec: " + (sr.pec || "N/D"));
    add("  PROPRIETARIO:");
    add("    denominazione: " + (p.denominazione || "N/D"));
    add("    cf_piva: " + (p.cf_piva || "N/D"));
    if (d.denominazione) {
      add("  DELEGATO:");
      add("    nome: " + (d.denominazione || ""));
      add("    cf: " + (d.cf || ""));
    }
    add("");

    if (interventi.length) {
      add("INTERVENTI SELEZIONATI");
      add(SEPARATOR);
      interventi.forEach(function (code) {
        add("  " + code);
        const campi = dt[code] || {};
        for (const k in campi) {
          if (
            campi.hasOwnProperty(k) &&
            campi[k] !== "" &&
            campi[k] !== null &&
            campi[k] !== undefined
          ) {
            add("    " + k + ": " + campi[k]);
          }
        }
      });
      add("");
    }

    if (eco.preventivo && eco.preventivo.length) {
      const sortedPreventivo = eco.preventivo.slice().sort(function (a, b) {
        return (a.codice_intervento || "").localeCompare(
          b.codice_intervento || "",
        );
      });
      add("PREVENTIVO");
      add(SEPARATOR);
      let tot = 0;
      sortedPreventivo.forEach(function (item) {
        const imp = (item.importo || 0) * (item.quantita || 1);
        tot = tot + imp;
        const codice = item.codice_intervento || "?";
        const descr = item.descrizione || "";
        const tipo = item.tipo_costo || "";
        add(
          "  " +
            codice +
            " | " +
            descr +
            " | " +
            tipo +
            " | " +
            imp.toFixed(2) +
            " \u20ac",
        );
      });
      add("  " + "-".repeat(30));
      const totalePreventivo = tot.toFixed(2);
      add("  TOTALE: " + totalePreventivo + " \u20ac");
      add("");
    }

    add(EQUAL);
    const dataGenerazione = new Date().toLocaleString();
    add("  Generato il " + dataGenerazione);
    add(EQUAL);

    const output = lines.join("\n");
    return output;
  };

  /**
   * Salva il report in formato .txt via download o File System API.
   * @returns {Promise<void>}
   */
  const _saveSintesi = async function () {
    var content = _exportPraticaTxt();

    if (!content) {
      console.error("_saveSintesi: contenuto report non valido");
      return;
    }

    content = content + _exportCalcoliTxt() + _exportRisultatiTxt();

    const denominazione = _praticaData.richiedente.denominazione || "pratica";
    const fileName =
      denominazione.replace(/[^a-zA-Z0-9]/g, "_") +
      "_" +
      new Date().toISOString().slice(0, 10) +
      ".txt";

    if (window.showSaveFilePicker) {
      try {
        const handle = await window.showSaveFilePicker({
          suggestedName: fileName,
          types: [
            {
              description: "Documento di Testo",
              accept: { "text/plain": [".txt"] },
            },
          ],
        });
        const writable = await handle.createWritable();
        await writable.write(content);
        await writable.close();
        return;
      } catch (err) {
        if (err.name === "AbortError") {
          return;
        }
        console.error(
          "_saveSintesi: showSaveFilePicker fallito, uso fallback",
          err,
        );
      }
    }

    const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = fileName;
    link.click();
  };

  /**
   * Stampa il report via finestra browser print.
   * @returns {void}
   */
  const _printSintesi = function () {
    const win = UaWindowAdm.get("win-report-preview");
    if (!win) {
      console.error("_printSintesi: finestra report non trovata");
      return;
    }

    const bodyEl = win.getElement().querySelector(".window-body");
    if (!bodyEl) {
      console.error("_printSintesi: corpo finestra non trovato");
      return;
    }

    const printContent = bodyEl.innerHTML;
    const printWindow = window.open("", "_blank");

    const docHtml =
      "<!DOCTYPE html><html><head><title>Sintesi Pratica CT 3.0</title>" +
      "<style>" +
      "body{font-family:sans-serif;padding:40px;color:#333;}" +
      "h1,h2,h3,h4{color:#68c8b2;}" +
      "h2{border-bottom:2px solid #68c8b2;padding-bottom:8px;margin-top:40px;}" +
      ".report-section{margin-bottom:25px;}" +
      ".report-item{margin-bottom:25px;padding:20px;border:1px solid #eee;border-left:5px solid #68c8b2;border-radius:4px;}" +
      ".data-table{width:100%;border-collapse:collapse;margin-top:15px;}" +
      ".data-table th,.data-table td{padding:12px;border:1px solid #eee;text-align:left;}" +
      ".data-table th{background:#f5f5f5;font-weight:600;}" +
      ".simple-data-table td{padding:4px 8px;border-bottom:1px solid #eee;}" +
      ".field-label{font-weight:600;color:#666;width:50%;}" +
      ".clean-list{list-style:none;padding:0;margin:0;font-size:0.9em;}" +
      ".clean-list li{margin-bottom:5px;}" +
      '.clean-list li:before{content:"\\2022 ";color:#68c8b2;font-weight:bold;}' +
      ".tag{display:inline-block;padding:4px 8px;background:#e8f5e9;color:#2e7d32;border-radius:4px;font-size:0.8em;font-weight:600;}" +
      ".watermark-overlay,.nav-actions,button,.header-actions{display:none !important;}" +
      "</style></head><body>" +
      printContent +
      "<script>setTimeout(function(){window.print();window.close();},500);</script></body></html>";

    printWindow.document.write(docHtml);
    printWindow.document.close();
  };

  /**
   * Archivia la pratica in IndexedDB con nome specifico.
   * @returns {Promise<void>}
   */
  const _archivePratica = async function () {
    const currentNome = _praticaData.pratica.nome || "";
    const saDenominazione = _praticaData.richiedente.denominazione || "nuova";

    // Validazione obbligo mantenimento 5 anni
    const interventi = _praticaData.interventi || [];
    if (interventi.length > 0) {
      const chkObbligo = document.getElementById("chk-obbligo-mantenimento");
      const accettato = chkObbligo
        ? chkObbligo.checked
        : _praticaData.obbligo_mantenimento_accettato === true;
      if (!accettato) {
        alert(
          "Obbligo normativo: \u00e8 necessario accettare l'obbligo di mantenimento dell'impianto per 5 anni prima di archiviare la pratica.",
        );
        return;
      }
      _praticaData.obbligo_mantenimento_accettato = true;
    }

    // Legge il codice dal DOM input (campo "Codice pratica" in Step 1)
    const codInput = document.querySelector('input[name="codice"]');
    let codicePratica = codInput ? codInput.value.trim() : "";
    if (!codicePratica) {
      codicePratica = _praticaData.pratica.codice || "";
    }
    if (!codicePratica) {
      codicePratica = await _generateNewCodice();
    }

    // Prompt: mostra il CODICE come default
    const defaultCodice =
      codicePratica ||
      currentNome ||
      "Pratica_" + saDenominazione.replace(/\s+/g, "_");
    const promptMsg = "Codice pratica:";
    let codiceConfermato = await prompt(promptMsg, defaultCodice);

    if (!codiceConfermato) {
      return;
    }

    // Verifica se il codice CONFERMATO esiste già nel DB
    let existingId = null;
    let codiceExists = false;
    try {
      const allPratiche = await praticheMgr.getAll();
      for (let i = 0; i < allPratiche.length; i++) {
        const p = allPratiche[i];
        const c = (p.dati && p.dati.pratica && p.dati.pratica.codice) || "";
        if (c === codiceConfermato) {
          codiceExists = true;
          existingId = p.id;
          break;
        }
      }
    } catch (e) {
      console.error("_archivePratica: errore scan DB", e);
    }

    if (codiceExists) {
      const sovrascrivi = confirm(
        'Codice "' +
          codiceConfermato +
          '" gi\u00e0 esistente.\nOK = Sovrascrivi\nAnnulla = Annulla',
      );
      if (!sovrascrivi) {
        return;
      }
    }

    // Il nome resta quello del form Step 1 ("Nome pratica")
    // Il codice viene aggiornato con il valore confermato dall'utente (key univoca)
    _praticaData.pratica.codice = codiceConfermato;

    try {
      let id = existingId || "PRATICA_" + Date.now();

      const dataCrea =
        _praticaData.pratica.data_creazione || new Date().toISOString();

      // Sincronizza i dati dal DOM a _praticaData prima di salvare
      const stepSections = _viewport.querySelectorAll(".wizard-step");
      stepSections.forEach(function (section) {
        if (section.classList.contains("step2")) {
          _bindFormData(section, _praticaData);
        } else if (section.classList.contains("step0")) {
          _bindFormData(section, _praticaData.pratica);
        } else if (section.classList.contains("step1")) {
          _bindFormData(section, _praticaData.edificio);
        } else if (section.classList.contains("step4")) {
          _bindFormData(section, _praticaData.dati_tecnici);
        } else if (section.classList.contains("step5")) {
          _bindFormData(section, _praticaData.economico);
        }
      });
      _syncEconomicoDaFlatKeys();

      const datiToStore = JSON.parse(JSON.stringify(_praticaData));

      if (
        Array.isArray(datiToStore.interventi) &&
        datiToStore.interventi.length > 0 &&
        typeof datiToStore.interventi[0] === "string"
      ) {
        const ecoSaved = datiToStore.economico || {};
        const speseSaved = ecoSaved.spese || {};
        const preventivoSaved = ecoSaved.preventivo || [];
        datiToStore.interventi = datiToStore.interventi.map(function (code) {
          const ecoForCode = preventivoSaved.filter(function (p) {
            return p.codice_intervento === code;
          });
          return {
            id_intervento: id + "_" + code,
            codice_intervento: code,
            is_trainante: false,
            dati_tecnici:
              (datiToStore.dati_tecnici && datiToStore.dati_tecnici[code]) ||
              {},
            economico: {
              spese: speseSaved[code] || 0,
              preventivo: ecoForCode,
              totale_spese: ecoForCode.reduce(function (sum, p) {
                return sum + (parseFloat(p.importo) || 0);
              }, 0),
              maggiorazioni: ecoSaved.maggiorazioni || [],
              incentivo: ecoSaved.incentivo || null,
            },
          };
        });
      }

      const dataToSave = {
        id: id,
        nome: currentNome,
        dataCrea: dataCrea,
        dati: datiToStore,
      };

      await praticheMgr.save(dataToSave);

      _praticaData.pratica.id = id;

      try {
        const soggetto = _praticaData.richiedente?.tipo_soggetto || "";
        if (soggetto) {
          const eco = datiToStore.economico || {};
          let totaleIncentivo = 0;
          for (const key of Object.keys(eco)) {
            const amt = parseFloat(eco[key]?.incentivo_totale) || 0;
            totaleIncentivo = totaleIncentivo + amt;
          }
          if (totaleIncentivo > 0) {
            await budgetMgr.addIncentivo(soggetto, totaleIncentivo);
          }
        }
      } catch (e) {
        console.error("_archivePratica: aggiornamento budget fallito", e);
      }

      const btn = document.getElementById("btn-wiz-archive");
      if (btn) {
        btn.disabled = true;
        btn.innerText = "Pratica Archiviata";
      }

      alert("Pratica archiviata: " + currentNome);
    } catch (error) {
      console.error("_archivePratica: Errore nel salvataggio", error);
    }
  };

  /**
   * Visualizza l'anteprima del report finale in una finestra UaWindowAdm.
   * @returns {void}
   */
  const _exportCalcoliTxt = function () {
    const interventi = _praticaData.interventi || [];
    const dt = _praticaData.dati_tecnici || {};
    const ed = _praticaData.edificio || {};
    const sa = _praticaData.richiedente || {};
    const lines = [];
    const SEPARATOR = "-".repeat(40);

    if (!interventi.length) return "";

    lines.push("");
    lines.push(SEPARATOR);
    lines.push("  CALCOLI — FORMULE INCENTIVO");
    lines.push(SEPARATOR);
    lines.push("");

    interventi.forEach(function (code) {
      const dati = dt[code] || {};
      const metadata = FORMULE_INCENTIVO[code];
      const calc = FormulaEngine.calculate(code, dati, {
        zonaClimatica: ed.zona_climatica,
        soggetto: sa.tipo_soggetto,
        codiciSelezionati: interventi,
        comuneSotto15k: !!ed.comune_sotto_15k,
        scuolaOspedale: !!ed.scuola_ospedale,
      });
      const metaIntervento = INTERVENTI[code] || {};
      const nomeIntervento = metaIntervento.nome || code;

      var formulaBase = "";
      if (metadata) {
        formulaBase = metadata.formula_base || "";
      }

      lines.push("  " + code + " — " + nomeIntervento);
      if (formulaBase) {
        lines.push("    Formula: I = " + formulaBase);
      }

      if (calc.steps && calc.steps.length > 0) {
        lines.push("    " + "Passaggi:");
        calc.steps.forEach(function (s) {
          var label = s.label || "";
          var desc = s.desc || "";
          var formulaExpr = s.formula || "";
          var calcVal = "";
          if (s.formula && calc.params) {
            calcVal = _substituteParams(s.formula, calc.params);
          }
          var isCurrency = typeof s.value === "number" && s.unit === "\u20ac";
          var valStr = isCurrency
            ? PreventivoManager.formatCurrency(s.value)
            : _formatNum2(s.value) + (s.unit ? " " + s.unit : "");
          var cellDesc = desc ? desc + " (" + label + ")" : label;
          lines.push(
            "      " +
              cellDesc +
              ": " +
              (formulaExpr || "") +
              " = " +
              calcVal +
              " => " +
              valStr,
          );
        });
      }

      if (calc.amount !== undefined) {
        var formattedAmount = PreventivoManager.formatCurrency(calc.amount);
        lines.push(
          "    Risultato: I = " +
            (formulaBase || "?") +
            " = " +
            formattedAmount,
        );
        if (calc.incentivoNetto !== undefined) {
          var nettoFormatted = PreventivoManager.formatCurrency(
            calc.incentivoNetto,
          );
          var gseFormatted = PreventivoManager.formatCurrency(
            calc.corrispettivoGSE ? calc.corrispettivoGSE.importo : 0,
          );
          lines.push(
            "    Netto GSE: " +
              nettoFormatted +
              " (corrispettivo GSE: " +
              gseFormatted +
              ")",
          );
        }
        if (calc.paymentPlan) {
          var rate = calc.paymentPlan.numInstallments;
          var rataLabel =
            rate === 1 ? "Unica soluzione" : rate + " rate annuali";
          lines.push("    Erogazione: " + rataLabel);
        }
      }

      if (calc.errors && calc.errors.length > 0) {
        lines.push("    Errori:");
        calc.errors.forEach(function (e) {
          lines.push("      - " + e);
        });
      }

      lines.push("");
    });

    return lines.join("\n");
  };

  const _exportRisultatiTxt = function () {
    const interventi = _praticaData.interventi || [];
    const dt = _praticaData.dati_tecnici || {};
    const ed = _praticaData.edificio || {};
    const sa = _praticaData.richiedente || {};
    const lines = [];
    const SEPARATOR = "-".repeat(40);

    if (!interventi.length) return "";

    lines.push("");
    lines.push(SEPARATOR);
    lines.push("  RISULTATI — DETTAGLIO CALCOLI");
    lines.push(SEPARATOR);
    lines.push("");

    interventi.forEach(function (code) {
      const dati = dt[code] || {};
      const calc = FormulaEngine.calculate(code, dati, {
        zonaClimatica: ed.zona_climatica,
        soggetto: sa.tipo_soggetto,
        codiciSelezionati: interventi,
        comuneSotto15k: !!ed.comune_sotto_15k,
        scuolaOspedale: !!ed.scuola_ospedale,
      });

      lines.push("  Intervento " + code);

      if (calc.steps && calc.steps.length > 0) {
        calc.steps.forEach(function (s) {
          var isCurrency = typeof s.value === "number" && s.unit === "\u20ac";
          var valStr = isCurrency
            ? PreventivoManager.formatCurrency(s.value)
            : _formatNum2(s.value) + (s.unit ? " " + s.unit : "");
          var desc = s.desc || "";
          var label = s.label || "";
          var calcVal =
            s.calc ||
            (typeof s.value === "number" ? _formatNum2(s.value) : s.value);
          lines.push(
            "    " + desc + " | " + label + " | " + calcVal + " = " + valStr,
          );
        });
      } else {
        lines.push("    Nessun dettaglio disponibile.");
      }

      if (calc.errors && calc.errors.length > 0) {
        lines.push("    Errori:");
        calc.errors.forEach(function (e) {
          lines.push("      - " + e);
        });
      }

      lines.push("");
    });

    return lines.join("\n");
  };

  const _showExportDataPreview = function () {
    const winId = "win-export-dati";
    let win = UaWindowAdm.get(winId);

    if (!win) {
      win = UaWindowAdm.create(winId);
      win.addClassStyle("ua-modal-window");
      win.setStyle({ minWidth: "800px", minHeight: "70vh" });
      win.setXY(10, 10).setZ(1500).drag();
    }

    const isDark = document.body.classList.contains("dark-theme");
    win.removeClassStyle("dark-theme").removeClassStyle("light-theme");
    win.addClassStyle(isDark ? "dark-theme" : "light-theme");

    var content = _exportPraticaTxt();

    if (!content) {
      const html =
        '<div class="window-header">' +
        '<span class="title">DATI PRATICA</span>' +
        '<button class="close-btn btn-close-win" title="Chiudi">&times;</button>' +
        "</div>" +
        '<div class="window-body" style="padding:40px;text-align:center;">' +
        '<p style="color:#f44336;">Errore: dati pratica non validi o assenti.</p>' +
        "</div>";
      win.setHtml(html).show();
      const closeBtn = win.getElement().querySelector(".btn-close-win");
      if (closeBtn)
        closeBtn.onclick = function () {
          win.close();
        };
      return;
    }

    var calcoliTxt = _exportCalcoliTxt();
    var risultatiTxt = _exportRisultatiTxt();
    content = content + calcoliTxt + risultatiTxt;

    const html =
      '<div class="window-header">' +
      '<span class="title">DATI PRATICA - ' +
      (_praticaData.richiedente?.denominazione || "Report") +
      "</span>" +
      '<div class="header-actions">' +
      '<button id="btn-save-dati-txt" class="cmd-btn" title="Salva i dati in un file di testo" style="background:linear-gradient(135deg,#1976d2,#1565c0);border-color:#1976d2;color:#fff;text-shadow:0 1px 2px rgba(0,0,0,0.3);">SALVA</button>' +
      "</div>" +
      '<button class="close-btn btn-close-win" title="Chiudi">&times;</button>' +
      "</div>" +
      '<div class="window-body" style="padding:20px;">' +
      '<pre style="background:' +
      (isDark ? "#1e1e1e" : "#f5f5f5") +
      ";color:" +
      (isDark ? "#e0e0e0" : "#1e1e1e") +
      ';padding:16px;border-radius:6px;font-family:monospace;font-size:0.85rem;line-height:1.5;overflow:auto;max-height:70vh;white-space:pre-wrap;word-break:break-word;">' +
      content
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;") +
      "</pre>" +
      "</div>";

    win.setHtml(html).show();

    const winEl = win.getElement();
    const closeBtn = winEl.querySelector(".btn-close-win");
    if (closeBtn)
      closeBtn.onclick = function () {
        win.close();
      };
    const saveBtn = winEl.querySelector("#btn-save-dati-txt");
    if (saveBtn)
      saveBtn.onclick = function () {
        _saveSintesi();
      };
  };

  const _showReportPreview = async function () {
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

    const dateStr = new Date().toLocaleDateString("it-IT");
    const rel = ReliabilityEngine.calculateReliability(
      _praticaData.dati_tecnici,
      {},
    );
    const sa = _praticaData.richiedente || {};
    const sr = _praticaData.responsabile || {};
    const prop = _praticaData.proprietario || {};
    const del = _praticaData.delegato || {};
    const ed = _praticaData.edificio || {};
    const interventi = _praticaData.interventi || [];
    const dt = _praticaData.dati_tecnici || {};
    const eco = _praticaData.economico || {};
    const p = _praticaData.pratica || {};

    let scadColore = "#4caf50";
    let scadMsg = "Nei termini";
    let scad5 = "N/D";
    if (p.modalita_accesso === "diretto" && p.data_fine_lavori) {
      var dtFine = new Date(p.data_fine_lavori);
      if (!isNaN(dtFine.getTime())) {
        var oggiDate = new Date();
        var ggTrascorsi = Math.floor(
          (oggiDate - dtFine) / (1000 * 60 * 60 * 24),
        );
        var ggResidui = 60 - ggTrascorsi;
        if (ggTrascorsi > 60) {
          scadColore = "#f44336";
          scadMsg = "SCADUTO da " + (ggTrascorsi - 60) + " giorni!";
        } else if (ggResidui <= 15) {
          scadColore = "#ff9800";
          scadMsg = "In scadenza! " + ggResidui + "gg residui su 60gg.";
        } else {
          scadMsg = ggResidui + "gg residui su 60gg";
        }
        scad5 = new Date(dtFine.getTime() + 5 * 365 * 24 * 60 * 60 * 1000)
          .toISOString()
          .slice(0, 10);
      }
    }

    const getLabel = function (code, key) {
      const scheda = SCHEDE_TECNICHE[code];
      if (!scheda) {
        return key;
      }
      const campo = scheda.campi.find(function (c) {
        return c.id === key;
      });
      const label = campo ? campo.label : key;
      return label;
    };

    let totalInvestment = 0;
    let totalIncentive = 0;
    let summaryRows = "";
    const results = {};

    interventi.forEach(function (code) {
      const tech = dt[code] || {};
      const meta = INTERVENTI[code] || {};
      const calc = FormulaEngine.calculate(code, tech, {
        zonaClimatica: ed.zona_climatica,
        soggetto: sa.tipo_soggetto,
        codiciSelezionati: interventi,
        comuneSotto15k: !!ed.comune_sotto_15k,
        scuolaOspedale: !!ed.scuola_ospedale,
      });
      results[code] = calc;
      const scheda = SCHEDE_TECNICHE[code];
      const spesaField = scheda
        ? scheda.campi.find(function (c) {
            return c.categoria === "economico";
          })
        : null;
      const spesa = spesaField
        ? parseFloat(tech[spesaField.id]) || 0
        : eco.spese
          ? eco.spese[code] || 0
          : 0;

      totalInvestment = totalInvestment + spesa;
      totalIncentive = totalIncentive + (calc.amount || 0);

      const spesaFormatted = PreventivoManager.formatCurrency(spesa);
      const incentivoFormatted = rel.showNumbers
        ? PreventivoManager.formatCurrency(calc.amount)
        : "[RISERVATO]";
      const nomeIntervento = meta.nome || "";

      summaryRows =
        summaryRows +
        "<tr><td><strong>" +
        code +
        "</strong></td>" +
        '<td style="text-align:right;">' +
        spesaFormatted +
        "</td>" +
        '<td style="text-align:right;font-weight:700;">' +
        incentivoFormatted +
        "</td>" +
        "<td>" +
        nomeIntervento +
        "</td></tr>";
    });

    let overallPlanHtml = "";
    const overallPlan = _calculateOverallPaymentPlan(results, sa.tipo_soggetto);
    if (overallPlan) {
      overallPlanHtml =
        '<div style="margin-top:20px;padding:15px;border:1px solid rgba(104,200,178,0.3);border-radius:6px;background:rgba(104,200,178,0.05);">' +
        '<div style="font-weight:700;color:#68c8b2;font-size:1.1em;margin-bottom:10px;">PIANO DI EROGAZIONE INCENTIVO COMPLESSIVO</div>';
      if (overallPlan.isSinglePayment) {
        overallPlanHtml +=
          '<p style="margin:4px 0;">Erogazione in <strong>unica annualità (soluzione unica)</strong> per importo complessivo sotto la soglia di 15.000 €.</p>' +
          '<p style="margin:4px 0;font-size:1.1em;">Importo erogato: <strong>' +
          PreventivoManager.formatCurrency(overallPlan.total) +
          "</strong></p>";
      } else {
        overallPlanHtml +=
          '<p style="margin:4px 0;">Erogazione suddivisa in <strong>' +
          overallPlan.numInstallments +
          " rate annuali</strong>:</p>" +
          '<table class="simple-data-table" style="margin-top:8px;font-size:0.95em;width:auto;min-width:300px;">';
        overallPlan.installments.forEach(function (inst) {
          overallPlanHtml +=
            '<tr><td style="padding:4px 15px 4px 0;"><strong>' +
            inst.label +
            "</strong></td>" +
            '<td style="text-align:right;font-weight:700;">' +
            PreventivoManager.formatCurrency(inst.amount) +
            "</td></tr>";
        });
        overallPlanHtml += "</table>";
      }
      overallPlanHtml += "</div>";
    }

    let interventiHtml = "";

    interventi.forEach(function (code) {
      const info = INTERVENTI[code] || {};
      const tech = dt[code] || {};
      const calc = FormulaEngine.calculate(code, tech, {
        zonaClimatica: ed.zona_climatica,
        soggetto: sa.tipo_soggetto,
        codiciSelezionati: interventi,
        comuneSotto15k: !!ed.comune_sotto_15k,
        scuolaOspedale: !!ed.scuola_ospedale,
      });

      let techRows = "";
      for (const k in tech) {
        if (
          tech.hasOwnProperty(k) &&
          tech[k] !== "" &&
          tech[k] !== null &&
          tech[k] !== undefined
        ) {
          const isCosto =
            k.indexOf("costo_") === 0 || k.indexOf("spesa_") === 0;
          if (isCosto) {
            continue;
          }
          const label = getLabel(code, k);
          const rawVal = tech[k];
          const valStr =
            typeof rawVal === "number" ? formatNum(rawVal) : rawVal;
          techRows =
            techRows +
            '<tr><td class="field-label">' +
            label +
            "</td><td>" +
            valStr +
            "</td></tr>";
        }
      }

      const lavorazioni = (info.lavorazioni_comprese || [])
        .map(function (l) {
          return "<li>" + l + "</li>";
        })
        .join("");
      const calcStatus = calc.status || "OK";
      const nomeInfo = info.nome || "";

      interventiHtml =
        interventiHtml +
        '<div class="report-item" style="border-left:5px solid #68c8b2;">' +
        '<div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:15px;">' +
        '<div><h3 style="margin:0;color:#68c8b2;">Intervento ' +
        code +
        "</h3>" +
        '<div style="font-weight:600;font-size:1.1em;">' +
        nomeInfo +
        "</div></div>" +
        '<div class="tag success" style="font-size:0.8em;">' +
        calcStatus +
        "</div></div>" +
        '<div class="report-grid" style="display:grid;grid-template-columns:1fr 1fr;gap:30px;">' +
        '<section><h4>Parametri Tecnici</h4><table class="simple-data-table">' +
        techRows +
        "</table></section>" +
        '<section><h4>Lavorazioni Ammesse</h4><ul class="clean-list">' +
        lavorazioni +
        "</ul></section></div></div>";
    });

    let watermarkHtml = "";
    if (rel.watermark) {
      watermarkHtml =
        '<div class="watermark-overlay" style="position:absolute;top:50%;left:50%;transform:translate(-50%,-50%) rotate(-45deg);font-size:80px;opacity:0.05;pointer-events:none;white-space:nowrap;color:#d32f2f;font-weight:900;z-index:10;">' +
        rel.watermark +
        "</div>";
    }

    const saDenominazione = sa.denominazione || "Report";
    const praticaId = _praticaData.pratica.id || "N/D";
    const totalInvestmentFormatted =
      PreventivoManager.formatCurrency(totalInvestment);
    const totalIncentiveFormatted = rel.showNumbers
      ? PreventivoManager.formatCurrency(totalIncentive)
      : "DA VERIFICARE";
    const bgColor = isDark ? "#2a2a2a" : "#f5f5f5";
    const incentiveColor = "#68c8b2";
    const affLabel = rel.label || "N/D";
    const darkFg = "rgba(255,255,255,0.6)";

    const impianto = ed.impianto_esistente || {};
    const impiantoHtml =
      '<strong>Impianto Esistente:</strong><br><span style="font-size:0.9em;">' +
      (impianto.tipo || "Non specificato") +
      (impianto.potenza_kw ? " (" + impianto.potenza_kw + " kW)" : "") +
      (impianto.combustibile ? " - " + impianto.combustibile : "") +
      (impianto.libretto ? " | Libretto: Sì" : " | Libretto: No") +
      (impianto.libretto_codice
        ? " (Cod. " + impianto.libretto_codice + ")"
        : "") +
      "</span><br>";

    let html =
      '<div class="window-header">' +
      '<span class="title">Report CT 3.0 - ' +
      saDenominazione +
      "</span>" +
      '<div class="header-actions">' +
      '<button id="btn-save-report-pdf" class="cmd-btn" title="Stampa il report" style="background:linear-gradient(135deg,#d32f2f,#b71c1c);border-color:#d32f2f;color:#fff;text-shadow:0 1px 2px rgba(0,0,0,0.3);">Stampa Report</button>' +
      "</div>" +
      '<button class="close-btn btn-close-win" title="Chiudi">&times;</button>' +
      "</div>" +
      '<div class="window-body" style="position:relative;">' +
      watermarkHtml +
      '<header style="text-align:center;margin-bottom:40px;border-bottom:3px solid #68c8b2;padding-bottom:20px;">' +
      '<h1 style="margin:0;color:#68c8b2;font-size:2.2em;">REPORT DI ANALISI PRELIMINARE</h1>' +
      '<div style="text-transform:uppercase;letter-spacing:2px;font-weight:600;margin-top:5px;">Conto Termico 3.0</div>' +
      '<div style="margin-top:15px;font-size:0.9em;color:' +
      darkFg +
      ';">Data: ' +
      dateStr +
      " | ID: " +
      praticaId +
      "</div>" +
      "</header>" +
      '<div class="report-section"><h2 style="border-bottom:1px solid #68c8b2;padding-bottom:8px;">1. Riepilogo Economico</h2>' +
      '<table class="data-table" style="margin-top:15px;"><thead><tr><th>Intervento</th><th style="text-align:right;">Investimento</th><th style="text-align:right;">Incentivo</th><th>Descrizione</th></tr></thead><tbody>' +
      summaryRows +
      "</tbody>" +
      '<tfoot><tr style="background:' +
      bgColor +
      ';font-size:1.1em;">' +
      '<td><strong>TOTALE</strong></td><td style="text-align:right;font-weight:700;">' +
      totalInvestmentFormatted +
      "</td>" +
      '<td style="text-align:right;font-weight:800;color:' +
      incentiveColor +
      ';font-size:1.2em;">' +
      totalIncentiveFormatted +
      "</td><td></td></tr></tfoot></table>" +
      overallPlanHtml +
      '<div style="margin-top:10px;font-size:0.85em;font-style:italic;color:' +
      darkFg +
      ';">Affidabilità: ' +
      affLabel +
      "</div></div>" +
      '<div class="report-section" style="margin-top:40px;"><h2 style="border-bottom:1px solid #68c8b2;padding-bottom:8px;">2. Soggetti e Immobile</h2>' +
      '<table class="data-table"><thead><tr><th>Soggetti</th><th>Edificio</th></tr></thead><tbody>' +
      '<tr><td style="vertical-align:top;padding:12px;">' +
      '<strong>SA:</strong><br><span style="font-size:0.9em;">' +
      (sa.denominazione || "N/D") +
      " (" +
      (sa.tipo_soggetto || "N/D") +
      ")</span><br>" +
      '<strong>SR:</strong><br><span style="font-size:0.9em;">' +
      (sr.denominazione || "N/D") +
      "</span><br>" +
      '<strong>Proprietario:</strong><br><span style="font-size:0.9em;">' +
      (prop.denominazione || "N/D") +
      "</span>" +
      (del.denominazione
        ? '<br><strong>Delegato:</strong><br><span style="font-size:0.9em;">' +
          del.denominazione +
          "</span>"
        : "") +
      '</td><td style="vertical-align:top;padding:12px;">' +
      '<strong>Indirizzo:</strong><br><span style="font-size:0.9em;">' +
      (ed.indirizzo || "N/D") +
      "</span><br>" +
      '<strong>Catasto:</strong><br><span style="font-size:0.9em;">' +
      (ed.categoria_catastale || "N/D") +
      " | Zona " +
      (ed.zona_climatica || "N/D") +
      "</span><br>" +
      '<strong>Superficie:</strong><br><span style="font-size:0.9em;">' +
      (ed.superficie_utile_mq || "N/D") +
      " mq</span><br>" +
      impiantoHtml +
      "</td></tr></tbody></table></div>" +
      '<div class="report-section" style="margin-top:40px;"><h2 style="border-bottom:1px solid #68c8b2;padding-bottom:8px;">3. Scadenze</h2>' +
      '<table class="data-table"><thead><tr><th>Data</th><th>Valore</th></tr></thead><tbody>' +
      "<tr><td>Fine lavori</td><td>" +
      (p.data_fine_lavori || "N/D") +
      "</td></tr>" +
      "<tr><td>Richiesta</td><td>" +
      (p.data_richiesta || "N/D") +
      "</td></tr>" +
      '<tr><td>Termine 60gg</td><td style="color:' +
      scadColore +
      ';font-weight:600;">' +
      scadMsg +
      "</td></tr>" +
      "<tr><td>Obbligo 5 anni</td><td>Scadenza " +
      scad5 +
      "</td></tr>" +
      "</tbody></table></div>" +
      '<div class="report-section" style="margin-top:40px;"><h2 style="border-bottom:1px solid #68c8b2;padding-bottom:8px;">4. Dettaglio Interventi</h2>' +
      interventiHtml +
      "</div>" +
      '<footer style="margin-top:50px;padding-top:20px;border-top:2px solid #333;font-size:0.8em;color:rgba(255,255,255,0.4);">' +
      "<p><strong>DISCLAIMER:</strong> Report generato dal sistema CT30 Advisor. I valori hanno natura indicativa e non costituiscono impegno vincolante del GSE.</p>" +
      "<p><strong>Obbligo normativo:</strong> Il richiedente \u00e8 tenuto al mantenimento dell'impianto per 5 anni dalla data di erogazione dell'incentivo (D.M. 7 agosto 2025).</p></footer></div>";

    // Carica info plafond asincrono
    let budgetHtml = "";
    try {
      const soggetto = _praticaData.richiedente?.tipo_soggetto || "";
      const { PROCEDURA_CONFIG } = await import("./core/normativa.js");
      const plafondMap = PROCEDURA_CONFIG?.PLAFOND || {};
      const report = await budgetMgr.getUsageReport(plafondMap);
      if (soggetto && report[soggetto]) {
        const r = report[soggetto];
        const pct = r.percentuale;
        const color = pct > 90 ? "#f44336" : pct > 70 ? "#ff9800" : "#4caf50";
        budgetHtml =
          '<div class="report-section" style="margin-top:30px;padding:12px 16px;border:1px solid ' +
          color +
          ';border-radius:6px;">' +
          '<h3 style="margin:0 0 8px;color:' +
          color +
          ';">Plafond ' +
          soggetto +
          "</h3>" +
          '<div style="font-size:0.85em;">Budget: ' +
          r.budget.toLocaleString("it-IT") +
          " €</div>" +
          '<div style="font-size:0.85em;">Utilizzato: ' +
          r.used.toLocaleString("it-IT", { minimumFractionDigits: 2 }) +
          " €</div>" +
          '<div style="font-size:0.85em;">Residuo: ' +
          r.residuo.toLocaleString("it-IT", { minimumFractionDigits: 2 }) +
          " €</div>" +
          '<div style="margin-top:6px;height:6px;background:#333;border-radius:3px;overflow:hidden;">' +
          '<div style="height:100%;width:' +
          Math.min(pct, 100) +
          "%;background:" +
          color +
          ';border-radius:3px;"></div></div>' +
          '<div style="font-size:0.75em;margin-top:4px;color:' +
          color +
          ';">' +
          pct +
          "% utilizzato</div></div>";
      }
    } catch (e) {
      console.error("_showReportPreview: errore plafond", e);
    }
    if (budgetHtml) {
      html = html.replace(
        "</footer></div>",
        "</footer>" + budgetHtml + "</div>",
      );
    }

    win.setHtml(html).show();

    const winEl = win.getElement();
    const closeBtn = winEl.querySelector(".btn-close-win");
    if (closeBtn) {
      closeBtn.onclick = function () {
        win.close();
      };
    }
    const printBtn = winEl.querySelector("#btn-save-report-pdf");
    if (printBtn) {
      printBtn.onclick = function () {
        _printSintesi();
      };
    }
  };

  /**
   * Visualizza il dettaglio dei calcoli analitici per ogni intervento.
   * @returns {void}
   */
  const _showCalculationDetails = function () {
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

    const interventi = _praticaData.interventi || [];
    const dt = _praticaData.dati_tecnici || {};
    const ed = _praticaData.edificio || {};
    const sa = _praticaData.richiedente || {};
    let contentHtml = "";

    interventi.forEach(function (code) {
      const dati = dt[code] || {};
      const calc = FormulaEngine.calculate(code, dati, {
        zonaClimatica: ed.zona_climatica,
        soggetto: sa.tipo_soggetto,
        codiciSelezionati: interventi,
        comuneSotto15k: !!ed.comune_sotto_15k,
        scuolaOspedale: !!ed.scuola_ospedale,
      });
      let stepsHtml = "";

      if (calc.steps && calc.steps.length > 0) {
        stepsHtml =
          '<table class="data-table"><thead><tr>' +
          '<th>Passaggio</th><th>Parametro</th><th>Valori</th><th style="text-align:right;">Risultato</th>' +
          "</tr></thead><tbody>";

        calc.steps.forEach(function (s) {
          const isCurrency = typeof s.value === "number" && s.unit === "\u20ac";
          const valStr = isCurrency
            ? PreventivoManager.formatCurrency(s.value)
            : formatNum(s.value) + (s.unit ? " " + s.unit : "");
          const desc = s.desc || "";
          const label = s.label || "";
          const calcVal =
            s.calc ||
            (typeof s.value === "number" ? formatNum(s.value) : s.value);

          stepsHtml =
            stepsHtml +
            "<tr><td>" +
            desc +
            "</td>" +
            "<td><strong>" +
            label +
            "</strong></td>" +
            "<td>" +
            calcVal +
            "</td>" +
            '<td style="text-align:right;font-weight:600;">' +
            valStr +
            "</td></tr>";
        });

        stepsHtml = stepsHtml + "</tbody></table>";
      } else {
        stepsHtml = "<p>Nessun dettaglio disponibile.</p>";
      }

      contentHtml =
        contentHtml +
        '<div style="margin-bottom:32px;"><h3>Intervento ' +
        code +
        "</h3>" +
        stepsHtml +
        "</div>";
    });

    const html =
      '<div class="window-header">' +
      '<span class="title">Dettaglio Calcoli</span>' +
      '<div class="header-actions"></div>' +
      '<button class="close-btn btn-close-win" title="Chiudi">&times;</button>' +
      "</div>" +
      '<div class="window-body">' +
      '<p style="font-size:0.85em;opacity:0.7;">Passaggi analitici basati sul D.M. 7 agosto 2025.</p>' +
      contentHtml +
      "</div>";

    win.setHtml(html).show();

    const winEl = win.getElement();
    const closeBtns = winEl.querySelectorAll(".btn-close-win");
    closeBtns.forEach(function (btn) {
      btn.onclick = function () {
        win.close();
      };
    });
  };

  /**
   * Visualizza l'elenco dei documenti richiesti per ogni intervento selezionato.
   * Segue la stessa logica di _showReportPreview (stessa finestra, stessi stili).
   */
  const _showDocumentiPreview = function () {
    const winId = "win-documenti-preview";
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

    const interventi = _praticaData.interventi || [];
    const dt = _praticaData.dati_tecnici || {};
    const praticaId = _praticaData.pratica.id || "N/D";
    const saDenominazione =
      (_praticaData.richiedente || {}).denominazione || "Documenti";
    const darkFg = "rgba(255,255,255,0.6)";
    var docFlags = _praticaData.documenti || {};

    let contentHtml = "";
    let countPresenti = 0;
    let countTotali = 0;

    interventi.forEach(function (code) {
      const meta = INTERVENTI[code] || {};
      const docs = meta.documenti_richiesti || [];
      const dati = dt[code] || {};
      const hasData = Object.keys(dati).length > 0;
      const nomeIntervento = meta.nome || "";
      const color = "#1976d2";

      if (docs.length === 0) {
        return;
      }

      if (!docFlags[code]) {
        docFlags[code] = {};
      }

      let rows = "";
      docs.forEach(function (doc) {
        countTotali = countTotali + 1;
        var docKey = doc.replace(/[^a-zA-Z0-9_]/g, "_");
        if (docFlags[code][docKey] === undefined) {
          docFlags[code][docKey] = hasData;
        }
        var presente = docFlags[code][docKey] === true;
        if (presente) {
          countPresenti = countPresenti + 1;
        }
        rows =
          rows +
          "<tr>" +
          '<td style="padding:8px 12px;border-bottom:1px solid rgba(255,255,255,0.08);">' +
          doc +
          "</td>" +
          '<td style="padding:8px 12px;border-bottom:1px solid rgba(255,255,255,0.08);text-align:center;">' +
          '<input type="checkbox" class="doc-checkbox" data-code="' +
          code +
          '" data-doc="' +
          docKey +
          '" ' +
          (presente ? "checked" : "") +
          ' style="width:18px;height:18px;cursor:pointer;">' +
          "</td>" +
          "</tr>";
      });

      contentHtml =
        contentHtml +
        '<div class="report-item" style="border-left:5px solid ' +
        color +
        ';margin-bottom:20px;">' +
        '<div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:12px;">' +
        '<div><h3 style="margin:0;color:' +
        color +
        ';">' +
        code +
        "</h3>" +
        '<div style="font-weight:600;font-size:1em;">' +
        nomeIntervento +
        "</div></div>" +
        '<div class="tag" style="background:' +
        color +
        "20;color:" +
        color +
        ";font-size:0.8em;border:1px solid " +
        color +
        '40;">' +
        (hasData ? "Dati inseriti" : "Dati mancanti") +
        "</div></div>" +
        '<table class="simple-data-table" style="width:100%;">' +
        '<thead><tr style="opacity:0.6;"><th style="padding:8px 12px;text-align:left;">Documento Richiesto</th>' +
        '<th style="padding:8px 12px;text-align:center;width:100px;">Presente</th></tr></thead><tbody>' +
        rows +
        "</tbody></table></div>";
    });

    // Documenti di verifica energetica (APE ante/post)
    var apeAnteDisponibile = _praticaData.edificio?.ape?.classe_ante
      ? true
      : false;
    var apePostDisponibile = apeAnteDisponibile;
    var docApeHtml =
      '<div class="report-item" style="border-left:5px solid #9c27b0;margin-bottom:20px;">' +
      '<div><h3 style="margin:0;color:#9c27b0;">VERIFICHE ENERGETICHE</h3></div>' +
      '<table class="simple-data-table" style="width:100%;margin-top:10px;">' +
      '<thead><tr style="opacity:0.6;"><th style="padding:8px 12px;text-align:left;">Documento</th>' +
      '<th style="padding:8px 12px;text-align:center;width:100px;">Presente</th></tr></thead><tbody>' +
      '<tr><td style="padding:8px 12px;">APE ante-operam (classe ' +
      (_praticaData.edificio?.ape?.classe_ante || "N/D") +
      ")</td>" +
      '<td style="text-align:center;"><input type="checkbox" class="doc-checkbox" data-code="_APE" data-doc="ape_ante" ' +
      (apeAnteDisponibile ? "checked" : "") +
      ' style="width:18px;height:18px;cursor:pointer;"></td></tr>' +
      '<tr><td style="padding:8px 12px;">APE post-operam</td>' +
      '<td style="text-align:center;"><input type="checkbox" class="doc-checkbox" data-code="_APE" data-doc="ape_post" ' +
      (apePostDisponibile ? "checked" : "") +
      ' style="width:18px;height:18px;cursor:pointer;"></td></tr>' +
      '<tr><td style="padding:8px 12px;">Diagnosi energetica ante-operam</td>' +
      '<td style="text-align:center;"><input type="checkbox" class="doc-checkbox" data-code="_APE" data-doc="diagnosi_ante" style="width:18px;height:18px;cursor:pointer;"></td></tr>' +
      '<tr><td style="padding:8px 12px;">Diagnosi energetica post-operam</td>' +
      '<td style="text-align:center;"><input type="checkbox" class="doc-checkbox" data-code="_APE" data-doc="diagnosi_post" style="width:18px;height:18px;cursor:pointer;"></td></tr>' +
      "</tbody></table></div>";
    contentHtml = contentHtml + docApeHtml;

    // Documenti amministrativi trasversali
    var docAmminHtml =
      '<div class="report-item" style="border-left:5px solid #ff9800;margin-bottom:20px;">' +
      '<div><h3 style="margin:0;color:#ff9800;">DOCUMENTAZIONE AMMINISTRATIVA</h3></div>' +
      '<table class="simple-data-table" style="width:100%;margin-top:10px;">' +
      '<thead><tr style="opacity:0.6;"><th style="padding:8px 12px;text-align:left;">Documento</th>' +
      '<th style="padding:8px 12px;text-align:center;width:100px;">Presente</th></tr></thead><tbody>' +
      '<tr><td style="padding:8px 12px;">Titolo di possesso (atto propriet\u00e0/locazione/comodato)</td>' +
      '<td style="text-align:center;"><input type="checkbox" class="doc-checkbox" data-code="_AMMIN" data-doc="titolo_possesso" style="width:18px;height:18px;cursor:pointer;"></td></tr>' +
      '<tr><td style="padding:8px 12px;">Dichiarazione conformit\u00e0 DM 37/08</td>' +
      '<td style="text-align:center;"><input type="checkbox" class="doc-checkbox" data-code="_AMMIN" data-doc="dichiarazione_conformita" style="width:18px;height:18px;cursor:pointer;"></td></tr>' +
      '<tr><td style="padding:8px 12px;">Asseverazione fine lavori</td>' +
      '<td style="text-align:center;"><input type="checkbox" class="doc-checkbox" data-code="_AMMIN" data-doc="asseverazione" style="width:18px;height:18px;cursor:pointer;"></td></tr>' +
      '<tr><td style="padding:8px 12px;">Fatture (separazione fornitura/posa)</td>' +
      '<td style="text-align:center;"><input type="checkbox" class="doc-checkbox" data-code="_AMMIN" data-doc="fatture" style="width:18px;height:18px;cursor:pointer;"></td></tr>' +
      '<tr><td style="padding:8px 12px;">Bonifici ordinari (data, importo, ordinante)</td>' +
      '<td style="text-align:center;"><input type="checkbox" class="doc-checkbox" data-code="_AMMIN" data-doc="bonifici" style="width:18px;height:18px;cursor:pointer;"></td></tr>' +
      '<tr><td style="padding:8px 12px;">Estratto conto</td>' +
      '<td style="text-align:center;"><input type="checkbox" class="doc-checkbox" data-code="_AMMIN" data-doc="estratto_conto" style="width:18px;height:18px;cursor:pointer;"></td></tr>' +
      "</tbody></table></div>";
    contentHtml = contentHtml + docAmminHtml;

    const richiedente = _praticaData.richiedente || {};
    const DOC_AGGIUNTIVI_MAP = {
      verbale_assemblea: "Verbale assemblea",
      tabella_millesimale: "Tabella millesimale",
    };
    let extraRows = "";
    for (const key in DOC_AGGIUNTIVI_MAP) {
      if (richiedente.hasOwnProperty(key)) {
        countTotali = countTotali + 1;
        const flaggato = richiedente[key] === true;
        if (flaggato) {
          countPresenti = countPresenti + 1;
        }
        const label = DOC_AGGIUNTIVI_MAP[key];
        const icon = flaggato ? "\u2705" : "\u274c";
        const statusLabel = flaggato ? "Flaggato" : "Mancante";
        const statusColor = flaggato ? "#4caf50" : "#e53935";
        extraRows =
          extraRows +
          "<tr>" +
          '<td style="padding:6px 12px;border-bottom:1px solid rgba(255,255,255,0.08);">' +
          label +
          "</td>" +
          '<td style="padding:6px 12px;border-bottom:1px solid rgba(255,255,255,0.08);text-align:center;">' +
          '<span style="display:inline-block;padding:2px 10px;border-radius:10px;font-size:0.8em;font-weight:600;background:' +
          statusColor +
          "20;color:" +
          statusColor +
          ';">' +
          icon +
          " " +
          statusLabel +
          "</span></td>" +
          "</tr>";
      }
    }
    if (extraRows) {
      contentHtml =
        contentHtml +
        '<div class="report-item" style="border-left:5px solid #1976d2;margin-bottom:20px;">' +
        '<div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:12px;">' +
        '<div><h3 style="margin:0;color:#1976d2;">DOCUMENTI SOGGETTO</h3>' +
        '<div style="font-weight:600;font-size:1em;">Richiedente / SA</div></div>' +
        '<div class="tag" style="background:#1976d220;color:#1976d2;font-size:0.8em;border:1px solid #1976d240;">' +
        "Documenti aggiuntivi</div></div>" +
        '<table class="simple-data-table" style="width:100%;">' +
        '<thead><tr style="opacity:0.6;"><th style="padding:6px 12px;text-align:left;">Documento</th>' +
        '<th style="padding:6px 12px;text-align:center;width:140px;">Stato</th></tr></thead><tbody>' +
        extraRows +
        "</tbody></table></div>";
    }

    if (!contentHtml) {
      contentHtml =
        '<p style="text-align:center;padding:40px;opacity:0.6;">Nessun documento richiesto per gli interventi selezionati.</p>';
    }

    const html =
      '<div class="window-header">' +
      '<span class="title">Documenti Richiesti - ' +
      saDenominazione +
      "</span>" +
      '<div class="header-actions">' +
      '<button id="btn-save-documenti" class="cmd-btn" title="Salva lo stato dei documenti" style="background:linear-gradient(135deg,#4caf50,#388e3c);border-color:#4caf50;color:#fff;text-shadow:0 1px 2px rgba(0,0,0,0.3);">Salva Documenti</button>' +
      '<button id="btn-print-documenti" class="cmd-btn" title="Stampa l\'elenco documenti" style="background:linear-gradient(135deg,#d32f2f,#b71c1c);border-color:#d32f2f;color:#fff;text-shadow:0 1px 2px rgba(0,0,0,0.3);">Stampa PDF</button>' +
      "</div>" +
      '<button class="close-btn btn-close-win" title="Chiudi">&times;</button>' +
      "</div>" +
      '<div class="window-body" style="position:relative;">' +
      '<header style="text-align:center;margin-bottom:30px;border-bottom:3px solid #68c8b2;padding-bottom:20px;">' +
      '<h1 style="margin:0;color:#68c8b2;font-size:2em;">DOCUMENTI RICHIESTI</h1>' +
      '<div style="text-transform:uppercase;letter-spacing:2px;font-weight:600;margin-top:5px;">Conto Termico 3.0</div>' +
      '<div style="margin-top:15px;font-size:0.9em;color:' +
      darkFg +
      ';">Pratica: ' +
      praticaId +
      "</div>" +
      '<div style="margin-top:8px;font-size:0.9em;color:' +
      darkFg +
      ';">Seleziona i documenti disponibili e premi "Salva Documenti"</div>' +
      "</header>" +
      '<div class="report-section">' +
      contentHtml +
      "</div>" +
      '<footer style="margin-top:40px;padding-top:16px;border-top:2px solid #333;font-size:0.8em;color:rgba(255,255,255,0.4);">' +
      '<p><strong>NOTA:</strong> Seleziona i documenti disponibili e premi "Salva Documenti" prima di chiudere.</p></footer></div>';

    win.setHtml(html).show();

    const winEl = win.getElement();
    const closeBtns = winEl.querySelectorAll(".btn-close-win");
    closeBtns.forEach(function (btn) {
      btn.onclick = function () {
        win.close();
      };
    });
    const printBtn = winEl.querySelector("#btn-print-documenti");
    if (printBtn) {
      printBtn.onclick = function () {
        _printDocumenti();
      };
    }
    const saveBtn = winEl.querySelector("#btn-save-documenti");
    if (saveBtn) {
      saveBtn.onclick = function () {
        var docFlags = _praticaData.documenti || {};
        var chkBoxes = winEl.querySelectorAll(".doc-checkbox");
        chkBoxes.forEach(function (chk) {
          var code = chk.getAttribute("data-code");
          var docKey = chk.getAttribute("data-doc");
          if (!code || !docKey) return;
          if (!docFlags[code]) {
            docFlags[code] = {};
          }
          docFlags[code][docKey] = chk.checked;
        });
        _praticaData.documenti = docFlags;
        saveBtn.textContent = "Salvato!";
        setTimeout(function () {
          saveBtn.textContent = "Salva Documenti";
        }, 2000);
      };
    }
  };

  const _printDocumenti = function () {
    const win = UaWindowAdm.get("win-documenti-preview");
    if (!win) {
      console.error("_printDocumenti: finestra documenti non trovata");
      return;
    }

    const bodyEl = win.getElement().querySelector(".window-body");
    if (!bodyEl) {
      console.error("_printDocumenti: corpo finestra non trovato");
      return;
    }

    const printContent = bodyEl.innerHTML;
    const printWindow = window.open("", "_blank");

    const docHtml =
      "<!DOCTYPE html><html><head><title>Documenti Richiesti CT 3.0</title>" +
      "<style>" +
      "body{font-family:sans-serif;padding:40px;color:#333;}" +
      "h1,h2,h3,h4{color:#68c8b2;}" +
      ".report-section{margin-bottom:25px;}" +
      ".report-item{margin-bottom:25px;padding:20px;border:1px solid #eee;border-left:5px solid #68c8b2;border-radius:4px;}" +
      ".data-table{width:100%;border-collapse:collapse;margin-top:15px;}" +
      ".data-table th,.data-table td{padding:12px;border:1px solid #eee;text-align:left;}" +
      ".data-table th{background:#f5f5f5;font-weight:600;}" +
      ".simple-data-table td{padding:4px 8px;border-bottom:1px solid #eee;}" +
      ".field-label{font-weight:600;color:#666;width:50%;}" +
      ".tag{display:inline-block;padding:4px 8px;background:#e8f5e9;color:#2e7d32;border-radius:4px;font-size:0.8em;font-weight:600;}" +
      "button,.header-actions,.close-btn{display:none !important;}" +
      "</style></head><body>" +
      printContent +
      "<script>setTimeout(function(){window.print();window.close();},500);</script></body></html>";

    printWindow.document.write(docHtml);
    printWindow.document.close();
  };

  /**
   * Sostituisce i nomi delle variabili in un'espressione coi valori numerici.
   * @param {string} expr - Espressione (es. "eta_s / eta_s_min_ecodesign")
   * @param {Object} params - Mappa nome→valore
   * @returns {string} Espressione con valori numerici (es. "130 / 110")
   */
  var _substituteParams = function (expr, params) {
    var keys = Object.keys(params).sort(function (a, b) {
      return b.length - a.length;
    });
    var result = expr;
    keys.forEach(function (key) {
      var val = params[key];
      if (typeof val === "number") {
        var repl = _formatNum2(val);
        result = result.replace(new RegExp("\\b" + key + "\\b", "g"), repl);
      }
    });
    result = result.replace(/\*/g, "\u00D7");
    return result;
  };

  /**
   * Visualizza le formule di calcolo in forma algebrica e numerica per ogni intervento selezionato.
   * @returns {void}
   */
  const _showFormuleIncentivo = function () {
    const winId = "win-wizard-formule";
    let win = UaWindowAdm.get(winId);

    if (!win) {
      win = UaWindowAdm.create(winId);
      win.addClassStyle("ua-modal-window");
      win.setStyle({ minWidth: "960px", maxHeight: "90vh" });
      win.setXY(3, 3).setZ(2100).drag();
    }

    const isDark = document.body.classList.contains("dark-theme");
    win.removeClassStyle("dark-theme").removeClassStyle("light-theme");
    win.addClassStyle(isDark ? "dark-theme" : "light-theme");

    const interventi = _praticaData.interventi || [];
    const dt = _praticaData.dati_tecnici || {};
    const ed = _praticaData.edificio || {};
    const sa = _praticaData.richiedente || {};

    var contentHtml = "";

    interventi.forEach(function (code) {
      const dati = dt[code] || {};
      const metadata = FORMULE_INCENTIVO[code];
      const calc = FormulaEngine.calculate(code, dati, {
        zonaClimatica: ed.zona_climatica,
        soggetto: sa.tipo_soggetto,
        codiciSelezionati: interventi,
        comuneSotto15k: !!ed.comune_sotto_15k,
        scuolaOspedale: !!ed.scuola_ospedale,
      });
      const metaIntervento = INTERVENTI[code] || {};
      var nomeIntervento = metaIntervento.nome || code;

      var formulaBase = "";
      var tipoFormula = "";
      if (metadata) {
        formulaBase = (metadata.formula_base || "").replace(/\*/g, "\u00D7");
        tipoFormula = metadata.formula_status || "";
      }

      var statusBadge = "";
      if (tipoFormula === "validato_tecnico") {
        statusBadge =
          '<span class="tag success" style="font-size:0.75em;">Validato</span>';
      } else if (tipoFormula === "da_validare") {
        statusBadge =
          '<span class="tag" style="font-size:0.75em;background:#ff980020;color:#ff9800;border:1px solid #ff980040;">Da validare</span>';
      }

      var cardHtml =
        '<div class="report-item" style="margin-bottom:24px;border-left:5px solid #68c8b2;">' +
        '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;">' +
        '<h3 style="margin:0;color:#68c8b2;">' +
        code +
        " \u2014 " +
        nomeIntervento +
        "</h3>" +
        statusBadge +
        "</div>";

      if (formulaBase) {
        cardHtml +=
          '<div style="margin-bottom:12px;padding:10px 14px;background:rgba(104,200,178,0.08);border-radius:4px;font-family:monospace;font-size:1.05em;">' +
          "<strong>Formula:</strong> I = " +
          formulaBase +
          "</div>";
      }

      if (calc.steps && calc.steps.length > 0) {
        cardHtml +=
          '<table class="data-table" style="font-size:0.9em;"><thead><tr>' +
          '<th style="width:30%;">Parametro</th>' +
          '<th style="width:35%;">Formula algebrica</th>' +
          '<th style="width:20%;">Valori</th>' +
          '<th style="text-align:right;width:15%;">Risultato</th>' +
          "</tr></thead><tbody>";

        calc.steps.forEach(function (s) {
          var label = s.label || "";
          var desc = s.desc || "";
          var formulaExpr = (s.formula || "").replace(/\*/g, "\u00D7");
          var calcVal = "";
          if (s.formula && calc.params) {
            calcVal = _substituteParams(s.formula, calc.params);
          }
          var isCurrency = typeof s.value === "number" && s.unit === "\u20ac";
          var valStr = isCurrency
            ? PreventivoManager.formatCurrency(s.value)
            : _formatNum2(s.value) + (s.unit ? " " + s.unit : "");
          var cellDesc = desc ? desc + " (" + label + ")" : label;

          cardHtml +=
            "<tr>" +
            "<td><strong>" +
            cellDesc +
            "</strong></td>" +
            '<td style="font-family:monospace;font-size:0.95em;">' +
            formulaExpr +
            "</td>" +
            '<td style="font-family:monospace;font-size:0.9em;">' +
            calcVal +
            "</td>" +
            '<td style="text-align:right;font-weight:600;">' +
            valStr +
            "</td>" +
            "</tr>";
        });

        cardHtml += "</tbody></table>";
      }

      if (calc.amount !== undefined && calc.amount > 0) {
        var formattedAmount = PreventivoManager.formatCurrency(calc.amount);
        cardHtml +=
          '<div style="margin-top:12px;padding:10px 14px;background:rgba(104,200,178,0.12);border-radius:4px;text-align:center;font-size:1.1em;font-weight:700;">' +
          "Risultato: I = " +
          (formulaBase || "?") +
          " = " +
          formattedAmount;

        if (calc.incentivoNetto !== undefined) {
          var nettoFormatted = PreventivoManager.formatCurrency(
            calc.incentivoNetto,
          );
          var gseFormatted = PreventivoManager.formatCurrency(
            calc.corrispettivoGSE ? calc.corrispettivoGSE.importo : 0,
          );
          cardHtml +=
            '<div style="font-size:0.8em;font-weight:400;margin-top:4px;opacity:0.8;">' +
            "Netto GSE: " +
            nettoFormatted +
            " (corrispettivo GSE: " +
            gseFormatted +
            ")</div>";
        }

        if (calc.paymentPlan) {
          var rate = calc.paymentPlan.numInstallments;
          var rataLabel =
            rate === 1 ? "Unica soluzione" : rate + " rate annuali";
          cardHtml +=
            '<div style="font-size:0.8em;font-weight:400;opacity:0.7;">Erogazione: ' +
            rataLabel +
            "</div>";
        }

        cardHtml += "</div>";
      }

      if (calc.errors && calc.errors.length > 0) {
        var errorHtml = calc.errors
          .map(function (e) {
            return "<li>" + e + "</li>";
          })
          .join("");
        cardHtml +=
          '<div style="margin-top:8px;padding:8px 12px;background:rgba(220,53,69,0.1);border-radius:4px;color:#dc3545;font-size:0.85em;">' +
          '<strong>Errori:</strong><ul style="margin:4px 0 0 0;">' +
          errorHtml +
          "</ul></div>";
      }

      cardHtml += "</div>";
      contentHtml += cardHtml;
    });

    if (!contentHtml) {
      contentHtml =
        '<p style="text-align:center;padding:40px;opacity:0.6;">Nessun intervento selezionato.</p>';
    }

    const html =
      '<div class="window-header">' +
      '<span class="title">Formule di Calcolo</span>' +
      '<div class="header-actions"></div>' +
      '<button class="close-btn btn-close-win" title="Chiudi">&times;</button>' +
      "</div>" +
      '<div class="window-body" style="overflow-y:auto;max-height:80vh;">' +
      '<p style="font-size:0.85em;opacity:0.7;">Formule basate sul D.M. 7 agosto 2025. I valori sono calcolati sui dati correnti della pratica.</p>' +
      contentHtml +
      "</div>";

    win.setHtml(html).show();

    const winEl = win.getElement();
    const closeBtns = winEl.querySelectorAll(".btn-close-win");
    closeBtns.forEach(function (btn) {
      btn.onclick = function () {
        win.close();
      };
    });
  };

  /**
   * Renderizza lo step 6 (Riepilogo) con dati formattati e pulsanti REPORT/CALCOLI/RISULTATI/DOCUMENTI/ARCHIVIA.
   * @returns {HTMLElement} Sezione dello step.
   */
  const _renderStep6 = function () {
    const section = document.createElement("section");
    section.className = "wizard-step step6";

    const p = _praticaData.pratica || {};
    const r = _praticaData.richiedente || {};
    const s = _praticaData.responsabile || {};
    const prop = _praticaData.proprietario || {};
    const ed = _praticaData.edificio || {};
    const interventi = _praticaData.interventi || [];
    const eco = _praticaData.economico || {};
    const delegato = _praticaData.delegato || {};

    const step6Title = '<div class="section-title">Riepilogo</div>';
    const btnGroup =
      '<div class="report-actions" style="display:flex;gap:10px;margin-bottom:20px;">' +
      '<button id="btn-wiz-preview-report" class="cmd-btn" style="flex:1;" title="Anteprima report dettagliato">REPORT</button>' +
      '<button id="btn-wiz-dati-export" class="cmd-btn" style="flex:1;" title="Visualizza i dati della pratica">DATI</button>' +
      '<button id="btn-wiz-formule" class="cmd-btn" style="flex:1;" title="Mostra le formule di calcolo">CALCOLI</button>' +
      '<button id="btn-wiz-calcoli" class="cmd-btn" style="flex:1;" title="Mostra i dettagli dei calcoli">RISULTATI</button>' +
      '<button id="btn-wiz-documenti" class="cmd-btn" style="flex:1;" title="Verifica documenti richiesti">DOCUMENTI</button>' +
      '<button id="btn-wiz-archive" class="cmd-btn green" style="flex:1;" title="Archivia la pratica corrente">ARCHIVIA</button>' +
      "</div>";

    const pNome = p.nome || "N/D";
    const pCodice = p.codice || "N/D";
    const pAccesso = p.modalita_accesso || "N/D";
    const pId = p.id || "N/D";
    const edIndirizzo = ed.indirizzo || "N/D";
    const edCatasto = ed.categoria_catastale || "N/D";
    const edZona = ed.zona_climatica || "N/D";
    const edSuperficie = ed.superficie_utile_mq || "N/D";
    const edAnno = ed.anno_costruzione || "N/D";
    const rDenom = r.denominazione || "N/D";
    const rTipo = r.tipo_soggetto || "N/D";
    const sDenom = s.denominazione || "N/D";
    const propDenom = prop.denominazione || "N/D";
    const delDenom = delegato.denominazione || "";

    var scadenzaHtml = "";
    if (p.modalita_accesso === "diretto" && p.data_fine_lavori) {
      var dtFine = new Date(p.data_fine_lavori);
      if (!isNaN(dtFine.getTime())) {
        var oggiDate = new Date();
        var termineMax = 60;
        var ggTrascorsi = Math.floor(
          (oggiDate - dtFine) / (1000 * 60 * 60 * 24),
        );
        var ggResidui = termineMax - ggTrascorsi;
        var scadColore = "#4caf50";
        var scadMsg =
          "Nei termini (" + ggResidui + "gg residui su " + termineMax + "gg)";
        if (ggTrascorsi > termineMax) {
          scadColore = "#f44336";
          scadMsg =
            "SCADUTO da " +
            (ggTrascorsi - termineMax) +
            " giorni! Richiesta oltre " +
            termineMax +
            "gg da fine lavori.";
        } else if (ggResidui <= 15) {
          scadColore = "#ff9800";
          scadMsg =
            "In scadenza! " +
            ggResidui +
            "gg residui su " +
            termineMax +
            "gg. Affrettarsi.";
        }
        scadenzaHtml =
          '<div class="card-title" style="margin-top:10px;">SCADENZE</div>' +
          '<table class="simple-data-table">' +
          '<tr><td class="field-label">Data fine lavori</td><td>' +
          (p.data_fine_lavori || "N/D") +
          "</td></tr>" +
          '<tr><td class="field-label">Data richiesta</td><td>' +
          (p.data_richiesta || "N/D") +
          "</td></tr>" +
          '<tr><td class="field-label">Termine richiesta</td><td style="color:' +
          scadColore +
          ';font-weight:600;">' +
          scadMsg +
          "</td></tr>" +
          '<tr><td class="field-label">Obbligo 5 anni</td><td>Scadenza ' +
          new Date(dtFine.getTime() + 5 * 365 * 24 * 60 * 60 * 1000)
            .toISOString()
            .slice(0, 10) +
          " (5 anni da fine lavori)</td></tr>" +
          "</table>";
      }
    }

    const intestazioneHtml =
      '<div class="card-title">DATI GENERALI</div>' +
      '<table class="simple-data-table">' +
      '<tr><td class="field-label">Codice</td><td>' +
      pCodice +
      "</td></tr>" +
      '<tr><td class="field-label">Nome</td><td>' +
      pNome +
      "</td></tr>" +
      '<tr><td class="field-label">Data richiesta</td><td>' +
      (p.data_richiesta || "N/D") +
      "</td></tr>" +
      '<tr><td class="field-label">Data fine lavori</td><td>' +
      (p.data_fine_lavori || "N/D") +
      "</td></tr>" +
      '<tr><td class="field-label">Modalit\u00e0 accesso</td><td>' +
      pAccesso +
      "</td></tr>" +
      '<tr><td class="field-label">ID</td><td>' +
      pId +
      "</td></tr>" +
      "</table>";

    const edificioHtml =
      '<div class="card-title" style="margin-top:20px;">EDIFICIO</div>' +
      '<table class="simple-data-table">' +
      '<tr><td class="field-label">Indirizzo</td><td>' +
      edIndirizzo +
      "</td></tr>" +
      '<tr><td class="field-label">Catasto</td><td>' +
      edCatasto +
      "</td></tr>" +
      '<tr><td class="field-label">Zona</td><td>' +
      edZona +
      "</td></tr>" +
      '<tr><td class="field-label">Superficie</td><td>' +
      edSuperficie +
      " mq</td></tr>" +
      '<tr><td class="field-label">Anno costruzione</td><td>' +
      edAnno +
      "</td></tr>" +
      "</table>";

    let delegatoRow = "";
    if (delDenom) {
      delegatoRow =
        '<tr><td class="field-label">Delegato</td><td>' +
        delDenom +
        "</td></tr>";
    }

    const soggettiHtml =
      '<div class="card-title" style="margin-top:20px;">SOGGETTI</div>' +
      '<table class="simple-data-table">' +
      '<tr><td class="field-label">SA</td><td>' +
      rDenom +
      " (" +
      rTipo +
      ")</td></tr>" +
      '<tr><td class="field-label">SR</td><td>' +
      sDenom +
      "</td></tr>" +
      '<tr><td class="field-label">Proprietario</td><td>' +
      propDenom +
      "</td></tr>" +
      delegatoRow +
      "</table>";

    let interventiHtml =
      '<div class="card-title" style="margin-top:20px;">INTERVENTI (' +
      interventi.length +
      ")</div>" +
      '<div style="display:flex;flex-wrap:wrap;gap:8px;margin-top:10px;">';

    interventi.forEach(function (code) {
      const meta = INTERVENTI[code] || {};
      const nomeMeta = meta.nome || "";
      interventiHtml =
        interventiHtml +
        '<span class="tag" style="display:inline-block;padding:6px 12px;background:rgba(104,200,178,0.15);border:1px solid rgba(104,200,178,0.3);border-radius:4px;">' +
        "<strong>" +
        code +
        "</strong> " +
        nomeMeta +
        "</span>";
    });
    interventiHtml = interventiHtml + "</div>";

    let ecoHtml =
      '<div class="card-title" style="margin-top:20px;">ECONOMICO</div>' +
      '<table class="simple-data-table">';
    if (eco.spese) {
      for (const code in eco.spese) {
        if (eco.spese.hasOwnProperty(code)) {
          const val = eco.spese[code] || 0;
          ecoHtml =
            ecoHtml +
            '<tr><td class="field-label">' +
            code +
            "</td><td>" +
            PreventivoManager.formatCurrency(val) +
            "</td></tr>";
        }
      }
    }
    ecoHtml = ecoHtml + "</table>";

    var obbligoMantenimentoHtml = "";
    if (interventi.length > 0) {
      var accettato = _praticaData.obbligo_mantenimento_accettato === true;
      obbligoMantenimentoHtml =
        '<div class="card-title" style="margin-top:20px;">OBBLIGHI NORMATIVI</div>' +
        '<div style="margin-top:10px;">' +
        '<label style="display:flex;align-items:flex-start;gap:8px;padding:10px;border:1px solid rgba(104,200,178,0.3);border-radius:6px;background:rgba(104,200,178,0.05);cursor:pointer;">' +
        '<input type="checkbox" id="chk-obbligo-mantenimento" ' +
        (accettato ? "checked" : "") +
        ' style="margin-top:3px;">' +
        '<span style="font-size:0.9rem;color:rgba(224,224,224,0.9);">' +
        "Accetto l'obbligo di mantenimento dell'impianto per 5 anni dalla data di erogazione dell'incentivo, ai sensi del D.M. 7 agosto 2025." +
        "</span>" +
        "</label>" +
        "</div>";
    }

    section.innerHTML =
      step6Title +
      btnGroup +
      intestazioneHtml +
      scadenzaHtml +
      edificioHtml +
      soggettiHtml +
      interventiHtml +
      ecoHtml +
      obbligoMantenimentoHtml;
    return section;
  };

  const _connectStep6Actions = function () {
    const reportBtn = document.getElementById("btn-wiz-preview-report");
    const datiBtn = document.getElementById("btn-wiz-dati-export");
    const formuleBtn = document.getElementById("btn-wiz-formule");
    const calcoliBtn = document.getElementById("btn-wiz-calcoli");
    const archiveBtn = document.getElementById("btn-wiz-archive");
    if (reportBtn) reportBtn.addEventListener("click", _showReportPreview);
    if (datiBtn) datiBtn.addEventListener("click", _showExportDataPreview);
    if (formuleBtn) formuleBtn.addEventListener("click", _showFormuleIncentivo);
    if (calcoliBtn)
      calcoliBtn.addEventListener("click", _showCalculationDetails);
    const documentiBtn = document.getElementById("btn-wiz-documenti");
    if (documentiBtn)
      documentiBtn.addEventListener("click", _showDocumentiPreview);
    if (archiveBtn) archiveBtn.addEventListener("click", _archivePratica);
  };

  const _showContextHelp = function (step) {
    var isDark = document.body.classList.contains("dark-theme");
    var darkFg = "color:rgba(255,255,255,0.6)";
    var lightFg = "color:rgba(0,0,0,0.6)";
    var fg = isDark ? darkFg : lightFg;

    var STEP_HELP_TITLES = [
      "Fase 1 — Dati della Pratica",
      "Fase 2 — Dati Edificio",
      "Fase 3 — Anagrafiche",
      "Fase 4 — Selezione Interventi",
      "Fase 5 — Dati Tecnici",
      "Fase 6 — Dati Economici",
      "Fase 7 — Riepilogo",
    ];

    var content = "";

    if (step === 0) {
      content =
        "<p>In questa pagina si inseriscono i dati generali della pratica.</p>" +
        "<h2>Campi</h2>" +
        "<ul>" +
        "<li><strong>Codice pratica</strong> — identificativo libero (opzionale).</li>" +
        "<li><strong>Data inserimento</strong> — data di creazione.</li>" +
        "<li><strong>Nome pratica</strong> — nome descrittivo (<em>obbligatorio</em>).</li>" +
        "<li><strong>Modalit\u00e0 accesso</strong> — <em>Accesso Diretto</em> (post-intervento, 60gg) o <em>Accesso su Prenotazione</em> (pre-intervento, PA/ETS).</li>" +
        "<li><strong>Note</strong> — appunti liberi (opzionale).</li>" +
        "</ul>" +
        "<h2>Vincoli</h2>" +
        "<ul>" +
        "<li>Nome pratica e Modalit\u00e0 accesso sono <strong>obbligatori</strong> per proseguire.</li>" +
        "<li>Accesso su Prenotazione: solo PA ed ETS, richiede richiesta preliminare prima dei lavori.</li>" +
        "</ul>" +
        "<h2>Pulsanti</h2>" +
        "<ul>" +
        "<li><strong>AVANTI</strong> — procede alla Fase 2 previa validazione.</li>" +
        "<li><strong>INIZIO/INDIETRO</strong> — disabilitati (primo step).</li>" +
        "</ul>";
    } else if (step === 1) {
      content =
        "<p>Inserisci le caratteristiche catastali e climatiche dell'edificio.</p>" +
        "<h2>Campi</h2>" +
        "<ul>" +
        "<li><strong>Indirizzo</strong> — ubicazione dell'edificio (<em>obbligatorio</em>).</li>" +
        "<li><strong>Categoria catastale</strong> — categoria dell'immobile (<em>obbligatorio</em>).</li>" +
        "<li><strong>Ambito</strong> — residenziale, terziario, industriale, ecc.</li>" +
        "<li><strong>Zona climatica</strong> — A, B, C, D, E, F (<em>obbligatorio</em>).</li>" +
        "<li><strong>Anno costruzione</strong> — anno di costruzione dell'edificio.</li>" +
        "<li><strong>Superficie utile (mq)</strong> — superficie netta riscaldata.</li>" +
        "</ul>" +
        "<h2>Vincoli</h2>" +
        "<ul>" +
        "<li>Indirizzo, categoria catastale e zona climatica sono <strong>obbligatori</strong>.</li>" +
        "<li>Ambito = residenziale con SA privato → solo Titolo III (nessun intervento involucro).</li>" +
        "</ul>" +
        "<h2>Pulsanti</h2>" +
        "<ul>" +
        "<li><strong>AVANTI</strong> — procede alla Fase 3.</li>" +
        "<li><strong>INDIETRO</strong> — torna alla Fase 1.</li>" +
        "</ul>";
    } else if (step === 2) {
      content =
        "<p>Inserisci i tre soggetti obbligatori e il delegato opzionale.</p>" +
        "<h2>Soggetti</h2>" +
        "<ul>" +
        "<li><strong>Proprietario (T1)</strong> — titolare del diritto di propriet\u00e0.</li>" +
        "<li><strong>Richiedente / SA (T2)</strong> — Soggetto Attuatore: PA, Privato (residenziale/terziario), ETS (non econ/econ).</li>" +
        "<li><strong>Responsabile / SR (T3)</strong> — Soggetto Responsabile: PA, Privato, ETS non econ, ESCO, CER.</li>" +
        "<li><strong>Delegato (T4)</strong> — operatore che agisce per conto dello SR (opzionale).</li>" +
        "</ul>" +
        "<h2>Vincoli</h2>" +
        "<ul>" +
        "<li>Tutti e tre i soggetti devono avere denominazione e tipo soggetto.</li>" +
        "<li>Proprietario \u2260 Richiedente → Atto di Assenso obbligatorio.</li>" +
        "<li>SA = privato residenziale → solo Titolo III.</li>" +
        "<li>SR \u2260 SA e SR = ESCO → contratto EPC obbligatorio.</li>" +
        "<li>Non-PA → Mandato irrevocabile all'incasso obbligatorio.</li>" +
        "<li>SA = privato con attivit\u00e0 economica → regime Titolo V.</li>" +
        "<li>ETS non economico → assimilato a PA; ETS economico → solo Titolo III, regime Titolo V.</li>" +
        "</ul>" +
        "<h2>Pulsanti di copia rapida</h2>" +
        "<ul>" +
        "<li><strong>Richiedente = Proprietario</strong> — copia i dati anagrafici del proprietario nel richiedente.</li>" +
        "<li><strong>Responsabile = Richiedente</strong> — copia i dati anagrafici del richiedente nel responsabile.</li>" +
        "</ul>";
    } else if (step === 3) {
      content =
        "<p>Scegli gli interventi ammessi in base al tipo di SA e all'ambito dell'edificio.</p>" +
        "<h2>Elenco interventi</h2>" +
        "<ul>" +
        "<li>Gli interventi sono raggruppati per <strong>Titolo II</strong> (involucro) e <strong>Titolo III</strong> (impianti).</li>" +
        "<li>Gli interventi non ammessi per il tipo SA selezionato sono <strong>disabilitati</strong>.</li>" +
        "</ul>" +
        "<h2>Vincoli</h2>" +
        "<ul>" +
        "<li><strong>II.C</strong> (schermature solari) richiede <strong>II.B</strong> (infissi).</li>" +
        "<li><strong>II.G</strong> e <strong>II.H</strong> richiedono <strong>III.A</strong> (pompa di calore).</li>" +
        "<li>Almeno un intervento deve essere selezionato.</li>" +
        "<li>Premere <strong>Verifica compatibilit\u00e0</strong> per convalidare la selezione.</li>" +
        "</ul>" +
        "<h2>Pulsanti</h2>" +
        "<ul>" +
        "<li><strong>Verifica compatibilit\u00e0</strong> — controlla le regole incrociate tra interventi.</li>" +
        "</ul>";
    } else if (step === 4) {
      content =
        "<p>Per ogni intervento selezionato, inserisci i parametri tecnici richiesti.</p>" +
        "<h2>Campi</h2>" +
        "<ul>" +
        "<li>I campi variano in base alla scheda tecnica dell'intervento.</li>" +
        "<li>Per III.A, III.B, III.C, III.D, III.E, II.H, II.G: \u00e8 disponibile un <strong>catalogo marche/modelli</strong> con auto-compilazione dei parametri.</li>" +
        "</ul>" +
        "<h2>Vincoli</h2>" +
        "<ul>" +
        "<li>Tutti i parametri obbligatori devono essere compilati per proseguire.</li>" +
        "<li>Selezionare marca e modello dal catalogo, oppure inserire i dati manualmente.</li>" +
        "</ul>";
    } else if (step === 5) {
      content =
        "<p>Inserisci l'importo della spesa per ogni intervento e calcola l'incentivo.</p>" +
        "<h2>Campi</h2>" +
        "<ul>" +
        "<li><strong>Importo (\u20ac)</strong> — spesa sostenuta per ogni intervento.</li>" +
        "<li><strong>Maggiorazioni</strong> — eventuali bonus aggiuntivi applicabili.</li>" +
        "</ul>" +
        "<h2>Vincoli</h2>" +
        "<ul>" +
        "<li>Tutti gli importi devono essere <strong>maggiori di zero</strong> per abilitare il pulsante FINE.</li>" +
        "<li>Premere <strong>Calcola incentivo</strong> per ottenere il calcolo.</li>" +
        "</ul>" +
        "<h2>Pulsanti</h2>" +
        "<ul>" +
        "<li><strong>Calcola incentivo</strong> — esegue il calcolo dell'incentivo spettante.</li>" +
        "<li><strong>AVANTI</strong> — passa al Riepilogo.</li>" +
        "</ul>";
    } else if (step === 6) {
      content =
        "<p>Riepilogo finale di tutti i dati inseriti nella pratica.</p>" +
        "<h2>Pulsanti</h2>" +
        "<ul>" +
        "<li><strong>REPORT</strong> — apre una finestra con il report dettagliato della pratica, stampabile.</li>" +
        "<li><strong>DATI</strong> — mostra tutti i dati della pratica in formato testo (include formule e risultati). Pulsante SALVA per scaricare il file completo.</li>" +
        "<li><strong>CALCOLI</strong> — mostra le formule di calcolo in forma algebrica e numerica per ogni intervento.</li>" +
        "<li><strong>RISULTATI</strong> — mostra il dettaglio analitico del calcolo dell'incentivo.</li>" +
        "<li><strong>DOCUMENTI</strong> — elenca i documenti richiesti per ogni intervento con lo stato.</li>" +
        "<li><strong>ARCHIVIA</strong> — salva la pratica nel database locale.</li>" +
        "</ul>" +
        "<h2>Vincoli</h2>" +
        "<ul>" +
        "<li>Archiviare la pratica prima di uscire per non perderne i dati.</li>" +
        "<li>\u00c8 sempre possibile tornare agli step precedenti per modificare i dati.</li>" +
        "</ul>";
    }

    var winId = "win-step-help";
    var win = UaWindowAdm.get(winId);
    if (!win) {
      win = UaWindowAdm.create(winId);
      win.addClassStyle("ua-modal-window");
      win.setStyle({ minWidth: "70vw", minHeight: "70vh" });
      win.setXY(2, 2).setZ(3100);
    }

    win.removeClassStyle("dark-theme").removeClassStyle("light-theme");
    win.addClassStyle(isDark ? "dark-theme" : "light-theme");

    var fgStyle = isDark
      ? "color:rgba(255,255,255,0.8)"
      : "color:rgba(0,0,0,0.8)";

    var headerTitle = STEP_HELP_TITLES[step] || "Help";
    var html =
      '<div class="window-header">' +
      '<span class="title" style="font-size:1.4em;color:#68c8b2;font-weight:700;">' +
      headerTitle +
      "</span>" +
      '<div class="header-actions"></div>' +
      '<button class="close-btn btn-close-help" title="Chiudi">&times;</button>' +
      "</div>" +
      '<div class="window-body" style="overflow-y:auto;padding:20px 40px 60px;' +
      fgStyle +
      '">' +
      content +
      "</div>";

    win.setHtml(html).show();

    var winEl = win.getElement();
    var closeBtns = winEl.querySelectorAll(".btn-close-help");
    closeBtns.forEach(function (btn) {
      btn.onclick = function () {
        win.close();
      };
    });
  };

  const _renderStep = function (step) {
    if (!_viewport) return;
    _viewport.innerHTML = "";
    _updateStepIndicator();
    var content = null;
    switch (step) {
      case 0:
        content = _renderStep0();
        break;
      case 1:
        content = _renderStep1();
        break;
      case 2:
        content = _renderStep2();
        break;
      case 3:
        content = _renderStep3();
        break;
      case 4:
        content = _renderStep4();
        break;
      case 5:
        content = _renderStep5();
        break;
      case 6:
        content = _renderStep6();
        break;
    }
    if (content) {
      _viewport.appendChild(content);
      var helpBtn = document.createElement("span");
      helpBtn.className = "step-help-btn";
      helpBtn.setAttribute("data-step", step);
      helpBtn.title = "Aiuto per questa fase";
      helpBtn.textContent = "?";
      helpBtn.style.cssText = "position:absolute;top:5px;right:5px;z-index:10;";
      content.style.position = "relative";
      content.appendChild(helpBtn);
    }
    if (step === 6) _connectStep6Actions();
    _updateGlobalNav();
    _isDirty = true;
    if (api.onStateChange) {
      api.onStateChange();
    }
  };

  const _validateStep0 = function () {
    const section = _viewport.querySelector(".step0");
    if (!section) return false;
    _bindFormData(section, _praticaData.pratica);
    if (!_praticaData.pratica.nome || _praticaData.pratica.nome.trim() === "") {
      alert("Inserire il nome.");
      return false;
    }
    if (!_praticaData.pratica.modalita_accesso) {
      alert("Selezionare modalit\u00e0 accesso.");
      return false;
    }
    if (_praticaData.pratica.modalita_accesso === "diretto") {
      const df = _praticaData.pratica.data_fine_lavori;
      if (!df) {
        alert("Per accesso diretto \u00e8 richiesta la data fine lavori.");
        return false;
      }
      const dtFine = new Date(df);
      if (isNaN(dtFine.getTime())) {
        alert("Data fine lavori non valida.");
        return false;
      }
      if (dtFine > new Date()) {
        alert(
          "Per accesso diretto la data fine lavori deve essere gi\u00e0 passata (intervento concluso).",
        );
        return false;
      }
      const dr = _praticaData.pratica.data_richiesta;
      if (dr) {
        const dtRich = new Date(dr);
        if (!isNaN(dtRich.getTime())) {
          const diff = Math.floor((dtRich - dtFine) / (1000 * 60 * 60 * 24));
          if (diff > 60) {
            alert(
              "La richiesta supera i 60 giorni dalla fine lavori. Termine massimo accesso diretto: 60 giorni.",
            );
            return false;
          }
          if (diff < 0) {
            alert(
              "La data richiesta non pu\u00f2 essere prima della fine lavori.",
            );
            return false;
          }
        }
      }
    }
    if (_praticaData.pratica.modalita_accesso === "prenotazione") {
      const dr = _praticaData.pratica.data_richiesta;
      if (!dr) {
        alert(
          "Per accesso in prenotazione \u00e8 richiesta la data richiesta.",
        );
        return false;
      }
    }
    return true;
  };

  const _validateStep1 = function () {
    const section = _viewport.querySelector(".step1");
    if (!section) return false;
    _bindFormData(section, _praticaData.edificio);
    if (
      !_praticaData.edificio.indirizzo ||
      !_praticaData.edificio.categoria_catastale ||
      !_praticaData.edificio.zona_climatica
    ) {
      alert("Compilare tutti i campi obbligatori edilizi.");
      return false;
    }
    return true;
  };

  const _validateStep2 = function () {
    const section = _viewport.querySelector(".step2");
    if (!section) return false;
    _bindFormData(section, _praticaData);
    _praticaData.delegato = {
      denominazione:
        (_praticaData.delegato && _praticaData.delegato.denominazione) || "",
      cf: (_praticaData.delegato && _praticaData.delegato.cf) || "",
      qualifica:
        (_praticaData.delegato && _praticaData.delegato.qualifica) || "",
      email: (_praticaData.delegato && _praticaData.delegato.email) || "",
    };
    const p = _praticaData.proprietario,
      r = _praticaData.richiedente,
      rs = _praticaData.responsabile;
    if (!p.denominazione || !r.denominazione || !rs.denominazione) {
      alert("Compilare tutte e tre le anagrafiche.");
      return false;
    }
    if (!r.tipo_soggetto || !rs.tipo_soggetto) {
      alert("Selezionare tipo soggetto per SA e SR.");
      return false;
    }
    return true;
  };

  const _validateStep3 = function () {
    const section = _viewport.querySelector(".step3");
    if (!section) return false;
    const checkboxes = section.querySelectorAll(
      "input[name=intervento]:checked",
    );
    const selected = [];
    checkboxes.forEach(function (cb) {
      selected.push(cb.value);
    });
    _praticaData.interventi = selected;
    if (selected.length === 0) {
      alert("Selezionare almeno un intervento.");
      return false;
    }
    const tipoSA = _praticaData.richiedente.tipo_soggetto || "";
    const ambito = _praticaData.edificio.ambito || "";
    const result = _rulesEngine.validateInterventiPerSoggetto(
      tipoSA,
      ambito,
      selected,
    );
    if (!result.success) {
      alert("Errore:\n" + result.errors.join("\n"));
      return false;
    }
    return true;
  };

  const _validateStep4 = function () {
    const section = _viewport.querySelector(".step4");
    if (!section) return false;
    _bindFormData(section, _praticaData.dati_tecnici);
    return true;
  };

  const _validateStep5 = function () {
    const section = _viewport.querySelector(".step5");
    if (!section) return false;
    _bindFormData(section, _praticaData.economico);
    _syncEconomicoDaFlatKeys();

    // ESCO soglie ambito residenziale (RA §3.5.1) — verifica su dati tecnici
    var anagData = {
      proprietario: _praticaData.proprietario || {},
      richiedente: _praticaData.richiedente || {},
      responsabile: _praticaData.responsabile || {},
      delegato: _praticaData.delegato || {},
    };
    var contesto = {
      ambito: (_praticaData.edificio || {}).ambito || "",
      interventiData: _praticaData.dati_tecnici || {},
    };
    var anagCheck = _rulesEngine.validateAnagrafiche(anagData, contesto);
    if (!anagCheck.success) {
      alert("ANAGRAFICHE: " + anagCheck.errors.join("\n"));
      return false;
    }
    if (anagCheck.warnings.length > 0) {
      console.warn("Avvisi anagrafiche:", anagCheck.warnings);
    }

    return true;
  };

  const _validateCurrentStep = function () {
    switch (_currentStep) {
      case 0:
        return _validateStep0();
      case 1:
        return _validateStep1();
      case 2:
        return _validateStep2();
      case 3:
        return _validateStep3();
      case 4:
        return _validateStep4();
      case 5:
        return _validateStep5();
      case 6:
        return true;
      default:
        return false;
    }
  };

  const _goNext = function () {
    if (_currentStep >= 6) return;
    if (!_validateCurrentStep()) return;
    _currentStep++;
    _renderStep(_currentStep);
  };

  const _goPrev = function () {
    if (_currentStep <= 0) return;
    _currentStep--;
    _renderStep(_currentStep);
  };

  const _goToStart = function () {
    if (_currentStep === 0) return;
    _currentStep = 0;
    _renderStep(_currentStep);
  };

  const _goToEnd = function () {
    if (_currentStep === 6) return;
    _currentStep = 6;
    _renderStep(_currentStep);
  };

  const _isEconomicoValorizzato = function () {
    var eco = _praticaData.economico || {};
    var spese = eco.spese || {};
    var selezionati = _praticaData.interventi || [];
    if (selezionati.length === 0) return false;
    for (var i = 0; i < selezionati.length; i++) {
      var code = selezionati[i];
      var val = spese[code];
      if (
        val === undefined ||
        val === null ||
        val === "" ||
        parseFloat(val) <= 0
      ) {
        return false;
      }
    }
    return true;
  };

  const _updateGlobalNav = function () {
    var btns = [
      "btn-wiz-start-global",
      "btn-wiz-prev-global",
      "btn-wiz-next-global",
      "btn-wiz-end-global",
    ];
    btns.forEach(function (id) {
      var el = document.getElementById(id);
      if (!el) return;
      el.style.display = "inline-flex";
      el.classList.remove("disabled");
    });
    var btnStart = document.getElementById("btn-wiz-start-global");
    var btnPrev = document.getElementById("btn-wiz-prev-global");
    var btnNext = document.getElementById("btn-wiz-next-global");
    var btnEnd = document.getElementById("btn-wiz-end-global");
    if (_currentStep === 0) {
      if (btnStart) btnStart.classList.add("disabled");
      if (btnPrev) btnPrev.classList.add("disabled");
    }
    if (_currentStep === 6) {
      if (btnNext) btnNext.classList.add("disabled");
      if (btnEnd) btnEnd.classList.add("disabled");
    } else if (!_isEconomicoValorizzato()) {
      if (btnEnd) btnEnd.classList.add("disabled");
    }
  };

  /* ========= FUNZIONI CARICAMENTO TEST ========= */

  var _generateTmpId = function () {
    var id =
      "TMP_" + Date.now() + "_" + Math.random().toString(36).substr(2, 5);
    return id;
  };

  var _normalizeZona = function (z) {
    if (!z) return "E";
    if (/^[A-F]$/.test(String(z))) return z;
    var m = String(z).match(/\b([A-F])\b/);
    if (m) return m[1];
    return "E";
  };

  var _mergeTestSoggetti = function (scenario) {
    var src = scenario.soggetti || {};

    var sa = src.sa || {};
    var sr = src.sr || {};
    var prop = src.proprietario || {};
    var del = src.delegato || {};

    var sogg = scenario.soggetto || {};

    var denom = sa.denominazione || sogg.denominazione || "Mario Rossi Test";
    var cf = sa.cf_piva || sogg.codiceFiscale || "RSSMRA80A01H501U";
    var pi = sa.partita_iva || sogg.partitaIva || cf;
    var ind =
      sa.indirizzo ||
      sogg.indirizzo ||
      scenario.edificio?.indirizzo ||
      scenario.immobile?.indirizzo ||
      "Via Roma 10, Milano";
    var pecDefault =
      "test@" +
      (sa.denominazione || "utente").replace(/[^a-zA-Z]/g, "").toLowerCase() +
      ".legalmail.it";

    var mergedRichiedente = {
      denominazione: denom,
      tipo_soggetto: sa.tipo || sogg.tipo || "Privato residenziale",
      cf_piva: cf,
      partita_iva: pi,
      indirizzo: ind,
      titolo_disponibilita: sa.titolo_godimento || "Propriet\u00e0",
      pec: sa.pec || pecDefault,
      email:
        sa.email ||
        sogg.email ||
        denom.replace(/ /g, ".").toLowerCase() + "@email.it",
      telefono: sa.telefono || sogg.telefono || "021234567",
      verbale_assemblea: sa.tipo && sa.tipo.indexOf("Condominio") !== -1,
      tabella_millesimale: sa.tipo && sa.tipo.indexOf("Condominio") !== -1,
    };

    var mergedResponsabile = {
      denominazione: sr.denominazione || denom,
      cf_piva: sr.cf_piva || cf,
      partita_iva: sr.partita_iva || pi,
      indirizzo: sr.indirizzo || ind,
      tipo_soggetto: sr.tipo || "Privato",
      iban: sr.iban || "IT60X0542811101000000123456",
      mandato_incasso: true,
      pec: sr.pec || pecDefault,
      email: sr.email || mergedRichiedente.email,
      certificazione_11352: sr.tipo === "ESCO",
      esco: sr.tipo === "ESCO",
      cer: sr.tipo === "CER",
      coincide_con_proprietario: prop.coincide_con_sa || false,
      coincide_con_richiedente: sr.coincide_con_sa || false,
    };

    var mergedProprietario = {
      denominazione: prop.denominazione || denom,
      cf_piva: prop.cf_piva || cf,
      partita_iva: prop.partita_iva || pi,
      indirizzo: prop.indirizzo || ind,
      tipo_soggetto:
        prop.tipo || sa.tipo || sogg.tipo || "Privato residenziale",
      titolo_proprieta: sa.titolo_godimento || "Propriet\u00e0",
    };

    var mergedDelegato = {
      denominazione: del.denominazione || del.nome || "Delegato Test",
      cf: del.cf || del.cf_piva || "DLGTST00A00A000A",
      qualifica: del.qualifica || "Delegato alla presentazione",
      email: del.email || "delegato.test@email.it",
    };

    return {
      richiedente: mergedRichiedente,
      responsabile: mergedResponsabile,
      proprietario: mergedProprietario,
      delegato: mergedDelegato,
    };
  };

  var _generateTechData = function (scenarioData, interventiList) {
    var result = {};

    interventiList.forEach(function (code) {
      var existing = scenarioData[code] || {};

      var scheda = SCHEDE_TECNICHE[code];
      if (!scheda || !scheda.campi) {
        result[code] = existing;
        return;
      }

      var filled = {};
      for (var k in existing) {
        filled[k] = existing[k];
      }

      scheda.campi.forEach(function (campo) {
        if (filled[campo.id] !== undefined && filled[campo.id] !== "") {
          return;
        }

        var defaultVal = "";

        if (campo.tipo === "number") {
          var min = campo.min || 0;
          var max = campo.max || 10000;
          defaultVal = (min + (max - min) * 0.3).toFixed(
            campo.id.indexOf("trasmittanza") !== -1 ? 2 : 0,
          );
          if (defaultVal === "NaN" || defaultVal === "0") {
            defaultVal = "" + (campo.min || 1);
          }
        } else if (campo.tipo === "select") {
          if (campo.opzioni && campo.opzioni.length > 0) {
            var preferred =
              campo.opzioni.indexOf("s\u00ec") !== -1
                ? "s\u00ec"
                : campo.opzioni[0];
            if (campo.id.indexOf("zona_assistita") !== -1) {
              preferred = "no";
            }
            defaultVal = preferred;
          }
        } else if (campo.tipo === "textarea") {
          defaultVal = "Test " + (campo.label || campo.id);
        } else {
          defaultVal = "Test " + (campo.label || campo.id);
        }

        filled[campo.id] = defaultVal;
      });

      result[code] = filled;
    });

    return result;
  };

  var _loadTestScenario = async function (scenario) {
    var nuovoCodice = scenario.codice || (await _generateNewCodice());
    var oggi = new Date().toISOString().slice(0, 10);
    var soggetti = _mergeTestSoggetti(scenario);

    var ambitoRaw = scenario.immobile?.destinazione || "residenziale";
    var ambito = ambitoRaw.toLowerCase();

    var apeRaw =
      scenario.immobile?.classeEnergeticaAnte ||
      scenario.edificio?.classe_ante ||
      "";
    var apeClasse = apeRaw.toUpperCase();

    var rawDati = scenario.valori_campi || scenario.interventiData || {};
    var interventiList =
      scenario.interventi || scenario.selectedInterventi || [];

    var datiTecnici = _generateTechData(rawDati, interventiList);

    var annoCostruzione = scenario.edificio?.anno_costruzione || 1995;
    var superficieMq = scenario.edificio?.superficie_utile_mq || 120;

    var preventivoItems = scenario.preventivo?.items || [];
    var spese = {};
    var preventivoTotale = 0;
    preventivoItems.forEach(function (item) {
      var code = item.codice_intervento;
      var qty = parseFloat(item.quantita) || 1;
      var imp = parseFloat(item.importo) || 0;
      var subtot = qty * imp;
      if (code && code !== "CUSTOM") {
        spese[code] = (spese[code] || 0) + subtot;
      }
      preventivoTotale = preventivoTotale + subtot;
    });
    interventiList.forEach(function (code) {
      if (!spese[code]) {
        spese[code] = Math.round(
          (preventivoTotale || 10000) / interventiList.length,
        );
      }
    });

    var maggiorazioni = scenario.maggiorazioni || [];

    _praticaData = {
      pratica: {
        id: _generateTmpId(),
        codice: nuovoCodice,
        data_inserimento: oggi,
        nome: scenario.nome || "Test automatico",
        modalita_accesso:
          scenario.input?.modalita_accesso ||
          scenario.modalita_accesso ||
          "diretto",
        data_richiesta: scenario.input?.data_richiesta || "",
        data_fine_lavori: scenario.input?.data_fine_lavori || "",
        note: scenario.descrizione || "",
      },
      edificio: {
        indirizzo:
          scenario.edificio?.indirizzo || scenario.immobile?.indirizzo || "",
        categoria_catastale:
          scenario.edificio?.categoria_catastale ||
          scenario.immobile?.categoriaCatastale ||
          "",
        ambito: ambito,
        zona_climatica: _normalizeZona(
          scenario.edificio?.zona_climatica || scenario.immobile?.zonaClimatica,
        ),
        anno_costruzione: annoCostruzione,
        superficie_utile_mq: superficieMq,
        impianto_esistente: scenario.edificio?.impianto_esistente || {
          tipo: scenario.edificio?.tipo_impianto || "",
          potenza_kw:
            scenario.edificio?.potenza_esistente_kw ||
            scenario.immobile?.potenza_esistente_kw ||
            0,
          combustibile:
            scenario.edificio?.combustibile_ante ||
            scenario.immobile?.combustibile_ante ||
            "",
          libretto: false,
          libretto_codice: "",
        },
        comune_sotto_15k: scenario.edificio?.comune_sotto_15k || false,
        scuola_ospedale: scenario.edificio?.scuola_ospedale || false,
        ape: {
          classe_ante: apeClasse,
        },
      },
      proprietario: soggetti.proprietario,
      richiedente: soggetti.richiedente,
      responsabile: soggetti.responsabile,
      delegato: soggetti.delegato,
      interventi: interventiList,
      dati_tecnici: datiTecnici,
      economico: {
        preventivo: preventivoItems,
        spese: spese,
        iva: scenario.iva || {},
        maggiorazioni: maggiorazioni,
        incentivo: null,
      },
      documenti: scenario.documenti || {},
    };

    _currentStep = 0;
    _renderStep(0);
    _updateGlobalNav();
  };

  /* ========= COLLEGAMENTO PULSANTE TEST ========= */

  var _connectTestButton = function () {
    var btn = document.getElementById("btn-load-test");
    if (!btn) return;

    btn.onclick = function () {
      var winId = "win-test-selector";
      var existingWin = document.getElementById(winId);
      if (existingWin) {
        existingWin.remove();
      }

      var overlay = document.createElement("div");
      overlay.className = "overlay show";
      overlay.style.cssText =
        "position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.5);z-index:20010;display:flex;align-items:center;justify-content:center;";

      var win = document.createElement("div");
      win.id = winId;
      win.style.cssText =
        "background:#252525;border:1px solid #68c8b2;border-radius:8px;min-width:620px;max-width:95%;box-shadow:0 11px 15px -7px rgba(0,0,0,0.5);z-index:20011;";

      var headerHtml =
        '<div style="background:#1e1e1e;color:#e0e0e0;padding:10px 15px;display:flex;justify-content:space-between;align-items:center;cursor:move;border-radius:8px 8px 0 0;border-bottom:1px solid rgba(104,200,178,0.3);">' +
        "<strong>Seleziona Scenario di Test</strong>" +
        '<button class="win-close-btn" title="Chiudi" style="background:transparent;border:none;color:white;cursor:pointer;font-size:1.2rem;line-height:1;">&times;</button>' +
        "</div>";

      var bodyHtml =
        '<div style="padding:16px 20px 20px;"><p style="margin-bottom:12px;font-size:0.9rem;color:rgba(224,224,224,0.7);">Seleziona uno scenario predefinito per caricare automaticamente tutti i dati:</p>' +
        '<div style="display:flex;flex-direction:column;gap:6px;max-height:65vh;overflow-y:auto;padding-right:6px;">';

      TEST_SCENARIOS_LIST.forEach(function (s) {
        if (s.group) {
          bodyHtml +=
            '<div style="font-weight:bold;color:#68c8b2;padding:8px 4px 2px 4px;font-size:0.8rem;letter-spacing:0.5px;text-transform:uppercase;border-bottom:1px solid rgba(104,200,178,0.15);">' +
            s.group +
            "</div>";
        } else {
          bodyHtml +=
            '<button class="scenario-btn" data-file="' +
            s.file +
            '"' +
            ' style="text-align:left;padding:9px 12px;background:rgba(255,255,255,0.04);color:inherit;border:1px solid rgba(255,255,255,0.08);border-radius:4px;cursor:pointer;font-size:0.9rem;transition:background 0.15s;"' +
            " onmouseover=\"this.style.background='rgba(104,200,178,0.12)'\"" +
            " onmouseout=\"this.style.background='rgba(255,255,255,0.04)'\"" +
            ">" +
            s.label +
            "</button>";
        }
      });

      bodyHtml += "</div></div>";
      win.innerHTML = headerHtml + bodyHtml;
      overlay.appendChild(win);
      document.body.appendChild(overlay);

      overlay.onclick = function (e) {
        if (e.target === overlay) {
          overlay.remove();
        }
      };

      win.querySelector(".win-close-btn").onclick = function () {
        overlay.remove();
      };

      win.querySelectorAll(".scenario-btn").forEach(function (btn) {
        btn.onclick = async function (e) {
          var fetchPath =
            e.currentTarget.getAttribute("data-file") + "?t=" + Date.now();
          try {
            var response = await fetch(fetchPath);
            if (!response.ok) {
              var errMsg = "HTTP " + response.status;
              throw new Error(errMsg);
            }
            var testData = await response.json();
            _loadTestScenario(testData);
            overlay.remove();
          } catch (err) {
            console.error("Errore caricamento test:", err);
            alert("Errore nel caricamento: file non trovato o JSON corrotto.");
          }
        };
      });
    };
  };

  const api = {
    onStateChange: null,
    init: async function () {
      if (!_praticaData.pratica.codice) {
        _praticaData.pratica.codice = await _generateNewCodice();
      }
      if (!_praticaData.pratica.data_inserimento) {
        _praticaData.pratica.data_inserimento = new Date()
          .toISOString()
          .slice(0, 10);
      }
      _currentStep = 0;
      _renderStep(0);
      _updateGlobalNav();
    },
    goNext: _goNext,
    goPrev: _goPrev,
    goToStart: _goToStart,
    goToEnd: _goToEnd,
    getData: function () {
      return _praticaData;
    },
    loadData: function (data) {
      if (!data) return;
      _normalizeFromComposed(data);
      if (
        Array.isArray(data.interventi) &&
        data.interventi.length > 0 &&
        typeof data.interventi[0] === "object"
      ) {
        data.interventi = data.interventi
          .map(function (iv) {
            return iv.codice_intervento || "";
          })
          .filter(function (code) {
            return code !== "";
          });
      }
      if (Array.isArray(data.interventi)) {
        data.interventi.sort();
      }
      _praticaData = data;
      _renderStep(_currentStep);
      _updateGlobalNav();
    },
    getCurrentStep: function () {
      return _currentStep;
    },
    loadTestScenario: _loadTestScenario,
    exportPraticaTxt: function (dati) {
      return _exportPraticaTxt(dati);
    },
    isStepActive: function () {
      if (!_viewport) return false;
      const step = _viewport.querySelector(".wizard-step");
      return step !== null;
    },
    hasActivePratica: function () {
      const nome = _praticaData.pratica.nome || "";
      return nome.trim() !== "";
    },
    showReport: function (dati) {
      if (!dati) {
        console.error("showReport: dati non validi");
        return;
      }
      const cloned = JSON.parse(JSON.stringify(dati));
      _normalizeFromComposed(cloned);
      if (
        Array.isArray(cloned.interventi) &&
        cloned.interventi.length > 0 &&
        typeof cloned.interventi[0] === "object"
      ) {
        cloned.interventi = cloned.interventi
          .map(function (iv) {
            return iv.codice_intervento || "";
          })
          .filter(function (code) {
            return code !== "";
          });
      }
      if (Array.isArray(cloned.interventi)) {
        cloned.interventi.sort();
      }
      _praticaData = cloned;
      _showReportPreview();
    },
    reset: function () {
      _praticaData = {
        pratica: {
          id: "",
          codice: "",
          data_inserimento: "",
          data_richiesta: "",
          data_fine_lavori: "",
          nome: "",
          modalita_accesso: "diretto",
          note: "",
        },
        proprietario: {},
        richiedente: {},
        responsabile: {},
        delegato: {},
        edificio: {
          indirizzo: "",
          categoria_catastale: "",
          ambito: "",
          zona_climatica: "",
          anno_costruzione: null,
          superficie_utile_mq: null,
          impianto_esistente: {
            tipo: "",
            potenza_kw: 0,
            combustibile: "",
            libretto: false,
            libretto_codice: "",
          },
          ape: {},
        },
        interventi: [],
        dati_tecnici: {},
        economico: { preventivo: [], maggiorazioni: [], incentivo: null },
        documenti: {},
      };
      _currentStep = 0;
      _renderStep(0);
      _updateGlobalNav();
    },
  };

  _connectTestButton();

  return api;
};

export const WizardManager = UaWizardManager;
