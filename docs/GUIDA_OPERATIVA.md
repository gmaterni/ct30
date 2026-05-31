# Guida Operativa — CT30 Advisor

Manuale pratico per l'uso dell'applicazione di simulazione Conto Termico 3.0.

---

## 1. Avvio dell'Applicazione

Aprire `static/index.html` in un browser moderno (Chrome, Firefox, Edge). L'applicazione funziona interamente lato client, non è necessario un server web.

All'avvio compare la schermata principale con:
- **Sidebar sinistra**: navigazione principale
- **Area centrale**: contenuto del wizard
- **Header superiore**: pulsante RESET e navigazione Avanti/Indietro

---

## 2. Sidebar — Comandi Principali

### Sezione PRATICHE
| Pulsante | Azione |
|----------|--------|
| **Nuova Pratica** | Avvia una nuova pratica da zero |
| **Elenco Pratiche** | Mostra l'elenco delle pratiche archiviate |
| **Pulisci DB** | Elimina TUTTI i dati dal database locale (doppia conferma) |

### Sezione NORMATIVA
| Pulsante | Azione |
|----------|--------|
| **Regole Base** | Mostra le regole di ammissibilità e i coefficienti normativi |
| **Catalogo Interventi** | Elenca tutti gli interventi disponibili con descrizione |

### Menu Test
Se presente nella sidebar, permette di caricare scenari predefiniti per test rapidi.

---

## 3. Wizard — Guida Passo Passo

### Step 0 — Censimento Edificio

Compilare i dati dell'immobile:

| Campo | Descrizione |
|-------|-------------|
| Indirizzo | Via, numero, città dell'immobile |
| Categoria Catastale | Selezionare dalla tendina (es. A/2, D/7) |
| Zona Climatica | Selezionare la zona in base al comune (A–F) |
| Potenza esistente (kW) | Potenza del generatore termico attuale |
| Combustibile ante | Metano, gasolio, GPL, biomassa, ecc. |
| Richiesta Preliminare | Solo per Imprese/ETS: flag + data invio al GSE |
| Data primo impegno | Solo per Imprese/ETS: data contratto/ordine |

Premere **Avanti** per proseguire.

### Step 1 — Richiesta Ruoli GSE

Definire i soggetti coinvolti:

**Soggetto Ammesso (SA)** — Chi ha la disponibilità dell'immobile
- Denominazione, CF/P.IVA, tipo soggetto (Privato, Impresa, PA, ETS, CER)
- Titolo di godimento (Proprietà, diritto reale, godimento personale)
- Email e telefono

**Soggetto Responsabile (SR)** — Chi sostiene le spese
- Se coincide con SA, spuntare l'apposito flag
- Altrimenti: denominazione, CF/P.IVA, IBAN, PEC

**Proprietario** — Se diverso da SA
- Spuntare "Proprietario coincide con SA" se uguale
- Altrimenti: denominazione, CF/P.IVA, flag atto di assenso

**Delegato** (opzionale) — Solo per compilazione portale
- Nome e CF

Premere **Avanti**. Se ci sono errori nei ruoli, un alert li elenca. Correggere e riprovare.

### Step 2 — Screening Ammissibilità

**Schermata informativa.** Non richiede azioni.
- Leggere il risultato della validazione automatica
- **Verde**: pratica ammissibile, titoli disponibili mostrati come tag
- **Rosso**: errori di ammissibilità elencati, tornare indietro e correggere

Il pulsante **Avanti** è visibile solo se la validazione è superata.

### Step 3 — Configurazione Progetto

**Selezionare gli interventi** dalla colonna sinistra:
- Spuntare uno o più interventi (III.A = Pompa di Calore, II.H = FV, ecc.)
- Gli interventi incompatibili sono disabilitati (mostrano il motivo)
- La selezione aggiorna automaticamente la maschera a destra

**Compilare i dati tecnici** per ogni intervento selezionato:

| Intervento | Campi principali |
|------------|-----------------|
| **III.A** (PdC) | Marca, modello, potenza kW, COP, SCOP, tipologia (aria/acqua, acqua/acqua), servizio, made in EU |
| **II.A** (Cappotto) | Superficie mq, spesa, trasmittanza, made in EU |
| **II.H** (FV) | Potenza kW, n. moduli, accumulo kWh, made in EU, registro ENEA, autoconsumo |
| **II.G** (Ricarica) | N. punti, potenza kW, tipo, smart charging |
| **II.F** (Automation) | Tipo controllo, n. dispositivi, classe sistema |
| **III.E** (Scaldacqua PDC) | Marca, modello, capacità litri, COP |

Premere **Avanti**. Se ci sono conflitti tra interventi selezionati (es. FV senza PdC), il passaggio è bloccato con messaggio esplicativo.

### Step 4 — Preventivo e Conformità

**Configurare il preventivo** per ogni intervento:
- Per ogni intervento vengono suggerite voci di costo (fornitura, posa, opere accessorie, documentazione)
- Modificare gli importi e le quantità cliccando sui campi
- **Aggiungere voci** personalizzate con il pulsante "Aggiungi Voce"
- I totali parziali si aggiornano automaticamente

**Verificare la documentazione**:
- Spuntare i documenti presenti nella checklist
- I documenti obbligatori per legge sono evidenziati

Premere **Avanti**.

### Step 5 — Erogazione e Chiusura

**Schermata riepilogativa finale.**

| Pulsante | Azione |
|----------|--------|
| **Calcoli** | Mostra il dettaglio analitico dei calcoli eseguiti (formule, parametri, bonus) |
| **Report** | Genera il report finale di sintesi con tutti i dati della pratica |
| **Archivia** | Salva definitivamente la pratica nel database locale |

**Consultare i risultati**:
- Incentivo totale calcolato
- Piano di erogazione (rata unica, 2 o 5 rate)
- Eventuali bonus applicati (Made in EU, Registro ENEA)
- Affidabilità del risultato (Alta/Media/Bassa)

**Archiviare la pratica** premendo **Archivia**. La pratica sarà disponibile nell'**Elenco Pratiche** dalla sidebar.

---

## 4. Elenco Pratiche

Dalla sidebar premere **Elenco Pratiche** per visualizzare tutte le pratiche archiviate.

La finestra mostra per ogni pratica:
- **Data** di creazione
- **Nome** della pratica
- **Soggetto** intestatario
- **Azioni**:
  - **Carica**: riapre la pratica nel wizard per modifiche
  - **Visualizza**: mostra il report finale
  - **Elimina**: cancella definitivamente la pratica (con conferma)

---

## 5. Gestione dei Test

### Scenari predefiniti
Dalla sidebar (sezione Test) selezionare uno scenario per caricare dati precompilati:

| Scenario | Descrizione |
|----------|-------------|
| Test 01 — Privato PdC | Privato residenziale, PDC 12kW |
| Test 02 — Impresa Full | Impresa D/7, PDC 100kW + FV 50kW |
| Test 03 — Isolamento | Cappotto termico 220mq |
| Test 04 — Ricarica EV | Condominio, 6 punti ricarica + PDC |
| Test 05 — Incentivo Massimo | Privato, PDC 40kW Zona E |
| Test 06 — Pratica Reale | Scenario realistico completo |
| Test 07 — Full Electric | Impresa, 5 interventi combinati |

Il caricamento di uno scenario sovrascrive i dati correnti. Se ci sono dati non archiviati, verranno persi.

---

## 6. Pulsanti di Sistema

| Pulsante | Azione |
|----------|--------|
| **RESET** (header) | Torna alla pagina iniziale. I dati non archiviati vanno persi |
| **🌙/☀️** (header) | Alterna tema scuro/chiuso |
| **Pulisci DB** (sidebar) | Elimina TUTTI i dati dal database. Doppia conferma richiesta |

---

## 7. Note Importanti

- **Nessun salvataggio automatico**: le modifiche vanno salvate manualmente con **Archivia** al termine della compilazione. Chiudere il browser senza archiviare comporta la perdita dei dati.
- **Database locale**: tutte le pratiche sono salvate in IndexedDB nel browser. Non c'è sincronizzazione cloud. Cancellare la cache del browser elimina i dati.
- **Backward compatibility**: le pratiche create con versioni precedenti dell'app vengono migrate automaticamente al primo caricamento.
- **Dati non vincolanti**: i risultati sono simulazioni orientative. Per la pratica ufficiale fare riferimento al portale GSE.
