# PROBLEMATICHE CRITICHE — Interpretazione normativa vs implementazione

Soluzioni ambigue, critiche o di difficile interpretazione emerse dal confronto tra le Regole Applicative CT 3.0, il Decreto e il codice implementato.

---

## 1. Made in EU — bonus differenziato per Titolo II e Titolo III

**Normativa**: Regole Applicative §4.2 (righe 1444-1448): "maggiorazione del 10% per interventi art.5, comma 1, lett. a)-f)".
La nota in `normativa.js` (PREMIALITA_CONFIG.made_in_eu.note) recita: "+10% per Titolo II, +5% per Titolo III (Manuale Analitico Sez.9)".

**Implementazione**: `normativa.js:22-28` — `bonus_perc: 0.10` applicato a _tutti_ gli interventi nella lista `applicabile_a`, che include sia Titolo II che Titolo III.

**Criticità**: Il codice applica +10% su Titolo III (es. III.A pompa di calore) ma la nota dice che per Titolo III dovrebbe essere +5%. Il valore `0.10` è unico, non c'è logica per differenziare per titolo. O la nota è errata o il valore è sbagliato per Titolo III.

**Rischio**: ALTO — sovrastima sistematica del 5% su tutti gli interventi Titolo III con made_in_eu.

**Riferimenti**: `normativa.js:22-28`, `formula_engine.js:341-346`

---

## 2. Termine accesso diretto — 60 vs 90 giorni

**Normativa**: Regole Applicative §4.1.1 (riga 1277): "entro 90 giorni" dalla data di conclusione intervento.

**Implementazione**: Tre costanti separate con valore 60:

- `normativa.js:68` — `TERMINI_CONFIG.accesso_diretto_gg: 60`
- `normativa.js:93` — `PROCEDURA_CONFIG.ACCESSO_DIRETTO_TERMINE_GIORNI: 60`
- `normativa.js:653` — `TERMINI_TEMPORALI.accesso_diretto_domanda_gg: 60`

**Criticità**: Le Regole Applicative dicono 90 giorni, il codice usa 60 in tre punti. Potrebbe essere un valore aggiornato dalle Regole Applicative rispetto al Decreto base (Art.10). Va verificato quale sia corretto.

**Rischio**: ALTO — se 90 è corretto, le pratiche con 60-90 giorni vengono bloccate erroneamente.

**Riferimenti**: `normativa.js:68, 93, 653`

---

## 3. Intensità Impresa — multi-intervento solo Titolo II usa base 25% anziché 30%

**Normativa**: Regole Applicative Tabella 11 (righe 1500-1517): singolo intervento Titolo II = 25%, multi-intervento = 30%.

**Implementazione**: Due punti separati:

- `normativa.js:681` — `SOTTO_CATEGORIE_SA.impresa.regole.intensita_titolo_ii_base: 0.25` (sempre 25%, anche per multi)
- Il valore 30% esiste solo in `PROCEDURA_CONFIG.INTENSITA_MASSIMA.Impresa_multi_Titolo_II: 0.30` (`normativa.js:107`), usato in `_resolvePercentuale` (`formula_engine.js:312`)
- `validateTitoloV` (`rules_engine.js:744-751`) calcola la base come `Math.max(0.25, 0.45)` se ha entrambi i titoli, ma se è solo Titolo II prende 0.25 dalla config sbagliata.

**Criticità**: `SOTTO_CATEGORIE_SA.impresa.regole.intensita_titolo_ii_base` è fissata a 0.25 e non distingue singolo/multi. Il valore 0.30 è definito solo in `INTENSITA_MASSIMA` (usato da formula_engine) ma non in `SOTTO_CATEGORIE_SA` (usato da rules_engine). I due engine usano fonti diverse e possono dare risultati discordanti.

**Rischio**: ALTO — sottostima dell'incentivo per imprese con multi-intervento solo Titolo II.

**Riferimenti**: `normativa.js:107, 681`, `rules_engine.js:744-751`, `formula_engine.js:312`

