/**
 * normativa.js - Database normativo centralizzato del Conto Termico 3.0.
 *
 * Questo modulo esporta come costanti native tutti i dati caricati dai file JSON
 * (D.M. 7 agosto 2025).
 * 
 * NOTA: Questo file è la "Single Source of Truth" per il frontend.
 * 
 * @module  normativa
 * @version 1.2.0
 * @date    2026-05-22
 */

"use strict";

/**
 * Configurazioni Premialità (Bonus) CT 3.0.
 */
export const PREMIALITA_CONFIG = {
    "made_in_eu": {
        "label": "Made in EU",
        "bonus_perc": 0.05,
        "applicabile_a": ["II.", "III."],
        "campo_attivazione": "made_in_eu"
    },
    "registro_enea_fv": {
        "label": "Registro ENEA (FV)",
        "applicabile_a": ["II.H"],
        "varianti": {
            "iscritti": { "bonus_perc": 0.05, "campo": "registro_enea" },
            "ue_prod": { "bonus_perc": 0.10, "campo": "ue_production" },
            "same_sec": { "bonus_perc": 0.15, "campo": "same_section" }
        }
    }
};

/**
 * Parametri procedurali e soglie di erogazione CT 3.0.
 */
export const PROCEDURA_CONFIG = {
    "SOGLIA_UNICA_SOLUZIONE": 15000,
    "EFFETTO_INCENTIVANTE_OBBLIGATORIO": ["Impresa", "ETS economico"],
    "DURATA_STANDARD_PICCOLA_POTENZA": 2, // anni per P <= 35kW
    "DURATA_STANDARD_GRANDE_POTENZA": 5    // anni per P > 35kW
};

/**
 * Regole base, fasce climatiche e parametri tecnici interventi.
 * Sorgente: data/rules.json
 */
export const RULES = {
    "version": "3.0_Full_May2026",
    "metadata": {
        "source": "Regole Applicative D.M. 7 agosto 2025",
        "last_update": "2026-05-05"
    },
    "fasce_climatiche": {
        "Zona A": { "quf": 600, "descrizione": "Clima molto caldo (es. Lampedusa, Porto Empedocle)" },
        "Zona B": { "quf": 850, "descrizione": "Clima caldo (es. Palermo, Reggio Calabria, Agrigento)" },
        "Zona C": { "quf": 1100, "descrizione": "Clima mite (es. Napoli, Bari, Cagliari, Latina)" },
        "Zona D": { "quf": 1400, "descrizione": "Clima temperato (es. Roma, Firenze, Genova, Pescara)" },
        "Zona E": { "quf": 1700, "descrizione": "Clima freddo (es. Milano, Torino, Bologna, L'Aquila)" },
        "Zona F": { "quf": 1800, "descrizione": "Clima molto freddo (es. Belluno, zone montane)" }
    },
    "interventi": {
        "II.A": { "desc": "Isolamento termico superfici opache", "varianti": { "Coperture Esterno": { "cmax": 300 }, "Coperture Interno": { "cmax": 150 }, "Coperture Ventilata": { "cmax": 350 }, "Parete Esterna": { "cmax": 200 }, "Parete Interna": { "cmax": 100 }, "Parete Ventilata": { "cmax": 250 }, "Pavimenti Esterno": { "cmax": 170 }, "Pavimenti Interno": { "cmax": 150 } }, "imax": 1000000, "perc": 0.4, "perc_zone_EF": 0.5, "perc_multi": 0.55 },
        "II.B": { "desc": "Sostituzione infissi", "varianti": { "Zone A,B,C": { "cmax": 700 }, "Zone D,E,F": { "cmax": 800 } }, "imax": 500000, "perc": 0.4, "perc_multi": 0.55 },
        "II.G": { 
            "desc": "Infrastrutture ricarica veicoli elettrici", 
            "varianti": { 
                "Punto ricarica Monofase": { "cmax_fisso": 2400 }, 
                "Punto ricarica Trifase": { "cmax_fisso": 8400 }, 
                "Potenza > 22 kW": { "cmax_kw": 1200 } 
            }, 
            "perc": 0.3, 
            "vincolo": "Richiede III.A Elettrica" 
        },
        "II.H": { 
            "desc": "Fotovoltaico + Accumulo", 
            "scaglioni_fv": [
                { "fino_a": 20, "cmax": 1500 }, 
                { "fino_a": 200, "cmax": 1200 }, 
                { "fino_a": 600, "cmax": 1100 }, 
                { "fino_a": 1000, "cmax": 1050 }
            ], 
            "accumulo": { "cmax": 1000 }, 
            "perc": 0.2, 
            "vincolo": "Richiede III.A Elettrica e Sostituzione Integrale" 
        },
        "III.A": { 
            "desc": "Pompe di calore", 
            "coefficienti_ci": { 
                "Ci_PDC_aria_aria_split_le12kW": 0.070,
                "Ci_PDC_aria_aria_fixed_double_duct_le12kW": 0.200,
                "Ci_PDC_aria_aria_VRF_12_35kW": 0.150,
                "Ci_PDC_aria_aria_VRF_gt35kW": 0.055,
                "Ci_PDC_aria_aria_rooftop_le35kW": 0.150,
                "Ci_PDC_aria_aria_rooftop_gt35kW": 0.055,
                "Ci_PDC_aria_acqua_le35kW": 0.150,
                "Ci_PDC_aria_acqua_gt35kW": 0.055,
                "Ci_PDC_acqua_aria_le35kW": 0.150,
                "Ci_PDC_acqua_aria_gt35kW": 0.060,
                "Ci_PDC_acqua_acqua_le35kW": 0.160,
                "Ci_PDC_acqua_acqua_gt35kW": 0.060,
                "Ci_PDC_salamoia_aria_le35kW": 0.160,
                "Ci_PDC_salamoia_aria_gt35kW": 0.060,
                "Ci_PDC_salamoia_acqua_le35kW": 0.160,
                "Ci_PDC_salamoia_acqua_gt35kW": 0.060
            }, 
            "durata": { "piccola": 2, "grande": 5 }, 
            "soglia_potenza": 35 
        },
        "III.G": {
            "desc": "Microcogenerazione",
            "perc": 0.5,
            "cmax": 4500,
            "imax": 1000000,
            "durata": 5
        }
    }
};

/**
 * Configurazione dettagliata dei Soggetti Responsabili.
 * Unifica regole base, compatibilità titoli e vincoli procedurali.
 * Sorgente: data/rules.json + data/compatibilita_soggetti_interventi.json
 */
