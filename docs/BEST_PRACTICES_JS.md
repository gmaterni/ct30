# SYSTEM INSTRUCTIONS: GUIDA SVILUPPO JAVASCRIPT (VANILLA) — v4.0

> **ISTRUZIONE CRITICA PER L'AGENTE:**
> Questo documento è la **"Costituzione"** del codice per questo progetto.
> Ogni riga generata DEVE aderirvi. Ignorare anche una sola direttiva è un **errore critico**.
> In caso di conflitto tra regole, il **Principio Arbitro** (sezione 0) ha sempre la precedenza assoluta.

---

## 0. PRINCIPIO ARBITRO (PRECEDENZA ASSOLUTA)

> *"Il codice è fondamentalmente un testo che descrive un processo secondo regole formali,
> destinato ad essere letto e compreso da altri programmatori.
> Solo in secondo luogo è un insieme di istruzioni eseguibili da una macchina."*

**Questo principio è il tiebreaker universale.**
La leggibilità in prosa è l'obiettivo supremo. Se una regola tecnica rende il codice oscuro, la chiarezza ha la precedenza. Un programmatore deve poter leggere il file dall'alto verso il basso come un libro.

---

## 1. ARCHITETTURA: RIGOROSAMENTE VANILLA (NO CLASSES)

L'uso di `class`, `this`, `new` e `prototype` è **STRETTAMENTE VIETATO**.
Le classi nascondono la natura funzionale di JS e complicano la gestione del contesto.

### 1.1 Pattern Factory/Closure (MANDATORIO)
Ogni modulo con stato o interazione DOM deve essere una Factory.
1.  **Stato Privato:** Variabili `let` e `const` all'interno della closure.
2.  **Funzioni Private:** Prefisso `_` (es. `_render`).
3.  **API Pubblica:** Un oggetto piano restituito esplicitamente alla fine.

---

## 2. REGOLE "STRICT" PER LA GENERAZIONE DI CODICE (LLM-READY)

Queste regole eliminano l'ambiguità logica durante la generazione.

### 2.1 Lingua e Naming
- **Logica/Variabili:** INGLESE (`camelCase`).
- **Costanti di Modulo:** INGLESE (`SCREAMING_SNAKE`).
- **Commenti/Documentazione/Log:** ITALIANO.
- **Factory:** `PascalCase` con prefisso `Ua` (es. `UaDataProcessor`).

### 2.2 RETURN STRICT (Regola Aurea)
Ogni `return` di un valore **computato** deve essere preceduto dall'assegnazione a una variabile descrittiva.
- **VIETATO:** `return a + b;`, `return await apiCall();`, `return { id: 1 };`.
- **AMMESSO:** `const total = a + b; return total;`.
- **ECCEZIONE:** Guard clauses (`return null;`) e letterali costanti (`return true;`).

### 2.3 TEMPLATE LITERAL STRICT
Nessuna logica dentro `${}`. Solo variabili o costanti già pronte.
- **VIETATO:** `${data.trim()}`, `${isValid ? 'a' : 'b'}`.
- **AMMESSO:** `const label = data.trim(); const msg = `Hi ${label}`;`.

### 2.4 FAIL FAST (Validazione Totale)
Validazione degli input e disponibilità del DOM in cima ad ogni funzione.
Se la validazione fallisce:
1. `console.error("NomeFunzione: messaggio errore")`.
2. `return null` (o `false`/`void`).

---

## 3. FORMATTAZIONE E LOGICA

- **No Magic Numbers:** Ogni valore letterale (stringhe ripetute, timeout, limiti) deve essere una costante `UPPER_CASE` a inizio modulo.
- **Catene di metodi:** Massimo 2 passaggi (es. `arr.filter().map()`). Se > 2, usare variabili intermedie.
- **Async/Await:** Usare esclusivamente `async/await`. VIETATO `.then()`.
- **Try/Catch Pattern:**
  ```javascript
  let result = null;
  try {
      const data = await call();
      result = data;
  } catch (error) {
      console.error("funzione:", error);
      result = null;
  }
  return result;
  ```

---

## 4. HTML SEMANTICO & HOOKS

### 4.1 Tag Semantici
Priorità assoluta ai tag semantici (`<nav>`, `<header>`, `<main>`, `<article>`, `<section>`, `<footer>`, `<aside>`, `<button>`). `<div>` e `<span>` solo come ultima risorsa per layout puro.

### 4.2 Hooks JS vs CSS
- **JS Hook:** Usare `id` o attributi `data-*`.
- **CSS Hook:** Usare `class`.
**REGOLA:** Mai selezionare un elemento tramite `class` se ha uno scopo logico/funzionale.

---

## 5. MODULO MASTER (TEMPLATE DI RIFERIMENTO)

```javascript
/**
 * UaUserManager.js - Gestore utenti via API.
 * 
 * @module UaUserManager
 * @version 4.0.0
 */

import { UaLogger } from "./utils/logger.js";

const API_ENDPOINT = "/api/users";
const DEFAULT_ROLE = "guest";

/**
 * Factory per la gestione utenti.
 * @returns {Object|null} API pubblica.
 */
const UaUserManager = function() {
    // 1. STATO
    let _users = [];

    // 2. FUNZIONI PRIVATE
    const _validateUser = function(user) {
        if (!user || !user.id) {
            console.error("_validateUser: dati utente non validi");
            return false;
        }
        return true;
    };

    // 3. FUNZIONI PUBBLICHE
    const fetchUsersAsync = async function() {
        let fetchedData = null;

        try {
            const response = await fetch(API_ENDPOINT);
            if (!response.ok) {
                console.error("fetchUsersAsync: errore rete");
                return null;
            }
            const data = await response.json();
            fetchedData = data;
        } catch (error) {
            console.error("fetchUsersAsync:", error);
            fetchedData = null;
        }

        if (fetchedData) {
            _users = fetchedData;
        }

        return fetchedData;
    };

    const getAdminUsers = function() {
        const admins = _users.filter(user => user.role === "admin");
        return admins;
    };

    // 4. API PUBBLICA
    return {
        fetchUsers: fetchUsersAsync,
        getAdmins: getAdminUsers
    };
};

export { UaUserManager };
```

---

## 6. CHECKLIST DI AUTO-REVISIONE (MANDATORIA)

L'Agente deve verificare questi punti prima di ogni invio:
1.  **Paradigma:** Ho usato `class`, `this` o `new`? (ERRORE CRITICO se sì).
2.  **Return Strict:** Ogni valore computato passa per una variabile nominata?
3.  **Template Strict:** `${}` contiene solo variabili semplici?
4.  **Fail Fast:** Ho validato gli input e loggato gli errori con il nome della funzione?
5.  **Vanilla JS:** Ho evitato librerie esterne non richieste?
6.  **Lingua:** Nomi in inglese, commenti in italiano?
7.  **Costanti:** Ho rimosso i "Magic Numbers" a favore di costanti `UPPER_CASE`?
8.  **HTML:** Ho usato tag semantici e separato correttamente gli hook JS/CSS?
9.  **Prosa:** Il codice è leggibile come un testo fluido senza "salti" logici?
