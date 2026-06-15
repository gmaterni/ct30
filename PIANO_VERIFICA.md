# PIANO DI VERIFICA — Conto Termico 3.0

Eseguire dopo ogni modifica a `formula_engine.js`, `rules_engine.js`,
`cross_rule_engine.js`, `wizard_manager.js` o `normativa.js`.

---

## Pre-requisiti: baseline DATI

Prima di applicare correzioni, salvare lo stato attuale:

```bash
node tools/genera_dati_test.mjs
cp -r dati_test dati_test_baseline
```

Dopo le correzioni, rigenerare e confrontare:

```bash
node tools/genera_dati_test.mjs
diff -r dati_test_baseline/ dati_test/ 2>&1 | less
```

Esaminare ogni differenza: devono essere solo quelle attese (descritte
nelle sezioni seguenti). Qualsiasi differenza extra va investigata.

---

## A — Rateizzazione incentivo

Verificare che il piano di erogazione sia corretto per ogni combinazione
di importo e soggetto.

### A.1 — Multi-intervento sotto/oltre soglia

| Prova | Carica test                    | Controlla                             |
| ----- | ------------------------------ | ------------------------------------- |
| A1    | T01 — III.A 12kW, 3.260,16€    | Unica rata (totale ≤ 15k)             |
| A2    | T09 — II.B + II.C, 15.340€     | 5 rate da 3.068€ (nessuna > 15k)      |
| A3    | T04 — II.G + III.A, 20.764,68€ | Rate, nessuna rata > 15.000€          |
| A4    | T13 — II.A + III.A, 8.313,90€  | Unica rata (totale ≤ 15k)             |
| A5    | T05 — III.A 40kW, 4.327,27€    | Unica rata (totale ≤ 15k)             |
| A6    | T07 — 5 interventi, ~53.795€   | Rate annuali chiare, legenda visibile |

**Valori attesi (post-fix A+B):**

| Test | Rate       | Dettaglio                                                  |
| ---- | ---------- | ---------------------------------------------------------- |
| T01  | 1 rata     | 3.260,16€ (unica)                                          |
| T09  | 5 rate     | 2.478€ + 590€ = 3.068€/anno                                |
| T04  | per durata | II.G e III.A splittati, nessuna > 15k                      |
| T13  | 1 rata     | 8.313,90€ (unica)                                          |
| T05  | 1 rata     | 4.327,27€ (unica)                                          |
| T07  | max durata | importi annuali decrescenti se ci sono interventi a 2 anni |

### A.2 — PA / ETS non economico

| Prova | Carica test                 | Controlla                                                        |
| ----- | --------------------------- | ---------------------------------------------------------------- |
| A7    | T08 — PA ≤15k, 78.342,55€   | Unica rata + nota "PA/ETS non economico" (se normativa conferma) |
| A8    | T16 — ETS non econ, 50.000€ | Unica rata + nota                                                |
| A9    | T17 — ETS non econ, 32.500€ | Unica rata + nota                                                |
| A10   | T14 — PA ≤15k, 5.841,82€    | Unica rata (sotto soglia + PA)                                   |

### A.3 — Piano complessivo UI

| Prova | Carica test | Controlla                                                                   |
| ----- | ----------- | --------------------------------------------------------------------------- |
| A11   | T07         | Legenda "Ogni intervento è rateizzato in base alla propria durata" presente |
| A12   | T07         | Per ogni intervento: mostra durata e importo annuo individuale              |
| A13   | T04         | Tooltip/nota "numero annualità = durata massima tra interventi"             |

---

## B — Calcolo importo incentivo

Verificare che l'importo lordo per ogni test corrisponda ai valori attesi
(da `docs/ANALISI_TEST_DATI.md`, tabella 31 scenari principali).