export const SOGGETTI_CONFIG = {
    "Privato residenziale": {
        "label": "Persona Fisica (Residenziale)",
        "descrizione": "Proprietari o detentori di unità immobiliari residenziali.",
        "titoli_ammessi": ["III"],
        "incentivo_base": 0.65,
        "richiesta_preliminare": false,
        "prenotazione": false,
        "alert": "Non ammesso per interventi di isolamento/infissi (Titolo II) se non in casi speciali (es. > 70kW o condomini)."
    },
    "Condominio": {
        "label": "Condominio",
        "descrizione": "Edifici residenziali con più unità immobiliari.",
        "titoli_ammessi": ["II", "III"],
        "incentivo_base": 0.65,
        "richiesta_preliminare": false,
        "prenotazione": false,
        "alert": "Ammesso per interventi su parti comuni (cappotto, caldaie centralizzate)."
    },
    "Privato terziario": {
        "label": "Privato (Uso Terziario)",
        "descrizione": "Proprietari di edifici non residenziali (uffici, negozi, ecc.).",
        "titoli_ammessi": ["II", "III"],
        "incentivo_base": 0.65,
        "richiesta_preliminare": false,
        "prenotazione": false,
        "alert": null
    },
    "Impresa": {
        "label": "Impresa (PMI o Grande Impresa)",
        "descrizione": "Soggetti che esercitano attività economica su edifici terziari.",
        "titoli_ammessi": ["II_solo_terziario", "III"],
        "incentivo_base": 0.65,
        "richiesta_preliminare": true,
        "prenotazione": false,
        "max_intensita": 0.65,
        "alert": "ATTENZIONE: Obbligo di Richiesta Preliminare prima di ordini o contratti (Effetto Incentivante)."
    },
    "Pubblica Amministrazione": {
        "label": "Pubblica Amministrazione (PA)",
        "descrizione": "Enti pubblici, comuni, scuole, sanità.",
        "titoli_ammessi": ["II", "III"],
        "incentivo_base": 1.0,
        "richiesta_preliminare": false,
        "prenotazione": true,
        "alert": "Accesso alla prenotazione dell'incentivo e intensità fino al 100%."
    },
    "ETS non economico": {
        "label": "ETS non economico",
        "descrizione": "Enti del Terzo Settore che non svolgono attività commerciale prevalente.",
        "titoli_ammessi": ["II", "III"],
        "incentivo_base": 1.0,
        "richiesta_preliminare": false,
        "prenotazione": true,
        "note": ["Assimilato alla PA"],
        "alert": "Assimilato alla Pubblica Amministrazione per regole e incentivi."
    },
    "ETS economico": {
        "label": "ETS economico",
        "descrizione": "Enti del Terzo Settore che svolgono attività commerciale.",
        "titoli_ammessi": ["III"],
        "incentivo_base": 0.65,
        "richiesta_preliminare": true,
        "prenotazione": false,
        "alert": "ATTENZIONE: Obbligo di Richiesta Preliminare. Ammesso solo per Titolo III."
    },
    "CER": {
        "label": "Comunità di Energia Rinnovabile (CER)",
        "descrizione": "Soggetti aggregati per l'energia rinnovabile.",
        "titoli_ammessi": ["dipende_membro"],
        "incentivo_base": null,
        "richiesta_preliminare": "dipende_membro",
        "prenotazione": false,
        "alert": "L'ammissibilità dipende dalla natura giuridica del membro che realizza l'intervento."
    }
};

/**
 * Catalogo descrittivo degli interventi e documenti richiesti.
 * Sorgente: data/interventi_guidati.json
 */
export const INTERVENTI = {
    "III.A": {
        "nome": "Pompa di calore elettrica per climatizzazione invernale",
        "descrizione": "Sostituzione dell'impianto di climatizzazione invernale esistente con pompa di calore elettrica, anche combinata per ACS ove coerente.",
        "lavorazioni_comprese": [ "rilievo impianto esistente e generatore da sostituire", "dismissione/rimozione del generatore esistente ove previsto", "fornitura e posa della pompa di calore elettrica", "collegamenti idraulici e/o frigoriferi necessari", "collegamenti elettrici e protezioni dedicate", "adeguamento terminali o circuito impiantistico se necessario", "sistemi di regolazione, avviamento e collaudo", "aggiornamento libretto impianto e documentazione post-operam" ],
        "lavorazioni_da_verificare": [ "mantenimento di generatori gas come backup", "sostituzione parziale del sistema esistente", "compatibilita con terminali esistenti a bassa temperatura", "potenze superiori a soglie che richiedono diagnosi energetica" ],
        "vincoli": [ "richiede edificio esistente, accatastato e climatizzato", "richiede impianto di climatizzazione invernale esistente dimostrabile", "se traina II.H deve essere pompa di calore elettrica pura" ],
        "interventi_collegati_obbligatori": [],
        "interventi_collegati_suggeriti": [ "II.H", "II.G", "II.F" ],
        "documenti_richiesti": [ "scheda tecnica PDC", "certificazioni prestazionali", "libretto impianto ante/post", "foto ante/post", "dichiarazione conformita", "fatture e bonifici" ],
        "note_compilatore": "Se il cliente vuole fotovoltaico CT 3.0, verificare subito che questa PDC sia elettrica e che sostituisca realmente l'impianto esistente.",
        "warning": []
    },
    "II.H": {
        "nome": "Fotovoltaico e accumulo abbinati a pompa di calore elettrica",
        "descrizione": "Installazione di impianto fotovoltaico, eventuale sistema di accumulo e opere di connessione presso edificio o pertinenze.",
        "lavorazioni_comprese": [ "fornitura e posa moduli fotovoltaici", "inverter e quadri elettrici dedicati", "strutture di supporto e fissaggi", "cablaggi DC/AC e protezioni", "eventuale sistema di accumulo", "opere di allacciamento alla rete", "pratiche tecniche e documentazione impianto" ],
        "lavorazioni_da_verificare": [ "premialita moduli iscritti al registro ENEA", "moduli tutti nella stessa sezione del registro", "opere edili accessorie non strettamente pertinenti", "FV installato non presso edificio o pertinenze" ],
        "vincoli": [ "non e un intervento autonomo nel CT 3.0", "richiede selezione contestuale di III.A", "richiede pompa di calore elettrica pura", "non e trainabile da sistema ibrido gas + PDC", "richiede sostituzione impianto di climatizzazione invernale esistente" ],
        "vincoli_logici": {
            "richiede_uno_di": ["III.A"]
        },
        "interventi_collegati_obbligatori": [],
        "interventi_collegati_suggeriti": [ "II.F", "II.G" ],
        "documenti_richiesti": [ "schede tecniche moduli", "scheda inverter", "documentazione accumulo", "preventivo/fattura FV", "documentazione connessione", "verifica registro ENEA se si richiede premialita" ],
        "note_compilatore": "Se non e presente III.A con PDC elettrica, l'intervento va bloccato. Non promettere incentivo FV prima della verifica documentale.",
        "warning": [ "FV standalone non ammissibile", "FV con ibrido gas non ammissibile" ]
    },
    "II.G": {
        "nome": "Infrastrutture ricarica veicoli elettrici",
        "descrizione": "Installazione di punti di ricarica presso edificio, pertinenze o parcheggi adiacenti nei limiti previsti.",
        "lavorazioni_comprese": [ "fornitura wallbox o colonnina", "linea elettrica dedicata", "quadri/protezioni", "posa e configurazione", "eventuali opere accessorie strettamente necessarie" ],
        "lavorazioni_da_verificare": [ "potenza e tipologia punto ricarica", "collocazione presso edificio/pertinenze", "compatibilita con PDC elettrica" ],
        "vincoli": [ "richiede abbinamento a sostituzione impianto con pompa di calore elettrica" ],
        "vincoli_logici": {
            "richiede_uno_di": ["III.A"]
        },
        "interventi_collegati_obbligatori": [],
        "interventi_collegati_suggeriti": [ "II.H", "II.F" ],
        "documenti_richiesti": [ "scheda tecnica colonnina", "schema elettrico", "dichiarazione conformita", "fatture e bonifici" ],
        "note_compilatore": "Valutare come estensione del pacchetto full electric, non come intervento isolato.",
        "warning": []
    },
    "II.F": {
        "nome": "Building automation e gestione carichi",
        "descrizione": "Tecnologie di gestione e controllo automatico degli impianti termici ed elettrici, inclusa termoregolazione e contabilizzazione dove applicabile.",
        "lavorazioni_comprese": [ "sensori ambientali", "contatori e misuratori", "controller", "attuatori", "sistemi di monitoraggio e regolazione", "configurazione e collaudo" ],
        "lavorazioni_da_verificare": [ "classe/funzionalita del sistema", "integrazione con PDC, FV e accumulo", "componenti Made in EU se si richiede premialita" ],
        "vincoli": [ "verificare soggetto e ambito edificio", "documentare componenti e funzioni effettive" ],
        "interventi_collegati_obbligatori": [],
        "interventi_collegati_suggeriti": [ "III.A", "II.H", "II.G" ],
        "documenti_richiesti": [ "schede tecniche componenti", "schema funzionale", "relazione sistema di controllo", "fatture e bonifici" ],
        "note_compilatore": "Utile per aumentare qualita del progetto e gestione autoconsumo, ma non deve essere usato per mascherare un impianto non ammissibile.",
        "warning": []
    },
    "II.A": {
        "nome": "Isolamento termico superfici opache",
        "descrizione": "Interventi su coperture, pareti o pavimenti delimitanti il volume climatizzato.",
        "lavorazioni_comprese": [ "fornitura e posa materiali isolanti", "rasature e finiture connesse", "sistemi accessori di posa", "eventuale VMC se pertinente e ammessa", "opere strettamente necessarie" ],
        "lavorazioni_da_verificare": [ "trasmittanze ante/post", "APE/diagnosi", "superfici disperdenti", "abbinamento con PDC per intensita maggiore" ],
        "vincoli": [ "Titolo II non sempre ammesso per residenziale privato", "richiede edificio esistente climatizzato" ],
        "interventi_collegati_obbligatori": [],
        "interventi_collegati_suggeriti": [ "III.A", "II.F" ],
        "documenti_richiesti": [ "relazione tecnica", "stratigrafie", "APE/diagnosi se richiesta", "schede materiali", "foto ante/post", "fatture e bonifici" ],
        "note_compilatore": "Nei casi impresa verificare ambito terziario e riduzione energia primaria richiesta.",
        "warning": []
    },
    "II.B": {
        "nome": "Sostituzione chiusure trasparenti/infissi",
        "descrizione": "Sostituzione di infissi delimitanti il volume climatizzato con prestazioni conformi.",
        "lavorazioni_comprese": [ "rimozione infissi esistenti", "fornitura e posa nuovi infissi", "controtelai/accessori", "sigillature e finiture strettamente connesse" ],
        "lavorazioni_da_verificare": [ "trasmittanza infissi", "zona climatica", "superfici", "ambito soggetto" ],
        "vincoli": [ "intervento Titolo II", "verificare ammissibilita soggetto/ambito" ],
        "interventi_collegati_obbligatori": [],
        "interventi_collegati_suggeriti": [ "II.A", "II.C", "II.F" ],
        "documenti_richiesti": [ "scheda tecnica infissi", "marcatura CE", "foto ante/post", "fatture e bonifici" ],
        "note_compilatore": "Non proporre automaticamente a privato residenziale senza verifica del perimetro ammesso.",
        "warning": []
    },
    "III.E": {
        "nome": "Scaldacqua a pompa di calore",
        "descrizione": "Sostituzione di scaldacqua elettrico o a gas con scaldacqua a pompa di calore.",
        "lavorazioni_comprese": [ "rimozione scaldacqua esistente", "fornitura e posa nuovo scaldacqua PDC", "collegamenti idraulici/elettrici", "scarico condensa ove necessario", "avviamento" ],
        "lavorazioni_da_verificare": [ "tipo scaldacqua sostituito", "classe energetica", "capacita accumulo", "documenti prodotto" ],
        "vincoli": [ "richiede sostituzione di scaldacqua esistente" ],
        "interventi_collegati_obbligatori": [],
        "interventi_collegati_suggeriti": [ "II.H", "II.F" ],
        "documenti_richiesti": [ "scheda tecnica", "prova scaldacqua esistente", "foto ante/post", "fatture e bonifici" ],
        "note_compilatore": "Non confondere con PDC per climatizzazione invernale III.A.",
        "warning": []
    }
};

