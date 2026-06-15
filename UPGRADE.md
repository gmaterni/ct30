# UPGRADE — Piano di correzione rateizzazione incentivo

Eseguire in ordine. Dopo ogni fase, verificare con `PIANO_VERIFICA.md`.

---

## FASE 0 — Backup baseline

Prima di toccare codice, salva lo stato attuale:

```bash
node tools/genera_dati_test.mjs
cp -r dati_test dati_test_baseline
```

---

## FASE 1 — Core fix rateizzazione (ERRORI #1, #4)

Rimuovere la soglia 15.000€ dal calcolo per-singolo-intervento e
applicarla solo sul totale complessivo.

### 1.1 — formula_engine.js: \_calculatePaymentPlan

File: `static/js/core/formula_engine.js`

Rimuovere le righe 106-118 (blocco `if (totalAmount <= SOGLIA_UNICA_SOLUZIONE)`).

Codice da rimuovere:

```js
if (totalAmount <= SOGLIA_UNICA_SOLUZIONE) {
  plan.numInstallments = 1;
  plan.isSinglePayment = true;
  plan.documentazioneSemplificata =
    totalAmount <=
    (PROCEDURA_CONFIG.SOGLIA_DOCUMENTAZIONE_SEMPLIFICATA || 5000);
  plan.installments.push({
    n: 1,
    amount: parseFloat(totalAmount.toFixed(2)),
    label: "Unica soluzione",
  });
  return plan;
}
```

Dopo la rimozione, il flusso continua direttamente al calcolo della
durata e allo split in rate. La variabile `plan` è già dichiarata
alle righe 99-104 con `isSinglePayment: false`.

**Attenzione**: la variabile `SOGLIA_UNICA_SOLUZIONE` rimane dichiarata
alla riga 92 perché serve ancora `PROCEDURA_CONFIG.SOGLIA_UNICA_SOLUZIONE`
per il campo `documentazioneSemplificata`. Se non più usata altrove,
rimuovere anche la riga 92 e 93-97 se non servono più.

### 1.2 — wizard_manager.js: \_calculateOverallPaymentPlan

File: `static/js/wizard_manager.js`

Alla riga 408, sostituire:

```js
    if (total <= 15000) {
```

con:

```js
    const sogliaUnicaSoluzione = 15000; // o import da PROCEDURA_CONFIG
    if (total <= sogliaUnicaSoluzione) {
```

Se disponibile, usare la costante `PROCEDURA_CONFIG.SOGLIA_UNICA_SOLUZIONE`
invece di 15000 hardcoded. La costante è esportata da `normativa.js`.

**Verifica**: eseguire sezione A.1 di `PIANO_VERIFICA.md` (prove A1–A6).

---

## FASE 2 — Verifica normativa PA/ETS (ERRORE #6)

Decidere se PA/ETS non economico devono rateizzare o rimanere unica rata.

### 2.1 — Consultare normativa

Leggere in `normative/Regole_Applicative_CT_3_0.txt`:

- §3.3: modalità accesso ETS
- §4.2: erogazione incentivo PA
- §4.2.1: rateizzazione

### 2.2 — Se unica rata confermata

Aggiungere nota esplicativa nella UI del piano erogazione in
`wizard_manager.js` (nell'HTML generato per PA/ETS):

```html
<div style="font-size:0.8em;color:#68c8b2;">
  Pagamento in unica soluzione per PA/ETS non economico (ai sensi delle Regole
  Applicative §4.2)
</div>
```

### 2.3 — Se rateizzazione necessaria

Rimuovere l'eccezione PA/ETS in due file:

1. `formula_engine.js:76-89` (blocco `_isPAorETS` in `_calculatePaymentPlan`)
2. `wizard_manager.js:382-398` (blocco `soggettoType === "Pubblica Amministrazione"` in `_calculateOverallPaymentPlan`)

Dopo rimozione, PA/ETS seguono la stessa logica di rateizzazione
degli altri soggetti (FASE 1).

**Verifica**: eseguire sezione A.2 di `PIANO_VERIFICA.md` (prove A7–A10).

---

## FASE 3 — UI trasparenza piano erogazione (ERRORE #5)

### 3.1 — Legenda piano complessivo

In `wizard_manager.js`, nell'HTML del piano complessivo (dopo il titolo
"Piano di Erogazione Incentivo Complessivo"), aggiungere:

```js
planHtml += '<div style="font-size:0.8em;opacity:0.7;margin-bottom:8px;">';
planHtml += "Ogni intervento è rateizzato in base alla propria durata ";
planHtml +=
  "(2 anni per potenza &lt; 35kW, 5 anni per potenza ≥ 35kW o durata fissa). ";
planHtml += "L'importo annuo complessivo è la somma delle rate di tutti ";
planHtml += "gli interventi attivi in quell'anno.";
planHtml += "</div>";
```

