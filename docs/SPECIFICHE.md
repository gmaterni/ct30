# SPECIFICHE TECNICHE — Conto Termico 3.0

## Stack Tecnologico

| Componente | Tecnologia | Versione |
|-----------|-----------|----------|
| Linguaggio | JavaScript (Vanilla ES Module) | ES2020+ |
| Stili | LESS (compilato lato browser via less.js) | 4.x |
| Persistenza | IndexedDB via Dexie.js | 7.x |
| UI Framework | Nessuno — HTML semantico + CSS puro |
| Dipendenze esterne | 0 (tutto vendordizzato) |

## Struttura File

```
static/
├── index.html                     # Entry point HTML
├── favicon.ico
├── js/
│   ├── app.js                     # Entry point JS (initApp)
│   ├── wizard_manager.js          # Controller wizard 7 fasi
│   ├── core/
│   │   ├── normativa.js           # Database normativo (SSOT)
│   │   ├── rules_engine.js        # Validazione regole business
│   │   ├── formula_engine.js      # Calcolo incentivi
│   │   ├── cross_rule_engine.js   # Regole interdipendenza interventi
│   │   ├── preventivo_manager.js  # Gestione preventivo
│   │   ├── premialita_engine.js   # Calcolo premialità
│   │   ├── reliability_engine.js  # Motore affidabilità
│   │   ├── qa_manager.js          # Quality assurance / audit
│   │   ├── catalogo_loader.js     # Caricamento on-demand cataloghi tecnici JSON
│   ├── infra/
│   │   ├── idb_mgr.js             # IndexedDB CRUD (Dexie)
│   │   ├── webuser_id.js          # Identificazione utente
│   │   └── vendor/
│   │       └── dexie.js           # Dexie vendordizzato
│   └── ui/lib/
│       ├── uawindow.js            # Finestre modali
│       ├── uadialog.js            # Dialoghi (prompt/confirm/alert)
│       ├── uadrag.js              # Drag & drop
│       └── uajtfh.js              # Helpers form
├── dati_tecnici/                  # Cataloghi tecnici (PDF → JSON)
│   ├── index.json                 # Manifesto codici→file (unico punto di registrazione)
│   ├── III.A_catalogo_pdc.json
│   ├── III.B_catalogo_ibridi.json
│   ├── III.C_catalogo_biomassa.json
│   ├── III.D_catalogo_solare_termico.json
│   └── III.E_catalogo_scaldacqua_pdc.json
├── less/
│   ├── less.js                    # LESS compiler (vendordizzato)
│   ├── style.less                 # Stili principali
│   ├── tooltip.less               # Stili tooltip custom
│   ├── uadialog.less              # Stili dialoghi
│   └── modules/
│       ├── variables.less         # Variabili LESS (colori, font, breakpoint)
│       ├── layout_base.less       # Layout base
│       ├── layout.less            # Layout responsive
│       └── components.less        # Componenti UI (card, bottoni, form)
├── data/
│   └── tests/                                         # 31 scenari JSON (CT30-T01..T31)
│       ├── test_01_pdc_privato.json                   # PdC III.A singolo
│       ├── test_02_impresa_grande.json                # PdC III.A + FV II.H impresa
│       ├── test_03_isolamento_pareti.json             # II.A parete esterna
│       ├── test_04_ricarica_auto.json                 # II.G ricarica EV
│       ├── test_05_incentivo_massimo.json             # Super pratica incentivo max
│       ├── test_06_pratica_reale.json                 # Pratica completa con delegato
│       ├── test_07_completo.json                      # Full Electric 5 interventi
│       ├── test_08_pa_comune.json                     # PA ≤15k + II.A + III.A
│       ├── test_09_infissi_schermature.json           # II.B + II.C cross-rule
│       ├── test_10_ets_biomassa_solare.json           # ETS non econ + III.C + III.D
│       ├── test_11_ibrido_bivalente.json              # III.B ibrido + III.E
│       ├── test_12_impresa_piccola_multi.json         # II.A + III.A piccola impresa
│       ├── test_13_privato_isolamento_pdc.json        # II.A + III.A 55%
│       ├── test_14_check_azion1_1.json                # PA ≤15k III.A 100%
│       ├── test_15_azion4_valvole_non_presenti.json   # Blocco II.B valvole
│       ├── test_16_azion5_ets_non_economico.json      # ETS non econ II.A 100%
│       ├── test_17_azion6_ets_unica_rata.json         # ETS unica rata
│       ├── test_18_azion7_made_in_eu_iii.json         # Premialità Made in EU
│       ├── test_19_azion9_iva_impresa.json            # IVA sottratta impresa
│       ├── test_20_azion10_iiiG_microcogenerazione.json # III.G + III.A
│       ├── test_21_azion11_mantenimento_5anni.json    # Blocco obbligo 5 anni
│       ├── test_22_azion12_iia_interno_30percento.json # II.A interno +30%
│       ├── test_23_azion15_nzeb_volumetrico.json      # Blocco II.D volumetria
│       ├── test_24_azion14_iiid_prestazionale.json    # III.D formula prestazionale
│       ├── test_25_iiif_teleriscaldamento_fasce.json  # III.F fasce 80kW
│       ├── test_26_iiic_biomassa_prestazionale.json   # III.C caldaia lineare
│       ├── test_27_iiic_stufa_logaritmica.json        # III.C stufa logaritmica
│       ├── test_28_iiib_rapporto_pdc_caldaia_blocco.json # Blocco III.B rapporto
│       ├── test_29_iiid_solar_cooling_blocco.json     # Blocco III.D DEC<8
│       ├── test_30_iiif_fascia_alta.json              # III.F fascia alta >150kW
│       └── test_31_iiic_caldaia_legna_logaritmica_d.json # III.C caldaia legna tipo D
├── test/                          # Test suite page (test_suite.html)
```