/**
 * Matrice di ammissibilità catastale.
 * Sorgente: data/categorie_catastali.json
 */
export const CATASTO = {
    "categorie": {
        "A/1": {"ambito": "residenziale", "ammissibile": true, "motivo": "Ammissibile salvo per privati."},
        "A/2": {"ambito": "residenziale", "ammissibile": true},
        "A/3": {"ambito": "residenziale", "ammissibile": true},
        "A/4": {"ambito": "residenziale", "ammissibile": true},
        "A/5": {"ambito": "residenziale", "ammissibile": true},
        "A/6": {"ambito": "residenziale", "ammissibile": true},
        "A/7": {"ambito": "residenziale", "ammissibile": true},
        "A/8": {"ambito": "escluso", "ammissibile": true, "motivo": "Ammissibile salvo per privati."},
        "A/9": {"ambito": "escluso", "ammissibile": true, "motivo": "Ammissibile salvo per privati."},
        "A/10": {"ambito": "terziario", "ammissibile": true},
        "A/11": {"ambito": "residenziale", "ammissibile": true},
        "B/1": {"ambito": "terziario", "ammissibile": true},
        "B/2": {"ambito": "terziario", "ammissibile": true},
        "B/3": {"ambito": "terziario", "ammissibile": true},
        "B/4": {"ambito": "terziario", "ammissibile": true},
        "B/5": {"ambito": "terziario", "ammissibile": true},
        "B/6": {"ambito": "terziario", "ammissibile": true},
        "B/7": {"ambito": "terziario", "ammissibile": true},
        "B/8": {"ambito": "terziario", "ammissibile": true},
        "C/1": {"ambito": "terziario", "ammissibile": true},
        "C/2": {"ambito": "terziario", "ammissibile": true},
        "C/3": {"ambito": "terziario", "ammissibile": true},
        "C/4": {"ambito": "terziario", "ammissibile": true},
        "C/5": {"ambito": "terziario", "ammissibile": true},
        "C/6": {"ambito": "da_verificare", "ammissibile": false, "motivo": "C/6 (Autorimesse) non ammesso come unità riscaldata autonoma."},
        "C/7": {"ambito": "da_verificare", "ammissibile": false, "motivo": "C/7 (Tettoie) non ammesso come unità riscaldata autonoma."},
        "D/1": {"ambito": "terziario", "ammissibile": true},
        "D/2": {"ambito": "terziario", "ammissibile": true},
        "D/3": {"ambito": "terziario", "ammissibile": true},
        "D/4": {"ambito": "terziario", "ammissibile": true},
        "D/5": {"ambito": "terziario", "ammissibile": true},
        "D/6": {"ambito": "terziario", "ammissibile": true},
        "D/7": {"ambito": "terziario", "ammissibile": true},
        "D/8": {"ambito": "terziario", "ammissibile": true},
        "D/9": {"ambito": "escluso", "ammissibile": false, "motivo": "Categoria D/9 esclusa."},
        "D/10": {"ambito": "terziario", "ammissibile": true},
        "E/1": {"ambito": "terziario", "ammissibile": true},
        "E/2": {"ambito": "escluso", "ammissibile": false},
        "E/3": {"ambito": "terziario", "ammissibile": true},
        "E/4": {"ambito": "escluso", "ammissibile": false},
        "E/5": {"ambito": "terziario", "ammissibile": true},
        "E/6": {"ambito": "escluso", "ammissibile": false},
        "E/7": {"ambito": "terziario", "ammissibile": true},
        "E/8": {"ambito": "terziario", "ammissibile": true},
        "E/9": {"ambito": "terziario", "ammissibile": true},
        "F/1": {"ambito": "escluso", "ammissibile": false, "motivo": "Categoria F (Area urbana) non ammessa."},
        "F/2": {"ambito": "escluso", "ammissibile": false, "motivo": "Categoria F/2 (Unità collabenti) richiede regolarizzazione."},
        "F/3": {"ambito": "escluso", "ammissibile": false, "motivo": "Categoria F/3 (In corso di costruzione) non ammessa."},
        "F/4": {"ambito": "escluso", "ammissibile": false, "motivo": "Categoria F/4 (In corso di definizione) non ammessa."},
        "F/5": {"ambito": "escluso", "ammissibile": false, "motivo": "Categoria F/5 (Lastrici solari) non ammessa."}
    },
    "gruppi": {
        "A": {"ambito_predefinito": "residenziale"},
        "B": {"ambito_predefinito": "terziario"},
        "C": {"ambito_predefinito": "terziario"},
        "D": {"ambito_predefinito": "terziario"},
        "E": {"ambito_predefinito": "terziario"},
        "F": {"ambito_predefinito": "escluso"}
    }
};

