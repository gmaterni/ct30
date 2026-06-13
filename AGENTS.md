# CT30 Advisor — Agent Instructions

## Project type

Pure client-side SPA: vanilla ES2020+ modules, no bundler, no npm deps, all libraries vendordized. LESS compiled in-browser via `less/less.js`.

## Entrypoints

- `static/index.html` → `<script type="module" src="js/app.js?0.1.7">`
- Test suite: `static/test/test_suite.html` (requires HTTP server)

## Dev commands

| Action | Command |
|--------|---------|
| Dev server | `npx live-server --port=8080 --no-css-inject` (from `static/`) |
| Compile LESS | `npx lessc static/less/main.less static/css/main.css` |
| Minify CSS | `npx cleancss -o static/css/main.min.css static/css/main.css` |
| Run test suite | Serve `static/` via HTTP, open `/test/test_suite.html` |
| MS tests in console | `QaManager.runAllTests()` in browser devtools |

The `bin/` scripts are dev-only helpers (git push to GitHub, compress CSS/JS). Do not rely on them for build.

## Code conventions

- **No `class`/`this`/`new`/`prototype`** — factory/closure with `let`/`const` only
- **PascalCase factory prefix**: `Ua*` (e.g. `UaWizardManager`, `UaFormulaEngine`, `UaWindowAdm`)
- **Return strict**: assign to descriptive variable before returning
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
       ├─ core/catalogo_loader.js     (loads catalogs JSON on-demand)
       ├─ infra/idb_mgr.js           (Dexie IndexedDB, vendordized)
       └─ ui/lib/uawindow.js          (modal windows)
```

The single source of truth for business rules is `static/js/core/normativa.js` — it exports `RULES`, `INTERVENTI`, `FORMULE_INCENTIVO`, `SCHEDE_TECNICHE`, `MATRICE_SA_INTERVENTI`, etc.

## Data & persistence

- **IndexedDB** via vendordized Dexie (`static/js/infra/vendor/dexie.js`), database per user: `CT30_{WebId}`
- **14 tables**: `kvStore`, `settings`, `pratiche`, `proprietari`, `richiedenti`, `responsabili`, `delegati`, `edifici`, `interventi`, `economico`, `documenti`, `variazioni` — schema v8
- **3 mandatory anagraphics** (proprietario, richiedente, responsabile) even if same person, with `coincide_con_*` flags
- Technical catalogs: `static/dati_tecnici/` JSON files loaded on-demand via `catalogo_loader.js`, registered in `index.json`
- Export/import DB via `Salva DB` / `Carica DB` buttons

## Versioning

When updating app version, update in 3 places:
1. `static/index.html` — query string on `js/app.js?...`
2. `static/js/app.js` — `APPVERSION` and `APPDATE` in `_renderWelcomeScreen()`
3. `static/js/core/normativa.js` — `NORMATIVA_VERSION` (normative version, not app)

## Tests

Three test mechanisms, all manual (browser-based):

1. **31 JSON scenarios** — `static/data/tests/test_*.json`, loaded via sidebar button "pratiche-test" in the wizard UI
2. **25 MS scenarios** — embedded in `normativa.js` as `TEST_SCENARIOS`, run via `QaManager.runAllTests()` in browser console
3. **Test suite page** — `static/test/test_suite.html` (4 groups: MS, Formula, Rules, Cross-Rule). **Requires HTTP server** (not `file://`). Uses `_cacheBustImport()` to bypass browser cache — Ctrl+F5 may be needed after module changes.

## Wizard phases

7 phases: Pratica → Edificio → Anagrafiche → Interventi → Dati Tecnici → Economico → Riepilogo

Each has a **"?"** button (`.step-help-btn`, top-right) opening contextual help in a `UaWindowAdm` modal.

## Wizard navigation (header bar)

| Button | Behavior |
|--------|----------|
| RESET | `cmd-reset` — clears current practice |
| INIZIO | `btn-wiz-start-global` — goes to step 0; disabled if step=0 |
| INDIETRO | `btn-wiz-prev-global` — step--; disabled if step=0 |
| AVANTI | `btn-wiz-next-global` — step++ with validation; disabled if step=6 |
| FINE | `btn-wiz-end-global` — goes to step 6; disabled if `_isEconomicoValorizzato()`=false |

Visibility toggled by `_updateUIState()` in `app.js`; disabled state by `_updateGlobalNav()` in `wizard_manager.js`.

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

## Important rules & quirks

- SA privato + ambito residenziale → only Titolo III (cannot use Titolo II interventions)
- Impresa with attività economica → regime Titolo V
- ETS non economico → assimilated to PA; ETS economico → only Titolo III+V
- II.G+II.H must pair with III.A; II.C must pair with II.B
- SR=ESCO → mandatory EPC contract
- Incentive max 65% (100% for schools/PA Comuni ≤15k pop.)
- GSE fee 1% max 250€
- Variazioni >20% → prevent GSE approval
- Mandatory irrevocable collection mandate for non-PA
- Atto di assenso required if proprietario ≠ richiedente
