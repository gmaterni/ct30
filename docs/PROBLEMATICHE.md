# PROBLEMATICHE — Regole Business Critiche CT3.0

Analisi delle 10 regole più insidiose per **complessità** o **ambiguità delle specifiche**.
Ogni regola classifica il livello di attenzione necessario.

Legenda complessità: 🟢 bassa | 🟡 media | 🔴 alta
Legenda ambiguità: 🟢 chiara | 🟡 ambigua | 🔴 conflitto normativo

---

## 1. SA privato + ambito residenziale → solo Titolo III

**Complessità**: 🟢 bassa **Ambiguità**: 🟢 chiara

**Problema**: Un Soggetto Attuatore privato in ambito residenziale non può accedere a interventi di Titolo II. Solo Titolo III.

**Dove**: `MATRICE_SA_INTERVENTI.privato_residenziale.titolo_ii: false` (normativa.js:652), `_isSubjectCompatible()` (rules_engine.js:182), `validateInterventiPerSoggetto()` (rules_engine.js:1165)

**Ambiguità**: Nessuna — la matrice SA è chiara. Il rischio è che l'utente confonda "privato residenziale" con "privato terziario" (che ha `titolo_ii: true`, normativa.js:658). Anche i condomini sono codificati come `privato_residenziale`.

**Impatto**: Se non applicata → privato ottiene incentivi per interventi non ammessi (es. isolamento II.A in casa singola). Blocco a livello wizard, ma il formula engine calcola comunque (T09 nel test data lo dimostra).

**Test**: R1-1..R1-6 in `test_problematiche.html` + `test_p01_privato_titolo3.json`

---

## 2. Impresa con attività economica → regime Titolo V

**Complessità**: 🔴 alta **Ambiguità**: 🟡 ambigua

**Problema**: 10 vincoli aggiuntivi (richiesta preliminare via PEC, riduzione EP ≥10%, APE, divieto fossili, intensità ridotta 25/30/45%, limite 30M€, conservazione 10 anni, maggiorazione dimensionale, cap 65%).

**Dove**: `SOTTO_CATEGORIE_SA.impresa.regole` (normativa.js:774), `validateTitoloV()` (rules_engine.js:863)

**Ambiguità**:

- IAP è "assimilato a Impresa" ma NON ha richiesta preliminare (normativa.js:624-626) — facile dimenticarlo.
- Soglia "riduzione EP ≥10% singolo / ≥20% multi" non specificata in un punto unico.
- Maggiorazione dimensionale (piccola +20%, media +10%, grande 0%) richiede input utente esplicito.
- Divieto fossili (controllo 5) è delegato a `CrossRuleEngine.checkDivietoFossili` dal P1 — chi modifica deve ricordarsi di non reintrodurre la duplicazione.

**Impatto**: Il più alto — errore su uno qualsiasi dei 10 controlli può portare a pratica invalida o sanzione.

**Test**: R2-1..R2-8 in `test_problematiche.html` + `test_p02_impresa_titolo_v.json`

---

## 3. ETS non economico → assimilato PA; ETS economico → solo Titolo III+V

**Complessità**: 🔴 alta **Ambiguità**: 🔴 conflitto normativo

**Problema**: Due categorie ETS con regimi opposti. ETS non economico = PA (100%, prenotazione, Titolo II+III). ETS economico = Impresa (richiesta preliminare, solo Titolo III, IVA esclusa).

**Dove**: `MATRICE_SA_INTERVENTI.ets_non_economico/economico` (normativa.js:662/668), `SOGGETTI_CONFIG` (normativa.js:541/555), `_resolvePercentuale()` (formula_engine.js:284)

**Ambiguità**:

- La distinzione "economico/non economico" è lasciata all'utente — nessuna euristica automatica.
- Un ETS con attività commerciale minima cade nella categoria sbagliata.
- ETS non economico SENZA comune≤15k né scuola/ospedale → base `PA_altri = 0.65` (non 100%). Molti sviluppatori assumono 100% per tutti gli ETS non economici.
- ETS economico segue regole impresa MA ha `prenotazione: true` (diverso da impresa che può avere prenotazione solo per grandi interventi).

**Impatto**: Altissimo — categoria errata → incentivo completamente diverso.

**Test**: R3-1..R3-6 in `test_problematiche.html` + `test_p03_ets_non_economico.json`

---

## 4. II.G (ricarica EV) e II.H (FV) devono abbinarsi a III.A

**Complessità**: 🟡 media **Ambiguità**: 🟡 ambigua