### 3.2 — Dettaglio durata per intervento

Nel card di riepilogo economico per ogni intervento, aggiungere riga:

```js
cardHtml += '<div style="font-size:0.8em;opacity:0.6;">';
cardHtml += "Durata: " + durata + " anni — Importo annuo: " + importoAnnuo;
cardHtml += "</div>";
```

Dove `durata` e `importoAnnuo` vengono dal `paymentPlan` di ogni intervento.

### 3.3 — Nota criterio maxYear

Nella UI del piano complessivo, aggiungere tooltip o nota:

```js
planHtml += '<div style="font-size:0.75em;opacity:0.5;margin-top:4px;">';
planHtml +=
  "Il numero di annualità corrisponde alla durata massima tra tutti gli interventi.";
planHtml += "</div>";
```

### 3.4 — Rata visibile anche con blocchi

In `_calculateOverallPaymentPlan`, se `hasErrors` ma `total > 0`,
calcolare comunque il piano (saltando solo gli interventi con errore).

Modificare il loop di aggregazione per saltare gli interventi con errori
invece di azzerare tutto.

**Verifica**: eseguire sezione A.3 di `PIANO_VERIFICA.md` (prove A11–A13)
e sezione E (prove E1–E3).

---

## FASE 4 — Messaggi blocco espliciti (ERRORI #2, #3)

### 4.1 — Mostrare blocco in fase Economico

In `wizard_manager.js`, nel rendering dei risultati di calcolo per
intervento, se `r.errors.length > 0`, mostrare messaggio rosso:

```js
if (r.errors && r.errors.length > 0) {
  html += '<div style="color:#ff6b6b;font-weight:600;margin:4px 0;">';
  html += "⛔ Blocco: " + r.errors[0];
  html += "</div>";
}
```

Invece di omettere la riga o mostrare 0€ senza contesto.

### 4.2 — Label test nella sidebar

In `TEST_SCENARIOS_LIST` (wizard_manager.js), aggiornare label:

| Riga | Da                                                      | A                                                         |
| ---- | ------------------------------------------------------- | --------------------------------------------------------- |
| T11  | `"Sistema Ibrido III.B (bivalente) + Scaldacqua III.E"` | `"Sistema Ibrido III.B + III.E — blocco η_s atteso"`      |
| T02  | `"PdC Grande III.A + Fotovoltaico II.H"`                | `"Terziario — PdC III.A + II.H (blocco accumulo atteso)"` |

**Verifica**: eseguire sezione C di `PIANO_VERIFICA.md` (prove C1–C6)
e sezione E (prove E1, E5).

---

## FASE 5 — Pulizia nomi test

### 5.1 — Rinominare test_02

```bash
mv static/data/tests/test_02_impresa_grande.json \
   static/data/tests/test_02_terziario_pdc_fv.json
```

### 5.2 — Aggiornare TEST_SCENARIOS_LIST

In `wizard_manager.js`:

- Cambiare path file: `test_02_impresa_grande.json` → `test_02_terziario_pdc_fv.json`
- Cambiare gruppo da "Impresa" a "Terziario" (spostare nel gruppo corretto)
- Aggiornare label: `"Terziario — PdC III.A + II.H (blocco accumulo atteso)"`

**Verifica**:

1. Caricare il test rinominato dalla sidebar → valori invariati
2. QaManager.runAllTests() → tutti verdi

---

## FASE 6 — Verifica finale

### 6.1 — Diff DATI

```bash
node tools/genera_dati_test.mjs
diff -r dati_test_baseline/ dati_test/
```

Confermare che le differenze siano SOLO nei test con rateizzazione
modificata (T01, T04, T09, T13, ecc.) e non in importi lordi.

### 6.2 — Smoke test

Eseguire sezione F di `PIANO_VERIFICA.md`:

- F.1 — Diff DATI (sopra)
- F.2 — `QaManager.runAllTests()` in console
- F.3 — Test suite HTML (3 pagine)

---

## Riepilogo comandi rapidi

```bash
# Backup baseline
node tools/genera_dati_test.mjs && cp -r dati_test dati_test_baseline

# Rigenerare dopo correzioni
node tools/genera_dati_test.mjs

# Confrontare
diff -r dati_test_baseline/ dati_test/

# Ripristinare baseline per ricominciare
rm -rf dati_test && cp -r dati_test_baseline dati_test
```

Se una fase produce effetti inattesi, fermarsi e riesaminare prima
di procedere alla successiva. Non saltare le verifiche intermedie.
