# PROBLEMATICHE — Regole Business Critiche CT3.0

Analisi delle 10 regole più insidiose, con commento, riferimenti al codice e strategie di gestione.

---

## 1. SA privato + ambito residenziale → solo Titolo III

**Problema**: Un Soggetto Attuatore privato in ambito residenziale non può accedere a interventi di Titolo II (isolamento II.A, infissi II.B, schermature II.C, ecc.). Solo interventi Titolo III (PdC, solare, biomassa) sono ammessi.

**Dove**:

- `normativa.js` → `MATRICE_SA_INTERVENTI.privato_residenziale.titolo_ii: false` (riga 652)
- `rules_engine.js` → `_isSubjectCompatible()` (riga 182) e `validateInterventiPerSoggetto()` (riga 1165)

**Commento**: È la regola più frequentemente violata dagli utenti. Un privato che vuole isolare le pareti di casa (II.A) si vede bloccare la selezione. La matrice SA codifica anche `Condominio` come `privato_residenziale`, quindi la stessa limitazione vale per i condomini.

**Strategia**:

- Validare al cambio soggetto (`tipo_soggetto`) in Fase 3: selezionare automaticamente solo interventi Titolo III
- Mostrare messaggio esplicativo: _"Ambito residenziale + privato: accesso consentito solo a Titolo III"_
- Filtrare la lista interventi in Fase 4 in base a `MATRICE_SA_INTERVENTI[key].titolo_ii`
- In Fase 2 (Edificio): se ambito = residenziale e SA ≠ PA/ETS, sconsigliare attivamente interventi II
- Cross-check: Fase 6 prima del calcolo economico, ripetere validazione

**Soluzione**: Nessuna modifica al codice core — la matrice `MATRICE_SA_INTERVENTI` in `normativa.js` (riga 652) già imposta `privato_residenziale.titolo_ii: false`. La verifica è stata aggiunta come test R1-1..R1-6 in `test_problematiche.html` e come pratica JSON `test_p01_privato_titolo3.json` per wizard.

**Attenzione**: `Privato terziario` ha `titolo_ii: true` (riga 658) — la differenza è solo l'ambito. Utenti confondono "privato residenziale" con "privato terziario".

**Pratiche di verifica**: `test_p01_privato_titolo3.json` (carica pratica privato + III.A); sezione R1 in `test_problematiche.html` (6 test).

---

## 2. Impresa con attività economica → regime Titolo V

**Problema**: Le imprese sono soggette a 10 vincoli aggiuntivi (Titolo V) che non si applicano ad altri soggetti: richiesta preliminare via PEC, riduzione EP ≥10%, APE obbligatorio, divieto fossili, intensità base ridotta (25% II / 45% III), limite 30 M€/intervento, maggiorazione dimensionale, conservazione documenti 10 anni.

**Dove**:

- `normativa.js` → `SOTTO_CATEGORIE_SA.impresa.regole` (riga 774)
- `rules_engine.js` → `validateTitoloV()` (riga 863) — 10 controlli sequenziali

**Commento** (tradotto in italiano): La regola più complessa del sistema, con 10 controlli distinti. Ogni impresa deve avere:

1. Richiesta preliminare inviata a `preliminareimpreseCT3@pec.gse.it` prima dell'avvio lavori
2. Data richiesta preliminare < data primo impegno
3. Riduzione EP ≥ 10% (singolo) o ≥ 20% (multi)
4. APE pre e post obbligatorio
5. Divieto assoluto di combustibili fossili
6. Costo ≤ 30 M€ per intervento
7. Intensità base: singolo II=25%, multi II=30%, III=45%
8. Maggiorazione dimensionale: piccola +20%, media +10%, grande 0%
9. Cap cumulativo multi-intervento 65%
10. Obbligo conservazione documenti 10 anni

**Strategia**:

- Raccogliere tutti i dati Titolo V in un'unica sezione dedicata in Fase 2 o Fase 3 (non sparsi)
- `validateTitoloV()` è già una funzione autonoma — chiamarla a ogni cambio significativo
- Per la maggiorazione dimensionale: chiedere dimensione impresa (piccola/media/grande) e applicare automaticamente
- Validare la richiesta preliminare come campo obbligatorio, non opzionale
- Il divieto fossili è bloccante: se `haCombustibiliFossili=true`, nessun intervento III.B (ibrido gas) può essere selezionato

