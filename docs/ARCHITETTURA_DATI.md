# ARCHITETTURA DATI — Conto Termico 3.0

## Modello Entità-Relazioni (14 tabelle)

Il sistema modella ogni pratica con **3 anagrafiche obbligatorie** (anche in caso di coincidenza di persona) più 1 opzionale, ed edificio + interventi + documentazione economica.

```
┌──────────────────────────────────────────────────────────────────┐
│                         PRATICA (T0)                             │
│  id, codice, nome, modalita_accesso, stato, data_inserimento,   │
│  procedura (II/III), note                                        │
└──────┬───────────────┬──────────────┬───────────────┬───────────┘
       │               │              │               │
       ▼               ▼              ▼               ▼
┌──────────┐   ┌──────────────┐   ┌──────────┐   ┌──────────┐
│ T1       │   │ T2           │   │ T3       │   │ T4 (opt) │
│ PROPRIE- │   │ RICHIEDENTE  │   │ RESPONSA- │   │ DELEGATO │
│ TARIO    │   │ (SA)         │   │ BILE (SR) │   │          │
└──────────┘   └──────────────┘   └──────────┘   └──────────┘
                    │                                       │
                    └──────────────┬────────────────────────┘
                                   │
                                   ▼
                          ┌────────────────┐
                          │  EDIFICIO (T5) │
                          │  dati catastali │
                          │  zona climatica │
                          │  APE pre        │
                          └────────────────┘
                                   │
                                   ▼
                    ┌──────────────────────────┐
                    │  INTERVENTO (T6 + T7)    │──┐
                    │  codice_intervento       │  │
                    │  dati_tecnici (JSON)     │  │
                    │  economico (JSON)        │  │
                    │  documenti []            │  │
                    │  contratto               │  │
                    │  esito_istruttoria       │  │
                    │  variazioni []           │  │
                    └──────────────────────────┘  │
                                                  ▼
                                         ┌────────────────┐
                                         │  ECONOMICO T8  │
                                         │  preventivo []  │
                                         │  maggiorazioni  │
                                         │  incentivo      │
                                         └────────────────┘
```

## IndexedDB Schema (v8)

Database: `CT30_{userId}` (Dexie)

### Tabella: `kvStore`
| Campo | Tipo | Note |
|-------|------|------|
| id | string | Chiave primaria |
| value | any | Valore JSON |

### Tabella: `settings`
| Campo | Tipo | Note |
|-------|------|------|
| id | string | Chiave primaria |
| value | any | Impostazioni utente |

### Tabella: `pratiche`
| Campo | Tipo | Note |
|-------|------|------|
| id | string | UUID |
| nome | string | Nome pratica |
| dataCrea | string | ISO date |
| stato | string | bozza/inviata/archiviata |
| modalita_accesso | string | diretto/prenotazione |
| pratica_data | JSON | Blob intero oggetto pratica |

### Tabelle anagrafiche: `proprietari`, `richiedenti`, `responsabili`, `delegati`
| Campo | Tipo | Note |
|-------|------|------|
| id | string | UUID |
| praticaId | string | FK → pratiche.id |
| denominazione | string | Ragione sociale / Nome |
| _(altri campi specifici)_ | | |

### Tabella: `edifici`
| Campo | Tipo | Note |
|-------|------|------|
| id | string | UUID |
| praticaId | string | FK |
| zona_climatica, categoria, ambito | string | |

### Tabella: `interventi`
| Campo | Tipo | Note |
|-------|------|------|
| id | string | UUID |
| praticaId | string | FK |
| codice_intervento | string | es. "III.A", "II.H" |
| is_trainante | boolean | |
| dati_tecnici | JSON | Blob dati tecnici specifici |
| economico | JSON | Blob economico specifico |

### Tabelle secondarie: `economico`, `documenti`, `variazioni`

## Struttura `_praticaData` (runtime)