/**
 * Schemi tecnici degli incentivi (massimali e tipi calcolo).
 * Sorgente: data/incentivi/incentivi_schema.json
 */
export const INCENTIVI_SCHEMA = {
    "interventi": [
        { "codice_intervento": "II.A", "titolo": "Isolamento termico superfici opache", "nome": "Cappotto termico", "tipo_calcolo": "percentuale_spesa", "percentuale_base": 0.4, "percentuale_massima": 0.55, "massimale_spesa": 1000000.0, "massimale_incentivo": null, "costo_massimo_unitario": 200.0, "unita_misura": "mq", "formula_riferimento": "min(Spesa, Superficie * Cmax) * %", "fonte": "D.M. 7 agosto 2025", "note": [ "Variante Cmax in base a tipo parete" ], "stato_validatione": "validato_documentale", "parametri": [ { "nome": "superficie_isolata", "categoria": "formula", "obbligatorio": true, "tipo_dato": "number", "fonte_dato": "scheda_tecnica", "stato_validazione": "da_validare", "note": "" }, { "nome": "spesa_totale", "categoria": "economico", "obbligatorio": false, "tipo_dato": "number", "fonte_dato": "scheda_tecnica", "stato_validazione": "da_validare", "note": "" }, { "nome": "zona_climatica", "categoria": "formula", "obbligatorio": true, "tipo_dato": "string", "fonte_dato": "scheda_tecnica", "stato_validazione": "da_validare", "note": "" } ] },
        { "codice_intervento": "II.D", "titolo": "Trasformazione nZEB", "nome": "Edifici a energia quasi zero", "tipo_calcolo": "da_verificare", "percentuale_base": null, "percentuale_massima": null, "massimale_spesa": null, "massimale_incentivo": null, "costo_massimo_unitario": null, "unita_misura": "mq", "formula_riferimento": "da_verificare", "fonte": "D.M. 7 agosto 2025", "note": [ "Intervento complesso su intero edificio" ], "stato_validazione": "da_validare", "parametri": [ { "nome": "superficie_utile", "categoria": "formula", "obbligatorio": true, "tipo_dato": "number", "fonte_dato": "scheda_tecnica", "stato_validazione": "da_validare", "note": "" }, { "nome": "spesa_totale", "categoria": "economico", "obbligatorio": false, "tipo_dato": "number", "fonte_dato": "scheda_tecnica", "stato_validazione": "da_validare", "note": "" }, { "nome": "attestazione_nzeb", "categoria": "ammissibilita", "obbligatorio": true, "tipo_dato": "string", "fonte_dato": "scheda_tecnica", "stato_validazione": "da_validare", "note": "" } ] },
        { "codice_intervento": "II.F", "titolo": "Building Automation", "nome": "Sistemi di automazione e controllo", "tipo_calcolo": "percentuale_spesa", "percentuale_base": 0.4, "percentuale_massima": 0.4, "massimale_spesa": 50000.0, "massimale_incentivo": null, "costo_massimo_unitario": 50.0, "unita_misura": "mq", "formula_riferimento": "min(Spesa, Superficie * Cmax) * %", "fonte": "D.M. 7 agosto 2025", "note": [ "Classe B secondo EN 15232" ], "stato_validazione": "da_validare", "parametri": [ { "nome": "superficie_asservita", "categoria": "formula", "obbligatorio": true, "tipo_dato": "number", "fonte_dato": "scheda_tecnica", "stato_validazione": "da_validare", "note": "" }, { "nome": "spesa_totale", "categoria": "economico", "obbligatorio": false, "tipo_dato": "number", "fonte_dato": "scheda_tecnica", "stato_validazione": "da_validare", "note": "" } ] },
        { "codice_intervento": "II.G", "titolo": "Infrastrutture ricarica veicoli elettrici", "nome": "Colonnine ricarica", "tipo_calcolo": "percentuale_spesa", "percentuale_base": 0.3, "percentuale_massima": 0.3, "massimale_spesa": null, "massimale_incentivo": null, "costo_massimo_unitario": null, "unita_misura": "n_punti", "formula_riferimento": "min(Spesa, Cmax_fisso + Potenza * Cmax_kw) * %", "fonte": "D.M. 7 agosto 2025", "note": [ "Richiede III.A elettrica" ], "stato_validazione": "parziale", "parametri": [ { "nome": "numero_punti_ricarica", "categoria": "formula", "obbligatorio": true, "tipo_dato": "number", "fonte_dato": "scheda_tecnica", "stato_validazione": "da_validare", "note": "" }, { "nome": "tipo_monofase_trifase", "categoria": "formula", "obbligatorio": true, "tipo_dato": "string", "fonte_dato": "scheda_tecnica", "stato_validazione": "da_validare", "note": "" }, { "nome": "potenza_kw", "categoria": "formula", "obbligatorio": true, "tipo_dato": "number", "fonte_dato": "scheda_tecnica", "stato_validazione": "da_validare", "note": "" }, { "nome": "spesa_totale", "categoria": "economico", "obbligatorio": false, "tipo_dato": "number", "fonte_dato": "scheda_tecnica", "stato_validazione": "da_validare", "note": "" } ] },
        { "codice_intervento": "II.H", "titolo": "Fotovoltaico + Accumulo", "nome": "Fotovoltaico trainato", "tipo_calcolo": "percentuale_spesa", "percentuale_base": 0.2, "percentuale_massima": 0.35, "massimale_spesa": null, "massimale_incentivo": null, "costo_massimo_unitario": 1500.0, "unita_misura": "kW", "formula_riferimento": "Potenza * Cmax_scaglione * %", "fonte": "D.M. 7 agosto 2025", "note": [ "Richiede III.A elettrica pura e sostituzione integrale" ], "stato_validazione": "validato_documentale", "parametri": [ { "nome": "potenza_picco_kW", "categoria": "formula", "obbligatorio": true, "tipo_dato": "number", "fonte_dato": "scheda_tecnica", "stato_validazione": "da_validare", "note": "" }, { "nome": "numero_moduli", "categoria": "documentazione", "obbligatorio": false, "tipo_dato": "number", "fonte_dato": "scheda_tecnica", "stato_validazione": "da_validare", "note": "" }, { "nome": "marca_moduli", "categoria": "documentazione", "obbligatorio": false, "tipo_dato": "string", "fonte_dato": "scheda_tecnica", "stato_validazione": "da_validare", "note": "" }, { "nome": "modello_moduli", "categoria": "documentazione", "obbligatorio": false, "tipo_dato": "string", "fonte_dato": "scheda_tecnica", "stato_validazione": "da_validare", "note": "" }, { "nome": "iscritti_enea", "categoria": "premialita", "obbligatorio": false, "tipo_dato": "string", "fonte_dato": "scheda_tecnica", "stato_validazione": "da_validare", "note": "" }, { "nome": "sezione_enea", "categoria": "premialita", "obbligatorio": false, "tipo_dato": "string", "fonte_dato": "scheda_tecnica", "stato_validazione": "da_validare", "note": "" }, { "nome": "produzione_ue", "categoria": "premialita", "obbligatorio": false, "tipo_dato": "string", "fonte_dato": "scheda_tecnica", "stato_validazione": "da_validare", "note": "" }, { "nome": "accumulo_presente", "categoria": "ammissibilita", "obbligatorio": true, "tipo_dato": "string", "fonte_dato": "scheda_tecnica", "stato_validazione": "da_validare", "note": "" }, { "nome": "capacita_accumulo_kWh", "categoria": "formula", "obbligatorio": true, "tipo_dato": "number", "fonte_dato": "scheda_tecnica", "stato_validazione": "da_validare", "note": "" }, { "nome": "costo_fv", "categoria": "economico", "obbligatorio": false, "tipo_dato": "number", "fonte_dato": "scheda_tecnica", "stato_validazione": "da_validare", "note": "" }, { "nome": "costo_accumulo", "categoria": "economico", "obbligatorio": false, "tipo_dato": "number", "fonte_dato": "scheda_tecnica", "stato_validazione": "da_validare", "note": "" }, { "nome": "connessione_pertinenze", "categoria": "ammissibilita", "obbligatorio": true, "tipo_dato": "string", "fonte_dato": "scheda_tecnica", "stato_validazione": "da_validare", "note": "" }, { "nome": "abbinato_pdc_elettrica", "categoria": "ammissibilita", "obbligatorio": true, "tipo_dato": "string", "fonte_dato": "scheda_tecnica", "stato_validazione": "da_validare", "note": "" }, { "nome": "documentazione_disponibile", "categoria": "documentazione", "obbligatorio": false, "tipo_dato": "string", "fonte_dato": "scheda_tecnica", "stato_validazione": "da_validare", "note": "" }, { "nome": "preventivo_disponibile", "categoria": "documentazione", "obbligatorio": false, "tipo_dato": "string", "fonte_dato": "scheda_tecnica", "stato_validazione": "da_validare", "note": "" } ] },
        { "codice_intervento": "III.A", "titolo": "Pompa di calore elettrica", "nome": "Sostituzione con PDC", "tipo_calcolo": "formula_prestazionale", "percentuale_base": 0.65, "percentuale_massima": 0.65, "massimale_spesa": null, "massimale_incentivo": null, "costo_massimo_unitario": null, "unita_measure": "kW", "formula_riferimento": "Pn * Ci * Quf", "fonte": "D.M. 7 agosto 2025", "note": [ "Quf dipendente da zona climatica" ], "stato_validazione": "validato_documentale", "parametri": [ { "nome": "marca", "categoria": "documentazione", "obbligatorio": false, "tipo_dato": "string", "fonte_dato": "scheda_tecnica", "stato_validazione": "da_validare", "note": "" }, { "nome": "modello", "categoria": "documentazione", "obbligatorio": false, "tipo_dato": "string", "fonte_dato": "scheda_tecnica", "stato_validazione": "da_validare", "note": "" }, { "nome": "tipologia_pdc", "categoria": "formula", "obbligatorio": true, "tipo_dato": "string", "fonte_dato": "scheda_tecnica", "stato_validazione": "da_validare", "note": "" }, { "nome": "is_elettrica", "categoria": "ammissibilita", "obbligatorio": true, "tipo_dato": "string", "fonte_dato": "scheda_tecnica", "stato_validazione": "da_validare", "note": "" }, { "nome": "potenza_termica_nominale", "categoria": "formula", "obbligatorio": true, "tipo_dato": "number", "fonte_dato": "scheda_tecnica", "stato_validazione": "da_validare", "note": "" }, { "nome": "potenza_elettrica_assorbita", "categoria": "formula", "obbligatorio": true, "tipo_dato": "number", "fonte_dato": "scheda_tecnica", "stato_validazione": "da_validare", "note": "" }, { "nome": "cop", "categoria": "formula", "obbligatorio": true, "tipo_dato": "number", "fonte_dato": "scheda_tecnica", "stato_validazione": "da_validare", "note": "" }, { "nome": "sorgente_energetica", "categoria": "formula", "obbligatorio": true, "tipo_dato": "string", "fonte_dato": "scheda_tecnica", "stato_validazione": "da_validare", "note": "" }, { "nome": "servizio", "categoria": "formula", "obbligatorio": true, "tipo_dato": "string", "fonte_dato": "scheda_tecnica", "stato_validazione": "da_validare", "note": "" }, { "nome": "sostituisce_esistente", "categoria": "ammissibilita", "obbligatorio": true, "tipo_dato": "string", "fonte_dato": "scheda_tecnica", "stato_validazione": "da_validare", "note": "" }, { "nome": "documentazione_disponibile", "categoria": "documentazione", "obbligatorio": false, "tipo_dato": "string", "fonte_dato": "scheda_tecnica", "stato_validazione": "da_validare", "note": "" }, { "nome": "scheda_prodotto", "categoria": "documentazione", "obbligatorio": false, "tipo_dato": "string", "fonte_dato": "scheda_tecnica", "stato_validazione": "da_validare", "note": "" }, { "nome": "certificazione_prestazionale", "categoria": "documentazione", "obbligatorio": false, "tipo_dato": "string", "fonte_dato": "scheda_tecnica", "stato_validazione": "da_validare", "note": "" }, { "nome": "zona_climatica", "categoria": "formula", "obbligatorio": true, "tipo_dato": "string", "fonte_dato": "scheda_tecnica", "stato_validazione": "da_validare", "note": "" }, { "nome": "coefficiente_Ci", "categoria": "formula", "obbligatorio": true, "tipo_dato": "number", "fonte_dato": "scheda_tecnica", "stato_validazione": "da_validare", "note": "" } ] },
        { "codice_intervento": "III.B", "titolo": "Sistemi ibridi / bivalenti / add-on", "nome": "Ibrido gas + PDC", "tipo_calcolo": "formula_prestazionale", "percentuale_base": 0.65, "percentuale_massima": 0.65, "massimale_spesa": null, "massimale_incentivo": null, "costo_massimo_unitario": null, "unita_measure": "kW", "formula_riferimento": "Pn * Ci * Quf", "fonte": "D.M. 7 agosto 2025", "note": [ "Non traina II.H" ], "stato_validazione": "parziale", "parametri": [ { "nome": "potenza_nominale_Pn_pdc", "categoria": "formula", "obbligatorio": true, "tipo_dato": "number", "fonte_dato": "scheda_tecnica", "stato_validazione": "da_validare", "note": "" }, { "nome": "zona_climatica", "categoria": "formula", "obbligatorio": true, "tipo_dato": "string", "fonte_dato": "scheda_tecnica", "stato_validazione": "da_validare", "note": "" }, { "nome": "coefficiente_Ci", "categoria": "formula", "obbligatorio": true, "tipo_dato": "number", "fonte_dato": "scheda_tecnica", "stato_validazione": "da_validare", "note": "" }, { "nome": "spesa_totale", "categoria": "economico", "obbligatorio": false, "tipo_dato": "number", "fonte_dato": "scheda_tecnica", "stato_validazione": "da_validare", "note": "" } ] },
        { "codice_intervento": "III.E", "titolo": "Scaldacqua a pompa di calore", "nome": "PDC per ACS", "tipo_calcolo": "percentuale_spesa", "percentuale_base": 0.4, "percentuale_massima": 0.4, "massimale_spesa": null, "massimale_incentivo": 1500.0, "costo_massimo_unitario": null, "unita_measure": "litri", "formula_riferimento": "Incentivo_fisso * %", "fonte": "D.M. 7 agosto 2025", "note": [ "Importi fissi per scaglioni litri" ], "stato_validazione": "validato_documentale", "parametri": [ { "nome": "capacita_litri", "categoria": "formula", "obbligatorio": true, "tipo_dato": "number", "fonte_dato": "scheda_tecnica", "stato_validazione": "da_validare", "note": "" }, { "nome": "classe_energetica", "categoria": "ammissibilita", "obbligatorio": true, "tipo_dato": "string", "fonte_dato": "scheda_tecnica", "stato_validazione": "da_validare", "note": "" }, { "nome": "spesa_totale", "categoria": "economico", "obbligatorio": false, "tipo_dato": "number", "fonte_dato": "scheda_tecnica", "stato_validazione": "da_validare", "note": "" } ] }
    ]
};