---

## 4. Intensità Impresa — II.D/II.G/II.H al 30% anche in multi

**Normativa**: Regole Applicative §4.2.1 nota 6 a Tabella 11 (righe 1513-1516): per II.D, II.G e II.H l'intensità massima è 30% anche in multi-intervento.

**Implementazione**: Nessuna — la regola non è implementata.

**Criticità**: II.D (nZEB), II.G (ricarica EV) e II.H (FV) hanno un cap specifico del 30% per imprese (anziché il 65% generale) anche in configurazione multi-intervento. Il codice non ha alcun controllo.

**Rischio**: ALTO — sovrastima per imprese con II.D/II.G/II.H in multi-intervento.

**Riferimenti**: nessuno — regola mancante.

---

## 5. ETS economico — prenotazione disabilitata nel codice ma prevista in normativa

**Normativa**: Regole Applicative §3.3 (righe 584-610). ETS economico: accesso alla prenotazione (Tabella 9 normativa, riga 1188: "Anticipato da valutazione preliminare").

**Implementazione**: `normativa.js:482` — `ETS economico.prenotazione: false`.

**Criticità**: Il flag `prenotazione` è a `false` per ETS economico, ma la normativa sembra concedere l'accesso alla prenotazione. Potrebbe essere intenzionale (solo accesso diretto per ETS economico) ma va verificato.

**Rischio**: ALTO — negazione di una modalità di accesso prevista dalla normativa.

**Riferimenti**: `normativa.js:476-487`

---

## 6. Pairing II.C → II.B — regola hard-coded, non nei dati INTERVENTI

**Normativa**: Regole Applicative — non esplicitamente presente. Deriva dalla natura dell'intervento (schermature installate su infissi nuovi).

**Implementazione**: Hard-coded in due engine separati:

- `rules_engine.js:884-887`
- `cross_rule_engine.js:48-52`
- MA `normativa.js:804-816` (`INTERVENTI.II.C`) ha `interventi_collegati_obbligatori: []`

**Criticità**: La regola esiste in due validatori ma non è definita come dato nell'oggetto INTERVENTI. Se si aggiornano i dati in futuro, la regola potrebbe essere dimenticata.

**Rischio**: ALTO — manutenzione fragile, possibilità di divergenza futura.

**Riferimenti**: `normativa.js:804-816`, `rules_engine.js:884-887`, `cross_rule_engine.js:48-52`

---

## 7. Divieto fossili per Imprese/ETS economici — tre implementazioni non coordinate

**Normativa**: Regole Applicative §3.4 (righe 613-634), Art.25 comma 2: divieto assoluto di combustibili fossili per imprese.

**Implementazione**: Tre punti distinti:

1. `rules_engine.js:392-409` — blacklist di tipologie gas per III.A (`tipologieGasEscluse`)
2. `rules_engine.js:729-732` — flag `haCombustibiliFossili` in `validateTitoloV`
3. `cross_rule_engine.js:115-145` — `_checkDivietoFossili` che blocca III.B e verifica alimentazione

**Criticità**: Il punto 1 usa una blacklist testuale, il punto 2 un flag booleano, il punto 3 controlla codici intervento. Nessuno controlla III.C (biomassa — potrebbe essere alimentato a gas in alcune configurazioni). Possono dare risultati incoerenti.

**Rischio**: ALTO — falsi positivi/negativi sul divieto fossili.

**Riferimenti**: `rules_engine.js:392-409, 729-732`, `cross_rule_engine.js:115-145`

---

## 8. ETS economico — IVA non esclusa come per Impresa

**Normativa**: Regole Applicative §4.2.1 (riga 1481-1482): "L'IVA applicata ai costi ammissibili [...] non è tuttavia compresa nel calcolo dell'intensità di aiuto". Non distingue tra imprese e ETS.

**Implementazione**: `formula_engine.js:449-454` — l'IVA viene sottratta solo per `soggetto === "Impresa"`.

