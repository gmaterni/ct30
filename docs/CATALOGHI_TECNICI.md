# Cataloghi Tecnici — Organizzazione Dati

Ogni catalogo è un file JSON salvato in `static/dati_tecnici/`.  
La mappa codici→file è letta da `index.json` nella stessa directory.  
Al caricamento, la struttura viene normalizzata in array di record piatti `{marca, modello, ...}`.

---

## index.json

```json
{
    "III.A": "III.A_catalogo_pdc.json",
    "III.B": "III.B_catalogo_ibridi.json",
    "...":   "..."
}
```

Per aggiungere un catalogo: crea il JSON, aggiungi la riga in `index.json`.  
Per rinominare un file: cambia solo `index.json`, nessun codice JS da toccare.

---

## Struttura per codice intervento

### III.A — Pompe di Calore (`III.A_catalogo_pdc.json`)

| Campo | Tipo | Descrizione |
|-------|------|-------------|
| `marca` | string | Nome produttore |
| `modello` | string | Codice modello |
| `tipologia_scambio` | string | `Aria/acqua`, `Acqua/acqua` |
| `modello_ue` | string o null | Modello UE (se diverso) |
| `modello_ui` | string o null | Modello UI (specifico italiano) |
| `potenza_kw` | number | Potenza termica nominale kW |
| `eta_s` | number | Efficienza stagionale ηs (%) |
| `scop_cop` | number | SCOP o COP |

### III.B — Sistemi Ibridi (`III.B_catalogo_ibridi.json`)

| Campo | Tipo | Descrizione |
|-------|------|-------------|
| `marca` | string | Nome produttore |
| `modello` | string | Modello PDC |
| `modello_ue` | string o null | Modello UE |
| `modello_ui` | string o null | Modello UI |
| `tipologia_scambio` | string | `Aria/acqua`, ecc. |
| `potenza_pdc_kw` | number | Potenza PDC kW |
| `eta_s` | number | ηs PDC |
| `scop_cop` | number | SCOP/COP PDC |
| `tipo_caldaia` | string o null | Tipologia caldaia (es. `a condensazione a gas`) |
| `modello_caldaia` | string o null | Modello caldaia |
| `potenza_caldaia_kw` | number o null | Potenza caldaia kW |
| `rendimento_caldaia_pct` | number o null | Rendimento caldaia % |

### III.C — Biomassa (`III.C_catalogo_biomassa.json`)

| Campo | Tipo | Descrizione |
|-------|------|-------------|
| `marca` | string | Nome produttore |
| `modello` | string | Modello generatore |
| `tipologia_generatore` | string | `Stufa`, `Caminetto`, `Termocucina`, `Caldaia` |
| `potenza_kw` | number | Potenza termica kW |
| `alimentazione` | string | `Pellet`, `Cippato`, `Legna` |
| `rendimento_pct` | number | Rendimento % |
| `classe_ambientale` | string | `5 stelle`, `4 stelle` |

### III.D — Solare Termico (`III.D_catalogo_solare_termico.json`)

| Campo | Tipo | Descrizione |
|-------|------|-------------|
| `tipo_collettori` | string | `piani`, `sottovuoto` |
| `utilizzo` | string | `Solo ACS`, `ACS e riscaldamento` |
| `marca` | string | Nome produttore |
| `modello` | string | Modello collettore |
| `n_collettori` | number o null | Numero collettori (se preconfigurato) |
| `area_ag_m2` | number | Area di apertura geometrica m² |
| `area_aa_m2` | number o null | Area di apertura totale m² |
| `qcol_50c_kwh` | number o null | Energia Qcol a 50°C kWh/anno |
| `qcol_75c_kwh` | number o null | Energia Qcol a 75°C kWh/anno |
| `qsol_50c_kwh` | number o null | Energia Qsol a 50°C kWh/anno |
| `qsol_75c_kwh` | number o null | Energia Qsol a 75°C kWh/anno |
| `qsol_150c_kwh` | number o null | Energia Qsol a 150°C kWh/anno |
| `ql_mj_anno` | number o null | Energia QL MJ/anno |

### III.E — Scaldacqua PDC (`III.E_catalogo_scaldacqua_pdc.json`)

| Campo | Tipo | Descrizione |
|-------|------|-------------|
| `marca` | string | Nome produttore |
| `modello` | string | Modello scaldacqua |
| `potenza_w` | number | Potenza termica W |
| `tipologia` | string | `Monoblocco`, `Split`, ecc. |
| `classe` | string | Classe energetica (`A+`, `A`, `B`, `C`) |
| `capacita_litri` | number | Capacità accumulo litri |

---

## Convenzioni generali

1. **`marca` e `modello`** sono i soli campi obbligatori in ogni record.
2. I valori assenti vanno rappresentati con `null` (non con stringa `"-"`).
3. I numeri usano `.` come separatore decimale (formato JSON standard).
4. Non ci sono limiti di lunghezza array — il caricamento è lazy (one-shot in memoria).
5. Il file `index.json` è l'unico punto di registrazione: senza di esso il catalogo non viene caricato.

## Auto-fill in Fase 4 (wizard_manager.js)

Il `CATALOGO_CONFIG` in `wizard_manager.js` definisce per ogni codice:

| Codice | Campi auto-compilati dal record catalogo | Formato modello |
|--------|------------------------------------------|-----------------|
| III.A | `potenza_termica_kw` → `potenza_pdc_kw`, `scop_cop` → `scop`, `efficienza_stagionale` → `eta_s` | `modello (potenza kW, ηs %)` |
| III.B | `potenza_pdc_kw` → `potenza_pdc_kw`, `scop_cop` → `scop`, `efficienza_stagionale` → `eta_s` | `modello (potenza kW, ηs %)` |
| III.C | `potenza_termica_kw` → `potenza_nominale_kw`, `classe_ambientale` → `classe_emissiva`, `alimentazione` → `tipo_biomassa` | `modello (potenza kW, alimentazione)` |
| III.D | `area_lorda_m2` → `superficie_lorda_mq` | `modello (area m²)` |
| III.E | `capacita_accumulo_litri` → `capacita_litri`, `classe_energetica` → `classe_energetica` | `modello (capacità L, classe)` |

### Formato record normalizzato

Al caricamento, `catalogo_loader.js:_normalizeCatalogo()` appiattisce la struttura annidata  
```json
{ "III.X": { "MARCA": { "MODELLO": [{...}] } } }
```
in un array piatto di record `{marca, modello, ...}` pronto per i dropdown.

Per aggiungere un nuovo codice con catalogo: creare il JSON, registrarlo in `index.json`, aggiungere la configurazione in `CATALOGO_CONFIG` e la scheda tecnica in `SCHEDE_TECNICHE`.
