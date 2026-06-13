#!/usr/bin/env node

import { readFileSync, writeFileSync, mkdirSync, existsSync, readdirSync } from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const STATIC = path.resolve(__dirname, "../static");

import * as normativa from "../static/js/core/normativa.js";
import { FormulaEngine } from "../static/js/core/formula_engine.js";

const {
  RULES, INTERVENTI, FORMULE_INCENTIVO, SCHEDE_TECNICHE,
  MATRICE_SA_INTERVENTI, SOGGETTI_CONFIG, TERMINI_CONFIG,
  PROCEDURA_CONFIG, CATASTO
} = normativa;

const OUT_DIR = path.resolve(__dirname, "../tmp");
const SEP = "-".repeat(40);
const EQL = "=".repeat(60);

function _fmt2(val) {
  if (val == null || val === "") return "";
  if (typeof val === "string") {
    val = parseFloat(val.replace(",", "."));
    if (isNaN(val)) return val;
  }
  if (typeof val !== "number") return String(val);
  return val.toLocaleString("it-IT", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function _fmtCurr(amount) {
  const val = parseFloat(amount) || 0;
  return val.toLocaleString("it-IT", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 2,
  });
}

function _substParams(expr, params) {
  if (!expr || !params) return expr || "";
  const keys = Object.keys(params).sort((a, b) => b.length - a.length);
  let result = expr;
  keys.forEach((key) => {
    const val = params[key];
    if (typeof val === "number") {
      const repl = _fmt2(val);
      result = result.replace(new RegExp("\\b" + key + "\\b", "g"), repl);
    }
  });
  result = result.replace(/\*/g, "\u00D7");
  return result;
}

function _caricaJson(relativePath) {
  const full = path.resolve(STATIC, relativePath);
  const raw = readFileSync(full, "utf-8");
  return JSON.parse(raw);
}

function _buildPraticaData(scenario) {
  const oggi = new Date().toISOString().slice(0, 10);
  const ambito = (scenario.immobile?.destinazione || "residenziale").toLowerCase();
  const apeClasse = (scenario.immobile?.classeEnergeticaAnte || scenario.edificio?.classe_ante || "").toUpperCase();

  const sogg = scenario.soggetto || {};
  const src = scenario.soggetti || {};
  const sa = src.sa || {};
  const sr = src.sr || {};
  const prop = src.proprietario || {};
  const del = src.delegato || {};

  const denom = sa.denominazione || sogg.denominazione || "N/D";
  const cf = sa.cf_piva || sogg.codiceFiscale || "N/D";
  const ind = sa.indirizzo || sogg.indirizzo || scenario.edificio?.indirizzo || scenario.immobile?.indirizzo || "";
  const pecDef = "test@" + (sa.denominazione || "utente").replace(/[^a-zA-Z]/g, "").toLowerCase() + ".legalmail.it";

  const richiedente = {
    denominazione: denom,
    tipo_soggetto: sa.tipo || sogg.tipo || "Privato residenziale",
    cf_piva: cf,
    indirizzo: ind,
    titolo_disponibilita: sa.titolo_godimento || "Propriet\u00e0",
    pec: sa.pec || pecDef,
    email: sa.email || sogg.email || denom.replace(/ /g, ".").toLowerCase() + "@email.it",
    telefono: sa.telefono || sogg.telefono || "021234567",
    verbale_assemblea: (sa.tipo && sa.tipo.indexOf("Condominio") !== -1) || false,
    tabella_millesimale: (sa.tipo && sa.tipo.indexOf("Condominio") !== -1) || false,
  };

  const responsabile = {
    denominazione: sr.denominazione || denom,
    cf_piva: sr.cf_piva || cf,
    indirizzo: sr.indirizzo || ind,
    tipo_soggetto: sr.tipo || "Privato",
    iban: sr.iban || "IT60X0542811101000000123456",
    mandato_incasso: true,
    pec: sr.pec || pecDef,
    coincide_con_proprietario: prop.coincide_con_sa || false,
    coincide_con_richiedente: sr.coincide_con_sa || false,
  };

  const proprietario = {
    denominazione: prop.denominazione || denom,
    cf_piva: prop.cf_piva || cf,
    tipo_soggetto: prop.tipo || sa.tipo || sogg.tipo || "Privato residenziale",
  };

  const delegato = {};
  if (del.denominazione || del.nome) {
    delegato.denominazione = del.denominazione || del.nome || "";
    delegato.cf = del.cf || del.cf_piva || "";
  }

  const interventiList = scenario.interventi || scenario.selectedInterventi || [];

  const rawDati = scenario.interventiData || scenario.valori_campi || {};
  const datiTecnici = {};
  interventiList.forEach(function (code) {
    const existing = rawDati[code] || {};
    const scheda = SCHEDE_TECNICHE[code];
    if (!scheda || !scheda.campi) {
      datiTecnici[code] = existing;
      return;
    }
    const filled = {};
    for (const k in existing) {
      filled[k] = existing[k];
    }
    scheda.campi.forEach(function (campo) {
      if (filled[campo.id] !== undefined && filled[campo.id] !== "") return;
      let defaultVal = "";
      if (campo.tipo === "number") {
        const min = campo.min || 0;
        const max = campo.max || 10000;
        defaultVal = ((min + (max - min) * 0.3)).toFixed(campo.id.indexOf("trasmittanza") !== -1 ? 2 : 0);
        if (defaultVal === "NaN" || defaultVal === "0") defaultVal = "" + (campo.min || 1);
      } else if (campo.tipo === "select") {
        if (campo.opzioni && campo.opzioni.length > 0) {
          defaultVal = campo.opzioni.indexOf("s\u00ec") !== -1 ? "s\u00ec" : campo.opzioni[0];
        }
      } else if (campo.tipo === "textarea") {
        defaultVal = "Test " + (campo.label || campo.id);
      } else {
        defaultVal = "Test " + (campo.label || campo.id);
      }
      filled[campo.id] = defaultVal;
    });
    datiTecnici[code] = filled;
  });

  const preventivoItems = scenario.preventivo?.items || [];
  const spese = {};
  let preventivoTotale = 0;
  preventivoItems.forEach(function (item) {
    const code = item.codice_intervento || "";
    const qty = parseFloat(item.quantita) || 1;
    const imp = parseFloat(item.importo) || 0;
    const subtot = qty * imp;
    if (code && code !== "CUSTOM") {
      spese[code] = (spese[code] || 0) + subtot;
    }
    preventivoTotale += subtot;
  });
  interventiList.forEach(function (code) {
    if (!spese[code]) {
      spese[code] = Math.round((preventivoTotale || 10000) / interventiList.length);
    }
  });

  const impEsistente = scenario.edificio?.impianto_esistente || scenario.immobile?._esistente || {};
  const edificio = {
    indirizzo: scenario.edificio?.indirizzo || scenario.immobile?.indirizzo || "",
    categoria_catastale: scenario.edificio?.categoria_catastale || scenario.immobile?.categoriaCatastale || "",
    ambito: ambito,
    zona_climatica: scenario.edificio?.zona_climatica || scenario.immobile?.zonaClimatica || "",
    anno_costruzione: scenario.edificio?.anno_costruzione || 1995,
    superficie_utile_mq: scenario.edificio?.superficie_utile_mq || 120,
    impianto_esistente: {
      tipo: impEsistente.tipo || scenario.edificio?.tipo_impianto || "",
      potenza_kw: impEsistente.potenza_kw || scenario.edificio?.potenza_esistente_kw || scenario.immobile?.potenza_esistente_kw || 0,
      combustibile: impEsistente.combustibile || scenario.edificio?.combustibile_ante || scenario.immobile?.combustibile_ante || "",
      libretto: false,
      libretto_codice: "",
    },
    comune_sotto_15k: scenario.edificio?.comune_sotto_15k || false,
    scuola_ospedale: scenario.edificio?.scuola_ospedale || false,
    ape: { classe_ante: apeClasse },
  };

  return {
    pratica: {
      id: "gen-" + (scenario.codice || "XXX"),
      codice: scenario.codice || "N/D",
      data_inserimento: oggi,
      nome: scenario.nome || "Test",
      modalita_accesso: scenario.input?.modalita_accesso || scenario.modalita_accesso || "diretto",
      data_richiesta: scenario.input?.data_richiesta || "",
      data_fine_lavori: scenario.input?.data_fine_lavori || "",
      note: scenario.descrizione || "",
      richiestaPreliminareInviata: scenario.richiestaPreliminareInviata || false,
      dataRichiestaPreliminare: scenario.dataRichiestaPreliminare || "",
      dataPrimoImpegno: scenario.dataPrimoImpegno || "",
    },
    edificio: edificio,
    richiedente: richiedente,
    responsabile: responsabile,
    proprietario: proprietario,
    delegato: delegato,
    interventi: interventiList,
    dati_tecnici: datiTecnici,
    economico: {
      preventivo: preventivoItems,
      spese: spese,
      iva: scenario.iva || {},
      maggiorazioni: scenario.maggiorazioni || [],
      incentivo: null,
    },
    documenti: scenario.documenti || {},
  };
}

function _exportPraticaTxt(dati) {
  if (!dati || !dati.pratica) return null;
  const interventi = dati.interventi || [];
  const r = dati.richiedente || {};
  const p = dati.proprietario || {};
  const sr = dati.responsabile || {};
  const d = dati.delegato || {};
  const ed = dati.edificio || {};
  const dt = dati.dati_tecnici || {};
  const eco = dati.economico || {};
  const lines = [];
  const add = (t) => lines.push(t);

  add(EQL);
  add("  REPORT DETTAGLIATO PRATICA");
  add(EQL);
  add("");

  add("DATI GENERALI");
  add(SEP);
  add("  Codice:          " + (dati.pratica.codice || "N/D"));
  add("  Nome:            " + (dati.pratica.nome || "N/D"));
  add("  Data inserimento:" + (dati.pratica.data_inserimento || "N/D"));
  add("  Data richiesta:  " + (dati.pratica.data_richiesta || "N/D"));
  add("  Data fine lavori:" + (dati.pratica.data_fine_lavori || "N/D"));
  add("  Modalit\u00e0 accesso:" + (dati.pratica.modalita_accesso || "N/D"));
  add("  Note:            " + (dati.pratica.note || ""));
  if (dati.pratica.richiestaPreliminareInviata) {
    add("  Rich. Preliminare: S\u00ec (" + (dati.pratica.dataRichiestaPreliminare || "") + ")");
    add("  Primo impegno:     " + (dati.pratica.dataPrimoImpegno || ""));
  }
  add("");

  const impianto = ed.impianto_esistente || {};
  add("EDIFICIO");
  add(SEP);
  add("  Indirizzo:             " + (ed.indirizzo || "N/D"));
  add("  Categoria catastale:   " + (ed.categoria_catastale || "N/D"));
  add("  Zona climatica:        " + (ed.zona_climatica || "N/D"));
  add("  Superficie utile mq:   " + (ed.superficie_utile_mq || "N/D"));
  add("  Anno costruzione:      " + (ed.anno_costruzione || "N/D"));
  add("  Comune <15.000 ab:     " + (ed.comune_sotto_15k ? "S\u00ec" : "No"));
  add("  Scuola/ospedale:       " + (ed.scuola_ospedale ? "S\u00ec" : "No"));
  add("  APE classe ante:       " + ((ed.ape && ed.ape.classe_ante) || "N/D"));
  add("  Impianto Esistente:");
  add("    Tipo:                " + (impianto.tipo || "Non specificato"));
  add("    Potenza termica:     " + (impianto.potenza_kw ? impianto.potenza_kw + " kW" : "N/D"));
  add("    Combustibile:        " + (impianto.combustibile || "N/D"));
  add("");

  add("SOGGETTI");
  add(SEP);
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
    add(SEP);
    interventi.forEach(function (code) {
      add("  " + code);
      const campi = dt[code] || {};
      for (const k in campi) {
        if (campi.hasOwnProperty(k) && campi[k] !== "" && campi[k] != null) {
          add("    " + k + ": " + campi[k]);
        }
      }
    });
    add("");
  }

  if (eco.preventivo && eco.preventivo.length) {
    const sorted = eco.preventivo.slice().sort((a, b) =>
      (a.codice_intervento || "").localeCompare(b.codice_intervento || "")
    );
    add("PREVENTIVO");
    add(SEP);
    let tot = 0;
    sorted.forEach(function (item) {
      const imp = (item.importo || 0) * (item.quantita || 1);
      tot += imp;
      const codice = item.codice_intervento || "?";
      const descr = item.descrizione || "";
      const tipo = item.tipo_costo || "";
      add("  " + codice + " | " + descr + " | " + tipo + " | " + imp.toFixed(2) + " \u20ac");
    });
    add("  " + "-".repeat(30));
    add("  TOTALE: " + tot.toFixed(2) + " \u20ac");
    add("");
  }

  add(EQL);
  add("  Generato da tools/genera_dati_test.mjs");
  add(EQL);

  return lines.join("\n");
}