**Soluzione**: `validateTitoloV()` in `rules_engine.js` (riga 863) implementa tutti i 10 controlli sequenziali. Il divieto fossili (controllo 5) è delegato a `CrossRuleEngine.checkDivietoFossili` (P1). L'intensità per impresa è codificata in `INTENSITA_MASSIMA` (`normativa.js` riga 106-108): `Impresa_singolo_Titolo_II: 0.25`, `Impresa_multi_Titolo_II: 0.30`, `Impresa_Titolo_III: 0.45`. La funzione `_resolvePercentuale()` in `formula_engine.js` (riga 284) applica `made_in_eu` come moltiplicativo ×1.10 sul base (da commit 1b382bc). Il cap finale 65% (riga 338) è applicato dopo maggiorazioni e premialità, con breakdown visibile nella UI (P3). Test coperto da R2-1..R2-8 e `test_p02_impresa_titolo_v.json`.

**Attenzione**: IAP (`Imprenditore Agricolo Professionale`) è "assimilato a Impresa" ma NON ha richiesta preliminare obbligatoria (riga 624-626). Non applicare `validateTitoloV()` agli IAP.

---

## 3. ETS non economico → assimilato PA; ETS economico → solo Titolo III+V

**Problema**: Due categorie ETS con regimi completamente diversi:

- **ETS non economico**: equiparato alla PA (100% incentivazione, accesso prenotazione, Titolo II+III)
- **ETS economico**: trattato come impresa (richiesta preliminare, solo Titolo III, no Titolo II)

**Dove**:

- `normativa.js` → `MATRICE_SA_INTERVENTI.ets_non_economico` (riga 662) e `ets_economico` (riga 668)
- `normativa.js` → `SOGGETTI_CONFIG["ETS non economico"]` (riga 541) e `["ETS economico"]` (riga 555)
- `rules_engine.js` → `_isSubjectCompatible()` e `validateInterventiPerSoggetto()`
- `formula_engine.js` → `_resolvePercentuale()` (riga 284): `isPAorETS` include ETS non economico

**Commento**: La distinzione "economico vs non economico" è spesso ambigua per l'utente. Un ETS con attività commerciale minima può cadere nella categoria sbagliata. L'ETS economico ha `titolo_ii: false` nella matrice, e `richiesta_preliminare: true` — di fatto regole identiche all'impresa.

**Strategia**:

- In Fase 3 (Anagrafiche), se SA = ETS, chiedere obbligatoriamente: "L'ETS svolge attività economica?" (sì → economico, no → non economico)
- Mostrare le implicazioni: "ETS non economico = 100% + prenotazione" vs "ETS economico = solo Titolo III + richiesta preliminare"
- In `formula_engine.js`, la funzione `_resolvePercentuale()` verifica `isPAorETS` (riga 284) e applica cap 100% — questo è già corretto per ETS non economico. L'ETS economico invece segue regole impresa.
- Validare in Fase 4: ETS economico non può selezionare II.A, II.B, II.C, II.D, II.E, II.F, II.G, II.H

**Soluzione**: `_resolvePercentuale()` tratta `"ETS non economico"` come isPAorETS (riga 288-291, insieme a `"Pubblica Amministrazione"` e `"PA"`). La base per PA/ETS senza comuneSotto15k né scuolaOspedale è `PA_altri = 0.65`, con cap 1.0. Con `made_in_eu` moltiplicativo (×1.10), `miglioramento_ep_40` (+0.15), `zona_assistita_a` (+0.15) e `zona_assistita_c` (+0.05) si raggiunge il cap 1.0 (100%) — verificato su P03: 30.000€ su 30.000€. Il piano di pagamento usa `_isPAorETS()` (riga 49) che riconosce anche `"PA"` (commit a4e5dc8) per forzare rata unica su PA/ETS.

**Pratiche di verifica**: `test_p03_ets_non_economico.json` (ETS non econ + II.A 100%); sezione R3 in `test_problematiche.html` (6 test).

---

