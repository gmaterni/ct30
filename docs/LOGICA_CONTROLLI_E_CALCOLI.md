# Specifica Tecnica: Logica di Controllo e Algoritmi di Calcolo
**Riferimento Normativo:** D.M. 7 Agosto 2025 (Conto Termico 3.0)
**Applicazione:** CT30 Advisor - Modulo Core

## 1. Architettura dei Motori Logici
Il sistema è strutturato su motori indipendenti che interagiscono con il database normativo centralizzato (`normativa.js`).

*   **`rules_engine.js`**: Gestione dei vincoli di ammissibilità soggettiva e catastale.
*   **`cross_rule_engine.js`**: Validazione delle dipendenze funzionali tra interventi (trainanti/trainati).
*   **`formula_engine.js`**: Esecuzione degli algoritmi di calcolo e generazione del piano di ammortamento.
*   **`premialita_engine.js`**: Calcolo delle maggiorazioni basato su certificazioni tecniche.

## 2. Flusso Operativo e Controlli Analitici

### Fase 1: Inquadramento e Verifica Addizionalità
**Script:** `rules_engine.js` | **Funzione:** `_checkEffettoIncentivante`

Il controllo è applicato esclusivamente ai soggetti classificati come "Impresa" o "ETS economico".
*   **Verifica Presenza:** Accertamento dell'invio della Richiesta Preliminare al GSE.
*   **Verifica Temporale:** Confronto tra la data di invio della Richiesta Preliminare ($D_p$) e la data del primo impegno giuridicamente vincolante ($D_i$). La condizione di ammissibilità è $D_p < D_i$.

### Fase 2: Validazione Ammissibilità
**Script:** `rules_engine.js` | **Funzione:** `validateAmmissibilita`

Il motore esegue il matching tra tre matrici di dati:
1.  **Stato Immobile**: Verifica del requisito di edificio esistente (accatastato o F/2).
2.  **Inquadramento Catastale**: Controllo della compatibilità della categoria (es. A, B, C, D) con il Decreto.
3.  **Titoli di Intervento**: Verifica che il soggetto abbia titolo per accedere agli interventi (Titolo II per efficienza, Titolo III per rinnovabili).

### Fase 3: Vincoli di Intervento
**Script:** `cross_rule_engine.js` | **Funzione:** `validateSelection`

Analisi delle interdipendenze tra le tecnologie selezionate:
*   **Interventi Trainati**: Controllo della presenza di un intervento trainante (es. II.H e II.G richiedono obbligatoriamente III.A).
*   **Vincoli Logici**: Applicazione delle regole definite in `normativa.js` tramite l'attributo `vincoli_logici`.

### Fase 4: Calcolo dell'Incentivo e Algoritmi
**Script:** `formula_engine.js` | **Funzione:** `_executeGenericFormula`

L'incentivo viene determinato secondo gli algoritmi definiti nell'Allegato 2 del Decreto.

#### Algoritmo Pompe di Calore (III.A)
Il calcolo si basa sull'energia termica incentivata ($E_i$):
1.  **Determinazione $Q_u$**: $P_{rated} \times Q_{uf}$ (coefficiente d'uso basato sulla zona climatica).
2.  **Calcolo $E_i$**: $Q_u \times (1 - 1/SCOP) \times k_p$.
3.  **Calcolo $k_p$ (Premialità)**: Rapporto $\eta_s / \eta_{s,min}$ (efficienza stagionale).
4.  **Valorizzazione**: $I_{tot} = k \times E_i \times C_i$ (dove $C_i$ è estratto dalla Tabella 9).

#### Algoritmo Interventi a Massimale (II.A, II.G)
1.  **Costo Ammissibile**: $min(Spesa, Parametro \times C_{max})$.
2.  **Incentivo**: Applicazione della percentuale di contribuzione (es. 40% o 50%) sul costo ammissibile.

## 3. Piano di Erogazione e Maggiorazioni

### Erogazione in Unica Soluzione
**Script:** `formula_engine.js` | **Funzione:** `_calculatePaymentPlan`

Il sistema valuta l'importo totale calcolato ($I_{tot}$):
*   Se $I_{tot} \leq 15.000€$: Erogazione integrale in un'unica rata.
*   Se $I_{tot} > 15.000€$: Ripartizione in quote annuali costanti (2 o 5 anni in base a potenza e tecnologia).

### Applicazione Bonus
**Script:** `premialita_engine.js` | **Funzione:** `calculateBonus`

Applicazione di maggiorazioni sull'incentivo base:
*   **Made in EU**: +5% sull'incentivo base.
*   **Registro ENEA (FV)**: Maggiorazione variabile (+5%, +10%, +15%) basata sulla sezione di iscrizione dei componenti.

## 4. Validazione Affidabilità (Firewall)
**Script:** `wizard_manager.js` | **Funzione:** `_renderStepRisultati`

Il sistema calcola un indice di affidabilità del risultato basato sulla fonte dei dati inseriti. Solo i dati con affidabilità "Media" o "Alta" (fonti verificate o certificate) abilitano la visualizzazione degli importi nel report ufficiale.
