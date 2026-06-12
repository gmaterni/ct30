# AGENTS.md — CT30 (Conto Termico 3.0 Advisor)

## What this is

Vanilla JS (ES Module) SPA, no framework/bundler/npm. Open `static/index.html` in a browser. Root `index.html` redirects there. LESS compiled client-side via vendored `less.js`.

## Commands

```bash
# Serve the app (ES modules require HTTP):
python3 -m http.server 8080 --directory static/
# then open http://localhost:8080/  (or http://localhost:8080/test/test_suite.html)

# Compile LESS → CSS (requires lessc + cleancss)
./bin/comprcss.sh

# Minify JS (requires google-closure-compiler)
./bin/comprjs.sh

# Deploy (force-push + enable Pages — has hardcoded GITHUB_TOKEN, handle with care)
./bin/git_push.sh
./bin/git_pages.sh
```

## Testing

- **JSON scenarios**: 31 test JSONs in `static/data/tests/`, registered in `wizard_manager.js:30` as `TEST_SCENARIOS_LIST` (8 groups). Load via sidebar "pratiche-test" button.
- **Automated (browser console)**: `QaManager.runAllTests()` runs 25 MS scenarios (`MS-001`..`MS-025`) embedded in `normativa.js` as `TEST_SCENARIOS` — validates RulesEngine, CrossRuleEngine, FormulaEngine.
- **Test suite page** (`static/test/test_suite.html`): 4 groups (MS Scenarios, Formula, Rules, Cross-Rule). Uses `_cacheBustImport()` (fetch + Blob URL) to bypass ES module cache. Hard refresh (Ctrl+F5) may help.
- **Quick test**: open `static/index.html`, click "pratiche-test" to load any JSON scenario.

## Entry & flow

`static/index.html` → `js/app.js` → `js/wizard_manager.js` (7-step wizard). Steps: 0=Pratica, 1=Edificio, 2=Anagrafiche, 3=Interventi, 4=Dati Tecnici, 5=Economico, 6=Riepilogo.

## Architecture

- **IndexedDB** via vendored Dexie.js (`static/js/infra/vendor/dexie.js`). Per-user DB name: `CT30_{WebId}` (localStorage via `static/js/infra/webuser_id.js`). Schema v8, non-destructive upgrade from v6. 12 tables.
- **Single source of truth for business logic**: `static/js/core/normativa.js` — rules, formulas, constants, SCHEDE_TECNICHE (~l.1003), FORMULE_INCENTIVO (~l.1274), PREMIALITA_CONFIG (~l.21), TEST_SCENARIOS (~l.1586). `NORMATIVA_VERSION` at l.19.
- **Core modules** (9 files in `static/js/core/`): `normativa.js`, `rules_engine.js`, `formula_engine.js`, `cross_rule_engine.js`, `premialita_engine.js`, `preventivo_manager.js`, `catalogo_loader.js`, `reliability_engine.js`, `qa_manager.js`. Exception: `catalogo_loader.js` exports plain functions (`loadCatalogo`, `getMarche`, `getModelliPerMarca`), not a Ua factory.
- **UI library** (`static/js/ui/lib/`): `uawindow.js`, `uadialog.js`, `uadrag.js`, `uajtfh.js`. Overrides `alert`/`confirm`/`prompt`.
- **Vendor**: Dexie.js (IndexedDB), `marked.min.js` (docs/help Markdown); less.js (LESS compilation).
- **Technical catalogs**: JSON in `static/dati_tecnici/` mapped by `index.json`. Currently III.A–III.E + III.G (III.F not yet cataloged).
- **Documentation**: `docs/README.md` (indice) + 7 reference Markdown + 1 TXT.

## Cross-cutting constraints (non-obvious)

- **Mutual exclusivity**: III.A, III.B, III.C, III.F cannot be selected together (`cross_rule_engine.js:167`).
- **Paired interventions**: II.H (FV) and II.G (ricarica EV) require III.A (electric heat pump with integrale sostituzione); II.C (schermature) requires II.B (infissi).
- **ETS non economico** treated as PA for intensity and single-rata rules (`formula_engine.js:_isPAorETS`).
- **PA/ETS single rata**: always 1 installment regardless of amount.
- **IVA**: subtracted from eligible spend for Impresa only.
- **Accesso diretto deadline**: 60gg from data_fine_lavori (`TERMINI_CONFIG.accesso_diretto_gg` in normativa.js:68).

## Code conventions

Factory/closure pattern — NO `class`/`this`/`new`/`prototype` in application code (built-in constructors like `Date`, `Set`, `Function` are OK). Use `let`/`const` private state (note: 4 legacy core files — `preventivo_manager.js`, `premialita_engine.js`, `qa_manager.js`, `reliability_engine.js` — still use `var`; new code must use `const`). Factories: `PascalCase` with `Ua` prefix (e.g., `UaWizardManager`, `UaFormulaEngine`). Named exports only, no default exports. ES module imports via relative paths in all files. Prefer `async`/`await`; one `.then()` in application code (`wizard_manager.js:610`). Variables/code in English; comments/docs/logs in Italian. No logic inside template literals — pre-assign variables only.

## Tooling & config

- **`opencode.json`** at root defines agent types and skill permissions (7 skills for coding agent). This file and `AGENTS.md` are `.gitignore`d.
- **`.agents/skills/`** contains per-skill guidance files referenced by `opencode.json`.
- **Other `.gitignore`d files**: `normative/`, `bin/`, `tmp/`, `report/`, `log/`, `.vscode/`, `*.code-workspace`.
- **No CI/CD**: zero automated pipeline (no `.github/` directory, no workflow files, no active pre-commit hooks). Testing done manually via browser or `QaManager.runAllTests()`.

## Notable facts

- DB export/import: sidebar buttons "Salva DB" / "Carica DB", or `idbMgr.exportAll()` / `idbMgr.importAll()`. `budgetMgr` in `idb_mgr.js` tracks plafond per soggetto categoria.
- `static/dati_tecnici/index.json` maps intervention codes (III.A–III.G) to their catalog JSON files.
- The `static/test/test_suite.html` test page requires an HTTP server (same as main app — ES modules don't work with `file://`).