/**
 * Definizioni dei campi di input per le schede tecniche.
 * Sorgente: data/schede_tecniche_interventi.json
 */
export const SCHEDE_TECNICHE = {
    "II.A": {
        "nome": "Isolamento termico superfici opache",
        "descrizione": "Raccolta dati per interventi su coperture, pareti e pavimenti disperdenti.",
        "campi": [
            { "id": "tipo_superficie_opaca", "label": "Tipo superficie", "tipo": "select", "opzioni": ["Parete Esterna", "Parete Interna", "Parete Ventilata", "Coperture Esterno", "Coperture Interno", "Coperture Ventilata", "Pavimenti Esterno", "Pavimenti Interno", "da verificare"], "obbligatorio": true, "unita": "", "categoria": "ammissibilita", "fonte_dato": "rilievo/progetto", "note": "Fondamentale per Cmax." },
            { "id": "superficie_isolata_mq", "label": "Superficie isolata", "tipo": "number", "obbligatorio": true, "unita": "mq", "min": 1, "max": 50000, "categoria": "formula", "fonte_dato": "computo/rilievo", "note": "Dato per calcolo massimale." },
            { "id": "trasmittanza_ante", "label": "Trasmittanza ante operam", "tipo": "number", "obbligatorio": true, "unita": "W/m²K", "min": 0.1, "max": 5.0, "categoria": "ammissibilita", "fonte_dato": "relazione tecnica/stratigrafia", "note": "Verifica miglioramento." },
            { "id": "trasmittanza_post", "label": "Trasmittanza post operam", "tipo": "number", "obbligatorio": true, "unita": "W/m²K", "min": 0.01, "max": 0.5, "categoria": "formula", "fonte_dato": "relazione tecnica/progetto", "note": "Verifica rispetto limiti zona." },
            { "id": "costo_isolamento", "label": "Costo totale isolamento", "tipo": "number", "obbligatorio": true, "unita": "€", "min": 1, "max": 5000000, "categoria": "economico", "fonte_dato": "preventivo/fattura", "note": "Dato economico." },
            { "id": "ape_ante_post_disponibile", "label": "APE ante/post disponibile", "tipo": "select", "opzioni": ["sì", "no", "da verificare"], "obbligatorio": false, "unita": "", "categoria": "documentazione", "fonte_dato": "documentazione tecnica", "note": "Da verificare in base a soggetto/intervento." }
        ]
    },
    "II.B": {
        "nome": "Sostituzione chiusure trasparenti / infissi",
        "descrizione": "Raccolta dati tecnici per serramenti, surfaces trasparenti e prestazioni termiche ante/post operam.",
        "campi": [
            { "id": "tipologia_serramento", "label": "Tipologia serramento", "tipo": "select", "opzioni": ["finestra", "porta-finestra", "vetrina", "lucernario", "altro", "da verificare"], "obbligatorio": true, "unita": "", "categoria": "descrittivo", "fonte_dato": "rilievo/progetto", "note": "Tipologia prevalente." },
            { "id": "superficie_infissi_mq", "label": "Superficie totale infissi", "tipo": "number", "obbligatorio": true, "unita": "mq", "min": 0.5, "max": 5000, "categoria": "formula", "fonte_dato": "computo/rilievo", "note": "Superficie oggetto di sostituzione." },
            { "id": "trasmittanza_infissi_ante", "label": "Trasmittanza ante operam", "tipo": "number", "obbligatorio": true, "unita": "W/m²K", "min": 0.5, "max": 7.0, "categoria": "formula", "fonte_dato": "documentazione/relazione", "note": "Dato ante operam." },
            { "id": "trasmittanza_infissi_post", "label": "Trasmittanza post operam", "tipo": "number", "obbligatorio": true, "unita": "W/m²K", "min": 0.5, "max": 2.5, "categoria": "formula", "fonte_dato": "scheda tecnica", "note": "Dato post operam." },
            { "id": "costo_infissi", "label": "Costo intervento infissi", "tipo": "number", "obbligatorio": true, "unita": "€", "min": 1, "max": 1000000, "categoria": "economico", "fonte_dato": "preventivo/fattura", "note": "Dato economico." }
        ]
    },
    "II.G": {
        "nome": "Infrastrutture ricarica veicoli elettrici",
        "descrizione": "Raccolta dati per colonnine/punti di ricarica abbinati a sostituzione con PDC elettrica.",
        "campi": [
            { "id": "numero_punti_ricarica", "label": "Numero punti ricarica", "tipo": "number", "obbligatorio": true, "unita": "n", "min": 1, "max": 50, "categoria": "formula", "fonte_dato": "progetto/preventivo", "note": "Quantità impianto." },
            { "id": "potenza_ricarica_kw", "label": "Potenza punto ricarica", "tipo": "number", "obbligatorio": true, "unita": "kW", "min": 7.4, "max": 350, "categoria": "formula", "fonte_dato": "scheda tecnica", "note": "Minimo 7.4 kW." },
            { "id": "tipo_ricarica", "label": "Tipo ricarica", "tipo": "select", "opzioni": ["Punto ricarica Monofase", "Punto ricarica Trifase", "Potenza > 22 kW"], "obbligatorio": true, "unita": "", "categoria": "descrittivo", "fonte_dato": "scheda tecnica", "note": "Variante per Cmax." },
            { "id": "is_smart", "label": "Dispositivo Smart", "tipo": "select", "opzioni": ["sì", "no"], "obbligatorio": true, "unita": "", "categoria": "ammissibilita", "fonte_dato": "scheda tecnica", "note": "Obbligatorio per CT 3.0." },
            { "id": "modo_ricarica", "label": "Modo di ricarica", "tipo": "select", "opzioni": ["modo 3", "modo 4"], "obbligatorio": true, "unita": "", "categoria": "ammissibilita", "fonte_dato": "scheda tecnica", "note": "Obbligatorio Modo 3 o 4." },
            { "id": "costo_colonnina", "label": "Costo infrastruttura ricarica", "tipo": "number", "obbligatorio": true, "unita": "€", "min": 1, "max": 200000, "categoria": "economico", "fonte_dato": "preventivo/fattura", "note": "Dato economico." }
        ]
    },
    "II.H": {
        "nome": "Fotovoltaico + accumulo",
        "descrizione": "Raccolta dati FV/accumulo. Richiede abbinamento con PDC elettrica.",
        "campi": [
            { "id": "potenza_fv_kw", "label": "Potenza FV", "tipo": "number", "obbligatorio": true, "unita": "kWp", "min": 1, "max": 1000, "categoria": "formula", "fonte_dato": "progetto/preventivo", "note": "Potenza di picco." },
            { "id": "is_autoconsumo", "label": "Regime Autoconsumo", "tipo": "select", "opzioni": ["sì", "no"], "obbligatorio": true, "unita": "", "categoria": "ammissibilita", "fonte_dato": "dichiarazione", "note": "Obbligatorio per incentivo." },
            { "id": "made_in_eu", "label": "Moduli Made in EU", "tipo": "select", "opzioni": ["sì", "no"], "obbligatorio": false, "unita": "", "categoria": "premialita", "fonte_dato": "certificato", "note": "Bonus +5%." },
            { "id": "registro_enea", "label": "Iscritto Registro ENEA", "tipo": "select", "opzioni": ["sì", "no"], "obbligatorio": false, "unita": "", "categoria": "premialita", "fonte_dato": "registro ENEA", "note": "Bonus variabile." },
            { "id": "ue_production", "label": "Produzione in UE", "tipo": "select", "opzioni": ["sì", "no"], "obbligatorio": false, "unita": "", "categoria": "premialita", "fonte_dato": "certificato", "note": "Bonus +10%." },
            { "id": "same_section", "label": "Stessa Sezione Registro", "tipo": "select", "opzioni": ["sì", "no"], "obbligatorio": false, "unita": "", "categoria": "premialita", "fonte_dato": "certificato", "note": "Bonus +15%." },
            { "id": "accumulo_presente", "label": "Accumulo presente", "tipo": "select", "opzioni": ["sì", "no"], "obbligatorio": false, "unita": "", "categoria": "ammissibilita", "fonte_dato": "progetto", "note": "Dato per configurazione." },
            { "id": "capacita_accumulo_kwh", "label": "Capacità accumulo", "tipo": "number", "obbligatorio": false, "unita": "kWh", "min": 1, "max": 2000, "categoria": "formula", "fonte_dato": "scheda tecnica", "note": "Capacità nominale." },
            { "id": "costo_fv", "label": "Costo FV + Accumulo", "tipo": "number", "obbligatorio": true, "unita": "€", "min": 1, "max": 3000000, "categoria": "economico", "fonte_dato": "preventivo/fattura", "note": "Dato economico." }
        ]
    },
    "III.A": {
        "nome": "Pompe di calore",
        "descrizione": "Raccolta dati tecnici PDC per calcolo Ei.",
        "campi": [
            { "id": "tipologia_pdc", "label": "Tipologia PDC", "tipo": "select", "opzioni": ["aria/aria", "aria/acqua", "acqua/acqua", "salamoia/acqua"], "obbligatorio": true, "unita": "", "categoria": "ammissibilita", "fonte_dato": "scheda tecnica", "note": "Sorgente/Utenza." },
            { "id": "potenza_pdc_kw", "label": "Potenza termica nominale (Prated)", "tipo": "number", "obbligatorio": true, "unita": "kW", "min": 1, "max": 2000, "categoria": "formula", "fonte_dato": "scheda tecnica", "note": "Prated." },
            { "id": "scop", "label": "SCOP", "tipo": "number", "obbligatorio": true, "unita": "", "min": 2.0, "max": 10.0, "categoria": "formula", "fonte_dato": "scheda tecnica", "note": "Efficienza stagionale." },
            { "id": "eta_s", "label": "Efficienza stagionale (ηs)", "tipo": "number", "obbligatorio": true, "unita": "%", "min": 110, "max": 500, "categoria": "formula", "fonte_dato": "scheda tecnica", "note": "ηs per calcolo kp." },
            { "id": "made_in_eu", "label": "PDC Made in EU", "tipo": "select", "opzioni": ["sì", "no"], "obbligatorio": false, "unita": "", "categoria": "premialita", "fonte_dato": "certificato", "note": "Bonus +5%." },
            { "id": "costo_pdc", "label": "Costo totale intervento PDC", "tipo": "number", "obbligatorio": true, "unita": "€", "min": 1, "max": 3000000, "categoria": "economico", "fonte_dato": "preventivo/fattura", "note": "Dato economico." }
        ]
    },
    "III.G": {
        "nome": "Microcogenerazione",
        "descrizione": "Raccolta dati per microcogeneratori da fonti rinnovabili.",
        "campi": [
            { "id": "potenza_elettrica", "label": "Potenza elettrica nominale", "tipo": "number", "obbligatorio": true, "unita": "kWe", "min": 1, "max": 50, "categoria": "formula", "fonte_dato": "scheda tecnica", "note": "Massimo 50 kWe." },
            { "id": "pes", "label": "Risparmio Energia Primaria (PES)", "tipo": "number", "obbligatorio": true, "unita": "%", "min": 10, "max": 100, "categoria": "formula", "fonte_dato": "asseverazione", "note": "Minimo 10%." },
            { "id": "tipo_alimentazione", "label": "Fonte di alimentazione", "tipo": "select", "opzioni": ["Biomassa", "Biogas", "Altro"], "obbligatorio": true, "unita": "", "categoria": "descrittivo", "fonte_dato": "progetto", "note": "Fonte rinnovabile." },
            { "id": "costo_intervento", "label": "Costo totale microcogenerazione", "tipo": "number", "obbligatorio": true, "unita": "€", "min": 1, "max": 1000000, "categoria": "economico", "fonte_dato": "preventivo/fattura", "note": "Dato economico." }
        ]
    }
};