function _exportCalcoliTxt(dati) {
  const interventi = dati.interventi || [];
  const dt = dati.dati_tecnici || {};
  const ed = dati.edificio || {};
  const sa = dati.richiedente || {};
  if (!interventi.length) return "";
  const lines = [];
  const add = (t) => lines.push(t);

  add("");
  add(SEP);
  add("  CALCOLI — FORMULE INCENTIVO");
  add(SEP);
  add("");

  interventi.forEach(function (code) {
    const datiInt = dt[code] || {};
    const metadata = FORMULE_INCENTIVO[code];
    const metaIntervento = INTERVENTI[code] || {};
    const nomeIntervento = metaIntervento.nome || code;

    const contesto = {
      zonaClimatica: ed.zona_climatica,
      soggetto: sa.tipo_soggetto,
      codiciSelezionati: interventi,
      comuneSotto15k: !!ed.comune_sotto_15k,
      scuolaOspedale: !!ed.scuola_ospedale,
    };

    let calc;
    try {
      calc = FormulaEngine.calculate(code, datiInt, contesto);
    } catch (err) {
      add("  " + code + " — " + nomeIntervento);
      add("    ERRORE calcolo: " + err.message);
      add("");
      return;
    }

    let formulaBase = "";
    if (metadata) {
      formulaBase = metadata.formula_base || "";
    }

    add("  " + code + " — " + nomeIntervento);
    if (formulaBase) {
      add("    Formula: I = " + formulaBase);
    }

    if (calc.steps && calc.steps.length > 0) {
      add("    Passaggi:");
      calc.steps.forEach(function (s) {
        const label = s.label || "";
        const desc = s.desc || "";
        const formulaExpr = s.formula || "";
        let calcVal = "";
        if (s.formula && calc.params) {
          calcVal = _substParams(s.formula, calc.params);
        }
        const isCurrency = typeof s.value === "number" && s.unit === "\u20ac";
        const valStr = isCurrency
          ? _fmtCurr(s.value)
          : _fmt2(s.value) + (s.unit ? " " + s.unit : "");
        const cellDesc = desc ? desc + " (" + label + ")" : label;
        add("      " + cellDesc + ": " + (formulaExpr || "") + " = " + calcVal + " => " + valStr);
      });
    }

    if (calc.amount !== undefined) {
      add("    Risultato: I = " + (formulaBase || "?") + " = " + _fmtCurr(calc.amount));
      if (calc.incentivoNetto !== undefined) {
        const netto = _fmtCurr(calc.incentivoNetto);
        const gse = _fmtCurr(calc.corrispettivoGSE ? calc.corrispettivoGSE.importo : 0);
        add("    Netto GSE: " + netto + " (corrispettivo GSE: " + gse + ")");
      }
      if (calc.paymentPlan) {
        const rate = calc.paymentPlan.numInstallments;
        const rataLabel = rate === 1 ? "Unica soluzione" : rate + " rate annuali";
        add("    Erogazione: " + rataLabel);
      }
    }

    if (calc.errors && calc.errors.length > 0) {
      add("    Errori:");
      calc.errors.forEach(function (e) {
        add("      - " + e);
      });
    }

    add("");
  });

  return lines.join("\n");
}