| Prova | Test | Interventi                        | %               | Importo lordo atteso            |
| ----- | ---- | --------------------------------- | --------------- | ------------------------------- |
| B1    | T01  | III.A PdC aria/acqua 12kW         | Ci=0.15         | 3.260,16€                       |
| B2    | T02  | III.A + II.H FV 50kWp             | Ci=0.06 / —     | 9.207,69€ / 0€ (blocco)         |
| B3    | T03  | II.A isolamento pareti 200mq      | 60%             | 19.200,00€                      |
| B4    | T04  | II.G ricarica + III.A PdC         | 45% / Ci=0.06   | 6.750,00€ / 13.564,68€          |
| B5    | T05  | III.A PdC 40kW (>35kW)            | Ci=0.06         | 4.327,27€                       |
| B6    | T07  | III.A+II.H+II.G+II.F+III.E        | 50/50/64/60%+Ci | 8.195+24.000+9.000+9.600+1.500€ |
| B7    | T08  | PA ≤15k: II.A + III.A             | 100% / Ci=0.06  | 72.000€ / 6.342,55€             |
| B8    | T10  | ETS non econ: III.C + III.D       | 65% / 65%       | 3.108€ / 2.814€                 |
| B9    | T12  | Impresa: II.A + III.A             | 63% / Ci=0.15   | 10.000€ / 3.826,22€             |
| B10   | T14  | PA ≤15k: III.A                    | 100% / Ci=0.06  | 5.841,82€                       |
| B11   | T16  | ETS non econ ≤15k: II.A           | 100%            | 50.000€                         |
| B12   | T17  | ETS non econ (no ≤15k): II.A      | 65%             | 32.500€                         |
| B13   | T18  | III.A PdC + made_in_eu            | Ci=0.15         | 2.524,24€                       |
| B14   | T19  | Impresa: III.A PdC                | Ci=0.15         | 2.524,24€                       |
| B15   | T20  | III.A + III.G microcog.           | Ci=0.15 / 65%   | 2.524,24€ / 65.000€             |
| B16   | T22  | Impresa: II.A parete interna      | 48%             | 4.940€                          |
| B17   | T24  | III.D solare termico prest.       | 65%             | 6.432€                          |
| B18   | T25  | III.F teleriscaldamento 80kW      | 65%             | 8.320€                          |
| B19   | T26  | III.C caldaia biomassa            | 65%             | 1.800€                          |
| B20   | T27  | III.C stufa pellet (log.)         | 65%             | 598,75€                         |
| B21   | T30  | PA: III.F teleriscaldamento 200kW | 65%             | 16.900€                         |
| B22   | T31  | III.C caldaia legna cippato       | 65%             | 2.520€                          |

**Modalità**: caricare ogni test dalla sidebar "pratiche-test", andare a
Fase 6 (Economico), premere "Calcola incentivo", leggere importo lordo.

---

## C — Blocchi e messaggi errore

Verificare che i test con blocchi previsti mostrino messaggio esplicito
nella UI (Fase Economico / Riepilogo) e non solo 0€ senza spiegazione.

| Prova | Test | Blocco atteso                                           | Messaggio UI atteso                                                  |
| ----- | ---- | ------------------------------------------------------- | -------------------------------------------------------------------- |
| C1    | T02  | II.H — accumulo 20kWh < 25kWh (ratio 0.40 < 0.50)       | "Blocco: accumulo insufficiente" su II.H; III.A mostra rata regolare |
| C2    | T11  | III.B — η_s 89% < 98% per potenza ≥400kW                | "Blocco: rendimento ibrido insufficiente"                            |
| C3    | T15  | II.B — valvole termostatiche non presenti               | "Blocco: valvole termostatiche non presenti"                         |
| C4    | T23  | II.D — ampliamento 200mc > 25% (limite 100mc)           | "Blocco: ampliamento volumetrico eccede 25%"                         |
| C5    | T28  | III.B — rapporto PdC/caldaia 1.00 > 0.5 + η_s 89% < 90% | "Blocco: rapporto PdC/caldaia superato"                              |
| C6    | T29  | III.D — DEC 6.67 < 8.0                                  | "Blocco: DEC inferiore a 8.0"                                        |

---

## D — Regole soggetto (R1–R10) e problematiche

Verificare le 8 pratiche "Problematiche (R1–R10)" dalla sidebar.