## Convenzioni Codice (BEST_PRACTICES_JS.md)

| Regola | Descrizione |
|--------|-------------|
| **Niente class/this/new** | Solo pattern Factory/Closure con variabili `let`/`const` |
| **Factory PascalCase** | Prefisso `Ua` (es. `UaWizardManager`, `UaFormulaEngine`) |
| **Return Strict** | Ogni return deve assegnare a variabile descrittiva prima |
| **Template Literal Strict** | Vietata logica dentro `${}` — solo variabili |
| **Fail Fast** | Validazione input in testa a ogni funzione |
| **Async/Await** | Vietato `.then()` — solo `await` |
| **Lingua** | Codice/costanti in inglese; commenti/log in italiano |
| **Hooks HTML** | JS usa `id`/`data-*`; CSS usa `class`; mai selezionare con class per logica |

## Architettura Moduli

```
app.js
  └── wizard_manager.js
        ├── core/rules_engine.js
        │     └── core/normativa.js
        ├── core/formula_engine.js
        │     └── core/normativa.js
        ├── core/cross_rule_engine.js
        │     └── core/normativa.js
        ├── core/preventivo_manager.js
        ├── core/reliability_engine.js
        ├── core/catalogo_loader.js   ← carica JSON da static/dati_tecnici/
        ├── infra/idb_mgr.js
        │     └── infra/vendor/dexie.js
        └── ui/lib/uawindow.js
  └── infra/idb_mgr.js
  └── infra/webuser_id.js
  └── ui/lib/uadialog.js
```

## IndexedDB — Schema v8

Database per-utente: `CT30_{WebId}`

| Tabella | Indexes | Utilizzo |
|---------|---------|----------|
| `kvStore` | id | Key-value generico |
| `settings` | id | Impostazioni utente |
| `pratiche` | id, nome, dataCrea, stato, modalita_accesso | Pratiche |
| `proprietari` | id, praticaId, denominazione | T1 |
| `richiedenti` | id, praticaId, denominazione, tipo_soggetto | T2/SA |
| `responsabili` | id, praticaId, denominazione, tipo_soggetto | T3/SR |
| `delegati` | id, praticaId, denominazione | T4 (opzionale) |
| `edifici` | id, praticaId, zona_climatica, categoria, ambito | T5 |
| `interventi` | id, praticaId, codice_intervento, is_trainante | T6+T7 |
| `economico` | id, praticaId, interventoId | T8 |
| `documenti` | id, praticaId, nome_documento | T9 |
| `variazioni` | id, praticaId, interventoId | T11 |

## Pattern di Persistenza