/**
 * Livelli di affidabilità delle fonti dato.
 * Sorgente: data/validazione_fonti.json
 */
export const VALIDAZIONE_FONTI = {
    "livelli_affidabilita": {
        "dichiarato_cliente": { "peso": 1, "descrizione": "Dato dichiarato verbalmente o non supportato da documento" },
        "documento_non_verificato": { "peso": 2, "descrizione": "Documento presente ma non ancora controllato" },
        "verificato_documentale": { "peso": 3, "descrizione": "Dato verificato su documento tecnico coerente" },
        "certificato": { "peso": 4, "descrizione": "Dato derivato da certificazione, scheda ufficiale o documento tecnico valido" }
    }
};

// #TODO: Non ancora utilizzato
/**
 * Elenco delle classi energetiche con descrizioni sintetiche.
 */
export const CLASSI_ENERGETICHE = {
    "A4": { "descrizione": "Altissime prestazioni (NZEB)" },
    "A3": { "descrizione": "Altissime prestazioni" },
    "A2": { "descrizione": "Altissime prestazioni" },
    "A1": { "descrizione": "Altissime prestazioni" },
    "A":  { "descrizione": "Ottime prestazioni" },
    "B":  { "descrizione": "Ottime prestazioni" },
    "C":  { "descrizione": "Buone prestazioni" },
    "D":  { "descrizione": "Prestazioni medie" },
    "E":  { "descrizione": "Prestazioni basse" },
    "F":  { "descrizione": "Alte dispersioni" },
    "G":  { "descrizione": "Prestazioni minime (Consumo elevato)" }
};

