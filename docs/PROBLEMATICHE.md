# PROBLEMATICHE — Regole Business Critiche CT3.0

Analisi delle 10 regole più insidiose, con commento, riferimenti al codice e strategie di gestione.

---

## 1. SA privato + ambito residenziale → solo Titolo III

**Problema**: Un Soggetto Attuatore privato in ambito residenziale non può accedere a interventi di Titolo II (isolamento II.A, infissi II.B, schermature II.C, ecc.). Solo interventi Titolo III (PdC, solare, biomassa) sono ammessi.

**Dove**:

- `normativa.js` → `MATRICE_SA_INTERVENTI.privato_residenziale.titolo_ii: false` (riga 566)
- `rules_engine.js` → `_isSubjectCompatible()` (riga 178) e `validateInterventiPerSoggetto()` (riga 837)

**Commento**: È la regola più frequentemente violata dagli utenti. Un privato che vuole isolare le pareti di casa (II.A) si vede bloccare la selezione. La matrice SA codifica anche `Condominio` come `privato_residenziale`, quindi la stessa limitazione vale per i condomini.

**Strategia**:

- Validare al cambio soggetto (`tipo_soggetto`) in Fase 3: selezionare automaticamente solo interventi Titolo III
- Mostrare messaggio esplicativo: _"Ambito residenziale + privato: accesso consentito solo a Titolo III"_
- Filtrare la lista interventi in Fase 4 in base a `MATRICE_SA_INTERVENTI[key].titolo_ii`
- In Fase 2 (Edificio): se ambito = residenziale e SA ≠ PA/ETS, sconsigliare attivamente interventi II
- Cross-check: Fase 6 prima del calcolo economico, ripetere validazione

**Attenzione**: `Privato terziario` ha `titolo_ii: true` (riga 573) — la differenza è solo l'ambito. Utenti confondono "privato residenziale" con "privato terziario".

---

## 2. Impresa con attività economica → regime Titolo V

**Problema**: Le imprese sono soggette a 10 vincoli aggiuntivi (Titolo V) che non si applicano ad altri soggetti: richiesta preliminare via PEC, riduzione EP ≥10%, APE obbligatorio, divieto fossili, intensità base ridotta (25% II / 45% III), limite 30 M€/intervento, maggiorazione dimensionale, conservazione documenti 10 anni.

**Dove**:

- `normativa.js` → `SOTTO_CATEGORIE_SA.impresa.regole` (riga 668)
- `rules_engine.js` → `validateTitoloV()` (riga 667) — 10 controlli sequenziali

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

**Attenzione**: IAP (`Imprenditore Agricolo Professionale`) è "assimilato a Impresa" ma NON ha richiesta preliminare obbligatoria (riga 538-549). Non applicare `validateTitoloV()` agli IAP.

---

## 3. ETS non economico → assimilato PA; ETS economico → solo Titolo III+V

**Problema**: Due categorie ETS con regimi completamente diversi:

- **ETS non economico**: equiparato alla PA (100% incentivazione, accesso prenotazione, Titolo II+III)
- **ETS economico**: trattato come impresa (richiesta preliminare, solo Titolo III, no Titolo II)

**Dove**:

- `normativa.js` → `MATRICE_SA_INTERVENTI.ets_non_economico` (riga 576) e `ets_economico` (riga 582)
- `normativa.js` → `SOGGETTI_CONFIG["ETS non economico"]` (riga 463) e `["ETS economico"]` (riga 477)
- `rules_engine.js` → `_isSubjectCompatible()` e `validateInterventiPerSoggetto()`
- `formula_engine.js` → `_resolvePercentuale()` (riga 210): `isPAorETS` include ETS non economico

**Commento**: La distinzione "economico vs non economico" è spesso ambigua per l'utente. Un ETS con attività commerciale minima può cadere nella categoria sbagliata. L'ETS economico ha `titolo_ii: false` nella matrice, e `richiesta_preliminare: true` — di fatto regole identiche all'impresa.

**Strategia**:

- In Fase 3 (Anagrafiche), se SA = ETS, chiedere obbligatoriamente: "L'ETS svolge attività economica?" (sì → economico, no → non economico)
- Mostrare le implicazioni: "ETS non economico = 100% + prenotazione" vs "ETS economico = solo Titolo III + richiesta preliminare"
- In `formula_engine.js`, la funzione `_resolvePercentuale()` verifica `isPAorETS` (riga 210) e applica cap 100% — questo è già corretto per ETS non economico. L'ETS economico invece segue regole impresa.
- Validare in Fase 4: ETS economico non può selezionare II.A, II.B, II.C, II.D, II.E, II.F, II.G, II.H

---

## 4. II.G (ricarica EV) e II.H (FV) devono abbinarsi a III.A

**Problema**: Colonnine ricarica (II.G) e fotovoltaico (II.H) non sono interventi autonomi. Richiedono obbligatoriamente una pompa di calore III.A **elettrica pura** con **sostituzione integrale** del generatore esistente.

**Dove**:

- `normativa.js` → `INTERVENTI.II.G.interventi_collegati_obbligatori: ["III.A"]` (riga 145) e `II.H` analogo (riga 158)
- `rules_engine.js` → `validateInterventiPerSoggetto()` (riga 874) — presenza codice
- `cross_rule_engine.js` → `_checkTechnicalConstraints()` (riga 57) — requisiti tecnici aggiuntivi

**Commento**: Il codice è più restrittivo di quanto sembri:

1. III.A deve essere presente
2. III.A deve essere **elettrica pura** (tipologia in `aria/aria`, `aria/acqua`, `acqua/aria`, `acqua/acqua`, `salamoia/aria`, `salamoia/acqua`, `geotermica` — riga 9-17 in `cross_rule_engine.js`)
3. III.A deve fare **sostituzione integrale** (`sostituisce_esistente = true`)

II.H inoltre esclude III.B dalla possibilità di trainare (riga 849 in normativa.js: III.B "non traina II.H").

**Strategia**:

- Validazione a 3 livelli (presenza, tipologia, sostituzione) — già implementata
- In Fase 5 (Dati Tecnici), quando l'utente compila III.A, controllare che la tipologia sia elettrica pura
- Se II.G o II.H sono selezionati e III.A non è ancora stato compilato, mostrare il vincolo come warning prima del blocco
- Non permettere selezione II.G/II.H senza III.A già selezionato nella lista interventi
- Attenzione: II.H (FV) ha anche requisito potenza 2-1000 kW (riga 98-99 in normativa.js)

---

## 5. II.C (schermature solari) deve abbinarsi a II.B (infissi)

**Problema**: Le schermature solari (II.C) non possono essere installate da sole. Richiedono obbligatoriamente la sostituzione degli infissi (II.B).

**Dove**:

- `rules_engine.js` → `validateInterventiPerSoggetto()` (riga 884)
- `cross_rule_engine.js` → `_checkDependencies()` (riga 19)

**Commento**: Doppia validazione in due engine distinti. La regola sembra ovvia ma è spesso ignorata: un utente seleziona "schermature solari" pensando siano un intervento a sé stante.

**Strategia**:

- In Fase 4: quando II.C viene selezionato, assicurarsi II.B sia già nella lista (o selezionarlo automaticamente)
- Validazione in Fase 6 (Economico): II.C da solo blocca il calcolo se II.B mancante
- Notare che II.B ha `vincolo_logico.richiede_valvole_termostatiche` se è in presenza di impianto centralizzato — II.C erediterebbe questo vincolo indirettamente
- La formula `perc_multi` (40%→55%) per II.C vale se abbinato a III.A, non a II.B

---

## 6. SR = ESCO → contratto EPC obbligatorio (con eccezione)

**Problema**: Se il Soggetto Responsabile (SR) è una ESCO e **non coincide** con il Richiedente (SA), è obbligatorio allegare il contratto EPC (UNI CEI EN 17669). Se SA e SR coincidono (stessa persona), l'EPC non serve. La certificazione UNI CEI 11352 è invece sempre obbligatoria per le ESCO.

**Dove**:

- `rules_engine.js` → `validateAnagrafiche()` (riga 542-556)