**Problema**: II.G e II.H non sono interventi autonomi. Richiedono III.A **elettrica pura** con **sostituzione integrale**.

**Dove**: `INTERVENTI.II.G/II.H.interventi_collegati_obbligatori` (normativa.js:218/231), `_checkTechnicalConstraints()` (cross_rule_engine.js:52), `_ELETTRICHE_TIPOLOGIE` (cross_rule_engine.js:8-16)

**Ambiguità**:

- La sostituzione integrale (`sostituisce_esistente = true`) non è documentata in `INTERVENTI` ma è hard-coded in `_checkTechnicalConstraints()`.
- Per II.H (FV): vincolo "incentivo FV ≤ incentivo III.A" — non codificato esplicitamente ma rispettato dai coefficienti.
- Solo III.A "elettrica pura" (tipologie elencate in `_ELETTRICHE_TIPOLOGIE`) è ammessa — III.B/III.C/III.F non trainano II.H.
- II.H (FV) ha anche requisito potenza 2-1000 kW (normativa.js:4249, sezione TEST_SCENARIOS fornitura III.F).

**Impatto**: Medio — blocca interventi se pairing errato, ma errore rilevabile in fase di compilazione.

**Test**: R4-1..R4-9 in `test_problematiche.html` + `test_p04_iiH_iiiA_pairing.json`

---

## 5. II.C (schermature solari) deve abbinarsi a II.B (infissi)

**Complessità**: 🟢 bassa **Ambiguità**: 🟡 ambigua

**Problema**: II.C non può essere installato da solo. Richiede II.B.

**Dove**: `INTERVENTI.II.C.interventi_collegati_obbligatori` (normativa.js:1094), `_checkDependencies()` (cross_rule_engine.js:18)

**Ambiguità**:

- La regola deriva dalla natura dell'intervento (Art.5 lett.b), non è esplicitamente nelle RA.
- In passato era hard-coded in due engine distinti — dal fix #6 in CRITICHE è stata spostata nei dati `INTERVENTI`.

**Impatto**: Basso — blocco ovvio se II.C selezionato senza II.B.

**Test**: R4-8/R4-9 in `test_problematiche.html` + `test_p05_iiB_iiC_pairing.json`

---

## 6. SR = ESCO → contratto EPC obbligatorio (con eccezioni)

**Complessità**: 🟡 media **Ambiguità**: 🟡 ambigua

**Problema**: ESCO come SR richiede contratto EPC (UNI CEI EN 17669). Eccezioni: (1) SR coincide con SA → EPC non serve; (2) SA privato+residenziale + soglie ESCO superate → EPC richiesto comunque (P5). Certificazione UNI CEI 11352 sempre obbligatoria.

**Dove**: `validateAnagrafiche()` (rules_engine.js:547)

**Ambiguità**:

- Due eccezioni che si sovrappongono creano confusione: "EPC non serve se SR=SA" MA "EPC serve se SA privato+residenziale+soglie superate, anche se SR=SA".
- Certificazione 11352 e contratto EPC sono due requisiti separati — spesso confusi.
- Soglie ESCO: potenza*clima >70kW OPPURE superficie_solare >20m² (normativa.js costanti `ESCO_SOGLIA*\*`).

**Impatto**: Alto — pratica bloccabile per documenti mancanti, o al contrario, EPC richiesto quando non serve.

**Test**: R6-1..R6-4 in `test_problematiche.html` + `test_p06_esco_epc.json`

---

## 7. Incentivo max 65% (100% per PA/scuole/Comuni ≤15.000 ab.)

**Complessità**: 🟡 media **Ambiguità**: 🟡 ambigua

**Problema**: Cap 65% generalizzato, 100% per PA/ETS non econ con comune≤15k o scuola/ospedale. II.D (nZEB) per PA forza 100%. Il cap è l'ultimo controllo dopo maggiorazioni e premialità.

**Dove**: `INTENSITA_MASSIMA` (normativa.js:129), `_resolvePercentuale()` (formula_engine.js:284-386)

**Ambiguità**:

- "PA" è riconosciuto in tre forme: `"Pubblica Amministrazione"`, `"PA"`, e indirettamente `"ETS non economico"` — storico di bug (commit 1b382bc): il wizard usava `"PA"` ma la funzione cercava `"Pubblica Amministrazione"`.
- Il 100% non è automatico per tutti i PA — solo se comune≤15k o scuola/ospedale (o II.D). Altri PA → 65%.
- `made_in_eu` è moltiplicativo (×1.10 sul base), NON additivo come altri bonus.
- Il cap per II.D/II.G/II.H su Impresa è 30%, non 65%.