/**
 * Registro e validatore delle formule di calcolo.
 * Sorgente: data/formule_incentivo.json
 */
export const FORMULE_INCENTIVO = {
    "III.A": { 
        "nome": "Pompe di calore", 
        "formula_status": "validato_tecnico", 
        "tipo_formula": "prestazionale", 
        "attiva": true, 
        "formula_base": "k * Ei * Ci",
        "variabili": [
            { "codice": "kp", "espressione": "eta_s / eta_s_min_ecodesign", "descrizione": "Coefficiente di premialità" },
            { "codice": "Qu", "espressione": "Prated * Quf", "descrizione": "Calore totale prodotto stimato" },
            { "codice": "Ei", "espressione": "Qu * (1 - 1/SCOP) * kp", "descrizione": "Energia termica incentivata" },
            { "codice": "k", "descrizione": "Coefficiente di utilizzo per sistemi ibridi/bivalenti", "valore_default": 1.0 }
        ],
        "richiede": ["potenza_pdc_kw", "tipologia_pdc", "scop", "eta_s"], 
        "mappatura_dati": {
            "Prated": "potenza_pdc_kw",
            "SCOP": "scop",
            "eta_s": "eta_s"
        },
        "blocchi": [], 
        "versione_normativa": "CT3_DM_2025", 
        "fonte": "normativa", 
        "note": ["Algoritmo Ei basato su Allegato 2"] 
    },
    "II.A": { 
        "nome": "Isolamento termico superfici opache", 
        "formula_status": "validato_tecnico", 
        "tipo_formula": "percentuale_spesa", 
        "attiva": true, 
        "formula_base": "min(spesa, superficie * cmax) * percentuale",
        "richiede": ["superficie_isolata_mq", "costo_isolamento", "tipo_superficie_opaca"], 
        "mappatura_dati": {
            "spesa": "costo_isolamento",
            "superficie": "superficie_isolata_mq"
        },
        "blocchi": [], 
        "versione_normativa": "CT3_DM_2025", 
        "fonte": "normativa", 
        "note": ["Formula validata per calcolo preliminare"] 
    },
    "II.G": { 
        "nome": "Infrastrutture ricarica veicoli elettrici", 
        "formula_status": "validato_tecnico", 
        "tipo_formula": "percentuale_spesa", 
        "attiva": true, 
        "formula_base": "min(spesa, (n_punti * cmax_fisso) + (max(0, potenza - 22) * cmax_kw)) * percentuale",
        "richiede": ["costo_colonnina", "numero_punti_ricarica", "potenza_ricarica_kw"], 
        "mappatura_dati": {
            "spesa": "costo_colonnina",
            "n_punti": "numero_punti_ricarica",
            "potenza": "potenza_ricarica_kw"
        },
        "blocchi": [], 
        "versione_normativa": "CT3_DM_2025", 
        "fonte": "normativa", 
        "note": ["Formula validata"] 
    },
    "III.G": {
        "nome": "Microcogenerazione",
        "formula_status": "validato_tecnico",
        "tipo_formula": "percentuale_spesa",
        "attiva": true,
        "formula_base": "spesa * percentuale",
        "richiede": ["costo_intervento", "potenza_elettrica", "pes"],
        "mappatura_dati": {
            "spesa": "costo_intervento"
        },
        "vincoli": [
            { "campo": "potenza_elettrica", "max": 50 },
            { "campo": "pes", "min": 10 }
        ],
        "versione_normativa": "CT3_DM_2025",
        "fonte": "normativa",
        "note": ["Calcolo su spesa sostenuta con limiti PES/Potenza"]
    }
};

