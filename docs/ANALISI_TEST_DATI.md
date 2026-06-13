# Analisi incrociata pratiche test (39/39)

Analisi generata il 2026-06-13 leggendo ogni JSON scenario
(`static/data/tests/`) e il corrispondente DATI (`dati_test/`), validando
contro le regole business CT3.0 (R1–R10, P1–P5).

---

## 31 scenari principali (CT30-T01 ÷ CT30-T31)

| Scenario | Soggetto                          | Interventi                                  | %                 | Importo lordo                   | Blocco                                                | Esito                                                                           |
| -------- | --------------------------------- | ------------------------------------------- | ----------------- | ------------------------------- | ----------------------------------------------------- | ------------------------------------------------------------------------------- |
| **T01**  | Privato residenziale              | III.A PdC aria/acqua 12kW                   | Ci=0.15           | 3.260,16€                       | —                                                     | ✅                                                                              |
| **T02**  | Privato terziario                 | III.A + II.H FV 50kWp                       | Ci=0.06 / —       | 9.207,69€ / 0€                  | **⚠ II.H accumulo 20kWh < 25kWh (ratio 0.40 < 0.50)** | ✅ blocco atteso                                                                |
| **T03**  | Privato terziario                 | II.A isolamento pareti 200mq                | 60%               | 19.200,00€                      | —                                                     | ✅                                                                              |
| **T04**  | Privato terziario                 | II.G ricarica + III.A PdC                   | 48% / Ci=0.06     | 7.200,00€ / 13.564,68€          | —                                                     | ✅                                                                              |
| **T05**  | Privato residenziale              | III.A PdC 40kW (>35kW)                      | Ci=0.06           | 4.327,27€                       | —                                                     | ✅                                                                              |
| **T06**  | Privato residenziale              | III.A PdC 40kW (>35kW)                      | Ci=0.06           | 4.327,27€                       | —                                                     | ✅                                                                              |
| **T07**  | Privato terziario                 | III.A+II.H+II.G+II.F+III.E                  | 52/53/64/60% + Ci | 8.195+24.960+9.540+9.600+1.500€ | —                                                     | ✅                                                                              |
| **T08**  | PA comune≤15k                     | II.A + III.A                                | 100% / Ci=0.06    | 72.000,00€ / 6.342,55€          | —                                                     | ✅                                                                              |
| **T09**  | Privato residenziale              | II.B + II.C                                 | 59% / 59%         | 12.390,00€ / 2.950,00€          | —                                                     | ✅ formula engine (wizard bloccherebbe Titolo II per privato residenziale — R1) |
| **T10**  | ETS non economico                 | III.C biomassa + III.D solare               | 65% / 65%         | 3.108,00€ / 2.814,00€           | —                                                     | ✅                                                                              |
| **T11**  | Privato residenziale              | III.B ibrido + III.E                        | —                 | III.B=0€ / III.E=700€           | **⚠ η_s caldaia 89% < 98% per potenza ≥400kW**        | ✅ blocco atteso                                                                |
| **T12**  | Impresa                           | II.A + III.A                                | 63% / Ci=0.15     | 10.000,00€ / 3.826,22€          | —                                                     | ✅                                                                              |
| **T13**  | Privato terziario                 | II.A + III.A (perc_multi 55%)               | 65% / Ci=0.15     | 5.850,00€ / 2.463,90€           | —                                                     | ✅                                                                              |
| **T14**  | PA comune≤15k                     | III.A PdC                                   | 100% / Ci=0.06    | 5.841,82€                       | —                                                     | ✅                                                                              |
| **T15**  | Privato terziario                 | II.B infissi                                | —                 | 0€                              | **⚠ valvole termostatiche non presenti**              | ✅ blocco atteso                                                                |
| **T16**  | ETS non economico comune≤15k      | II.A isolamento                             | 100%              | 50.000,00€                      | —                                                     | ✅                                                                              |
| **T17**  | ETS non economico (no comune≤15k) | II.A isolamento                             | 65%               | 32.500,00€                      | —                                                     | ✅                                                                              |
| **T18**  | Privato residenziale              | III.A PdC + made_in_eu                      | Ci=0.15           | 2.524,24€                       | —                                                     | ✅                                                                              |
| **T19**  | Impresa                           | III.A PdC                                   | Ci=0.15           | 2.524,24€                       | —                                                     | ✅                                                                              |
| **T20**  | Impresa                           | III.A + III.G microcogenerazione            | Ci=0.15 / 65%     | 2.524,24€ / 65.000,00€          | —                                                     | ✅                                                                              |
| **T21**  | Impresa                           | III.A PdC (mantenimento 5 anni)             | Ci=0.15           | 2.524,24€                       | —                                                     | ✅                                                                              |
| **T22**  | Impresa                           | II.A parete interna (cmax 30%)              | 48%               | 4.940,00€                       | —                                                     | ✅                                                                              |
| **T23**  | Privato residenziale              | II.D nZEB volumetrico                       | —                 | 0€                              | **⚠ ampliamento 200mc > 25% limite (100mc)**          | ✅ blocco atteso                                                                |
| **T24**  | Privato residenziale              | III.D solare termico prestazionale          | 65%               | 6.432,00€                       | —                                                     | ✅                                                                              |
| **T25**  | Privato terziario                 | III.F teleriscaldamento 80kW                | 65%               | 8.320,00€                       | —                                                     | ✅                                                                              |
| **T26**  | Privato residenziale              | III.C caldaia biomassa                      | 65%               | 1.800,00€                       | —                                                     | ✅                                                                              |
| **T27**  | Privato residenziale              | III.C stufa pellet (logaritmica)            | 65%               | 598,75€                         | —                                                     | ✅                                                                              |
| **T28**  | Privato residenziale              | III.B ibrido PdC/caldaia                    | —                 | 0€                              | **⚠ rapporto PdC/caldaia 1.00 > 0.5 + η_s 89% < 90%** | ✅ blocco atteso                                                                |
| **T29**  | Privato residenziale              | III.D solar cooling                         | —                 | 0€                              | **⚠ DEC 6.67 < 8.0**                                  | ✅ blocco atteso                                                                |
| **T30**  | PA                                | III.F teleriscaldamento 200kW (fascia alta) | 65%               | 16.900,00€                      | —                                                     | ✅                                                                              |
| **T31**  | Privato residenziale              | III.C caldaia legna cippato (log. D)        | 65%               | 2.520,00€                       | —                                                     | ✅                                                                              |

