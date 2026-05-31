# Workflow della Pratica — CT30 Advisor

Il workflow si articola in **6 fasi progressive**. Ogni fase ha uno scopo specifico, raccoglie dati obbligatori, esegue controlli di validazione e può bloccare il passaggio alla fase successiva se i vincoli non sono soddisfatti.

---

## Step 0 — Censimento Edificio

**Scopo**: Anagrafica dell'immobile oggetto dell'intervento.

### Azioni dell'utente
- Inserire indirizzo e dati catastali dell'edificio
- Selezionare la categoria catastale (A/2, D/7, ecc.)
- Selezionare la zona climatica (Zona A–F)
- Indicare la potenza del generatore esistente (kW)
- Selezionare il combustibile ante-operam (metano, gasolio, GPL, biomassa)
- Per Impresa/ETS: indicare data richiesta preliminare e data primo impegno

### Controlli automatici al passaggio
1. **Edificio esistente**: Il campo `buildingStatus` è forzato a `"esistente"` (vincolo CT 3.0)
2. **Categoria catastale**: Non sono ammesse A/1, A/8, A/9 (salvo eccezioni per PA e aperti al pubblico)
3. **Dati essenziali**: indirizzo, zona climatica e potenza devono essere compilati

### Condizione di uscita
Utente preme **Avanti**. I dati vengono memorizzati in `_praticaData.edificio`.

---

## Step 1 — Richiesta Ruoli GSE

**Scopo**: Definizione dei soggetti coinvolti nella pratica.

### Azioni dell'utente
- **Soggetto Ammesso (SA)**: denominazione, tipo (Privato/Impresa/PA/ETS/CER), CF/P.IVA, titolo di godimento (Proprietà, diritto reale, godimento personale), email, telefono
- **Soggetto Responsabile (SR)**: denominazione, CF/P.IVA, IBAN, PEC; flag "coincide con SA"
- **Proprietario**: denominazione, CF/P.IVA; flag "coincide con SA"; atto di assenso se diverso da SA
- **Delegato** (opzionale): nome e CF per compilazione portale
- **Richiesta Preliminare** (solo Impresa/ETS): flag inviata, data richiesta, data primo impegno

### Controlli automatici al passaggio
1. **Validazione Ruoli GSE** (`RulesEngine.validateRoles`): SA deve avere tipo valido, SR deve avere IBAN e PEC se diverso da SA, se proprietario ≠ SA deve avere atto di assenso
2. **Effetto Incentivante** (`_checkEffettoIncentivante`): per Imprese e ETS, la data richiesta preliminare deve essere antecedente alla data del primo impegno giuridicamente vincolante
3. **Ammissibilità soggettiva** (`validateAmmissibilita`): incrocio tra tipo soggetto, categoria catastale e titoli disponibili

### Condizione di uscita
Utente preme **Avanti**. Se i controlli falliscono, viene mostrato un alert con gli errori e il passaggio è bloccato.

---

## Step 2 — Screening Ammissibilità

**Scopo**: Verifica che il soggetto e l'immobile abbiano titolo per accedere agli incentivi.

### Azioni dell'utente
- **Nessuna**: schermata informativa di riepilogo
- Leggere il risultato della validazione automatica
- I titoli ammissibili (es. "II" = Involucro, "III" = Impianti) vengono visualizzati come tag verdi
- Eventuali errori di ammissibilità vengono mostrati in rosso

### Controlli automatici al passaggio
1. **Risultato validazione**: `_praticaData.validation.success` deve essere `true`
2. **Titoli disponibili**: almeno un titolo di intervento deve risultare compatibile
3. **Soggetto vs categoria**: matching tra `SOGGETTI_CONFIG`, categoria catastale e titoli (Titolo II o III)

### Condizione di uscita
Utente preme **Avanti**. Se `validation.success === false`, il pulsante Avanti rimane nascosto e l'utente non può proseguire. Deve tornare indietro e correggere i dati degli step precedenti.

---

## Step 3 — Configurazione Progetto

**Scopo**: Selezione degli interventi e inserimento dati tecnici.