**Commento**: È una regola con una "grazia" (l'eccezione) che la rende insidiosa. Un agente che implementasse "ESCO → EPC obbligatorio" senza la condizione di non-coincidenza produrrebbe falsi positivi. Inoltre, la certificazione 11352 è un requisito separato e indipendente — spesso confuso con l'EPC.

**Strategia**:

- Chiedere in Fase 3: se SR = ESCO **e** SR ≠ SA, mostrare form per upload contratto EPC
- Se SR = ESCO, mostrare sempre campo per certificazione 11352 con data scadenza
- Validare entrambi i documenti in Fase 6
- Attenzione: `contratto_epc` e `certificazione_11352_valida` sono due campi distinti nel DB
- Quando `coincide_con_richiedente = true`, disabilitare campo EPC (non richiesto) ma mantenere certificazione 11352

---

## 7. Incentivo max 65% (100% per PA/scuole/Comuni ≤15.000 ab.)

**Problema**: Il cap massimo dell'incentivo è 65% per la generalità dei soggetti. Solo PA (Pubblica Amministrazione), ETS non economico, cooperative edilizie e interventi II.D (nZEB) per PA possono arrivare al 100%.

**Dove**:

- `normativa.js` → `INTENSITA_MASSIMA` (riga 100)
- `formula_engine.js` → `_resolvePercentuale()` (riga 206) e `_resolveBonusScuole()` (se presente)

**Commento**: Il cap 65% è l'ultimo controllo in `_resolvePercentuale()` (riga 261-262). Significa che anche applicando maggiorazioni e premialità, il totale non può superare 65% (o 100% per PA/ETS). La risoluzione segue una logica precisa (riga 214-264):

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
- II.D (nZEB) per PA forza 100% (riga 221-223) — priorità su altri calcoli

---

## 8. Commissione GSE 1% max 250€

**Problema**: Sul totale dell'incentivo calcolato viene applicata una commissione GSE dell'1%, con massimale di 250€. Se l'incentivo è ≤ 0, nessuna commissione.

**Dove**:

- `formula_engine.js` → `_calculateCorrispettivoGSE()` (riga 189)

**Commento**: Regola semplice ma con impatto sull'incentivo netto. Formula: `min(incentivo * 0.01, 250)`. Hardcoded come `percentuale = 1` e `massimale = 250`. Il codice divide per 100, quindi 1/100 = 0.01 = 1%.

**Strategia**:

- Calcolare commissione DOPO il calcolo dell'incentivo lordo, prima di mostrare il netto
- Mostrare separatamente: lordo, commissione GSE, netto
- Per pratiche con incentivo lordo > 25.000€, la commissione sarà 250€ (massimale)
- Non dimenticare di arrotondare a 2 decimali (`toFixed(2)`, riga 200)
- La funzione ritorna anche `percentuale: 1` e `massimale: 250` per log/report

---

## 9. Variazioni > 20% → approvazione GSE preventiva

**Problema**: Se l'importo finale dell'intervento varia di oltre il 20% rispetto al preventivo, è necessaria l'approvazione preventiva del GSE (Art. 25 c.2). La soglia è strettamente maggiore di 20 (non ≥), e considera il valore assoluto.

**Dove**:

- `normativa.js` → `TERMINI_CONFIG.variazione_soglia_perc: 20` (riga 74)
- `rules_engine.js` → `validateTermini()` (riga 1009-1015)

**Commento**: Usa `Math.abs()` (riga 1012) — sia aumento che diminuzione oltre 20% richiedono approvazione. Soglia 20.0 esatta **non** scatta.

**Strategia**:

- In Fase 6 (Economico), calcolare la variazione percentuale tra preventivo e consuntivo
- Se `Math.abs(variazione) > 20`, mostrare blocco con messaggio: _"Variazione del X% superiore al 20%. Necessaria approvazione GSE preventiva (Art.25 c.2)."_
- Permettere all'utente di procedere solo se conferma di aver ottenuto l'approvazione (campo `approvazione_gse_ottenuta`)
- Tracciare la data di approvazione GSE per audit
- La variazione 0% = nessun blocco; variazione 20.0% = nessun blocco (soglia stretta)
- NB: la funzione `validateTermini()` riceve `variazionePercentuale` via opzioni — assicurarsi che Fase 6 lo fornisca sempre

---

## 10. Mandato irrevocabile all'incasso + atto di assenso

**Problema**: Due obblighi documentali separati che bloccano la pratica se mancanti:

- **Mandato irrevocabile all'incasso**: obbligatorio per TUTTI gli SR non-PA (riga 558-564)
- **Atto di assenso**: obbligatorio se proprietario ≠ richiedente, anche se coincidenza anagrafica non dichiarata (riga 523-529)

**Dove**:

- `rules_engine.js` → `validateAnagrafiche()` (riga 523-564)

**Commento**: Il mandato è spesso dimenticato perché l'utente pensa sia un dettaglio bancario. L'atto di assenso è critico perché richiede un documento notarile separato — non può essere risolto in fase di compilazione. Se il proprietario è il coniuge ma non è dichiarata la coincidenza, scatta il blocco.

**Strategia**:

- In Fase 3 (Anagrafiche), per ogni SR non-PA: checkbox _"Mandato irrevocabile all'incasso conferito (Art.13 c.5)"_ con obbligo di conferma
- Se proprietario ≠ richiedente (per CF o per flag): mostrare _"Atto di Assenso obbligatorio"_ con campo upload
- I flag `coincide_con_proprietario`, `coincide_con_richiedente`, `coincide_con_responsabile` (riga 524) esonerano dall'obbligo — controllarli PRIMA di richiedere il documento
- Se CF uguali ma flag non impostati: solo warning (riga 502-503), non blocco
- In Fase 7 (Riepilogo), ripetere la validazione documentale: `documenti_flags` in `_praticaData.economico` deve confermare

---

## Riepilogo strategie comuni

| Fase                      | Azione                                                                                                      |
| ------------------------- | ----------------------------------------------------------------------------------------------------------- |
| **Fase 3** (Anagrafiche)  | Validare SA/SR, richiedere documenti (mandato, atto assenso, EPC, certificazione 11352, verbale condominio) |
| **Fase 4** (Interventi)   | Filtrare interventi per matrice SA; applicare vincoli di coppia (II.G→III.A, II.H→III.A, II.C→II.B)         |
| **Fase 5** (Dati Tecnici) | Validare tipologia PDC (elettrica pura per II.G/II.H); sostituzione integrale                               |
| **Fase 6** (Economico)    | Calcolare incentivo con cap; applicare commissione GSE; calcolare variazione preventivo/consuntivo          |
| **Fase 7** (Riepilogo)    | Ripetere tutte le validazioni; mostrare documenti mancanti; audit finale                                    |

Ogni regola ha validazione **sia** nell'engine specializzato (rules_engine.js / cross_rule_engine.js / formula_engine.js) **sia** nel flusso wizard (wizard_manager.js). Le due vie devono rimanere allineate.

---

## Copertura test

| Regola                              | `test_problematiche.html`              | JSON pratica (`static/data/tests/`)    |
| ----------------------------------- | -------------------------------------- | -------------------------------------- |
| R1 — Privato resid. solo Titolo III | R1-1..R1-6 (6 test)                    | `test_p01_privato_titolo3.json`        |
| R2 — Impresa Titolo V               | R2-1..R2-8 (8 test)                    | `test_p02_impresa_titolo_v.json`       |
| R3 — ETS non econ/economico         | R3-1..R3-6 (6 test)                    | `test_p03_ets_non_economico.json`      |
| R4 — II.G/II.H → III.A              | R4-1..R4-9 (9 test, incl. II.C → II.B) | `test_p04_iiH_iiiA_pairing.json`       |
| R5 — II.C → II.B                    | Incluso in R4-8/R4-9                   | `test_p05_iiB_iiC_pairing.json`        |
| R6 — ESCO → EPC                     | R6-1..R6-4 (4 test)                    | `test_p06_esco_epc.json`               |
| R7 — Incentivo max                  | R7-1..R7-5 (5 test)                    | `test_p07_pa_comune_100percento.json`  |
| R8 — GSE fee                        | R8-1..R8-2 (2 test)                    | — (calcolo interno, test unitario)     |
| R9 — Variazioni >20%                | R9-1..R9-6 (6 test)                    | — (validazione interna, test unitario) |
| R10 — Mandato + atto assenso        | R10-1..R10-5 (5 test)                  | `test_p10_mandato_atto_assenso.json`   |

**Totale**: 46 test unitari in `test_problematiche.html` + 8 pratiche JSON nel selettore "Problematiche (R1–R10)".
