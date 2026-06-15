# WORKFLOW — Conto Termico 3.0

## Processo Wizard (7 fasi)

```
Fase 1 ─── Fase 2 ─── Fase 3 ─── Fase 4 ─── Fase 5 ─── Fase 6 ─── Fase 7
PRATICA   EDIFICIO   ANAGRAFICHE INTERVENTI DATI TECN. ECONOMICO  RIEPILOGO

    ↑            ↑          ↑           ↑          ↑          ↑         ↑
   [ ? ]       [ ? ]      [ ? ]       [ ? ]      [ ? ]      [ ? ]     [ ? ]
 Aiuto       Aiuto      Aiuto       Aiuto      Aiuto      Aiuto     Aiuto
cont.        cont.      cont.       cont.      cont.      cont.     cont.
```

Su ogni fase, il pulsante **"?"** in alto a destra apre l'aiuto contestuale con:

- campi da compilare
- vincoli obbligatori
- pulsanti disponibili

### Navigazione

La barra superiore (header) mostra, quando una pratica è attiva:

| Pulsante     | Descrizione                                                                                      |
| ------------ | ------------------------------------------------------------------------------------------------ |
| **RESET**    | Cancella i dati della pratica corrente                                                           |
| **INIZIO**   | Torna alla Fase 1 (disabilitato se già al primo step)                                            |
| **INDIETRO** | Torna alla fase precedente (disabilitato al primo step)                                          |
| **AVANTI**   | Passa alla fase successiva con validazione (disabilitato all'ultimo step)                        |
| **FINE**     | Salta direttamente all'ultimo step (Fase 7). Abilitato solo se tutte le spese in Fase 6 sono > 0 |

### Fase 1 — Pratica

- Seleziona modalità accesso: **Diretto** (post-intervento) o **Prenotazione** (pre-intervento)
- Inserisci codice CT30-###, data_inserimento, nome pratica
- Controllo automatico duplicati: "ATTENZIONE: Pratica già esistente nel DB!"

### Fase 2 — Edificio

- Dati catastali (categoria, foglio, particella, subalterno)
- Zona climatica (A–F)
- Ambito (residenziale/terziario/entrambi)
- Anno costruzione, superficie utile
- **Impianto Esistente / Generatore Sostituito**:
  - Tipo Impianto (PDC, Ibrido, Biomassa, Solare Termico, Altro, Nessuno)
  - Potenza kW
  - Combustibile/Alimentazione
  - Libretto Presente (checkbox)
  - Codice Libretto
- APE pre-intervento (classe, indice EP)

### Fase 3 — Anagrafiche (3 schede obbligatorie)

1. **Proprietario (T1)** — denominazione, CF, P.IVA, sede
2. **Richiedente/SA (T2)** — tipo soggetto + ambito (se privato)
3. **Responsabile/SR (T3)** — tipo soggetto, IBAN, mandato irrevocabile
4. **Delegato (T4)** — opzionale, operatore portale

- Bottoni "coincide con" per copiare dati tra schede
- Per SA = condominio: flag verbale assemblea e tabella millesimale

### Fase 4 — Interventi

- Selezione codici intervento (II.A–II.H, III.A–III.G)
- Filtro automatico per matrice SA→interventi ammissibili
- **Titolo II abilitato per**: Condominio (mappato come privato_residenziale) e Impresa (mappato come privato_terziario)
- Coppie obbligatorie: II.G + II.H → III.A; II.C → II.B
- **Mutua esclusività generatori riscaldamento principale**: III.A (PDC), III.B (Ibridi), III.C (Biomassa), III.F (Sistemi emissione) sono mutuamente esclusivi. La selezione di uno deseleziona e disabilita automaticamente gli altri
- Flag trainante per intervento principale
- Pulsante **Verifica compatibilità** per convalidare la selezione

### Fase 5 — Dati Tecnici

- Sezioni tecniche specifiche per codice intervento selezionato
- Campi: potenza, superficie, rendimento, tipologia, ecc.
- **Cataloghi tecnici**: per interventi III.A–III.E vengono caricati automaticamente i cataloghi JSON (da `static/dati_tecnici/`) che popolano dropdown Marca/Modello
- Alla selezione del modello, i parametri tecnici (potenza, SCOP, ηs, classe, capacità) vengono auto-compilati dal catalogo
- Nota: navigando avanti/indietro la selezione Marca/Modello viene preservata automaticamente

### Fase 6 — Economico

- Preventivo: voci di costo, totale spese
- Maggiorazioni: condominio (+5%), NZEB (+5%), zona sismica (+10%)
- Incentivo: calcolo automatico base + maggiorazioni tramite pulsante **Calcola incentivo**
- **Ripartizione incentivo in annualità**:
  - Ogni intervento è rateizzato in base alla propria durata (2 o 5 anni, salvo durata esplicita)
  - La durata complessiva è la massima tra le durate dei singoli interventi
  - PA/ETS con accesso diretto: **unica soluzione** (art.11 c.6)
- Cap: 65% (100% scuole/PA Comuni ≤15k ab.)
- GSE: 1% max 250€
- **Vincolo**: tutti gli importi devono essere > 0 per abilitare il pulsante FINE

### Test Automation

Il sistema include 3 modalità di test:

1. **31 scenari JSON** (`static/data/tests/test_01..test_31.json`) — caricabili dal wizard tramite pulsante "pratiche-test". Coprono tutti i codici intervento (II.A–III.G) e tutte le tipologie soggetto.
2. **25 MS Scenarios** (MS-001..MS-025) — embedded in `normativa.js` come `TEST_SCENARIOS`. Eseguibili via `QaManager.runAllTests()` in console browser.
3. **Test suite HTML** (`static/test/test_suite.html`) — richiede server HTTP locale. Esegue 4 gruppi (MS Scenarios, Formula Engine, Rules Engine, Cross-Rule Engine).

### Fase 7 — Riepilogo

- Riepilogo completo dati pratica
- **REPORT**: mostra finestra report (bottone Esporta Dati blu + Stampa Report rosso)
- **CALCOLI**: mostra le formule di calcolo in forma algebrica e numerica per ogni intervento
- **RISULTATI**: mostra il dettaglio analitico del calcolo dell'incentivo
- **DOCUMENTI**: elenca i documenti richiesti per ogni intervento con stato (verde=flaggato, rosso=mancante); per soggetti condominio mostra anche verbale assemblea e tabella millesimale
- **ARCHIVIA**: salva in IndexedDB

## Macchina a Stati — Accesso Diretto

```
┌──────────┐   60gg da    ┌──────────┐   ammiss.    ┌──────────┐   istr.    ┌──────────┐
│ LAVORI   │───complet.──▶│ DOMANDA  │─────────────▶│ VALIDA   │──────────▶│ ESITO    │
│ TERMINATI│              │ DIRETTA  │               │          │           │ (+/-)    │
└──────────┘              └──────────┘               └──────────┘           └──────────┘
                              │                          │
                              │ respinta                 │ variazione >20%
                              ▼                          ▼
                          ┌──────────┐              ┌──────────┐
                          │ FINE     │              │ VARIAZ.  │──▶ GSE approva
                          └──────────┘              │ RICHIESTA│
                                                    └──────────┘
```

## Macchina a Stati — Accesso su Prenotazione

```
┌──────────┐   pre-       ┌──────────┐   ammiss.    ┌──────────┐
│ ISTANZA  │──intervento─▶│ DOMANDA  │─────────────▶│ PRENOT.  │──▶ FINE se budget PA
│ PRELIM.  │              │ PRENOT.  │               │ APPROV.  │    esaurito
└──────────┘              └──────────┘               └──────────┘
                              │                          │
                              │ 50% budget PA            │ esecuzione
                              ▼                          ▼
                          ┌────────────────────┐   ┌──────────┐
                          │ ATTESA ESECUZIONE  │──▶│ LAVORI   │
                          │ (max 2-5 anni)     │   │ ESEGUITI │
                          └────────────────────┘   └──────────┘
                              │                          │
                               │ acconto 2/5              │ 60gg per
                              ▼                          ▼
                          ┌────────────────────┐   ┌──────────┐
                          │ EROGAZIONE         │──▶│ DOMANDA  │
                          │ (acconto + saldo)  │   │ DIRETTA  │
                          └────────────────────┘   └──────────┘
```

## Regole Temporali

| Evento                                     | Termine                     | Riferimento                       |
| ------------------------------------------ | --------------------------- | --------------------------------- |
| Domanda Diretto da conclusione lavori      | 60 giorni                   | TERMINI_CONFIG.accesso_diretto_gg |
| Domanda Prenotazione prima di avvio lavori | —                           | ct30_rules.txt §A2                |
| Acconto prenotazione (2 anni)              | 50%                         | ct30_rules.txt §A2                |
| Acconto prenotazione (5 anni)              | 2/5                         | ct30_rules.txt §A2                |
| Richiesta preliminare impresa (Titolo V)   | prima avvio lavori          | ct30_rules.txt §C1                |
| Variazione >20%                            | approvazione GSE preventiva | ct30_rules.txt §B                 |

## Regole Trasversali

| Regola          | Condizione                          | Effetto                                                                                                 |
| --------------- | ----------------------------------- | ------------------------------------------------------------------------------------------------------- |
| Titolo V        | SA = privato con attività economica | Richiesta preliminare, no fossili, APE, EP≥10%, intensità 25-65%                                        |
| Condominio      | Edificio condominiale               | Maggiorazione +5%, gestione parti comuni, documenti aggiuntivi (verbale assemblea, tabella millesimale) |
| ETS non econ    | SA = ETS non economico              | Assimilato a PA per accesso                                                                             |
| ETS economico   | SA = ETS economico                  | Solo Titolo III, regime Titolo V                                                                        |
| Atto Assenso    | Proprietario ≠ Richiedente          | Obbligatorio                                                                                            |
| Contratto EPC   | SR = ESCO                           | Obbligatorio                                                                                            |
| Mandato incasso | Non PA                              | Obbligatorio                                                                                            |