**6 blocchi attesi confermati**: T02 (accumulo), T11 (η_s), T15 (valvole), T23 (volume), T28 (rapporto ibrido), T29 (DEC).

---

## 8 scenari problematiche (CT30-P01 ÷ P10)

| Scenario    | Soggetto             | Interventi                  | % applicata   | Importo lordo          | Esito |
| ----------- | -------------------- | --------------------------- | ------------- | ---------------------- | ----- |
| **P01** R1  | Privato residenziale | III.A PdC 12kW aria/acqua   | Ci=0.15       | 3.815,06€              | ✅    |
| **P02** R2  | Impresa              | III.A PdC 100kW acqua/acqua | Ci=0.06       | 9.207,69€              | ✅    |
| **P03** R3  | ETS non economico    | II.A isolamento 200mq       | **65%**       | 19.500,00€             | ✅    |
| **P04** R4  | Privato terziario    | III.A + II.H FV 10kWp       | Ci=0.15 / 52% | 10.006,82€ + 7.800,00€ | ✅    |
| **P05** R5  | Privato residenziale | II.B + II.C                 | 64% / 64%     | 7.680,00€ + 3.200,00€  | ✅    |
| **P06** R6  | PA (SA), ESCO (SR)   | III.A PdC 60kW              | Ci=0.06       | 8.368,64€              | ✅    |
| **P07** R7  | PA comune≤15k        | II.A isolamento 300mq       | **100%**      | 50.000,00€             | ✅    |
| **P10** R10 | Privato residenziale | III.A PdC 10kW aria/acqua   | Ci=0.15       | 3.067,35€              | ✅    |

---

## Discrepanze rilevate

### ❌ PROBLEMATICHE.md: P03 etichettato "100%" ma valore reale 65%

**File**: `docs/PROBLEMATICHE.md` riga 313

La tabella di copertura test riporta:

```
| R3 | ✅ 19.500,00€ (II.A 100%) |
```

Ma il DATI effettivo (`dati_test/DATI_ets_non_economico.txt`) mostra:

```
× 0,65 ⇒ 19.500,00€
```

(19.500€ ÷ 30.000€ spesa = 65%, non 100%).

**Causa**: Lo scenario P03 non ha `comuneSotto15k` né `scuolaOspedale` attivi → `isPAorETS=true` ma base = `PA_altri = 0.65` (cap 1.0). Solo PA con comune≤15k o scuola/ospedale ottengono 100%.

**Correzione**: `✅ 19.500,00€ (II.A 65%)`

### ⚠️ T09: Privato residenziale con Titolo II — calcolato ma non validato dal wizard

**File**: `static/data/tests/test_09_infissi_schermature.json`

Lo scenario ha `soggetto.tipo = "Privato residenziale"` e `selectedInterventi: ["II.B", "II.C"]`. Per R1, privato residenziale può accedere solo a Titolo III. Il formula engine calcola comunque (non controlla la matrice SA), ma il wizard lo bloccherebbe.

Non è un bug — il test generator bypassa il wizard — ma è un **falso positivo**: uno scenario non realistico che passerebbe la generazione DATI ma fallirebbe nel wizard reale.

### ⚠️ T02: Nome fuorviante

**File**: `static/data/tests/test_02_impresa_grande.json`

Si chiama "Impresa Grande PdC + FV" ma il `soggetto.tipo` è `"Privato terziario"`, non Impresa. Il codice CT30-T02 e il nome non corrispondono al tipo soggetto.

---

## Statistiche finali

| Categoria                     | Conteggio                        |
| ----------------------------- | -------------------------------- |
| ✅ Calcolo OK (nessun blocco) | 33                               |
| ✅ Blocco atteso confermato   | 6                                |
| ❌ Anomalia di sostanza       | 0                                |
| ⚠️ Discrepanza documentazione | 1 (P03 100%→65%)                 |
| ⚠️ Scenario irrealistico      | 1 (T09 privato res. + Titolo II) |
| ⚠️ Nome fuorviante            | 1 (T02 "Impresa" ma è terziario) |

**Nessuna anomalia di calcolo**: tutti i valori numerici corrispondono alle regole
business implementate. Le uniche discrepanze sono nella documentazione
(PROBLEMATICHE.md) e nella nomenclatura degli scenari di test.