**Criticità**: Se la normativa dice che l'IVA non è mai ammissibile (per tutti i soggetti), l'esclusione solo per Impresa è errata. Se invece l'IVA è ammissibile per PA/Privati/ETS, allora sarebbe corretta. Serve chiarimento.

**Rischio**: MEDIO — possibile sovrastima incentivo per ETS economico.

**Riferimenti**: `formula_engine.js:449-454`

---

## 9. Calcolo intensità finale — miscelazione additivo/moltiplicativo

**Normativa**: Regole Applicative §4.2 (righe 1409-1463), §4.2.1 (righe 1472-1547): maggiorazioni e premialità come "incrementi" sulla base.

**Implementazione**: `formula_engine.js:348-351`:

```
finale = base * (1 + madeInEuBonus) + maggiorazioneTotale + (premialitaTotale - madeInEuBonus)
```

**Criticità**: Le componenti sono miste: `made_in_eu` è moltiplicativo (×1.10 sul base), le altre sono additive. La sottrazione `premialitaTotale - madeInEuBonus` è un artificio contabile per evitare doppio conteggio (perché `made_in_eu` è contato sia in `_calculatePremialita` che nel moltiplicatore). Il cap finale (65% o 100%) può azzerare l'effetto di alcune maggiorazioni senza avvisare l'utente. Per una piccola impresa con base 45% + maggiorazione 20%, l'aggiunta di `made_in_eu` (+5%) porta al 70% che viene cappato a 65% — l'utente non sa che la maggiorazione made_in_eu è stata azzerata dal cap.

**Rischio**: ALTO — l'utente non vede l'effetto del cap sulle singole componenti.

**Riferimenti**: `formula_engine.js:338-356`

---

## 10. Mutua esclusività generatori — III.G e II.D non considerati

**Normativa**: Non esplicitamente presente nel Regole Applicative. Deriva dalla natura degli interventi (sostituzione di un unico generatore).

**Implementazione**: `cross_rule_engine.js:168-172, 203-208` — lista hard-coded `riscaldamentoPrincipale = ["III.A", "III.B", "III.C", "III.F"]`.

