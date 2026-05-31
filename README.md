# CT30 Advisor

**CT30 Advisor** è un'applicazione web prototipale avanzata per la simulazione, la validazione e il calcolo degli incentivi previsti dal **Decreto Conto Termico 3.0** (D.M. 7 agosto 2025).

L'obiettivo principale dell'applicazione è guidare i professionisti (geometri, ingegneri, consulenti energetici) nella corretta predisposizione delle pratiche GSE, garantendo la conformità normativa e fornendo una stima precisa dell'incentivo erogabile.

---

## 🚀 Caratteristiche Principali

- **Wizard Guidato in 6 Step:** Un percorso strutturato che accompagna l'utente dall'inquadramento iniziale del soggetto e dell'immobile fino alla generazione del report finale.
- **Architettura Data-Driven:** La logica di calcolo è separata dai dati normativi, centralizzati in una "Single Source of Truth" (`normativa.js`).
- **Motori Logici Specializzati:**
    - **Rules Engine:** Verifica l'ammissibilità soggettiva (Privati, Imprese, PA) e catastale.
    - **Cross-Rule Engine:** Valida le dipendenze tra interventi (trainanti e trainati).
    - **Formula Engine:** Esegue i complessi algoritmi del Decreto per il calcolo dell'energia termica incentivata e dell'importo totale.
    - **Premialità Engine:** Gestisce le maggiorazioni (Made in EU, Registro ENEA, zone assistite).
    - **Reliability Engine:** Valuta la qualità dei dati inseriti per garantire l'affidabilità del risultato.
- **Persistenza Locale:** Utilizzo di **IndexedDB** per salvare le pratiche direttamente nel browser, garantendo privacy e velocità.

---

## 🛠️ Stack Tecnologico

- **Linguaggio:** Vanilla JavaScript (ES6 Modules) - *Senza l'uso di framework o classi*.
- **Persistence:** [Dexie.js](https://dexie.org/) per la gestione di IndexedDB.
- **Stile:** CSS dinamico tramite **LESS**.
- **UI:** Libreria custom interna per la gestione di finestre modali e wizard.

---

## 📂 Struttura del Progetto

- `/static/index.html`: Punto di ingresso dell'applicazione.
- `/static/js/core/`: I "motori" dell'applicazione (logica di calcolo e regole).
- `/static/js/infra/`: Gestione del database e identificazione utente.
- `/static/js/ui/`: Componenti dell'interfaccia utente.
- `/docs/`: Documentazione tecnica approfondita, workflow e specifiche.
- `/static/data/tests/`: Scenari di test JSON per validare diversi casi d'uso (es. PDC privato, grande impresa, ecc.).

---

## 📖 Guida all'Uso

1. **Avvio:** Aprire il file `index.html` alla radice del progetto o direttamente `static/index.html` in un browser moderno.
2. **Creazione Pratica:** Iniziare il wizard inserendo i dati del soggetto e dell'edificio.
3. **Selezione Interventi:** Scegliere le tecnologie da incentivare (es. Pompe di calore, Cappotto termico, Solare termico).
4. **Inserimento Dati Tecnici:** Compilare i parametri richiesti (potenza, rendimenti, zone climatiche).
5. **Calcolo:** Visualizzare il piano di erogazione (unica soluzione o rate annuali) e la sintesi economica.