- `_archivePratica()`: serializza `_praticaData.interventi` da array di stringhe → array di oggetti con `dati_tecnici` + `economico` blob JSON
- `_composePratica()`: ricostruisce `_praticaData` da record DB, ripristina blob JSON in oggetti
- `_normalizeFromComposed()`: backward compat per archivi vecchi formato v6
- `edificio.dati` (blob JSON) include ora `impianto_esistente { tipo, potenza_kw, combustibile, libretto, libretto_codice }`

## LESS Variables (Dark Theme Default)

```less
@dark-bg: #121212;
@dark-surface: #1e1e1e;
@dark-card-bg: #252525;
@dark-primary: #68c8b2;       // Accento unico teal (sostituito indigo #3f51b5)
@dark-primary-variant: #3da88e;
@dark-on-primary: #000000;    // Testo nero su teal per contrasto WCAG AA
@dark-secondary: #ff5252;
@dark-text-primary: #e0e0e0;
@dark-border-radius: 8px;
```

Nota: tutti i colori accent sono unificati al teal `#68c8b2`.   
Nessun riferimento residuo a indigo (`#3f51b5`, `#5c6bc0`) o viola in JS/LESS.

## Moduli Normativi (normativa.js — SSOT)

| Esportazione | Descrizione |
|-------------|-------------|
| `RULES` | Limiti, cap, percentuali di legge |
| `FORMULE_INCENTIVO` | Formule per codice intervento |
| `PROCEDURA_CONFIG` | Configurazione procedure (Titolo II/III) |
| `MAGGIORAZIONI` | Maggiorazioni incentivabili |
| `INTERVENTI` | Catalogo interventi con sezioni tecniche |
| `CATASTO` | Categorie catastali e zone climatiche |
| `SOGGETTI_CONFIG` | Tipologie soggetto e abbinamenti |
| `MATRICE_SA_INTERVENTI` | Matrice SA → interventi ammissibili |
| `MATRICE_SA_SR` | Matrice abbinamento SA → SR ammesso |
| `SCHEDE_TECNICHE` | Sezioni tecniche per codice intervento |
| `CATALOGO_CONFIG` | (wizard_manager.js) Config auto-fill cataloghi tecnici |
| `TERMINI_TEMPORALI` | Scadenze e termini normativi |
| `SOTTO_CATEGORIE_SA` | Sotto-categorie soggetto attuatore |

## Cataloghi Tecnici

Vedi [`CATALOGHI_TECNICI.md`](CATALOGHI_TECNICI.md) per:
- Schema dati di ogni catalogo (III.A–III.E)
- Convenzioni su campi obbligatori, tipi, valori null
- Configurazione auto-fill in Fase 4
- Come aggiungere un nuovo catalogo

## Regole Business Implementate

- [x] Accesso diretto: domanda entro 60gg da conclusione lavori
- [x] Prenotazione: solo PA/ETS non econ, pre-intervento, 50% budget PA
- [x] 3 anagrafiche sempre (anche coincidenza) con flag `coincide_con_*`
- [x] Atto di assenso obbligatorio se proprietario ≠ richiedente
- [x] SA privato + ambito residenziale → solo Titolo III
- [x] Impresa (SA con attività economica) → regime Titolo V
- [x] ETS non econ → assimilato PA; ETS econ → solo Titolo III+V
- [x] II.G+II.H paired with III.A; II.C paired with II.B
- [x] SR=ESCO → contratto EPC obbligatorio
- [x] Incentivo max 65% (100% scuole/PA Comuni ≤15.000 ab.)
- [x] GSE 1% max 250€
- [x] Variazioni >20% → approvazione GSE preventiva
- [x] Mandato irrevocabile all'incasso per non-PA

## Test Suite

