# PROBLEMATICHE CRITICHE — Verifica normativa vs implementazione

Analisi incrociata tra Regole Applicative CT 3.0, Decreto MASE 7/8/2025,
Manuale Analitico v1.1 e codice. Stato aggiornato al 13-06-2026.

Ogni criticità include il riferimento alla regola business corrispondente
in `PROBLEMATICHE.md` (R1–R10) e all'eventuale upgrade P1–P5.

---

## 1. Made in EU — bonus differenziato per Titolo II e Titolo III

**Corrisponde a**: R7 (Cap intensità)

**Normativa**: Regole Applicative §4.2 (righe 1444-1448): "maggiorazione del 10%
per interventi art.5, comma 1, lett. a)-f)". Manuale Analitico Sez.9 riepilogo:
"+10% (solo Titolo II)".

**Implementazione originale**: `bonus_perc: 0.10` applicato a _tutti_ gli
interventi (II e III).

**✅ RISOLTO**: Rimossi III.\* da `PREMIALITA_CONFIG.made_in_eu.applicabile_a`.
Ora +10% solo Titolo II come da RA §4.2 e Manuale.

---

## 2. Termine accesso diretto — 60 vs 90 giorni

**Corrisponde a**: — (regola procedurale, non in R1-R10)

**Normativa**: Decreto Art.14 c.2 e RA §4.1.1: "entro 90 giorni dalla
conclusione dell'intervento".

**Implementazione originale**: Tre costanti a 60 (codice allineato a Manuale errato).

**✅ RISOLTO**: Corrette tutte e 3 le costanti a 90 in `normativa.js`. Corretto
anche il Manuale Analitico (Sez.11).

---

## 3. Intensità Impresa — multi-intervento solo Titolo II usa base 25% anziché 30%

**Corrisponde a**: R2 (Impresa Titolo V), R7 (Cap intensità)

**Normativa**: RA Tabella 11: singolo II=25%, multi II=30%.

**Implementazione originale**: `intensita_titolo_ii_base: 0.25` fisso in
`SOTTO_CATEGORIE_SA`. Valore 0.30 esisteva solo in `INTENSITA_MASSIMA` (usato
da formula_engine) ma non in `SOTTO_CATEGORIE_SA` (usato da rules_engine).

**✅ RISOLTO**: Aggiunto `intensita_titolo_ii_multi: 0.3` in
`SOTTO_CATEGORIE_SA`. `rules_engine.js` ora usa il valore multi quando `isMulti`
è true.

---

## 4. Intensità Impresa — II.D/II.G/II.H al 30% anche in multi

**Corrisponde a**: R2 (Impresa Titolo V), R7 (Cap intensità)

**Normativa**: RA §4.2.1 nota 6 a Tabella 11: per II.D, II.G, II.H l'intensità
massima è 30%.

**Implementazione originale**: Nessuna — regola non implementata.

**✅ RISOLTO**: Implementato cap 30% in `rules_engine.js:validateTitoloV()` e
`formula_engine.js:_resolvePercentuale()`. Aggiunto anche al Manuale Analitico.

---

## 5. ETS economico — prenotazione disabilitata nel codice ma prevista in normativa

**Corrisponde a**: R3 (ETS)

**Normativa**: RA §3.3: ETS economici assimilati a PA per "modalità di accesso".
RA §4.1.2: ETS possono presentare richiesta di accesso mediante prenotazione.

**Implementazione originale**: `ETS economico.prenotazione: false` in
`normativa.js`.

**✅ RISOLTO**: `prenotazione: true` in `normativa.js`. Corretto anche il Manuale
Analitico.

---

## 6. Pairing II.C → II.B — regola hard-coded, non nei dati INTERVENTI

**Corrisponde a**: R5 (II.C→II.B)

**Normativa**: RA — non esplicitamente presente. Deriva dalla natura
dell'intervento (Art.5 lett.b).

**Implementazione originale**: Hard-coded in `rules_engine.js` e
`cross_rule_engine.js`. Dato `INTERVENTI.II.C.interventi_collegati_obbligatori:
[]` vuoto.

**✅ RISOLTO**: Spostato nei dati:
`INTERVENTI.II.C.interventi_collegati_obbligatori: ["II.B"]`. Rimosso hard-code
da entrambi gli engine.

---

## 7. Divieto fossili per Imprese/ETS economici — tre implementazioni non coordinate

**Corrisponde a**: R2 (Impresa Titolo V) — **P1**

**Normativa**: RA §3.4, Art.25 comma 2: divieto assoluto di combustibili fossili
per imprese.

**Implementazione originale**: Tre punti distinti non coordinati:

1. `rules_engine.js` — blacklist testuale tipologie gas per III.A
2. `rules_engine.js` — flag `haCombustibiliFossili` in `validateTitoloV`
3. `cross_rule_engine.js` — `_checkDivietoFossili` (III.B, alimentazione)

**✅ RISOLTO (P1)**: Unificato in `_checkDivietoFossiliUnified` in
`cross_rule_engine.js`. Copre Impresa + ETS economico, III.A gas/ibrido, III.B,
III.C, alimentazione fossile su qualsiasi intervento, flag `haCombustibiliFossili`.
Wizard chiama `validateSelectionWithData`.

---

## 8. ETS economico — IVA non esclusa come per Impresa

**Corrisponde a**: R3 (ETS)

**Normativa**: RA §4.2.1: "IVA non compresa nel calcolo dell'intensità".
RA §3.3: ETS economico segue Titolo V.