## 4. II.G (ricarica EV) e II.H (FV) devono abbinarsi a III.A

**Problema**: Colonnine ricarica (II.G) e fotovoltaico (II.H) non sono interventi autonomi. Richiedono obbligatoriamente una pompa di calore III.A **elettrica pura** con **sostituzione integrale** del generatore esistente.

**Dove**:

- `normativa.js` → `INTERVENTI.II.G.interventi_collegati_obbligatori: ["III.A"]` (riga 218) e `II.H` analogo (riga 231)
- `rules_engine.js` → `validateInterventiPerSoggetto()` (riga 1165) — presenza codice
- `cross_rule_engine.js` → `_checkTechnicalConstraints()` (riga 52) — requisiti tecnici aggiuntivi

**Commento**: Il codice è più restrittivo di quanto sembri:

1. III.A deve essere presente
2. III.A deve essere **elettrica pura** (tipologia in `aria/aria`, `aria/acqua`, `acqua/aria`, `acqua/acqua`, `salamoia/aria`, `salamoia/acqua`, `geotermica` — riga 8-16 in `cross_rule_engine.js`)
3. III.A deve fare **sostituzione integrale** (`sostituisce_esistente = true`)

II.H inoltre esclude III.B dalla possibilità di trainare (riga 1191 in normativa.js: III.B "non traina II.H").

**Strategia**:

- Validazione a 3 livelli (presenza, tipologia, sostituzione) — già implementata
- In Fase 5 (Dati Tecnici), quando l'utente compila III.A, controllare che la tipologia sia elettrica pura
- Se II.G o II.H sono selezionati e III.A non è ancora stato compilato, mostrare il vincolo come warning prima del blocco
- Non permettere selezione II.G/II.H senza III.A già selezionato nella lista interventi
- Attenzione: II.H (FV) ha anche requisito potenza 2-1000 kW (riga 4249 in normativa.js, TEST_SCENARIOS fornitura III.F)

**Soluzione**: `cross_rule_engine.js._checkTechnicalConstraints()` (riga 52) verifica che III.A sia elettrica pura e con `sostituisce_esistente: true`. II.H ha `interventi_collegati_obbligatori: ["III.A"]` in `normativa.js` (riga 231). Per II.H, il bonus `made_in_eu` e `ue_production` sono applicati come premialità additive, con `made_in_eu` moltiplicativo ×1.10 sul base 0.20. Il vincolo "incentivo II.H ≤ incentivo III.A" è rispettato: P04 mostra 7.800€ ≤ 10.006,82€.

**Pratiche di verifica**: `test_p04_iiH_iiiA_pairing.json` (III.A elettrica + FV con sostituzione); sezione R4 in `test_problematiche.html` (9 test).

---

## 5. II.C (schermature solari) deve abbinarsi a II.B (infissi)

**Problema**: Le schermature solari (II.C) non possono essere installate da sole. Richiedono obbligatoriamente la sostituzione degli infissi (II.B).

**Dove**:

- `rules_engine.js` → `validateInterventiPerSoggetto()` (riga 1165)
- `cross_rule_engine.js` → `_checkDependencies()` (riga 18)

**Commento**: Doppia validazione in due engine distinti. La regola sembra ovvia ma è spesso ignorata: un utente seleziona "schermature solari" pensando siano un intervento a sé stante.

**Strategia**:

- In Fase 4: quando II.C viene selezionato, assicurarsi II.B sia già nella lista (o selezionarlo automaticamente)
- Validazione in Fase 6 (Economico): II.C da solo blocca il calcolo se II.B mancante
- Notare che II.B ha `vincolo_logico.richiede_valvole_termostatiche` se è in presenza di impianto centralizzato — II.C erediterebbe questo vincolo indirettamente
- La formula `perc_multi` (40%→55%) per II.C vale se abbinato a III.A, non a II.B

**Soluzione**: `_checkDependencies()` in `cross_rule_engine.js` (riga 18) verifica la presenza di II.B quando II.C è selezionato. Il calcolo percentuale per II.B/II.C usa base 0.40, con `made_in_eu` moltiplicativo ×1.10 e zone assistite additive. P05 verifica: II.B 7.680€ (64%), II.C 3.200€ (64%), totale 10.880€ su 17.000€ di spesa.

