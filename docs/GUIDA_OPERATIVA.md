# GUIDA OPERATIVA — Conto Termico 3.0

## Avvio

Apri `static/index.html` in un browser moderno (Chrome/Firefox/Edge).  
Nessun server richiesto — l'applicazione funziona completamente lato client.

## Interfaccia

```
┌──────────────────────────────────────────────────────────────────────────┐
│  [RESET]  [INIZIO] [INDIETRO] [AVANTI] [FINE]        CT 3.0  v0.1.4   │  ← Header
├──────────────┬───────────────────────────────────────────────────────────┤
│  HELP        │                                                           │
│  ┌─────────┐ │                 WORK AREA                                │
│  │HELP     │ │                 (wizard-viewport)                        │
│  └─────────┘ │                                                           │
│  PRATICHE    │                                                           │
│  ┌─────────┐ │     Wizard a 7 fasi o                                    │
│  │Gestisci │ │     schermata iniziale                                   │
│  │Pratica  │ │                                                           │
│  │Elenco   │ │     Pulsante "?" in alto a destra                        │
│  │Pratiche │ │     su ogni fase per aiuto contestuale                   │
│  └─────────┘ │                                                           │
│              │                                                           │
│  GESTIONE DB │                                                           │
│  ┌─────────┐ │                                                           │
│  │Pulisci  │ │                                                           │
│  │Salva    │ │                                                           │
│  │Carica   │ │                                                           │
│  └─────────┘ │                                                           │
│              │                                                           │
│  ┌─────────┐ │                                                           │
│  │pratiche-│ │                                                           │
│  │test     │ │                                                           │
│  └─────────┘ │                                                           │
└──────────────┴───────────────────────────────────────────────────────────┘
```

### Sidebar (sinistra)

| Comando | Azione |
|---------|--------|
| **HELP** | Apre una finestra di guida generale dell'applicativo. |
| **Gestisci Pratica** | Crea nuova pratica o riprende pratica attiva. |
| **Elenco Pratiche** | Mostra archivio pratiche salvate. |
| **Pulisci DB** | Cancella tutto il database (con conferma). |
| **Salva DB** | Esporta DB in file JSON di backup. |
| **Carica DB** | Importa DB da file JSON backup. |
| **pratiche-test** | Mostra finestra scenari di test predefiniti (31 JSON in 8 gruppi). |

### Header (superiore)

| Comando | Visibile | Azione |
|---------|----------|--------|
| **RESET** | Solo con pratica attiva | Cancella dati pratica corrente. |
| **INIZIO** | Solo con pratica attiva | Torna alla Fase 1 (disabilitato se già al primo step). |
| **INDIETRO** | Solo con pratica attiva | Torna alla fase precedente (disabilitato se al primo step). |
| **AVANTI** | Solo con pratica attiva | Passa alla fase successiva con validazione (disabilitato all'ultimo step). |
| **FINE** | Solo con pratica attiva | Salta all'ultimo step (Riepilogo). Abilitato solo se tutti gli importi economici sono > 0. |
| **CT 3.0** | Sempre | Titolo applicazione + versione. |

### Aiuto contestuale "?"

Su ogni fase del wizard, in alto a destra del form, compare un pulsante **"?"** arancione.  
Cliccandolo si apre una finestra che spiega:
- Campi da compilare
- Vincoli obbligatori per proseguire
- Pulsanti disponibili in quella fase

## Flusso Operativo

### 1. Nuova Pratica
1. Premi **Gestisci Pratica**
2. **Fase 1 — Pratica**: scegli modalità accesso (Diretto/Prenotazione), inserisci codice/data/nome
3. **Fase 2 — Edificio**: compila dati catastali, caratteristiche edificio e dati impianto esistente (tipo generatore, potenza, combustibile, libretto impianto)
4. **Fase 3 — Anagrafiche**: compila Proprietario (T1), Richiedente/SA (T2), Responsabile/SR (T3) — 3 schede distinte anche in caso di coincidenza
5. **Fase 4 — Interventi**: seleziona codici intervento ammissibili; verifica compatibilità con apposito pulsante
6. **Fase 5 — Dati Tecnici**: parametri tecnici specifici per ogni intervento. Per III.A–III.E compaiono dropdown **Marca** e **Modello** caricati dal catalogo tecnico. Selezionando il modello, i parametri vengono automaticamente compilati.
7. **Fase 6 — Economico**: voci di costo, maggiorazioni, calcolo incentivo
8. **Fase 7 — Riepilogo**: verifica dati, REPORT, CALCOLI, RISULTATI, DOCUMENTI, ARCHIVIA

### 2. Pulsanti in Fase 7 (Riepilogo)

| Pulsante | Azione |
|----------|--------|
| **REPORT** | Apre finestra report dettagliato (esportabile/stampabile). |
| **CALCOLI** | Mostra le formule di calcolo in forma algebrica e numerica per ogni intervento. |
| **RISULTATI** | Mostra il dettaglio analitico del calcolo dell'incentivo. |
| **DOCUMENTI** | Elenca i documenti richiesti per ogni intervento con stato (verde=ok, rosso=mancante). |
| **ARCHIVIA** | Salva la pratica in IndexedDB. |

### 3. Archiviazione
- Premi **ARCHIVIA** in Fase 7 per salvare in IndexedDB
- I dati vengono persistiti localmente nel browser (per utente)

### 4. Caricamento Pratica
- Premi **Elenco Pratiche** per vedere tutte le pratiche archiviate
- Ogni riga mostra: codice, nome, data, stato
- Azioni per pratica: **CARICA**, **REPORT**, **ELIMINA**

### 5. Test
- Premi **pratiche-test** per caricare uno scenario JSON predefinito
- 31 scenari disponibili in 8 gruppi (Privato, Impresa, Terziario, PA/ETS, Massimali, Blocchi, Aggiornamento CT3.0, Funzionalità Specifiche)
- In console browser: `QaManager.runAllTests()` esegue 25 scenari MS (MS-001..MS-025)
- Test suite automatizzata: apri `http://localhost:8080/test/test_suite.html` con un server HTTP locale

## Note Importanti

- Il DB è **per-utente** (basato su WebId) — ogni browser/profilo ha il suo
- Il backup **Salva DB** esporta tutto il DB in JSON
- **Pulisci DB** cancella TUTTI i dati (operazione irreversibile)
- I tooltip (`title`) su ogni pulsante descrivono l'azione
- Il codice pratica segue formato `CT30-###` (auto-incrementale o manuale)