**Impatto**: Altissimo — differenza 35 punti percentuali (es. P07: 50.000€ vs 32.500€).

**Test**: R7-1..R7-5 in `test_problematiche.html` + `test_p07_pa_comune_100percento.json`

---

## 8. Commissione GSE 1% max 250€

**Complessità**: 🟢 bassa **Ambiguità**: 🟢 chiara

**Problema**: `min(incentivo × 0.01, 250)` sull'incentivo lordo.

**Dove**: `_calculateCorrispettivoGSE()` (formula_engine.js:267)

**Ambiguità**: Nessuna — formula hardcoded e chiara. L'unica attenzione: se incentivo lordo > 25.000€, la commissione è sempre 250€ (massimale).

**Impatto**: Basso — differenza sull'incentivo netto. Massimale 250€ anche su incentivi milionari.

**Test**: R8-1..R8-2 in `test_problematiche.html`

---

## 9. Variazioni > 20% → approvazione GSE preventiva

**Complessità**: 🟢 bassa **Ambiguità**: 🟢 chiara

**Problema**: Se `|variazione% preventivo vs spese| > 20` → necessaria approvazione GSE. Soglia STRETTAMENTE maggiore (20.0 esatta non scatta).

**Dove**: `TERMINI_CONFIG.variazione_soglia_perc: 20` (normativa.js:103), `validateTermini()` (rules_engine.js:1341)

**Ambiguità**: Nessuna — formula chiara. Integrata nel wizard dal P4: `_validateStep5` calcola automaticamente la variazione e chiama `validateTermini`.

**Impatto**: Medio — pratica bloccata se variazione >20% senza approvazione.

**Test**: R9-1..R9-6 in `test_problematiche.html`

---

## 10. Mandato irrevocabile + atto di assenso

**Complessità**: 🟡 media **Ambiguità**: 🟡 ambigua

**Problema**: Due obblighi documentali separati. Mandato: per tutti gli SR non-PA. Atto assenso: se proprietario ≠ richiedente (anche se coincidenza anagrafica non dichiarata).

**Dove**: `validateAnagrafiche()` (rules_engine.js:547 — mandato riga 719-724, atto assenso riga 635)

**Ambiguità**:

- Flag `coincide_con_proprietario/richiedente/responsabile` (riga 594) esonerano dall'atto di assenso MA non dal mandato.
- CF/P.IVA uguali ma flag non impostati → solo warning (riga 595-596), non blocco.
- CF/P.IVA diversi ma flag attivo → errore (riga 611-618).
- Titolo di possesso (proprietà, usufrutto, comodato) esonera dall'atto di assenso (fix #14 in CRITICHE).

**Impatto**: Medio — pratica bloccabile per documenti mancanti, scenario comune (coniuge proprietario).

**Test**: R10-1..R10-5 in `test_problematiche.html` + `test_p10_mandato_atto_assenso.json`

---

## Mappa cross-reference

| Regola                | CRITICHE # | P1-P5  | Test suite   | JSON pratica                          |
| --------------------- | ---------- | ------ | ------------ | ------------------------------------- |
| R1 Privato solo III   | —          | —      | R1-1..R1-6   | `test_p01_privato_titolo3.json`       |
| R2 Impresa Titolo V   | #3, #4, #7 | P1     | R2-1..R2-8   | `test_p02_impresa_titolo_v.json`      |
| R3 ETS                | #5, #8     | —      | R3-1..R3-6   | `test_p03_ets_non_economico.json`     |
| R4 II.G/II.H→III.A    | —          | —      | R4-1..R4-9   | `test_p04_iiH_iiiA_pairing.json`      |
| R5 II.C→II.B          | #6         | —      | R4-8/R4-9    | `test_p05_iiB_iiC_pairing.json`       |
| R6 ESCO→EPC           | #11        | P2, P5 | R6-1..R6-4   | `test_p06_esco_epc.json`              |
| R7 Cap intensità      | #3, #4, #9 | P3     | R7-1..R7-5   | `test_p07_pa_comune_100percento.json` |
| R8 GSE fee            | —          | —      | R8-1..R8-2   | —                                     |
| R9 Variazioni >20%    | #12        | P4     | R9-1..R9-6   | —                                     |
| R10 Mandato + assenso | #14        | —      | R10-1..R10-5 | `test_p10_mandato_atto_assenso.json`  |
