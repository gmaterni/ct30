# CT30 Advisor — Agent Instructions

## Project type

Pure client-side SPA: vanilla ES2020+ modules, no bundler, no npm deps, all libraries vendordized. LESS compiled in-browser via `less/less.js`.

## Entrypoints

- `static/index.html` → `<script type="module" src="js/app.js?0.1.8">`
- Test pages: `static/test/test_suite.html` (4 groups), `test_problematiche.html`, `static/test/index.html`
- Root `index.html` is a redirect to `static/index.html` — not the real entry

## Dev commands

| Action              | Command                                                        |
| ------------------- | -------------------------------------------------------------- |
| Dev server          | `npx live-server --port=8080 --no-css-inject` (from `static/`) |
| Compile LESS        | `npx lessc static/less/main.less static/css/main.css`          |
| Minify CSS          | `npx cleancss -o static/css/main.min.css static/css/main.css`  |
| Run test suite      | Serve `static/` via HTTP, open `/test/test_suite.html`         |
| MS tests in console | `QaManager.runAllTests()` in browser devtools                  |

`bin/` scripts are dev-only helpers (git push/pages, compress CSS/JS, generate test data). Prettier auto-runs via `opencode.jsonc` formatter.

## Code conventions

- **No `class`/`this`/`new`/`prototype`** — factory/closure with `let`/`const` only
- **PascalCase factory prefix**: `Ua*` (e.g. `UaWizardManager`, `UaFormulaEngine`, `UaWindowAdm`)
- **Template literal strict**: no logic inside `${}` — only variables
- **Async/await only**: no `.then()`
- **Fail-fast**: validate inputs at top of every function
- **Language**: code/constants/identifiers in English; comments/logs in Italian
- **CSS selectors**: JS hooks = `id`/`data-*` attributes; CSS hooks = `class`. Never select by class for logic.
- **Dark theme**: teal accent `#68c8b2` (no residual indigo/violet references)

## Architecture

```
static/js/app.js  (initApp — entry)
  └─ wizard_manager.js  (7-phase wizard controller)
       ├─ core/rules_engine.js        (+ normativa.js SSOT)
       ├─ core/formula_engine.js      (+ normativa.js)
       ├─ core/cross_rule_engine.js   (+ normativa.js)
       ├─ core/preventivo_manager.js
       ├─ core/reliability_engine.js
       ├─ core/premialita_engine.js
       ├─ core/qa_manager.js          (runs TEST_SCENARIOS from normativa.js)
       ├─ core/catalogo_loader.js     (loads catalog JSON on-demand)
       ├─ infra/idb_mgr.js           (Dexie IndexedDB, vendordized)
       ├─ infra/webuser_id.js         (per-user DB name: CT30_{WebId})
       ├─ ui/lib/uawindow.js          (modal windows)
       ├─ ui/lib/uadialog.js          (dialog helpers)
       ├─ ui/lib/uadrag.js            (drag support)
       └─ ui/lib/uajtfh.js            (dynamic HTML builder)
```

Business rules SSOT: `static/js/core/normativa.js` — 21 exports including `RULES`, `INTERVENTI`, `FORMULE_INCENTIVO`, `SCHEDE_TECNICHE`, `MATRICE_SA_INTERVENTI`, `TEST_SCENARIOS`, etc.

## Data & persistence

- **IndexedDB** via vendordized Dexie (`static/js/infra/vendor/dexie.js`), database per user: `CT30_{WebId}`
- **12 tables**: `kvStore`, `settings`, `pratiche`, `proprietari`, `richiedenti`, `responsabili`, `delegati`, `edifici`, `interventi`, `economico`, `documenti`, `variazioni` — schema v8
- **3 mandatory anagraphics** (proprietario, richiedente, responsabile) even if same person, with `coincide_con_*` flags
- Technical catalogs: `static/dati_tecnici/` JSON (III.A–III.G) loaded on-demand via `catalogo_loader.js`, registered in `index.json`
- Export/import DB via `Salva DB` / `Carica DB` buttons

## Versioning

When updating app version, update in 3 places:

1. `static/index.html` — query string on `js/app.js?0.1.8`
2. `static/js/app.js` — `APPVERSION` and `APPDATE` in `_renderWelcomeScreen()`
3. `static/js/core/normativa.js` — `NORMATIVA_VERSION` (normative version, not app)

## Tests

Three manual browser-based mechanisms:

1. **39 JSON scenarios** — `static/data/tests/test_*.json` (31 principal) + `test_p*.json` (8 problematiche), loaded via sidebar "pratiche-test" in wizard
2. **25 MS scenarios** — embedded in `normativa.js` as `TEST_SCENARIOS`, run via `QaManager.runAllTests()` in console
3. **Test suite pages** — `static/test/test_suite.html` (4 groups), `test_problematiche.html`, `index.html`. **Require HTTP server** (not `file://`). Use `_cacheBustImport()` — Ctrl+F5 may be needed after module changes.

## Wizard navigation (header bar buttons)

| Button   | ID                     | Behavior                                              |
| -------- | ---------------------- | ----------------------------------------------------- |
| RESET    | `cmd-reset`            | clears current practice                               |
| INIZIO   | `btn-wiz-start-global` | step=0; disabled if step=0                            |
| INDIETRO | `btn-wiz-prev-global`  | step--; disabled if step=0                            |
| AVANTI   | `btn-wiz-next-global`  | step++; disabled if step=6                            |
| FINE     | `btn-wiz-end-global`   | step=6; disabled if `_isEconomicoValorizzato()`=false |

Visibility: `_updateUIState()` in `app.js`. Disabled state: `_updateGlobalNav()` in `wizard_manager.js`.

## LESS organization

```
static/less/
  style.less          — main styles
  tooltip.less        — custom tooltips (data-tt attribute)
  uadialog.less       — dialog styles
  modules/
    variables.less    — colors, fonts, breakpoints
    layout_base.less
    layout.less       — responsive (SM≤576, MD≤768, LG≤992, XL>1200)
    components.less   — cards, buttons, forms
```

7 wizard phases: Pratica → Edificio → Anagrafiche → Interventi → Dati Tecnici → Economico → Riepilogo. Each has a "?" button (`.step-help-btn`, top-right) opening contextual help in a `UaWindowAdm` modal.