// #TODO: Non ancora utilizzato
/**
 * Voci di catalogo suggerite per il preventivo.
 * Sorgente: data/preventivo_voci_catalogo.json
 */
export const PREVENTIVO_VOCI = {
    "III.A": { "nome": "Pompa di calore", "voci_suggerite": [ { "descrizione": "Fornitura pompa di calore", "tipo_costo": "fornitura" }, { "descrizione": "Posa e collegamenti idraulici/elettrici", "tipo_costo": "posa" }, { "descrizione": "Rimozione/dismissione generatore esistente", "tipo_costo": "opere_accessorie" }, { "descrizione": "Avviamento, collaudo e dichiarazione conformità", "tipo_costo": "documentazione" } ] },
    "II.H": { "nome": "Fotovoltaico e accumulo", "voci_suggerite": [ { "descrizione": "Fornitura moduli fotovoltaici", "tipo_costo": "fornitura" }, { "descrizione": "Inverter, quadri, cablaggi e protezioni", "tipo_costo": "fornitura" }, { "descrizione": "Sistema di accumulo", "tipo_costo": "fornitura" }, { "descrizione": "Posa, fissaggi e opere di connessione", "tipo_costo": "posa" }, { "descrizione": "Pratiche di connessione e documentazione impianto", "tipo_costo": "pratiche" } ] },
    "II.A": { "nome": "Isolamento termico", "voci_suggerite": [ { "descrizione": "Materiale isolante", "tipo_costo": "fornitura" }, { "descrizione": "Posa sistema isolante", "tipo_costo": "posa" }, { "descrizione": "Opere accessorie e ponteggi", "tipo_costo": "opere_accessorie" }, { "descrizione": "Relazione tecnica e asseverazioni", "tipo_costo": "documentazione" } ] },
    "II.B": { "nome": "Infissi", "voci_suggerite": [ { "descrizione": "Fornitura serramenti", "tipo_costo": "fornitura" }, { "descrizione": "Smontaggio infissi esistenti", "tipo_costo": "opere_accessorie" }, { "descrizione": "Posa nuovi serramenti", "tipo_costo": "posa" }, { "descrizione": "Schede tecniche, marcatura CE e dichiarazioni", "tipo_costo": "documentazione" } ] },
    "II.F": { "nome": "Building automation", "voci_suggerite": [ { "descrizione": "Sensori, controller e dispositivi attuatori", "tipo_costo": "fornitura" }, { "descrizione": "Installazione e configurazione sistema", "tipo_costo": "posa" }, { "descrizione": "Collaudo e documentazione tecnica", "tipo_costo": "documentazione" } ] },
    "II.G": { "nome": "Infrastrutture ricarica veicoli elettrici", "voci_suggerite": [ { "descrizione": "Fornitura infrastruttura di ricarica", "tipo_costo": "fornitura" }, { "descrizione": "Adeguamento elettrico e posa", "tipo_costo": "posa" }, { "descrizione": "Dichiarazioni e documentazione tecnica", "tipo_costo": "documentazione" } ] }
};

// #TODO: Non ancora utilizzato
/**
 * Casi prova manuali guidati per validazione.
 * Sorgente: data/manual_test_scenarios.json
 */
export const TEST_SCENARIOS = {
    "versione": "CT30_TASK26_manual_scenarios",
    "descrizione": "Casi prova manuali guidati per validare i blocchi critici e i percorsi principali dell'app CT 3.0.",
    "criteri_generali": [ "I casi con blocco non devono produrre esito positivo.", "Il report cliente non deve mostrare importi incentivo se formule o dati non sono validati.", "Il report interno può mostrare solo bozza interna con watermark quando ammesso dal firewall economico.", "Ogni caso deve generare audit/log se l'analisi viene completata." ],
    "scenari": [
        { "id": "MS-001", "nome": "Privato residenziale con FV senza PDC", "obiettivo": "Verificare il blocco rigido dell'intervento II.H quando manca III.A.", "input": { "soggetto": "Privato residenziale", "categoria_catastale": "A/2", "ambito": "Residenziale", "edificio_esistente": true, "accatastato": true, "impianto_climatizzazione_esistente": true, "interventi": [ "II.H" ], "post_operam": { "pdc_elettrica_pura": false, "rimane_gas": false } }, "atteso": { "esito": "non_ammissibile_o_blocco_intervento", "rischio": "alto", "blocchi_attesi": [ "II.H senza III.A", "FV non incentivabile senza PDC elettrica" ], "report_cliente_numeri": false } },
        { "id": "MS-002", "nome": "Privato residenziale con FV + PDC elettrica pura", "obiettivo": "Verificare compatibilità preliminare II.H + III.A in caso full electric coerente.", "input": { "soggetto": "Privato residenziale", "categoria_catastale": "A/2", "ambito": "Residenziale", "edificio_esistente": true, "accatastato": true, "impianto_climatizzazione_esistente": true, "interventi": [ "III.A", "II.H" ], "post_operam": { "pdc_elettrica_pura": true, "tipo_nuovo_generatore": "pompa di calore elettrica", "rimane_gas": false, "dismesso_esistente": "sì", "sostituzione_integrale_post": "sì", "serve_clima_invernale": true } }, "atteso": { "esito": "ammissibile_preliminare_o_da_verificare", "rischio_massimo_accettabile": "medio", "blocchi_attesi": [], "report_cliente_numeri": false } },
        { "id": "MS-003", "nome": "FV + sistema ibrido gas/PDC", "obiettivo": "Verificare blocco II.H quando il traino è un sistema ibrido gas.", "input": { "soggetto": "Privato residenziale", "categoria_catastale": "A/2", "ambito": "Residenziale", "edificio_esistente": true, "accatastato": true, "impianto_climatizzazione_esistente": true, "interventi": [ "III.B", "II.H" ], "post_operam": { "tipo_nuovo_generatore": "sistema ibrido factory made gas + PDC", "pdc_elettrica_pura": false, "rimane_gas": true } }, "atteso": { "esito": "non_ammissibile_o_blocco_intervento", "rischio": "alto", "blocchi_attesi": [ "FV non trainabile da sistema ibrido gas" ], "report_cliente_numeri": false } },
        { "id": "MS-004", "nome": "Impresa terziario con richiesta preliminare prima dell'ordine", "obiettivo": "Verificare corretto percorso per impresa con effetto incentivante rispettato.", "input": { "soggetto": "Impresa", "categoria_catastale": "D/7", "ambito": "Terziario", "edificio_esistente": true, "accatastato": true, "impianto_climatizzazione_esistente": true, "interventi": [ "III.A" ], "stato_lavori": { "preliminare_inviata": "sì", "data_preliminare": "2026-01-10", "data_ordine": "2026-01-20" } }, "atteso": { "esito": "ammissibile_preliminare_o_da_verificare", "rischio_massimo_accettabile": "medio", "blocchi_attesi": [] } }
    ]
};