```js
{
  pratica: {
    id, codice, nome, modalita_accesso, procedura, stato,
    data_inserimento, note
  },
  proprietario:   { /* T1 — tipo_soggetto da SA */ },
  richiedente:    { /* T2 — tipo_soggetto + ambito */ },
  responsabile:   { /* T3 — tipo_soggetto + ruolo_sr */ },
  delegato:       { /* T4 — opzionale */ },
  edificio: {
    indirizzo, dati_catastali, ambito, zona_climatica,
    anno_costruzione, superficie_utile_mq,
    impianto_esistente: {
      tipo, potenza_kw, combustibile,
      libretto: false, libretto_codice
    },
    ape: {}
  },
  interventi: [{
    codice_intervento, is_trainante,
    dati_tecnici: {}, economico: {}
  }],
  dati_tecnici: {},
  economico: { preventivo: [], maggiorazioni: [], incentivo: null }
}
```

## Cataloghi Tecnici (dati_tecnici/)

I cataloghi tecnici risiedono in `static/dati_tecnici/` come JSON parsificati dai PDF ufficiali GSE.  
Vengono caricati on-demand via `catalogo_loader.js` per i soli interventi III.A–III.E.

La mappa codici→file non è hardcoded: `catalogo_loader.js` legge `dati_tecnici/index.json`  
all'avvio. Per aggiungere/rinominare un file basta aggiornare `index.json`.

| Codice | File | Contenuto |
|--------|------|-----------|
| III.A | `III.A_catalogo_pdc.json` | Pompe di calore: marca, modello, potenza kW, ηs, SCOP/COP |
| III.B | `III.B_catalogo_ibridi.json` | Sistemi ibridi: PDC + caldaia, potenze, ηs, SCOP, rendimento caldaia |
| III.C | `III.C_catalogo_biomassa.json` | Biomasse: marca, modello, potenza, alimentazione, rendimento, classe |
| III.D | `III.D_catalogo_solare_termico.json` | Solare termico: tipo, utilizzo, area AG/Aa, energia Qcol/Qsol |
| III.E | `III.E_catalogo_scaldacqua_pdc.json` | Scaldacqua PDC: capacità, classe, potenza |

In Fase 4, ogni intervento con catalogo mostra dropdown Marca/Modello.  
Alla selezione del modello, i campi tecnici vengono auto-compilati (es. `potenza_kw` → `potenza_pdc_kw`, `scop_cop` → `scop`, `classe_ambientale` → `classe_emissiva`).

Per lo schema dettagliato di ogni catalogo vedi [`CATALOGHI_TECNICI.md`](CATALOGHI_TECNICI.md).

## Campi chiave per anagrafica

### Proprietario (T1)
- denominazione, codice_fiscale, partita_iva, indirizzo_sede
- Flag: coincide_con_richiedente, coincide_con_responsabile

### Richiedente (T2)
- denominazione, tipo_soggetto (PA/Privato residenziale/Condominio/Privato terziario/Impresa/ETS non econ/ETS econ/Cooperativa edilizia/IAP)
- ambito (residenziale/terziario) — solo per Privato residenziale/terziario
- titolo_disponibilita, indirizzo_sede

### Responsabile (T3)
- denominazione, tipo_soggetto (PA/Privato/ETS non econ/ETS econ/Cooperativa edilizia/ESCO/CER/AUC)
- ruolo_sr, iban, mandato_incasso_irrevocabile

### Delegato (T4)
- denominazione, codice_fiscale, indirizzo_pec

## Vincoli referenziali

- T1 ≠ T2 (ruoli diversi) → atto di assenso obbligatorio (Art. 13)
- T2 (SA) → determina ammissibilità interventi (MATRICE_SA_INTERVENTI)
- T3 (SR) → abbinato a SA via MATRICE_SA_SR
- T3 = ESCO → contratto EPC obbligatorio
- T2 = privato + ambito residenziale → solo Titolo III
- T2 = impresa (attività economica) → regime Titolo V