| Prova | Test | Regola                    | Importo atteso         | Note            |
| ----- | ---- | ------------------------- | ---------------------- | --------------- |
| D1    | P01  | R1 — Privato solo III     | 3.815,06€              | III.A PdC       |
| D2    | P02  | R2 — Impresa Titolo V     | 9.207,69€              | III.A 45%       |
| D3    | P03  | R3 — ETS non econ         | 19.500,00€             | II.A 65%        |
| D4    | P04  | R4 — II.H → III.A pairing | 10.006,82€ + 7.500,00€ | III.A + II.H    |
| D5    | P05  | R5 — II.C → II.B pairing  | 7.680,00€ + 3.200,00€  | II.B + II.C     |
| D6    | P06  | R6 — ESCO → EPC           | 8.368,64€              | PA+ESCO         |
| D7    | P07  | R7 — PA comune ≤15k 100%  | 50.000,00€             | II.A isolamento |
| D8    | P10  | R10 — Mandato + assenso   | 3.067,35€              | III.A PdC       |

---

## E — Messaggi e note UI

| Prova | Carica test | Controlla                                                         |
| ----- | ----------- | ----------------------------------------------------------------- |
| E1    | T02         | III.A mostra rata (unica); II.H mostra "Blocco: accumulo"         |
| E2    | T07         | Legenda visibile nel piano erogazione complessivo                 |
| E3    | T07         | Per ogni intervento: riga "Durata: X anni — Importo annuo: Y.YY€" |
| E4    | T08         | Nota "Pagamento in unica soluzione per PA/ETS" (se confermato)    |
| E5    | T11         | Messaggio blocco η_s rosso visibile                               |

---

## F — Smoke test finale

### F.1 — Scenari DATI completi (39/39)

```bash
# Pre-fix (già fatto in pre-requisiti)
node tools/genera_dati_test.mjs
cp -r dati_test dati_test_baseline

# Post-fix
node tools/genera_dati_test.mjs
diff -r dati_test_baseline/ dati_test/
```

Il diff DEVE mostrare solo differenze attese:

- **Rateizzazione**: tutti i test passano da `Unica soluzione` a `X rate annuali` (FASE 1)
- **PA/ETS**: rimangono `Unica soluzione` (accesso diretto)
- **Importi lordi** cambiano solo per test con II.G o II.H (D3: made_in_eu rimosso)
  - T04 (II.G): 7.200€ → 6.750€
  - T07 (II.H+II.G): 24.960+9.540 → 24.000+9.000
  - P04 (II.H): 7.800 → 7.500
- **Test invariati**: nessuna differenza sugli importi di III.A, III.D, II.A, ecc.

Se il diff mostra differenze su importi lordi in test non toccati → regressione.

### F.2 — MS Scenarios (console browser)

```js
QaManager.runAllTests();
```

Tutti i 25 MS test devono passare (verde).

### F.3 — Test suite HTML

Servire `static/` via HTTP e aprire:

| Pagina                          | Gruppi                                                        | Esito atteso   |
| ------------------------------- | ------------------------------------------------------------- | -------------- |
| `/test/test_suite.html`         | MS Scenarios, Formula Engine, Rules Engine, Cross-Rule Engine | Tutti verdi    |
| `/test/test_problematiche.html` | R1..R10                                                       | Tutti verdi    |
| `/test/index.html`              | Panoramica                                                    | Caricamento ok |

---

## Riepilogo tempi

| Fase       | Azione                                  | Durata stimata |
| ---------- | --------------------------------------- | -------------- |
| Pre        | `genera_dati_test.mjs` + salva baseline | 1 min          |
| A          | Rateizzazione (13 prove)                | 15 min         |
| B          | Importi lordi (22 prove)                | 25 min         |
| C          | Blocchi (6 prove)                       | 10 min         |
| D          | Regole soggetto (8 prove)               | 15 min         |
| E          | UI messaggi (5 prove)                   | 10 min         |
| F1         | Diff DATI                               | 2 min          |
| F2         | MS console                              | 1 min          |
| F3         | Test suite HTML                         | 5 min          |
| **Totale** |                                         | **~84 min**    |

Dopo familiarità: ~40 min per verifica completa.
