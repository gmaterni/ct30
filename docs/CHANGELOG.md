# CHANGELOG

## [2026-06-15] Rateizzazione + Allineamento normativo

### FASE 1 — Rateizzazione corretta

- Rimosso blocco `SOGLIA_UNICA_SOLUZIONE` (15.000€) da `_calculatePaymentPlan`
- Sostituito hardcoded 15000 con `PROCEDURA_CONFIG.SOGLIA_UNICA_SOLUZIONE`
- Legenda rateizzazione nei card Economico e Riepilogo
- `_calculateOverallPaymentPlan` salta interventi con errori invece di null

### D1 — PA/ETS: unica rata solo in accesso diretto

- Aggiunto parametro `modalitaAccesso` a `_calculatePaymentPlan`
- Condizione PA/ETS: `_isPAorETS(soggettoType) && modalitaAccesso === "diretto"`
- Stessa logica in `_calculateOverallPaymentPlan` di wizard_manager.js
- Call site aggiornati con `_praticaData.pratica.modalita_accesso`

### D2 — III.D durata: soglia superficie 50m²

- `_calculatePaymentPlan` usa `interventionRules.soglia_superficie` se presente
- Soglia di confronto: `potenzaKw <= soglia` (≤ invece di <)
- Fallback a `SOGLIA_POTENZA_KW` se `soglia_superficie` non definita

### D3 — Made in EU: II.G e II.H esclusi

- Rimossi `"II.G"` e `"II.H"` da `PREMIALITA_CONFIG.made_in_eu.applicabile_a`

### D4 — Zona assistita: filtro applicabile_a

- `zona_assistita_a`: aggiunto check `applicabile_a.some(p => code.startsWith(p) || code === p)`
- `zona_assistita_c`: stesso filtro

### FASE 5 — Test rename

- `test_02_impresa_grande.json` rinominato `test_02_terziario_pdc_fv.json`
- Spostato da gruppo Impresa a Terziario in `TEST_SCENARIOS_LIST`

### Files modificati

- `static/js/core/formula_engine.js` — D1/D2/D4 + FASE 1
- `static/js/core/normativa.js` — D3 (made_in_eu list) + FASE 5 (test rename)
- `static/js/wizard_manager.js` — D1 (PA/ETS modalita_accesso)
- `static/data/tests/test_02_impresa_grande.json` — rimosso
- `static/data/tests/test_02_terziario_pdc_fv.json` — nuovo
- `dati_test/*.txt` — rigenerati