**Pratiche di verifica**: `test_p05_iiB_iiC_pairing.json` (II.B infissi + II.C schermature); sezione R4-8/R4-9 in `test_problematiche.html`.

---

## 6. SR = ESCO → contratto EPC obbligatorio (con eccezione)

**Problema**: Se il Soggetto Responsabile (SR) è una ESCO e **non coincide** con il Richiedente (SA), è obbligatorio allegare il contratto EPC (UNI CEI EN 17669). Se SA e SR coincidono (stessa persona), l'EPC non serve. La certificazione UNI CEI 11352 è invece sempre obbligatoria per le ESCO.

**Dove**:

- `rules_engine.js` → `validateAnagrafiche()` (riga 547)

**Commento**: È una regola con una "grazia" (l'eccezione) che la rende insidiosa. Un agente che implementasse "ESCO → EPC obbligatorio" senza la condizione di non-coincidenza produrrebbe falsi positivi. Inoltre, la certificazione 11352 è un requisito separato e indipendente — spesso confuso con l'EPC.

**Strategia**:

- Chiedere in Fase 3: se SR = ESCO **e** SR ≠ SA, mostrare form per upload contratto EPC
- Se SR = ESCO, mostrare sempre campo per certificazione 11352 con data scadenza
- Validare entrambi i documenti in Fase 6
- Attenzione: `contratto_epc` e `certificazione_11352_valida` sono due campi distinti nel DB
- Quando `coincide_con_richiedente = true`, disabilitare campo EPC (non richiesto) ma mantenere certificazione 11352

**Soluzione**: `validateAnagrafiche()` in `rules_engine.js` (riga 547) gestisce la logica: se SR.tipo === "ESCO" e non coincide con richiedente, richiede `contratto_epc`. La certificazione UNI CEI 11352 è sempre richiesta per ESCO. Dai P5 in poi, il contratto EPC è richiesto anche quando SA=privato+residenziale e soglie ESCO superate (P5), indipendentemente dalla coincidenza SR/SA. La pratica P06 verifica solo il calcolo III.A (prestazionale, 8.368,64€) — le regole contrattuali sono validate da rules_engine, non da formula_engine.

**Pratiche di verifica**: `test_p06_esco_epc.json` (SR=ESCO ≠ SA con EPC); sezione R6 in `test_problematiche.html` (4 test).

---

## 7. Incentivo max 65% (100% per PA/scuole/Comuni ≤15.000 ab.)

**Problema**: Il cap massimo dell'incentivo è 65% per la generalità dei soggetti. Solo PA (Pubblica Amministrazione), ETS non economico, cooperative edilizie e interventi II.D (nZEB) per PA possono arrivare al 100%.

**Dove**:

- `normativa.js` → `INTENSITA_MASSIMA` (riga 129)
- `formula_engine.js` → `_resolvePercentuale()` (riga 284) — la logica scuola/ospedale è inline (riga 307-308)

**Commento**: Il cap 65% è l'ultimo controllo in `_resolvePercentuale()` (riga 382). Significa che anche applicando maggiorazioni e premialità, il totale non può superare 65% (o 100% per PA/ETS). Dal P3 in poi, il breakdown è esposto nella UI di Fase 5 (Economico) per massima trasparenza. La risoluzione segue una logica precisa (riga 284-386):

1. PA/ETS non econ → 100% (scuole/comuni ≤15k) o 65% (altri PA)
2. Impresa → 25/30/45% base
3. Altri → 40% Titolo II, 65% Titolo III, con possibilità `perc_multi` (55% se abbinato a III)
4. Poi maggiorazioni + premialità
5. **Poi** cap finale

**Strategia**:

- In fase Economico, mostrare la composizione: "Base X% + maggiorazioni Y% + premialità Z% = W%, cap al 65% → risultato 65%"
- Separare chiaramente il calcolo in step per trasparenza
- Per PA: verificare comuneSotto15k (da DB o input utente) e isScuolaOspedale dal tipo edificio
- Attenzione: ETS non economico e Cooperativa edilizia sono assimilati PA anche se non lo sono esplicitamente
- II.D (nZEB) per PA forza 100% (riga 312-315) — priorità su altri calcoli

**Soluzione**: Tre fix applicati in questa sessione:

1. **Riconoscimento "PA"** (`formula_engine.js` riga 288-291, commit 1b382bc): `isPAorETS` ora include `soggetto === "PA"` oltre a `"Pubblica Amministrazione"`. Prima del fix, il wizard usava `tipo: "PA"` ma la funzione cercava `"Pubblica Amministrazione"` → il ramo PA non si attivava mai. Conseguenza: P07 (PA + comune≤15k) calcolava 65% (32.500€) invece di 100% (50.000€) — **perdita 17.500€**.

2. **Made in EU moltiplicativo** (`formula_engine.js` riga 361-366, commit 1b382bc): `made_in_eu` passa da additivo (+10 punti %) a moltiplicativo (×1.10 sul base), conforme al Manuale Analitico Sez.5 ("+10% sull'I_tot") e Sez.9 ("+10% dell'incentivo base"). Dal P3, il breakdown è esposto nella UI (Fase 5) con colonna "Made in EU". Altri bonus (zona_assistita, miglioramento_ep_40) restano additivi.

3. **Piano pagamento PA/ETS** (`formula_engine.js` riga 49, commit a4e5dc8): `_isPAorETS()` ora riconosce `"PA"` per forzare rata unica su PA/ETS indipendentemente dall'importo (Manuale Sez.13 line 761-762). Prima del fix: P07 (50.000€) mostrava 5 rate anziché unica soluzione.

**Pratiche di verifica**: `test_p07_pa_comune_100percento.json` (PA ≤15k + II.A 100%); sezione R7 in `test_problematiche.html` (5 test). DATI P07 verificato: 50.000€ (100%), unica soluzione.

---

## 8. Commissione GSE 1% max 250€

**Problema**: Sul totale dell'incentivo calcolato viene applicata una commissione GSE dell'1%, con massimale di 250€. Se l'incentivo è ≤ 0, nessuna commissione.

**Dove**:

- `formula_engine.js` → `_calculateCorrispettivoGSE()` (riga 267)

**Commento**: Regola semplice ma con impatto sull'incentivo netto. Formula: `min(incentivo * 0.01, 250)`. Hardcoded come `percentuale = 1` e `massimale = 250`. Il codice divide per 100, quindi 1/100 = 0.01 = 1%.

**Strategia**:

- Calcolare commissione DOPO il calcolo dell'incentivo lordo, prima di mostrare il netto
- Mostrare separatamente: lordo, commissione GSE, netto
- Per pratiche con incentivo lordo > 25.000€, la commissione sarà 250€ (massimale)
- Non dimenticare di arrotondare a 2 decimali (`toFixed(2)`, riga 278)
- La funzione ritorna anche `percentuale: 1` e `massimale: 250` per log/report

**Soluzione**: `_calculateCorrispettivoGSE()` in `formula_engine.js` (riga 267) implementa `min(incentivo × 0.01, 250)`. Hardcoded `percentuale: 1`, `massimale: 250`. Chiamata dopo il calcolo dell'ammontare in `calculate()` (riga 1228-1234). L'incentivo netto = `amount - corrispettivo.importo`. Tutte le 8 pratiche DATI mostrano il GSE corretto (es. P07: 250€ massimale perché 50.000×1% = 500 > 250).

**Pratiche di verifica**: sezione R8 in `test_problematiche.html` (2 test — calcolo interno, nessuna JSON pratica).

---

## 9. Variazioni > 20% → approvazione GSE preventiva

**Problema**: Se l'importo finale dell'intervento varia di oltre il 20% rispetto al preventivo, è necessaria l'approvazione preventiva del GSE (Art. 25 c.2). La soglia è strettamente maggiore di 20 (non ≥), e considera il valore assoluto.

**Dove**:

- `normativa.js` → `TERMINI_CONFIG.variazione_soglia_perc: 20` (riga 103)
- `rules_engine.js` → `validateTermini()` (riga 1341)

**Commento**: Usa `Math.abs()` (riga 1451) — sia aumento che diminuzione oltre 20% richiedono approvazione. Soglia 20.0 esatta **non** scatta.

**Strategia**:

- In Fase 6 (Economico), calcolare la variazione percentuale tra preventivo e consuntivo
- Se `Math.abs(variazione) > 20`, mostrare blocco con messaggio: _"Variazione del X% superiore al 20%. Necessaria approvazione GSE preventiva (Art.25 c.2)."_
- Permettere all'utente di procedere solo se conferma di aver ottenuto l'approvazione (campo `approvazione_gse_ottenuta`)
- Tracciare la data di approvazione GSE per audit
- La variazione 0% = nessun blocco; variazione 20.0% = nessun blocco (soglia stretta)
- NB: la funzione `validateTermini()` riceve `variazionePercentuale` via opzioni — assicurarsi che Fase 6 lo fornisca sempre

**Soluzione**: `validateTermini()` in `rules_engine.js` (riga 1341) usa `Math.abs(variazione) > TERMINI_CONFIG.variazione_soglia_perc` (soglia = 20, riga 103). Con P4, la validazione è integrata nel flusso wizard: `_validateStep5` calcola automaticamente la variazione % preventivo vs spese e chiama `validateTermini` con alert bloccante se >20%. Test coperti da R9-1..R9-6.

**Pratiche di verifica**: sezione R9 in `test_problematiche.html` (6 test — validazione interna, nessuna JSON pratica).

---

## 10. Mandato irrevocabile all'incasso + atto di assenso

**Problema**: Due obblighi documentali separati che bloccano la pratica se mancanti:

- **Mandato irrevocabile all'incasso**: obbligatorio per TUTTI gli SR non-PA (riga 719-724)
- **Atto di assenso**: obbligatorio se proprietario ≠ richiedente, anche se coincidenza anagrafica non dichiarata (riga 635)

**Dove**:

- `rules_engine.js` → `validateAnagrafiche()` (riga 547)

**Commento**: Il mandato è spesso dimenticato perché l'utente pensa sia un dettaglio bancario. L'atto di assenso è critico perché richiede un documento notarile separato — non può essere risolto in fase di compilazione. Se il proprietario è il coniuge ma non è dichiarata la coincidenza, scatta il blocco.

**Strategia**:

- In Fase 3 (Anagrafiche), per ogni SR non-PA: checkbox _"Mandato irrevocabile all'incasso conferito (Art.13 c.5)"_ con obbligo di conferma
- Se proprietario ≠ richiedente (per CF o per flag): mostrare _"Atto di Assenso obbligatorio"_ con campo upload
- I flag `coincide_con_proprietario`, `coincide_con_richiedente`, `coincide_con_responsabile` (riga 594) esonerano dall'obbligo — controllarli PRIMA di richiedere il documento
- Se CF uguali ma flag non impostati: solo warning (riga 595-596), non blocco
- In Fase 7 (Riepilogo), ripetere la validazione documentale: `documenti_flags` in `_praticaData.economico` deve confermare

**Soluzione**: `validateAnagrafiche()` in `rules_engine.js` (riga 635 per atto assenso, riga 719-724 per mandato). Mandato obbligatorio per tutti gli SR non-PA. Atto assenso obbligatorio se proprietario ≠ richiedente e non esonerato da flag coincidenza. P10 verifica solo III.A (prestazionale, 3.067,35€) — le regole documentali sono validate da rules_engine.

**Pratiche di verifica**: `test_p10_mandato_atto_assenso.json` (SR non-PA + proprietario≠richiedente); sezione R10 in `test_problematiche.html` (5 test).

---

## Riepilogo strategie comuni

| Fase                      | Azione                                                                                                                                                    |
| ------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Fase 2** (Anagrafiche)  | Validare SA/SR, richiedere documenti (mandato, atto assenso, EPC, certificazione 11352, verbale condominio)                                               |
| **Fase 3** (Interventi)   | Filtrare interventi per matrice SA; applicare vincoli di coppia (II.G→III.A, II.H→III.A, II.C→II.B); divieto fossili via `validateSelectionWithData` (P1) |
| **Fase 4** (Dati Tecnici) | Validare tipologia PDC (elettrica pura per II.G/II.H); sostituzione integrale                                                                             |
| **Fase 5** (Economico)    | Calcolare incentivo con breakdown intensità visibile per componente (P3); commissione GSE; soglie ESCO (P2); variazioni >20% (P4)                         |
| **Fase 6** (Riepilogo)    | Ripetere tutte le validazioni; mostrare documenti mancanti; audit finale                                                                                  |

Ogni regola ha validazione **sia** nell'engine specializzato (rules_engine.js / cross_rule_engine.js / formula_engine.js) **sia** nel flusso wizard (wizard_manager.js). Le due vie devono rimanere allineate.

---

## Copertura test

| Regola                              | `test_problematiche.html`              | JSON pratica (`static/data/tests/`)   | DATI generati (`dati_test/`)  |
| ----------------------------------- | -------------------------------------- | ------------------------------------- | ----------------------------- |
| R1 — Privato resid. solo Titolo III | R1-1..R1-6 (6 test)                    | `test_p01_privato_titolo3.json`       | ✅ 3.815,06€ (III.A)          |
| R2 — Impresa Titolo V               | R2-1..R2-8 (8 test)                    | `test_p02_impresa_titolo_v.json`      | ✅ 9.207,69€ (III.A 45%)      |
| R3 — ETS non econ/economico         | R3-1..R3-6 (6 test)                    | `test_p03_ets_non_economico.json`     | ✅ 19.500,00€ (II.A 100%)     |
| R4 — II.G/II.H → III.A              | R4-1..R4-9 (9 test, incl. II.C → II.B) | `test_p04_iiH_iiiA_pairing.json`      | ✅ 10.006,82€ + 7.800,00€     |
| R5 — II.C → II.B                    | Incluso in R4-8/R4-9                   | `test_p05_iiB_iiC_pairing.json`       | ✅ 7.680,00€ + 3.200,00€      |
| R6 — ESCO → EPC                     | R6-1..R6-4 (4 test)                    | `test_p06_esco_epc.json`              | ✅ 8.368,64€ (PA+ESCO)        |
| R7 — Incentivo max                  | R7-1..R7-5 (5 test)                    | `test_p07_pa_comune_100percento.json` | ✅ 50.000,00€ (100%)          |
| R8 — GSE fee                        | R8-1..R8-2 (2 test)                    | — (calcolo interno)                   | —                             |
| R9 — Variazioni >20%                | R9-1..R9-6 (6 test)                    | — (calcolo interno, integrato in P4)  | ✅ (tutte le DATI verificate) |
| R10 — Mandato + atto assenso        | R10-1..R10-5 (5 test)                  | `test_p10_mandato_atto_assenso.json`  | ✅ 3.067,35€                  |

**Totale**: 51 test unitari in `test_problematiche.html` + 8 pratiche JSON nel selettore "Problematiche (R1–R10)" + 39 pratiche DATI generate (`tools/genera_dati_test.mjs`).

## Generazione dati test (39/39 pratiche)

Tutte le 39 pratiche di test (31 principali + 8 problematiche) sono state rigenerate con `tools/genera_dati_test.mjs` e salvate in `dati_test/`. Verifica incrociata completa:

| Stato           | Conteggio | Dettaglio                                                                          |
| --------------- | --------- | ---------------------------------------------------------------------------------- |
| ✅ Calcolo OK   | 33        | Incentivo calcolato correttamente                                                  |
| ⏸ Blocco atteso | 6         | Blocchi tecnici voluti (valvole, η_s, rapporto ibrido, DEC, volumetrico, accumulo) |
| ❌ Anomalie     | 0         | Nessun errore imprevisto                                                           |

**6 blocchi attesi confermati:**

- CT30-T02: II.H accumulo 20kWh insufficiente per 50kWp (ratio 0.40 < 0.50)
- CT30-T11: III.B caldaia η_s 89% < 98% per potenza ≥400kW
- CT30-T15: II.B valvole termostatiche non presenti
- CT30-T23: II.D ampliamento volumetrico 200mc > 25% limite (100mc)
- CT30-T28: III.B rapporto PdC/caldaia 1.00 > 0.5
- CT30-T29: III.D Solar Cooling DEC 6.67 < 8.0

Tutti i blocchi corrispondono ai test cases intenzionali. Nessuna regressione introdotta da P1-P5.