### Azioni dell'utente
- Selezionare uno o più interventi dalla sidebar sinistra (check box)
- Ogni intervento mostra nome, codice (III.A, II.H, ecc.) e compatibilità
- Gli interventi incompatibili sono disabilitati con motivazione
- Compilare, per ogni intervento selezionato, i campi tecnici nella maschera destra:
  - **III.A** (PdC): marca, modello, potenza, COP, SCOP, tipologia (aria/acqua, acqua/acqua), servizio, made in EU
  - **II.H** (FV+accumulo): potenza FV, numero moduli, accumulo kWh, made in EU, registro ENEA, autoconsumo
  - **II.G** (ricarica EV): numero punti, potenza, tipo, smart charging
  - **II.F** (building automation): tipo controllo, dispositivi, classe sistema
  - **III.E** (scaldacqua PDC): marca, modello, capacità, COP

### Controlli automatici al passaggio
1. **Selezione minima**: almeno un intervento deve essere selezionato
2. **Vincoli incrociati** (`CrossRuleEngine.validateSelection`):
   - II.H (FV) e II.G (ricarica) richiedono III.A (PdC elettrica pura) come trainante
   - Sostituzione integrale deve essere confermata
3. **Dati tecnici obbligatori**: i campi con `obbligatorio: true` nella scheda tecnica devono essere compilati

### Condizione di uscita
Utente preme **Avanti**. Se i vincoli incrociati non sono soddisfatti, il passaggio è bloccato con messaggio di errore.

---

## Step 4 — Preventivo e Conformità

**Scopo**: Configurazione delle voci di spesa e verifica documentale.

### Azioni dell'utente
- Per ogni intervento selezionato, visualizzare le voci di costo suggerite dal catalogo
- Modificare importi e quantità per ciascuna voce
- Aggiungere voci personalizzate (pulsante "Aggiungi Voce")
- Verificare i totali parziali per tipo costo (fornitura, posa, opere accessorie, documentazione)
- Marcare i documenti obbligatori come presenti/assenti nella checklist

### Controlli automatici al passaggio
1. **Totale positivo**: l'importo totale del preventivo deve essere > 0
2. **Documenti critici**: i documenti obbligatori per la normativa devono essere marcati
3. **Massimali di spesa** (Cmax): il sistema segnala eventuali superamenti dei massimali ma non blocca (avviso)

### Condizione di uscita
Utente preme **Avanti**.

---

## Step 5 — Erogazione e Chiusura

**Scopo**: Calcolo dell'incentivo e generazione report finale.

### Azioni dell'utente
- Visualizzare i calcoli eseguiti dai motori:
  - **FormulaEngine**: calcolo Ei (energia incentivata) e incentivo base per ogni intervento
  - **PremialitaEngine**: applicazione bonus (Made in EU +5%, Registro ENEA)
  - **ReliabilityEngine**: valutazione affidabilità dei dati inseriti
- Verificare il piano di erogazione:
  - **Rata unica**: se incentivo totale ≤ 15.000 €
  - **2 rate**: se incentivo > 15.000 € e potenza < 35 kW
  - **5 rate**: se incentivo > 15.000 € e potenza ≥ 35 kW
- Premere **Calcoli** per dettaglio analitico
- Premere **Report** per generare il documento di sintesi
- Premere **Archivia** per salvare definitivamente la pratica

### Controlli automatici
1. **Coerenza formule**: tutti i parametri necessari devono essere presenti
2. **Firewall economico**: se l'affidabilità dei dati è bassa, gli importi sono nascosti nel report cliente (solo bozza interna)
3. **Salvataggio**: l'archiviazione in IndexedDB crea il record completo con tutte le tabelle collegate

### Condizione di uscita
Utente preme **Archivia**. La pratica viene salvata con id `PRATICA_timestamp` e diventa accessibile dall'elenco pratiche.

---

## Matrice delle Transizioni

| Da | A | Condizione |
|----|---|-----------|
| Step 0 → Step 1 | Censimento → Ruoli | Dati edificio compilati |
| Step 1 → Step 2 | Ruoli → Screening | Ruoli GSE validati + Effetto Incentivante OK |
| Step 2 → Step 3 | Screening → Configurazione | `validation.success === true` |
| Step 3 → Step 4 | Configurazione → Conformità | Interventi selezionati + Vincoli incrociati OK |
| Step 4 → Step 5 | Conformità → Erogazione | Preventivo compilato |
| Step 5 → (chiuso) | Erogazione → Archiviata | Utente preme Archivia |
