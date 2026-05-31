# Architettura dei Dati — CT30 Advisor

## 1. Modello Concettuale (Edificio-Centrico)

Il sistema ruota attorno all'**EDIFICIO**, non alla singola pratica. Un edificio può avere più richieste nel tempo (es. una per PDC, una successiva per cappotto), ma solo una "Richiesta Attiva" per volta.

```
[ Edificio ] <── 1:1 ── [ Proprietario ]
     │
     └── 1:N ── [ Pratica ] ── 1:1 ── [ Anagrafica Istanza ] (SA, SR, Delegato)
                     │
                     ├── N:1 ── [ Operatore ] ── N:1 ── [ Utente ]
                     │
                     ├── 1:N ── [ Interventi Scelti ]
                     │              │
                     │              └── 1:N ── [ Dati Tecnici ]
                     │
                     ├── 1:N ── [ Documenti ]
                     │
                     ├── 1:N ── [ Preventivo Voci ]
                     │
                     └── 1:1 ── [ Piano Erogazione ]
```

## 2. Tabelle del Database (IndexedDB v5)

### 2.1. `pratiche` — Capofila della pratica

| Campo | Tipo | Note |
|-------|------|------|
| `id` | string (PK) | Formato `PRATICA_timestamp` o `AUTO_timestamp` |
| `nome` | string | Nome assegnato dall'utente |
| `dataCrea` | ISO date | Data di creazione |
| `dati` | JSON (nullable) | Presente solo per record v4 legacy; assente nel nuovo formato |

### 2.2. `edifici` — Anagrafica immobile

| Campo | Tipo | Note |
|-------|------|------|
| `praticaId` | string (FK → pratiche.id) | Chiave esterna |
| `indirizzo` | string | Via, numero, città |
| `categoria_catastale` | string | Es. A/2, D/7 |
| `zona_climatica` | string | Zona A–F |
| `potenza_esistente_kw` | number | Potenza generatore ante |
| `combustibile_ante` | string | Metano, gasolio, GPL, biomassa |

### 2.3. `soggetti` — Ruoli GSE (SA, SR, Proprietario, Delegato)

| Campo | Tipo | Note |
|-------|------|------|
| `praticaId` | string (FK → pratiche.id) | Chiave esterna |
| `ruolo` | string | `sa`, `sr`, `proprietario`, `delegato` |
| `denominazione` | string | Nome / ragione sociale |
| `cf_piva` | string | Codice fiscale / partita IVA |
| `tipo` | string | Solo per SA: Privato, Impresa, PA, ETS, CER |
| `email` / `telefono` / `iban` / `pec` | string | Contatti |
| `coincide_con_sa` | boolean | Solo per SR / proprietario |
| `atto_assenso` | boolean | Solo per proprietario |

### 2.4. `interventi_scelti` — Selezione interventi

| Campo | Tipo | Note |
|-------|------|------|
| `praticaId` | string (FK → pratiche.id) | Chiave esterna |
| `codice` | string | Codice intervento (III.A, II.H, ...) |

### 2.5. `valori_campi` — Parametri tecnici per intervento

| Campo | Tipo | Note |
|-------|------|------|
| `id` | autoincrement (PK) | |
| `praticaId` | string (FK → pratiche.id) | Chiave esterna |
| `codice_intervento` | string | III.A, II.H, ... |
| `campo_id` | string | Nome parametro (potenza_pdc_kw, cop, ...) |
| `valore` | string | Valore testuale (convertito a number/boolean lato JS) |

### 2.6. `preventivo` — Voci di spesa

| Campo | Tipo | Note |
|-------|------|------|
| `praticaId` | string (FK → pratiche.id) | Chiave esterna |
| `id` | string | Identificativo voce |
| `codice_intervento` | string | III.A, II.H, ... |
| `descrizione` | string | Descrizione voce |
| `tipo_costo` | string | `fornitura`, `posa`, `opere_accessorie`, `documentazione` |
| `importo` | number | Importo unitario |
| `quantita` | number | Quantità |
| `unita` | string | unità di misura (corpo, kW, mq, pz) |
| `is_custom` | boolean | Se aggiunto manualmente |

### 2.7. `piano_erogazione` — Risultato calcolo incentivo

| Campo | Tipo | Note |
|-------|------|------|
| `praticaId` | string (FK → pratiche.id) | Chiave esterna |
| `incentivo_totale` | number | Importo totale |
| `numero_rate` | integer | 1, 2 o 5 |
| `importo_rata` | number | Importo per singola rata |
| `data_presunta_fine_lavori` | date | |

### 2.8. `documenti` (inalterata) — Checklist documentale

| Campo | Tipo |
|-------|------|
| `id` | autoincrement (PK) |
| `praticaId` | string (FK → pratiche.id) |
| `nomeDocumento` | string |
| `caricato` | boolean / string |

### 2.9. `settings` (inalterata) — Impostazioni applicazione

| Campo | Tipo |
|-------|------|
| `key` | string (PK) |
| `value` | any |

## 3. Schema di Riferimento (SQL)

Esiste lo script DDL completo in `news_db/db_schema.sql` (30 KB, 744 righe) con:
- Vincoli di foreign key e cascade delete
- Indici per ottimizzazione
- Valori di default e check constraint
- Enum per stati e tipologie

## 4. Note Implementative

- **Relazionalità in IndexedDB**: Dexie.js gestisce le relazioni lato client. Le tabelle sono collegate tramite `praticaId` come foreign key logica.
- **Composizione pratica**: `praticheMgr.get()` ricompone l'oggetto unificato leggendo da tutte le tabelle collegate.
- **Cascade delete**: `praticheMgr.delete()` rimuove i record da tutte le tabelle figlie.
- **Backward compatibility**: I record v4 (con campo `dati` blob) sono rilevati da `_composePratica()` e restituiti inalterati. La migrazione a v5 avviene automaticamente al primo salvataggio o tramite `praticheMgr.migrate()`.

## 5. Entità Normative (SSOT)

Il database normativo è centralizzato in `static/js/core/normativa.js` e contiene:
- **RULES**: Coefficienti Quf (zona climatica), Ci (Tabella 9), massimali Cmax
- **INTERVENTI**: Catalogo interventi Titolo II e III con vincoli logici
- **SCHEDE_TECNICHE**: Campi di input dinamici per ogni tecnologia
- **FORMULE_INCENTIVO**: Metadati formule e mappatura variabili
- **SOGGETTI_CONFIG**: Regole compatibilità per tipo soggetto
- **CLASSI_ENERGETICHE**: Classi A4–G con descrizioni
- **PREVENTIVO_VOCI**: Voci di catalogo suggerite per preventivo
- **TEST_SCENARIOS**: Casi prova manuali per validazione