function _exportRisultatiTxt(dati) {
  const interventi = dati.interventi || [];
  const dt = dati.dati_tecnici || {};
  const ed = dati.edificio || {};
  const sa = dati.richiedente || {};
  if (!interventi.length) return "";
  const lines = [];
  const add = (t) => lines.push(t);

  add("");
  add(SEP);
  add("  RISULTATI — DETTAGLIO CALCOLI");
  add(SEP);
  add("");

  interventi.forEach(function (code) {
    const datiInt = dt[code] || {};
    const contesto = {
      zonaClimatica: ed.zona_climatica,
      soggetto: sa.tipo_soggetto,
      codiciSelezionati: interventi,
      comuneSotto15k: !!ed.comune_sotto_15k,
      scuolaOspedale: !!ed.scuola_ospedale,
    };

    let calc;
    try {
      calc = FormulaEngine.calculate(code, datiInt, contesto);
    } catch (err) {
      add("  Intervento " + code);
      add("    ERRORE: " + err.message);
      add("");
      return;
    }

    add("  Intervento " + code);

    if (calc.steps && calc.steps.length > 0) {
      calc.steps.forEach(function (s) {
        const isCurrency = typeof s.value === "number" && s.unit === "\u20ac";
        const valStr = isCurrency
          ? _fmtCurr(s.value)
          : _fmt2(s.value) + (s.unit ? " " + s.unit : "");
        const desc = s.desc || "";
        const label = s.label || "";
        const calcVal = s.calc || (typeof s.value === "number" ? _fmt2(s.value) : s.value);
        add("    " + desc + " | " + label + " | " + calcVal + " = " + valStr);
      });
    } else {
      add("    Nessun dettaglio disponibile.");
    }

    if (calc.errors && calc.errors.length > 0) {
      add("    Errori:");
      calc.errors.forEach(function (e) {
        add("      - " + e);
      });
    }

    add("");
  });

  return lines.join("\n");
}