**Criticità**: III.G (microcogenerazione) non è incluso — quindi III.G + III.A è permesso. II.D (nZEB, intervento complesso sull'intero edificio) non è considerato. La lista è duplicata in due funzioni identiche.

**Rischio**: MEDIO — possibilità di selezionare combinazioni di interventi non compatibili.

**Riferimenti**: `cross_rule_engine.js:167-172, 203-208`

---

## 11. Soglie ESCO residenziale — 70 kW / 20 m² non implementate

**Normativa**: Regole Applicative §3.5.1 (righe 717-738), Tabelle 7 e 8: in ambito residenziale, ESCO può fare da SR solo per potenza >70 kW o superficie solare >20 m². Sotto soglia, opera solo come mandataria.

**Implementazione**: Nessuna — `rules_engine.js:542-556` verifica solo contratto EPC e certificazione 11352, senza controllo soglie.

**Criticità**: Un ESCO che opera come SR su un intervento residenziale sotto soglia (es. PDC 10 kW) non viene bloccato, ma la normativa richiederebbe che fosse solo mandatario.

**Rischio**: ALTO — pratiche con SR=ESCO sotto soglia potrebbero essere respinte dal GSE.

**Riferimenti**: `rules_engine.js:542-556`

---

## 12. Variazioni >20% — non gestita come regola di business separata

**Normativa**: Regole Applicative §10 (righe 6635-6655): "Le modifiche apportate agli interventi incentivanti non potranno comportare, in nessun caso, il ricalcolo in aumento dell'incentivo riconosciuto". Art.25 comma 2.

**Implementazione**: `rules_engine.js:1009-1015` — validazione opzionale basata su parametro `variazionePercentuale` passato esternamente.

**Criticità**: La verifica è opzionale e non legata al flusso della pratica. Non c'è un meccanismo di alert preventivo durante la compilazione. La normativa dice che le modifiche "non potranno comportare ricalcolo in aumento" — il codice non gestisce lo scenario di riduzione dell'incentivo.

**Rischio**: MEDIO — la regola è facilmente bypassabile.

**Riferimenti**: `rules_engine.js:1009-1015`

---

## 13. perc_multi — lista di abbinamento III incompleta

**Normativa**: Regole Applicative §4.2 — non c'è un riferimento esplicito a `perc_multi`.

**Implementazione**: `formula_engine.js:326-328` — abbinamento III limitato a `["III.A", "III.B", "III.C", "III.E"]`.

**Criticità**: III.D (solare termico) e III.F (teleriscaldamento) non sono inclusi nella lista di abbinamento per `perc_multi`. Non è chiaro se sia intenzionale o una dimenticanza. III.D in particolare è un intervento Titolo III che potrebbe trainare Titolo II.

**Rischio**: MEDIO — possibile mancata maggiorazione per interventi combinati con III.D/III.F.

**Riferimenti**: `formula_engine.js:320-333`, `normativa.js` (II.A: riga 141, II.B: riga 142)

---

## 14. Atto di Assenso — non copre "titolare di altro diritto reale"

**Normativa**: Regole Applicative §3.1 (righe 417-419): "Soggetti Ammessi [...] in quanto proprietari o titolari di altro diritto reale o personale di godimento".

**Implementazione**: `rules_engine.js:523-529` — verifica solo confronto CF/P.IVA e flag `coincide_con_*`.

**Criticità**: Se il richiedente è un usufruttuario o locatario (titolare di diritto reale di godimento), il proprietario potrebbe non essere indicato nella pratica. In questo caso il confronto CF non scatta e la richiesta di atto di assenso potrebbe essere omessa erroneamente.

**Rischio**: MEDIO — pratiche con diritti reali diversi dalla proprietà potrebbero bypassare il controllo.

**Riferimenti**: `rules_engine.js:523-529`

---

## Riepilogo

| #   | Criticità                                       | Rischio | Normativa     | Implementazione                |
| --- | ----------------------------------------------- | ------- | ------------- | ------------------------------ |
| 1   | Made in EU: bonus 10% su Titolo III (forse 5%)  | ALTO    | §4.2          | `normativa.js:22-28`           |
| 2   | Termine accesso diretto: 60gg vs 90gg           | ALTO    | §4.1.1        | `normativa.js:68,93,653`       |
| 3   | Impresa multi II: base 25% vs 30%               | ALTO    | Tabella 11    | `normativa.js:681,107`         |
| 4   | II.D/II.G/II.H impresa 30% non implementato     | ALTO    | §4.2.1 nota 6 | assente                        |
| 5   | ETS economico: prenotazione=false (forse=true)  | ALTO    | §3.3          | `normativa.js:482`             |
| 6   | II.C→II.B hard-coded, non nei dati              | ALTO    | —             | `rules_engine.js:884-887`      |
| 7   | Divieto fossili: 3 implementazioni divergenti   | ALTO    | §3.4          | 3 file diversi                 |
| 8   | IVA non esclusa per ETS economico               | MEDIO   | §4.2.1        | `formula_engine.js:449-454`    |
| 9   | Formula intensità: cap invisibile all'utente    | ALTO    | §4.2          | `formula_engine.js:348-351`    |
| 10  | Mutua esclusività: III.G e II.D non considerati | MEDIO   | —             | `cross_rule_engine.js:167-172` |
| 11  | Soglie ESCO 70kW/20m² non implementate          | ALTO    | §3.5.1        | assente                        |
| 12  | Variazioni >20%: regola opzionale               | MEDIO   | §10           | `rules_engine.js:1009-1015`    |
| 13  | perc_multi: III.D e III.F esclusi               | MEDIO   | §4.2          | `formula_engine.js:326-328`    |
| 14  | Atto assenso: diritto reale non coperto         | MEDIO   | §3.1          | `rules_engine.js:523-529`      |
