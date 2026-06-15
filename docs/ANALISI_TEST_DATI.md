# Analisi incrociata pratiche test (39/39)

Analisi generata il 2026-06-13 leggendo ogni JSON scenario
(`static/data/tests/`) e il corrispondente DATI (`dati_test/`), validando
contro le regole business CT3.0.

---

## Copertura test per regola

| Regola                              | `test_problematiche.html`            | JSON pratica (`static/data/tests/`)   | DATI (`dati_test/`)           |
| ----------------------------------- | ------------------------------------ | ------------------------------------- | ----------------------------- |
| R1 — Privato resid. solo Titolo III | R1-1..R1-6 (6 test)                  | `test_p01_privato_titolo3.json`       | ✅ 3.815,06€ (III.A)          |
| R2 — Impresa Titolo V               | R2-1..R2-8 (8 test)                  | `test_p02_impresa_titolo_v.json`      | ✅ 9.207,69€ (III.A 45%)      |
| R3 — ETS non econ/economico         | R3-1..R3-6 (6 test)                  | `test_p03_ets_non_economico.json`     | ✅ 19.500,00€ (II.A 65%)      |
| R4 — II.G/II.H → III.A              | R4-1..R4-9 (9 test, incl. II.C→II.B) | `test_p04_iiH_iiiA_pairing.json`      | ✅ 10.006,82€ + 7.500,00€     |
| R5 — II.C → II.B                    | Incluso in R4-8/R4-9                 | `test_p05_iiB_iiC_pairing.json`       | ✅ 7.680,00€ + 3.200,00€      |
| R6 — ESCO → EPC                     | R6-1..R6-4 (4 test)                  | `test_p06_esco_epc.json`              | ✅ 8.368,64€ (PA+ESCO)        |
| R7 — Incentivo max                  | R7-1..R7-5 (5 test)                  | `test_p07_pa_comune_100percento.json` | ✅ 50.000,00€ (100%)          |
| R8 — GSE fee                        | R8-1..R8-2 (2 test)                  | — (calcolo interno)                   | —                             |
| R9 — Variazioni >20%                | R9-1..R9-6 (6 test)                  | — (integrato in P4)                   | ✅ (tutte le DATI verificate) |
| R10 — Mandato + atto assenso        | R10-1..R10-5 (5 test)                | `test_p10_mandato_atto_assenso.json`  | ✅ 3.067,35€                  |

**Totale**: 51 test unitari in `test_problematiche.html` + 8 pratiche JSON
"Problematiche (R1–R10)" + 39 pratiche DATI generate.

---

## 31 scenari principali (CT30-T01 ÷ CT30-T31)