**Implementazione originale**: IVA sottratta solo per `soggetto === "Impresa"`.

**✅ RISOLTO**: Aggiunto `"ETS economico"` all'esclusione IVA in
`formula_engine.js`. Aggiornato Manuale Analitico.

---

## 9. Calcolo intensità finale — miscelazione additivo/moltiplicativo

**Corrisponde a**: R7 (Cap intensità) — **P3**

**Normativa**: RA §4.2, §4.2.1: maggiorazioni come "incrementi" sulla base.

**Implementazione originale** (prima di P3):

```
finale = base * (1 + madeInEuBonus) + maggiorazioneTotale + (premialitaTotale - madeInEuBonus)
```

Il cap era invisibile all'utente.

**✅ RISOLTO (P3)**: `_resolvePercentuale` restituisce breakdown completo
(`base, madeInEuBonus, maggiorazioneTotale, premialitaTotale, anteCap, cap,
valore`). UI in fase Economico mostra griglia intensità per componente con
indicatore cap. Maggiori dettagli in `PROBLEMATICHE.md` R7.

---

## 10. Mutua esclusività generatori — III.G e II.D non considerati

**Corrisponde a**: — (regola tecnica, non in R1-R10)

**Normativa**: Non esplicitamente presente nelle RA. Deriva dalla natura degli
interventi.

**Implementazione originale**: `riscaldamentoPrincipale = ["III.A", "III.B",
"III.C", "III.F"]`.

**✅ RISOLTO (parziale)**: III.G è stato valutato e **non** aggiunto — la
microcogenerazione (III.G) produce calore+elettricità e può coesistere con III.A.
II.D (nZEB) non è un generatore, quindi escluso dalla mutua esclusività.

---

## 11. Soglie ESCO residenziale — 70 kW / 20 m² non implementate

**Corrisponde a**: R6 (ESCO→EPC) — **P2**

**Normativa**: RA §3.5.1: in ambito residenziale, ESCO come SR solo per potenza

> 70 kW o superficie >20 m².

**Implementazione originale**: Nessuna nel codice.

**✅ RISOLTO (P2)**: Validato in `validateAnagrafiche` con parametro
`contesto.{ambito, interventiData}`. Helper `_getMaxPotenzaClima` /
`_getSuperficieSolare`. Wizard chiama la validazione in fase Economico.

---

## 12. Variazioni >20% — non gestita come regola di business separata

**Corrisponde a**: R9 (Variazioni >20%) — **P4**

**Normativa**: RA §10: "Le modifiche non potranno comportare ricalcolo in aumento
dell'incentivo".

**Implementazione originale**: Validazione opzionale in `rules_engine.js`.

**✅ RISOLTO (P4)**: Calcolo automatico variazione preventivo vs spese in
`_validateStep5`. Alert bloccante se >20% con richiamo a `validateTermini`.

---

## 13. perc_multi — lista di abbinamento III incompleta

**Corrisponde a**: R4 (II.G/II.H→III.A), R5 (II.C→II.B)

**Normativa**: RA §4.2 — non c'è riferimento esplicito a `perc_multi`.

**Implementazione originale**: `["III.A", "III.B", "III.C", "III.E"]`.

**✅ RISOLTO**: Aggiunti III.D (solare termico) e III.F (teleriscaldamento) alla
lista.

---

## 14. Atto di Assenso — non copre "titolare di altro diritto reale"

**Corrisponde a**: R10 (Mandato + assenso)

**Normativa**: RA §3.1: Soggetti Ammessi = "proprietari o titolari di altro
diritto reale o personale di godimento".

**Implementazione originale**: Solo confronto CF/P.IVA e flag coincidenza.

**✅ RISOLTO**: Esteso controllo in `rules_engine.js`: se richiedente ha
`titolo_possesso`, non richiede atto di assenso.

---

## Riepilogo

| #   | Criticità                                     | Regola | Px  | Stato      |
| --- | --------------------------------------------- | ------ | --- | ---------- |
| 1   | Made in EU su Titolo III                      | R7     | —   | ✅ Risolto |
| 2   | Termine accesso diretto 60gg vs 90gg          | —      | —   | ✅ Risolto |
| 3   | Impresa multi II: base 25% vs 30%             | R2,R7  | —   | ✅ Risolto |
| 4   | II.D/II.G/II.H impresa 30% non implementato   | R2,R7  | —   | ✅ Risolto |
| 5   | ETS economico: prenotazione=false             | R3     | —   | ✅ Risolto |
| 6   | II.C→II.B hard-coded, non nei dati            | R5     | —   | ✅ Risolto |
| 7   | Divieto fossili: 3 implementazioni divergenti | R2     | P1  | ✅ Risolto |
| 8   | IVA non esclusa per ETS economico             | R3     | —   | ✅ Risolto |
| 9   | Formula intensità: cap invisibile all'utente  | R7     | P3  | ✅ Risolto |
| 10  | Mutua esclusività: III.G e II.D               | —      | —   | ✅ (parz.) |
| 11  | Soglie ESCO 70kW/20m² non implementate        | R6     | P2  | ✅ Risolto |
| 12  | Variazioni >20%: regola opzionale             | R9     | P4  | ✅ Risolto |
| 13  | perc_multi: III.D e III.F esclusi             | R4,R5  | —   | ✅ Risolto |
| 14  | Atto assenso: diritto reale non coperto       | R10    | —   | ✅ Risolto |