| Tipo | Descrizione | Esecuzione |
|------|-------------|------------|
| **Scenari JSON** | 31 file in `data/tests/` caricabili via pulsante "pratiche-test" nel wizard | Browser (file://) |
| **MS Scenarios** | 25 scenari MS-001..MS-025 in `normativa.js` `TEST_SCENARIOS` | `QaManager.runAllTests()` in console |
| **Test Suite page** | `static/test/test_suite.html` — 4 gruppi (MS, Formula, Rules, Cross-Rule) | Richiede server HTTP (es. `python3 -m http.server 8080 --directory static/`) |

### Cache busting

I test ES Module usano `_cacheBustImport()` (fetch + Blob URL) per aggirare la cache del browser.  
Un hard refresh (Ctrl+F5) può essere necessario dopo modifiche ai moduli.

## Tooltip

Tutti i pulsanti interattivi hanno attributo `title` nativo HTML.  
Stili CSS custom in `tooltip.less` per elementi con attributo `data-tt` (data-tt tooltip con angoli smussati e bordo 2px).

Tutti i pulsanti di chiusura (`×`) hanno `title="Chiudi"`.

## Aiuto contestuale "?" — step-help-btn

Su ogni fase del wizard (1–7) è presente un pulsante **"?"** posizionato in alto a destra del form.

| Proprietà | Valore |
|-----------|--------|
| Classe CSS | `.step-help-btn` |
| Posizionamento | `position: absolute; top: 5px; right: 5px` sul contenitore `.wizard-step` (che ha `position: relative`) |
| Stile | Cerchio 36×36px, sfondo `#ff8f00`, testo `#1a1a1a`, peso 900, ombra |
| Comportamento | Click apre `UaWindowAdm` modale (`70vw × 70vh`) con `_showContextHelp(step)` che mostra campi, vincoli e pulsanti della fase corrente |
| Window header | Usa `STEP_HELP_TITLES[step]` come titolo (es. "Fase 3 — Anagrafiche") in `1.4em` colore `#68c8b2` |

Definito in `wizard_manager.js`:
- Costruzione DOM: `_renderStep()` crea `<span class="step-help-btn" data-step="N">?</span>`
- Contenuto: `_showContextHelp(step)` con if/else per ogni fase
- Event binding: listener delegato su `_viewport` con `e.target.closest(".step-help-btn")`

## DOCUMENTI preview

In Fase 7 (Riepilogo) è presente il pulsante **DOCUMENTI** che apre `_showDocumentiPreview()`.

Mostra per ogni intervento selezionato i documenti richiesti da `INTERVENTI[code].documenti_richiesti` con stato:
- ✅ **Flaggato** (verde) — documento presente in `_praticaData.economico.documenti_flags`
- ❌ **Mancante** (rosso) — documento assente

Per SA di tipo condominio, mostra anche i documenti aggiuntivi (`verbale_assemblea`, `tabella_millesimale`) letti dai flag su `_praticaData.richiedente`.

Pulsante **Stampa PDF** nell'header per la stampa della finestra.

## Barra di navigazione superiore (Header Nav)

Quando una pratica è attiva, la barra superiore mostra i pulsanti:

| Pulsante | ID | Comportamento |
|----------|----|--------------|
| RESET | `cmd-reset` | Reimposta pratica corrente |
| INIZIO | `btn-wiz-start-global` | `_goToStart()` — torna a step 0; disabilitato se step = 0 |
| INDIETRO | `btn-wiz-prev-global` | `_goPrev()` — step--; disabilitato se step = 0 |
| AVANTI | `btn-wiz-next-global` | `_goNext()` — step++ con validazione; disabilitato se step = 6 |
| FINE | `btn-wiz-end-global` | `_goToEnd()` — va a step 6; disabilitato se step = 6 o se `_isEconomicoValorizzato()` = false |

La visibilità/abilitazione è gestita da:
- `_updateUIState()` in `app.js` — mostra/nasconde in base a `stepActive`
- `_updateGlobalNav()` in `wizard_manager.js` — stato disabilitato per step corrente e dati economici

I pulsanti disabilitati hanno stile `.disabled` (opacità ridotta, `pointer-events: none`).

## Responsive Design

| Breakpoint | Larghezza | Comportamento |
|-----------|-----------|---------------|
| SM | ≤576px | Sidebar orizzontale, font ridotto, tabella elenco colonne compresse |
| MD | ≤768px | Layout colonna singola sidebar/area |
| LG | ≤992px | Layout normale |
| XL | >1200px | Layout esteso |

### Margini e Layout

- `#wizard-viewport`: `margin: 0 clamp(8px,2vw,40px) 0 4px` — margine sinistro minimo 4px, destro responsive.
- `width: auto` + `box-sizing: border-box` — si allarga fino ai margini senza `max-width` fisso.
- Tabelle elenco pratiche: `table-layout: fixed` con larghezze percentuali, `font-size: 7–8px`.
- `.table-wrap`: `overflow-x: auto` per scroll orizzontale su schermi stretti.
- Finestre modali: `width: min(95vw, 1200px)` su JS + `@media (max-width: @screen-md)` a 95vw.