function generateFile(scenario) {
  const dati = _buildPraticaData(scenario);
  const sezione1 = _exportPraticaTxt(dati);
  if (!sezione1) {
    console.error("  ERRORE: impossibile generare report per " + scenario.codice);
    return null;
  }
  const sezione2 = _exportCalcoliTxt(dati);
  const sezione3 = _exportRisultatiTxt(dati);
  return sezione1 + sezione2 + sezione3;
}

function main() {
  if (!existsSync(OUT_DIR)) {
    mkdirSync(OUT_DIR, { recursive: true });
  }

  const testDir = path.resolve(STATIC, "data/tests");
  const files = readdirSync(testDir)
    .filter(function (f) { return f.endsWith(".json"); })
    .map(function (f) { return path.join(testDir, f); })
    .sort();

  if (files.length === 0) {
    console.error("Nessun file test_p*.json trovato in " + testDir);
    process.exit(1);
  }

  console.log("Generazione file DATI per " + files.length + " pratiche di test...\n");

  const allSections = [];
  let ok = 0, err = 0;

  files.forEach(function (filePath) {
    const basename = path.basename(filePath, ".json");
    const label = basename.replace(/^test_p\d+_/, "").replace(/^test_\d+_/, "");
    const outName = "DATI_" + label + ".txt";

    let scenario;
    try {
      scenario = JSON.parse(readFileSync(filePath, "utf-8"));
    } catch (e) {
      console.error("  [ERR] " + basename + ": parse fallito — " + e.message);
      err++;
      return;
    }

    const codice = scenario.codice || basename;
    const nome = scenario.nome || basename;
    const content = generateFile(scenario);

    if (content === null) {
      console.error("  [ERR] " + codice + " — " + nome);
      err++;
      return;
    }

    const outPath = path.join(OUT_DIR, outName);
    writeFileSync(outPath, content, "utf-8");
    const size = (Buffer.byteLength(content, "utf-8") / 1024).toFixed(1);
    console.log("  [OK]  " + codice + "  →  " + outName + "  (" + size + " KB)");
    ok++;

    const sep = "\n" + "=".repeat(60) + "\n  PAGE BREAK — " + nome + " (" + codice + ")\n" + "=".repeat(60) + "\n";
    allSections.push(sep);
    allSections.push(content);
  });

  console.log("\n---");
  console.log("Totale: " + ok + " OK, " + err + " errori su " + files.length + " file");
    console.log("Output in: " + path.relative(__dirname, OUT_DIR) + "/");

  if (allSections.length > 0) {
    const allPath = path.join(OUT_DIR, "TUTTE_PRATICHE_DATI.txt");
    writeFileSync(allPath, allSections.join(""), "utf-8");
    const totalSize = (Buffer.byteLength(allSections.join(""), "utf-8") / 1024).toFixed(1);
    console.log("File unico: " + allPath + "  (" + totalSize + " KB)");
  }
}

main();