| Scenario | Soggetto                     | Interventi                                  | %               | Importo lordo                   | Blocco                                          | Esito                                       |
| -------- | ---------------------------- | ------------------------------------------- | --------------- | ------------------------------- | ----------------------------------------------- | ------------------------------------------- |
| **T01**  | Privato residenziale         | III.A PdC aria/acqua 12kW                   | Ci=0.15         | 3.260,16€                       | —                                               | ✅                                          |
| **T02**  | Privato terziario            | III.A + II.H FV 50kWp                       | Ci=0.06 / —     | 9.207,69€ / 0€                  | accumulo 20kWh < 25kWh (ratio 0.40 < 0.50)      | ⏸ blocco atteso                             |
| **T03**  | Privato terziario            | II.A isolamento pareti 200mq                | 60%             | 19.200,00€                      | —                                               | ✅                                          |
| **T04**  | Privato terziario            | II.G ricarica + III.A PdC                   | 45% / Ci=0.06   | 6.750,00€ / 13.564,68€          | —                                               | ✅                                          |
| **T05**  | Privato residenziale         | III.A PdC 40kW (>35kW)                      | Ci=0.06         | 4.327,27€                       | —                                               | ✅                                          |
| **T06**  | Privato residenziale         | III.A PdC 12kW                              | Ci=0.15         | 3.260,16€                       | —                                               | ✅                                          |
| **T07**  | Privato terziario            | III.A+II.H+II.G+II.F+III.E                  | 50/50/64/60%+Ci | 8.195+24.000+9.000+9.600+1.500€ | —                                               | ✅                                          |
| **T08**  | PA comune≤15k                | II.A + III.A                                | 100% / Ci=0.06  | 72.000€ / 6.342,55€             | —                                               | ✅                                          |
| **T09**  | Privato residenziale         | II.B + II.C                                 | 59% / 59%       | 12.390€ / 2.950€                | —                                               | ✅ (calc.) ⚠️ (wizard R1 blocca privato+II) |
| **T10**  | ETS non economico            | III.C biomassa + III.D solare               | 65% / 65%       | 3.108€ / 2.814€                 | —                                               | ✅                                          |
| **T11**  | Privato residenziale         | III.B ibrido + III.E                        | —               | 0€ / 700€                       | η_s 89% < 98% per potenza ≥400kW                | ⏸ blocco atteso                             |
| **T12**  | Impresa                      | II.A + III.A                                | 63% / Ci=0.15   | 10.000€ / 3.826,22€             | —                                               | ✅                                          |
| **T13**  | Privato terziario            | II.A + III.A (perc_multi 55%)               | 65% / Ci=0.15   | 5.850€ / 2.463,90€              | —                                               | ✅                                          |
| **T14**  | PA comune≤15k                | III.A PdC                                   | 100% / Ci=0.06  | 5.841,82€                       | —                                               | ✅                                          |
| **T15**  | Privato terziario            | II.B infissi                                | —               | 0€                              | valvole termostatiche non presenti              | ⏸ blocco atteso                             |
| **T16**  | ETS non economico comune≤15k | II.A isolamento                             | 100%            | 50.000€                         | —                                               | ✅                                          |
| **T17**  | ETS non economico (no ≤15k)  | II.A isolamento                             | 65%             | 32.500€                         | —                                               | ✅                                          |
| **T18**  | Privato residenziale         | III.A PdC + made_in_eu                      | Ci=0.15         | 2.524,24€                       | —                                               | ✅                                          |
| **T19**  | Impresa                      | III.A PdC                                   | Ci=0.15         | 2.524,24€                       | —                                               | ✅                                          |
| **T20**  | Impresa                      | III.A + III.G microcogenerazione            | Ci=0.15 / 65%   | 2.524,24€ / 65.000€             | —                                               | ✅                                          |
| **T21**  | Impresa                      | III.A PdC (mantenimento 5 anni)             | Ci=0.15         | 2.524,24€                       | —                                               | ✅                                          |
| **T22**  | Impresa                      | II.A parete interna (cmax 30%)              | 48%             | 4.940€                          | —                                               | ✅                                          |
| **T23**  | Privato residenziale         | II.D nZEB volumetrico                       | —               | 0€                              | ampliamento 200mc > 25% limite (100mc)          | ⏸ blocco atteso                             |
| **T24**  | Privato residenziale         | III.D solare termico prestazionale          | 65%             | 6.432€                          | —                                               | ✅                                          |
| **T25**  | Privato terziario            | III.F teleriscaldamento 80kW                | 65%             | 8.320€                          | —                                               | ✅                                          |
| **T26**  | Privato residenziale         | III.C caldaia biomassa                      | 65%             | 1.800€                          | —                                               | ✅                                          |
| **T27**  | Privato residenziale         | III.C stufa pellet (logaritmica)            | 65%             | 598,75€                         | —                                               | ✅                                          |
| **T28**  | Privato residenziale         | III.B ibrido PdC/caldaia                    | —               | 0€                              | rapporto PdC/caldaia 1.00 > 0.5 + η_s 89% < 90% | ⏸ blocco atteso                             |
| **T29**  | Privato residenziale         | III.D solar cooling                         | —               | 0€                              | DEC 6.67 < 8.0                                  | ⏸ blocco atteso                             |
| **T30**  | PA                           | III.F teleriscaldamento 200kW (fascia alta) | 65%             | 16.900€                         | —                                               | ✅                                          |
| **T31**  | Privato residenziale         | III.C caldaia legna cippato (log. D)        | 65%             | 2.520€                          | —                                               | ✅                                          |

**6 blocchi attesi confermati**: T02 (accumulo), T11 (η_s), T15 (valvole),
T23 (volume), T28 (rapporto ibrido), T29 (DEC).

---

## 8 scenari problematiche (CT30-P01 ÷ P10)

| Scenario | Soggetto             | Interventi                  | % applicata | Importo lordo          | Esito |
| -------- | -------------------- | --------------------------- | ----------- | ---------------------- | ----- |
| **P01**  | Privato residenziale | III.A PdC 12kW aria/acqua   | Ci=0.15     | 3.815,06€              | ✅    |
| **P02**  | Impresa              | III.A PdC 100kW acqua/acqua | Ci=0.06     | 9.207,69€              | ✅    |
| **P03**  | ETS non economico    | II.A isolamento 200mq       | 65%         | 19.500,00€             | ✅    |
| **P04**  | Privato terziario    | III.A + II.H FV 10kWp       | Ci=0.15/50% | 10.006,82€ + 7.500,00€ | ✅    |
| **P05**  | Privato residenziale | II.B + II.C                 | 64%/64%     | 7.680,00€ + 3.200,00€  | ✅    |
| **P06**  | PA (SA), ESCO (SR)   | III.A PdC 60kW              | Ci=0.06     | 8.368,64€              | ✅    |
| **P07**  | PA comune≤15k        | II.A isolamento 300mq       | 100%        | 50.000,00€             | ✅    |
| **P10**  | Privato residenziale | III.A PdC 10kW aria/acqua   | Ci=0.15     | 3.067,35€              | ✅    |

---

## Risultati complessivi

| Categoria                  | Conteggio                                                                                  |
| -------------------------- | ------------------------------------------------------------------------------------------ |
| ✅ Calcolo OK              | 33                                                                                         |
| ⏸ Blocco atteso confermato | 6                                                                                          |
| ❌ Anomalia di sostanza    | 0                                                                                          |
| ⚠️ Scenario irrealistico   | 1 (T09: privato res. + Titolo II — il formula engine calcola ma il wizard R1 bloccherebbe) |
| ⚠️ Nome fuorviante         | 1 (T02: file `test_02_impresa_grande.json` ma soggetto è Privato terziario)                |

**Nessuna anomalia di calcolo**: tutti i valori corrispondono alle regole
implementate. L'unica discrepanza documentale (P03 100%→65%) è già stata
corretta in `PROBLEMATICHE.md`.

Per i dettagli sulle regole business: `PROBLEMATICHE.md`.
Per il divario normativa vs implementazione: `PROBLEMATICHE_CRITICHE.md`.
