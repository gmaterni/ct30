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
        "bonus_perc": 0.10,
        "applicabile_a": ["II."],
        "campo_attivazione": "made_in_eu",
        "note": "+10% su Titolo II"
    },
    "registro_enea_fv": {
        "label": "Registro ENEA (FV)",
        "applicabile_a": ["II.H"],
        "varianti": {
            "iscritti": { "bonus_perc": 0.05, "campo": "registro_enea" },
            "ue_prod": { "bonus_perc": 0.10, "campo": "ue_production" },
            "same_sec": { "bonus_perc": 0.15, "campo": "same_section" }
        }
    },
    "miglioramento_ep_40": {
        "label": "Miglioramento EP ≥40%",
        "bonus_perc": 0.15,
        "applicabile_a": ["III.A", "III.B", "III.C"],
        "campo_attivazione": "miglioramento_ep_40",
        "note": "+15% se riduzione EP ≥40% rispetto a edificio esistente"
    },
    "zona_assistita_a": {
        "label": "Zona assistita (art. 107.3 lett.a)",
        "bonus_perc": 0.15,
        "applicabile_a": ["II.", "III."],
        "campo_attivazione": "zona_assistita_a",
        "note": "+15% per zone assistite ai sensi dell'art. 107.3 lett.a TFUE"
    },
    "zona_assistita_c": {
        "label": "Zona assistita (art. 107.3 lett.c)",
        "bonus_perc": 0.05,
        "applicabile_a": ["II.", "III."],
        "campo_attivazione": "zona_assistita_c",
        "note": "+5% per zone assistite ai sensi dell'art. 107.3 lett.c TFUE"
    }
};

/**
 * Parametri procedurali e soglie di erogazione CT 3.0.
 */
export const PROCEDURA_CONFIG = {
    "SOGLIA_UNICA_SOLUZIONE": 15000,
    "EFFETTO_INCENTIVANTE_OBBLIGATORIO": ["Impresa", "ETS economico", "ESCO"],
    "DURATA_STANDARD_PICCOLA_POTENZA": 2,
    "DURATA_STANDARD_GRANDE_POTENZA": 5,
    "SOGLIA_ANTIMAFIA": 150000,
    "ACCESSO_DIRETTO_TERMINE_GIORNI": 90,
    "DURATA_TITOLO_II_ANNI": 5,
    "INTERVENTI_DURATA_5_ANNI": ["II.A", "II.B", "II.C", "II.D", "II.E", "II.F"],
    "INTERVENTI_DURATA_2_ANNI": ["III.E"],
    "SOGLIA_POTENZA_PICCOLA": 35,
    "FV_POTENZA_MIN_KW": 2,
    "FV_POTENZA_MAX_KW": 1000,
    "INTENSITA_MASSIMA": {
        "default_Titolo_II": 0.40,
        "default_Titolo_III": 0.65,
        "PA_comuni_sotto_15000": 1.0,
        "PA_scuole_ospedali": 1.0,
        "PA_altri": 0.40,
        "Impresa_singolo_Titolo_II": 0.45,
        "Impresa_multi_Titolo_II": 0.55,
        "Impresa_Titolo_III": 0.65
    }
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
        "II.A": { "desc": "Isolamento termico superfici opache", "varianti": { "Coperture Esterno": { "cmax": 300 }, "Coperture Interno": { "cmax": 150 }, "Coperture Ventilata": { "cmax": 350 }, "Parete Esterna": { "cmax": 200 }, "Parete Interna": { "cmax": 100 }, "Parete Ventilata": { "cmax": 250 }, "Pavimenti Esterno": { "cmax": 170 }, "Pavimenti Interno": { "cmax": 150 } }, "imax": 1000000, "perc": 0.4, "perc_zone_EF": 0.5, "perc_multi": 0.55, "durata": 5 },
        "II.B": { "desc": "Sostituzione infissi", "varianti": { "Zone A,B,C": { "cmax": 700 }, "Zone D,E,F": { "cmax": 800 } }, "imax": 500000, "perc": 0.4, "perc_multi": 0.55, "durata": 5 },
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
                "Ci_PDC_aria_acqua_gt35kW": 0.060,
                "Ci_PDC_acqua_aria_le35kW": 0.160,
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
        "II.C": {
            "desc": "Schermature/ombreggiamento solare",
            "varianti": {
                "Schermature mobili": { "cmax": 150 },
                "Schermature fisse": { "cmax": 150 },
                "Tende da sole": { "cmax": 50 },
                "Pellicole": { "cmax": 50 },
                "Vetri elettrocromici": { "cmax": 250 }
            },
            "imax": 90000,
            "perc": 0.4,
            "durata": 5
        },
        "II.D": {
            "desc": "Trasformazione nZEB (demolizione/ricostruzione o ampliamento ≤25%)",
            "varianti": {
                "Demolizione e ricostruzione": { "cmax": 1300 },
                "Ampliamento ≤25%": { "cmax": 1000 }
            },
            "imax": 3000000,
            "perc": 0.4,
            "durata": 5
        },
        "II.E": {
            "desc": "Sostituzione illuminazione",
            "varianti": {
                "Edifici privati": { "cmax": 35 },
                "Edifici PA": { "cmax": 15 }
            },
            "imax": 140000,
            "perc": 0.4,
            "durata": 5
        },
        "II.F": {
            "desc": "Building automation e gestione carichi",
            "varianti": {
                "Classe B EN 15232": { "cmax": 60 }
            },
            "imax": 100000,
            "perc": 0.4,
            "durata": 5
        },
        "III.B": {
            "desc": "Sistemi ibridi/bivalenti/add-on (gas + PDC)",
            "durata": { "piccola": 2, "grande": 5 },
            "soglia_potenza": 35,
            "coefficienti_ci": {
                "Ci_PDC_aria_aria_split_le12kW": 0.070,
                "Ci_PDC_aria_aria_fixed_double_duct_le12kW": 0.200,
                "Ci_PDC_aria_aria_VRF_12_35kW": 0.150,
                "Ci_PDC_aria_aria_VRF_gt35kW": 0.055,
                "Ci_PDC_aria_aria_rooftop_le35kW": 0.150,
                "Ci_PDC_aria_aria_rooftop_gt35kW": 0.055,
                "Ci_PDC_aria_acqua_le35kW": 0.150,
                "Ci_PDC_aria_acqua_gt35kW": 0.060,
                "Ci_PDC_acqua_aria_le35kW": 0.160,
                "Ci_PDC_acqua_aria_gt35kW": 0.060,
                "Ci_PDC_acqua_acqua_le35kW": 0.160,
                "Ci_PDC_acqua_acqua_gt35kW": 0.060,
                "Ci_PDC_salamoia_aria_le35kW": 0.160,
                "Ci_PDC_salamoia_aria_gt35kW": 0.060,
                "Ci_PDC_salamoia_acqua_le35kW": 0.160,
                "Ci_PDC_salamoia_acqua_gt35kW": 0.060
            }
        },
        "III.C": {
            "desc": "Generatori a biomassa (≤2.000 kW)",
            "varianti": {
                "Biomassa classe 5 stelle": { "cmax": 600, "perc": 0.65 },
                "Biomassa classe 4 stelle": { "cmax": 0, "perc": 0 }
            },
            "durata": { "piccola": 2, "grande": 5 },
            "soglia_potenza": 35
        },
        "III.D": {
            "desc": "Solare termico (≤2.500 m²)",
            "varianti": {
                "Pannelli piani vetrati": { "cmax": 550 },
                "Pannelli sottovuoto": { "cmax": 700 },
                "Pannelli non vetrati": { "cmax": 250 }
            },
            "imax": 250000,
            "durata": { "piccola": 2, "grande": 5 },
            "soglia_superficie": 50,
            "perc": 0.65
        },
        "III.E": {
            "desc": "Scaldacqua a pompa di calore",
            "scaglioni": [
                { "fino_a": 150, "incentivo_fisso": 500 },
                { "fino_a": 300, "incentivo_fisso": 1000 },
                { "oltre": true, "incentivo_fisso": 1500 }
            ],
            "durata": 2,
            "perc": 0.4
        },
        "III.F": {
            "desc": "Allaccio a teleriscaldamento efficiente",
            "varianti": {
                "Allaccio singolo": { "cmax": 6500 },
                "Allaccio multiplo": { "cmax": 30000 }
            },
            "durata": 5,
            "perc": 0.65
        },
        "III.G": {
            "desc": "Microcogenerazione (≤50 kWe)",
            "perc": 0.5,
            "cmax": 4500,
            "imax": 100000,
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
        "titoli_ammessi": ["II_solo_terziario", "III"],
        "incentivo_base": 0.65,
        "richiesta_preliminare": true,
        "prenotazione": false,
        "alert": "ATTENZIONE: Obbligo di Richiesta Preliminare. Titolo II ammesso solo su terziario."
    },
    "ESCO": {
        "label": "ESCO (Energy Service Company)",
        "descrizione": "Società di servizi energetici certificata UNI CEI 11352.",
        "titoli_ammessi": ["II", "III"],
        "incentivo_base": 0.65,
        "richiesta_preliminare": true,
        "prenotazione": false,
        "certificazione_richiesta": "UNI CEI 11352",
        "alert": "ATTENZIONE: Obbligo di Richiesta Preliminare. La certificazione UNI CEI 11352 deve essere valida al momento della richiesta."
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
    },
    "II.C": {
        "nome": "Schermature e ombreggiamento solare",
        "descrizione": "Installazione di sistemi di schermatura solare, tende da sole, pellicole o vetri elettrocromici per ridurre i carichi termici estivi.",
        "lavorazioni_comprese": [ "fornitura e posa sistemi schermanti", "eventuali opere edili connesse", "sistemi motorizzati e domotici", "configurazione e collaudo" ],
        "lavorazioni_da_verificare": [ "fattore solare g", "efficacia schermatura", "rilascio certificazioni" ],
        "vincoli": [ "intervento Titolo II", "verificare ammissibilita soggetto/ambito" ],
        "interventi_collegati_obbligatori": [],
        "interventi_collegati_suggeriti": [ "II.B", "II.A", "II.F" ],
        "documenti_richiesti": [ "schede tecniche prodotti", "certificazioni prestazionali", "foto ante/post", "fatture e bonifici" ],
        "note_compilatore": "Utile per ridurre carichi estivi, abbinabile a infissi e isolamento.",
        "warning": []
    },
    "II.D": {
        "nome": "Trasformazione in edificio nZEB",
        "descrizione": "Demolizione e ricostruzione o ampliamento volumetrico ≤25% con raggiungimento classe nZEB.",
        "lavorazioni_comprese": [ "demolizione selettiva", "ricostruzione con involucro ad alte prestazioni", "impianti ad alta efficienza", "certificazione nZEB" ],
        "lavorazioni_da_verificare": [ "limite ampliamento 25%", "classe energetica nZEB", "permessi edilizi" ],
        "vincoli": [ "intervento complesso su intero edificio", "richiede autorizzazioni edilizie" ],
        "interventi_collegati_obbligatori": [],
        "interventi_collegati_suggeriti": [ "III.A", "II.H", "II.F" ],
        "documenti_richiesti": [ "progetto architettonico", "APE nZEB", "relazione tecnica", "permessi edilizi", "fatture e bonifici" ],
        "note_compilatore": "Intervento complesso, verificare requisiti nZEB completi.",
        "warning": []
    },
    "II.E": {
        "nome": "Sostituzione illuminazione",
        "descrizione": "Sostituzione di impianti di illuminazione esistenti con sorgenti LED ad alta efficienza e sistemi di controllo.",
        "lavorazioni_comprese": [ "rimozione corpi illuminanti esistenti", "fornitura e posa nuovi corpi LED", "sistemi di regolazione e controllo", "adeguamento quadri elettrici" ],
        "lavorazioni_da_verificare": [ "efficienza luminosa", "classe energetica", "sistemi di controllo presenti" ],
        "vincoli": [ "intervento Titolo II", "verificare ammissibilita soggetto/ambito" ],
        "interventi_collegati_obbligatori": [],
        "interventi_collegati_suggeriti": [ "II.F" ],
        "documenti_richiesti": [ "schede tecniche corpi illuminanti", "progetto illuminotecnico", "foto ante/post", "fatture e bonifici" ],
        "note_compilatore": "Intervento Titolo II, verificare soggetto ammesso.",
        "warning": []
    },
    "III.B": {
        "nome": "Sistema ibrido/bivalente/add-on (gas + PDC)",
        "descrizione": "Installazione di sistema ibrido con pompa di calore e caldaia a gas, sistema bivalente o add-on PDC su generatore esistente.",
        "lavorazioni_comprese": [ "fornitura e posa PDC", "integrazione con caldaia esistente o nuova", "centralina ibrida di gestione", "collegamenti idraulici/elettrici", "avviamento e collaudo" ],
        "lavorazioni_da_verificare": [ "configurazione ibrida/bivalente", "ripartizione carichi", "SCOP sistema" ],
        "vincoli": [ "richiede edificio esistente climatizzato", "non traina II.H (FV)", "non ammesso per imprese/ETS economici se a gas" ],
        "interventi_collegati_obbligatori": [],
        "interventi_collegati_suggeriti": [ "II.F" ],
        "documenti_richiesti": [ "schede tecniche PDC", "scheda tecnica caldaia", "certificazioni prestazionali", "foto ante/post", "fatture e bonifici" ],
        "note_compilatore": "Non trainabile per FV. Verificare soggetto e tipo gas.",
        "warning": [ "Non traina II.H" ]
    },
    "III.C": {
        "nome": "Generatori a biomassa (classe 5 stelle)",
        "descrizione": "Sostituzione di generatore esistente con caldaia/stufa a biomassa classe 5 stelle, potenza ≤2.000 kW.",
        "lavorazioni_comprese": [ "rimozione generatore esistente", "fornitura e posa generatore biomassa", "collegamenti idraulici/fumi", "silo/canale alimentazione", "avviamento e collaudo" ],
        "lavorazioni_da_verificare": [ "classe emissiva 5 stelle", "potenza ≤2.000 kW", "tipologia combustibile" ],
        "vincoli": [ "richiede sostituzione generatore esistente", "classe 5 stelle obbligatoria", "non ammesso per imprese/ETS economici" ],
        "interventi_collegati_obbligatori": [],
        "interventi_collegati_suggeriti": [ "II.A", "II.F" ],
        "documenti_richiesti": [ "scheda tecnica generatore", "certificazione classe 5 stelle", "libretto impianto ante/post", "foto ante/post", "fatture e bonifici" ],
        "note_compilatore": "Solo classe 5 stelle ammessa. Classe 4 stelle non incentivabile.",
        "warning": [ "Classe 4 stelle non ammessa", "Non ammesso per imprese/ETS economici" ]
    },
    "III.D": {
        "nome": "Solare termico",
        "descrizione": "Installazione di pannelli solari termici per produzione di ACS e/o integrazione riscaldamento, superficie ≤2.500 m².",
        "lavorazioni_comprese": [ "fornitura e posa pannelli solari termici", "accumulo e centralina", "collegamenti idraulici", "opere di connessione" ],
        "lavorazioni_da_verificare": [ "tipo pannello", "superficie lorda", "certificazione Solar Keymark" ],
        "vincoli": [ "superficie ≤2.500 m²", "richiede edificio esistente" ],
        "interventi_collegati_obbligatori": [],
        "interventi_collegati_suggeriti": [ "II.A", "II.F" ],
        "documenti_richiesti": [ "scheda tecnica pannelli", "certificazione Solar Keymark", "foto ante/post", "fatture e bonifici" ],
        "note_compilatore": "Superficie lorda totale ≤2.500 m².",
        "warning": []
    },
    "III.F": {
        "nome": "Allaccio a teleriscaldamento efficiente",
        "descrizione": "Allacciamento dell'edificio a una rete di teleriscaldamento efficiente conforme alla direttiva 2012/27/UE.",
        "lavorazioni_comprese": [ "scavo e posa tubazioni", "sotto-stazione di scambio", "contabilizzazione", "disconnessione generatore esistente", "adeguamento impianto esistente" ],
        "lavorazioni_da_verificare": [ "classificazione teleriscaldamento efficiente", "certificazione del gestore", "potenza allacciamento" ],
        "vincoli": [ "richiede edificio esistente climatizzato", "teleriscaldamento deve essere efficiente (direttiva 2012/27/UE)" ],
        "interventi_collegati_obbligatori": [],
        "interventi_collegati_suggeriti": [ "II.A", "II.F" ],
        "documenti_richiesti": [ "contratto allaccio", "certificazione gestore teleriscaldamento", "foto ante/post", "fatture e bonifici" ],
        "note_compilatore": "Verificare classificazione teleriscaldamento efficiente.",
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
        { "codice_intervento": "II.F", "titolo": "Building Automation", "nome": "Sistemi di automazione e controllo", "tipo_calcolo": "percentuale_spesa", "percentuale_base": 0.4, "percentuale_massima": 0.4, "massimale_spesa": 100000.0, "massimale_incentivo": null, "costo_massimo_unitario": 60.0, "unita_misura": "mq", "formula_riferimento": "min(Spesa, Superficie * Cmax) * %", "fonte": "D.M. 7 agosto 2025", "note": [ "Classe B secondo EN 15232" ], "stato_validazione": "da_validare", "parametri": [ { "nome": "superficie_asservita", "categoria": "formula", "obbligatorio": true, "tipo_dato": "number", "fonte_dato": "scheda_tecnica", "stato_validazione": "da_validare", "note": "" }, { "nome": "spesa_totale", "categoria": "economico", "obbligatorio": false, "tipo_dato": "number", "fonte_dato": "scheda_tecnica", "stato_validazione": "da_validare", "note": "" } ] },
        { "codice_intervento": "II.G", "titolo": "Infrastrutture ricarica veicoli elettrici", "nome": "Colonnine ricarica", "tipo_calcolo": "percentuale_spesa", "percentuale_base": 0.3, "percentuale_massima": 0.3, "massimale_spesa": null, "massimale_incentivo": null, "costo_massimo_unitario": null, "unita_misura": "n_punti", "formula_riferimento": "min(Spesa, Cmax_fisso + Potenza * Cmax_kw) * %", "fonte": "D.M. 7 agosto 2025", "note": [ "Richiede III.A elettrica" ], "stato_validazione": "parziale", "parametri": [ { "nome": "numero_punti_ricarica", "categoria": "formula", "obbligatorio": true, "tipo_dato": "number", "fonte_dato": "scheda_tecnica", "stato_validazione": "da_validare", "note": "" }, { "nome": "tipo_monofase_trifase", "categoria": "formula", "obbligatorio": true, "tipo_dato": "string", "fonte_dato": "scheda_tecnica", "stato_validazione": "da_validare", "note": "" }, { "nome": "potenza_kw", "categoria": "formula", "obbligatorio": true, "tipo_dato": "number", "fonte_dato": "scheda_tecnica", "stato_validazione": "da_validare", "note": "" }, { "nome": "spesa_totale", "categoria": "economico", "obbligatorio": false, "tipo_dato": "number", "fonte_dato": "scheda_tecnica", "stato_validazione": "da_validare", "note": "" } ] },
        { "codice_intervento": "II.H", "titolo": "Fotovoltaico + Accumulo", "nome": "Fotovoltaico trainato", "tipo_calcolo": "percentuale_spesa", "percentuale_base": 0.2, "percentuale_massima": 0.35, "massimale_spesa": null, "massimale_incentivo": null, "costo_massimo_unitario": 1500.0, "unita_misura": "kW", "formula_riferimento": "Potenza * Cmax_scaglione * %", "fonte": "D.M. 7 agosto 2025", "note": [ "Richiede III.A elettrica pura e sostituzione integrale" ], "stato_validazione": "validato_documentale", "parametri": [ { "nome": "potenza_picco_kW", "categoria": "formula", "obbligatorio": true, "tipo_dato": "number", "fonte_dato": "scheda_tecnica", "stato_validazione": "da_validare", "note": "" }, { "nome": "numero_moduli", "categoria": "documentazione", "obbligatorio": false, "tipo_dato": "number", "fonte_dato": "scheda_tecnica", "stato_validazione": "da_validare", "note": "" }, { "nome": "marca_moduli", "categoria": "documentazione", "obbligatorio": false, "tipo_dato": "string", "fonte_dato": "scheda_tecnica", "stato_validazione": "da_validare", "note": "" }, { "nome": "modello_moduli", "categoria": "documentazione", "obbligatorio": false, "tipo_dato": "string", "fonte_dato": "scheda_tecnica", "stato_validazione": "da_validare", "note": "" }, { "nome": "iscritti_enea", "categoria": "premialita", "obbligatorio": false, "tipo_dato": "string", "fonte_dato": "scheda_tecnica", "stato_validazione": "da_validare", "note": "" }, { "nome": "sezione_enea", "categoria": "premialita", "obbligatorio": false, "tipo_dato": "string", "fonte_dato": "scheda_tecnica", "stato_validazione": "da_validare", "note": "" }, { "nome": "produzione_ue", "categoria": "premialita", "obbligatorio": false, "tipo_dato": "string", "fonte_dato": "scheda_tecnica", "stato_validazione": "da_validare", "note": "" }, { "nome": "accumulo_presente", "categoria": "ammissibilita", "obbligatorio": true, "tipo_dato": "string", "fonte_dato": "scheda_tecnica", "stato_validazione": "da_validare", "note": "" }, { "nome": "capacita_accumulo_kWh", "categoria": "formula", "obbligatorio": true, "tipo_dato": "number", "fonte_dato": "scheda_tecnica", "stato_validazione": "da_validare", "note": "" }, { "nome": "costo_fv", "categoria": "economico", "obbligatorio": false, "tipo_dato": "number", "fonte_dato": "scheda_tecnica", "stato_validazione": "da_validare", "note": "" }, { "nome": "costo_accumulo", "categoria": "economico", "obbligatorio": false, "tipo_dato": "number", "fonte_dato": "scheda_tecnica", "stato_validazione": "da_validare", "note": "" }, { "nome": "connessione_pertinenze", "categoria": "ammissibilita", "obbligatorio": true, "tipo_dato": "string", "fonte_dato": "scheda_tecnica", "stato_validazione": "da_validare", "note": "" }, { "nome": "abbinato_pdc_elettrica", "categoria": "ammissibilita", "obbligatorio": true, "tipo_dato": "string", "fonte_dato": "scheda_tecnica", "stato_validazione": "da_validare", "note": "" }, { "nome": "documentazione_disponibile", "categoria": "documentazione", "obbligatorio": false, "tipo_dato": "string", "fonte_dato": "scheda_tecnica", "stato_validazione": "da_validare", "note": "" }, { "nome": "preventivo_disponibile", "categoria": "documentazione", "obbligatorio": false, "tipo_dato": "string", "fonte_dato": "scheda_tecnica", "stato_validazione": "da_validare", "note": "" } ] },
        { "codice_intervento": "III.A", "titolo": "Pompa di calore elettrica", "nome": "Sostituzione con PDC", "tipo_calcolo": "formula_prestazionale", "percentuale_base": 0.65, "percentuale_massima": 0.65, "massimale_spesa": null, "massimale_incentivo": null, "costo_massimo_unitario": null, "unita_measure": "kW", "formula_riferimento": "Pn * Ci * Quf", "fonte": "D.M. 7 agosto 2025", "note": [ "Quf dipendente da zona climatica" ], "stato_validazione": "validato_documentale", "parametri": [ { "nome": "marca", "categoria": "documentazione", "obbligatorio": false, "tipo_dato": "string", "fonte_dato": "scheda_tecnica", "stato_validazione": "da_validare", "note": "" }, { "nome": "modello", "categoria": "documentazione", "obbligatorio": false, "tipo_dato": "string", "fonte_dato": "scheda_tecnica", "stato_validazione": "da_validare", "note": "" }, { "nome": "tipologia_pdc", "categoria": "formula", "obbligatorio": true, "tipo_dato": "string", "fonte_dato": "scheda_tecnica", "stato_validazione": "da_validare", "note": "" }, { "nome": "is_elettrica", "categoria": "ammissibilita", "obbligatorio": true, "tipo_dato": "string", "fonte_dato": "scheda_tecnica", "stato_validazione": "da_validare", "note": "" }, { "nome": "potenza_termica_nominale", "categoria": "formula", "obbligatorio": true, "tipo_dato": "number", "fonte_dato": "scheda_tecnica", "stato_validazione": "da_validare", "note": "" }, { "nome": "potenza_elettrica_assorbita", "categoria": "formula", "obbligatorio": true, "tipo_dato": "number", "fonte_dato": "scheda_tecnica", "stato_validazione": "da_validare", "note": "" }, { "nome": "cop", "categoria": "formula", "obbligatorio": true, "tipo_dato": "number", "fonte_dato": "scheda_tecnica", "stato_validazione": "da_validare", "note": "" }, { "nome": "sorgente_energetica", "categoria": "formula", "obbligatorio": true, "tipo_dato": "string", "fonte_dato": "scheda_tecnica", "stato_validazione": "da_validare", "note": "" }, { "nome": "servizio", "categoria": "formula", "obbligatorio": true, "tipo_dato": "string", "fonte_dato": "scheda_tecnica", "stato_validazione": "da_validare", "note": "" }, { "nome": "sostituisce_esistente", "categoria": "ammissibilita", "obbligatorio": true, "tipo_dato": "string", "fonte_dato": "scheda_tecnica", "stato_validazione": "da_validare", "note": "" }, { "nome": "documentazione_disponibile", "categoria": "documentazione", "obbligatorio": false, "tipo_dato": "string", "fonte_dato": "scheda_tecnica", "stato_validazione": "da_validare", "note": "" }, { "nome": "scheda_prodotto", "categoria": "documentazione", "obbligatorio": false, "tipo_dato": "string", "fonte_dato": "scheda_tecnica", "stato_validazione": "da_validare", "note": "" }, { "nome": "certificazione_prestazionale", "categoria": "documentazione", "obbligatorio": false, "tipo_dato": "string", "fonte_dato": "scheda_tecnica", "stato_validazione": "da_validare", "note": "" }, { "nome": "zona_climatica", "categoria": "formula", "obbligatorio": true, "tipo_dato": "string", "fonte_dato": "scheda_tecnica", "stato_validazione": "da_validare", "note": "" }, { "nome": "coefficiente_Ci", "categoria": "formula", "obbligatorio": true, "tipo_dato": "number", "fonte_dato": "scheda_tecnica", "stato_validazione": "da_validare", "note": "" } ] },
        { "codice_intervento": "III.B", "titolo": "Sistemi ibridi / bivalenti / add-on", "nome": "Ibrido gas + PDC", "tipo_calcolo": "formula_prestazionale", "percentuale_base": 0.65, "percentuale_massima": 0.65, "massimale_spesa": null, "massimale_incentivo": null, "costo_massimo_unitario": null, "unita_measure": "kW", "formula_riferimento": "Pn * Ci * Quf", "fonte": "D.M. 7 agosto 2025", "note": [ "Non traina II.H" ], "stato_validazione": "parziale", "parametri": [ { "nome": "potenza_nominale_Pn_pdc", "categoria": "formula", "obbligatorio": true, "tipo_dato": "number", "fonte_dato": "scheda_tecnica", "stato_validazione": "da_validare", "note": "" }, { "nome": "zona_climatica", "categoria": "formula", "obbligatorio": true, "tipo_dato": "string", "fonte_dato": "scheda_tecnica", "stato_validazione": "da_validare", "note": "" }, { "nome": "coefficiente_Ci", "categoria": "formula", "obbligatorio": true, "tipo_dato": "number", "fonte_dato": "scheda_tecnica", "stato_validazione": "da_validare", "note": "" }, { "nome": "spesa_totale", "categoria": "economico", "obbligatorio": false, "tipo_dato": "number", "fonte_dato": "scheda_tecnica", "stato_validazione": "da_validare", "note": "" } ] },
        { "codice_intervento": "III.E", "titolo": "Scaldacqua a pompa di calore", "nome": "PDC per ACS", "tipo_calcolo": "percentuale_spesa", "percentuale_base": 0.4, "percentuale_massima": 0.4, "massimale_spesa": null, "massimale_incentivo": 1500.0, "costo_massimo_unitario": null, "unita_measure": "litri", "formula_riferimento": "min(spesa, incentivo_fisso_per_scaglione)", "fonte": "D.M. 7 agosto 2025", "note": [ "Importi fissi per scaglioni litri: ≤150L=500€, ≤300L=1000€, >300L=1500€" ], "stato_validazione": "validato_documentale", "parametri": [ { "nome": "capacita_litri", "categoria": "formula", "obbligatorio": true, "tipo_dato": "number", "fonte_dato": "scheda_tecnica", "stato_validazione": "da_validare", "note": "" }, { "nome": "classe_energetica", "categoria": "ammissibilita", "obbligatorio": true, "tipo_dato": "string", "fonte_dato": "scheda_tecnica", "stato_validazione": "da_validare", "note": "" }, { "nome": "spesa_totale", "categoria": "economico", "obbligatorio": false, "tipo_dato": "number", "fonte_dato": "scheda_tecnica", "stato_validazione": "da_validare", "note": "" } ] },
        { "codice_intervento": "II.C", "titolo": "Schermature e ombreggiamento solare", "nome": "Sistemi schermanti", "tipo_calcolo": "percentuale_spesa", "percentuale_base": 0.4, "percentuale_massima": 0.55, "massimale_spesa": null, "massimale_incentivo": 90000.0, "costo_massimo_unitario": null, "unita_misura": "mq", "formula_riferimento": "min(Spesa, Superficie * Cmax) * %", "fonte": "D.M. 7 agosto 2025", "note": [ "Cmax variabile per tipo schermatura" ], "stato_validazione": "da_validare", "parametri": [ { "nome": "superficie_schermata", "categoria": "formula", "obbligatorio": true, "tipo_dato": "number", "fonte_dato": "scheda_tecnica", "stato_validazione": "da_validare", "note": "" }, { "nome": "tipo_schermatura", "categoria": "formula", "obbligatorio": true, "tipo_dato": "string", "fonte_dato": "scheda_tecnica", "stato_validazione": "da_validare", "note": "" }, { "nome": "spesa_totale", "categoria": "economico", "obbligatorio": false, "tipo_dato": "number", "fonte_dato": "scheda_tecnica", "stato_validazione": "da_validare", "note": "" } ] },
        { "codice_intervento": "II.E", "titolo": "Sostituzione illuminazione", "nome": "LED e controllo", "tipo_calcolo": "percentuale_spesa", "percentuale_base": 0.4, "percentuale_massima": 0.55, "massimale_spesa": null, "massimale_incentivo": 140000.0, "costo_massimo_unitario": null, "unita_misura": "mq", "formula_riferimento": "min(Spesa, Superficie * Cmax) * %", "fonte": "D.M. 7 agosto 2025", "note": [ "Cmax differenziato per privati/PA" ], "stato_validazione": "da_validare", "parametri": [ { "nome": "superficie_illuminata", "categoria": "formula", "obbligatorio": true, "tipo_dato": "number", "fonte_dato": "scheda_tecnica", "stato_validazione": "da_validare", "note": "" }, { "nome": "tipo_edificio", "categoria": "ammissibilita", "obbligatorio": true, "tipo_dato": "string", "fonte_dato": "dichiarazione", "stato_validazione": "da_validare", "note": "" }, { "nome": "spesa_totale", "categoria": "economico", "obbligatorio": false, "tipo_dato": "number", "fonte_dato": "scheda_tecnica", "stato_validazione": "da_validare", "note": "" } ] },
        { "codice_intervento": "III.C", "titolo": "Generatori a biomassa", "nome": "Caldaie/stufe biomassa classe 5 stelle", "tipo_calcolo": "percentuale_spesa", "percentuale_base": 0.65, "percentuale_massima": 0.65, "massimale_spesa": null, "massimale_incentivo": null, "costo_massimo_unitario": 600.0, "unita_measure": "kW", "formula_riferimento": "min(Spesa, Potenza * Cmax) * %", "fonte": "D.M. 7 agosto 2025", "note": [ "Solo classe 5 stelle ammessa", "Potenza ≤2.000 kW" ], "stato_validazione": "da_validare", "parametri": [ { "nome": "potenza_nominale_kw", "categoria": "formula", "obbligatorio": true, "tipo_dato": "number", "fonte_dato": "scheda_tecnica", "stato_validazione": "da_validare", "note": "" }, { "nome": "classe_emissiva", "categoria": "ammissibilita", "obbligatorio": true, "tipo_dato": "string", "fonte_dato": "scheda_tecnica", "stato_validazione": "da_validare", "note": "" }, { "nome": "spesa_totale", "categoria": "economico", "obbligatorio": false, "tipo_dato": "number", "fonte_dato": "scheda_tecnica", "stato_validazione": "da_validare", "note": "" } ] },
        { "codice_intervento": "III.D", "titolo": "Solare termico", "nome": "Pannelli solari termici", "tipo_calcolo": "percentuale_spesa", "percentuale_base": 0.65, "percentuale_massima": 0.65, "massimale_spesa": null, "massimale_incentivo": 250000.0, "costo_massimo_unitario": null, "unita_measure": "mq", "formula_riferimento": "min(Spesa, Superficie * Cmax) * %", "fonte": "D.M. 7 agosto 2025", "note": [ "Superficie lorda ≤2.500 m²", "Cmax variabile per tipo pannello" ], "stato_validazione": "da_validare", "parametri": [ { "nome": "superficie_lorda_mq", "categoria": "formula", "obbligatorio": true, "tipo_dato": "number", "fonte_dato": "scheda_tecnica", "stato_validazione": "da_validare", "note": "" }, { "nome": "tipo_pannello", "categoria": "formula", "obbligatorio": true, "tipo_dato": "string", "fonte_dato": "scheda_tecnica", "stato_validazione": "da_validare", "note": "" }, { "nome": "spesa_totale", "categoria": "economico", "obbligatorio": false, "tipo_dato": "number", "fonte_dato": "scheda_tecnica", "stato_validazione": "da_validare", "note": "" } ] },
        { "codice_intervento": "III.F", "titolo": "Allaccio a teleriscaldamento", "nome": "Allaccio a rete efficiente", "tipo_calcolo": "percentuale_spesa", "percentuale_base": 0.65, "percentuale_massima": 0.65, "massimale_spesa": null, "massimale_incentivo": null, "costo_massimo_unitario": null, "unita_misura": "kW", "formula_riferimento": "min(Spesa, Cmax_allaccio) * %", "fonte": "D.M. 7 agosto 2025", "note": [ "Cmax 6.500€ singolo, 30.000€ multiplo" ], "stato_validazione": "da_validare", "parametri": [ { "nome": "tipo_allaccio", "categoria": "formula", "obbligatorio": true, "tipo_dato": "string", "fonte_dato": "contratto", "stato_validazione": "da_validare", "note": "" }, { "nome": "potenza_allaccio", "categoria": "formula", "obbligatorio": true, "tipo_dato": "number", "fonte_dato": "contratto", "stato_validazione": "da_validare", "note": "" }, { "nome": "spesa_totale", "categoria": "economico", "obbligatorio": false, "tipo_dato": "number", "fonte_dato": "scheda_tecnica", "stato_validazione": "da_validare", "note": "" } ] }
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
            { "id": "potenza_fv_kw", "label": "Potenza FV", "tipo": "number", "obbligatorio": true, "unita": "kWp", "min": 2, "max": 1000, "categoria": "formula", "fonte_dato": "progetto/preventivo", "note": "Potenza di picco (min 2 kW, max 1.000 kW)." },
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
            { "id": "tipologia_pdc", "label": "Tipologia PDC", "tipo": "select", "opzioni": ["aria/aria", "aria/acqua", "acqua/aria", "acqua/acqua", "salamoia/aria", "salamoia/acqua"], "obbligatorio": true, "unita": "", "categoria": "ammissibilita", "fonte_dato": "scheda tecnica", "note": "Sorgente/Utenza." },
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
    },
    "II.C": {
        "nome": "Schermature e ombreggiamento solare",
        "descrizione": "Raccolta dati per sistemi di schermatura solare.",
        "campi": [
            { "id": "tipo_schermatura", "label": "Tipo schermatura", "tipo": "select", "opzioni": ["Schermature mobili", "Schermature fisse", "Tende da sole", "Pellicole", "Vetri elettrocromici"], "obbligatorio": true, "unita": "", "categoria": "ammissibilita", "fonte_dato": "scheda tecnica", "note": "Determina Cmax." },
            { "id": "superficie_schermata_mq", "label": "Superficie schermata", "tipo": "number", "obbligatorio": true, "unita": "mq", "min": 0.5, "max": 10000, "categoria": "formula", "fonte_dato": "rilievo/progetto", "note": "Superficie netta." },
            { "id": "fattore_solare_g", "label": "Fattore solare g (ante)", "tipo": "number", "obbligatorio": true, "unita": "", "min": 0.1, "max": 1.0, "categoria": "ammissibilita", "fonte_dato": "scheda tecnica", "note": "Valore ante operam." },
            { "id": "fattore_solare_g_post", "label": "Fattore solare g (post)", "tipo": "number", "obbligatorio": true, "unita": "", "min": 0.01, "max": 0.9, "categoria": "formula", "fonte_dato": "scheda tecnica", "note": "Valore post operam." },
            { "id": "costo_schermatura", "label": "Costo totale schermatura", "tipo": "number", "obbligatorio": true, "unita": "€", "min": 1, "max": 500000, "categoria": "economico", "fonte_dato": "preventivo/fattura", "note": "Dato economico." }
        ]
    },
    "II.D": {
        "nome": "Trasformazione nZEB",
        "descrizione": "Raccolta dati per demolizione/ricostruzione o ampliamento nZEB.",
        "campi": [
            { "id": "tipo_intervento_nzeb", "label": "Tipo intervento", "tipo": "select", "opzioni": ["Demolizione e ricostruzione", "Ampliamento ≤25%"], "obbligatorio": true, "unita": "", "categoria": "ammissibilita", "fonte_dato": "progetto", "note": "Determina Cmax." },
            { "id": "superficie_utile_mq", "label": "Superficie utile", "tipo": "number", "obbligatorio": true, "unita": "mq", "min": 10, "max": 50000, "categoria": "formula", "fonte_dato": "progetto", "note": "Superficie utile dell'edificio." },
            { "id": "classe_energetica_post", "label": "Classe energetica post", "tipo": "select", "opzioni": ["A4", "A3", "A2", "A1"], "obbligatorio": true, "unita": "", "categoria": "ammissibilita", "fonte_dato": "APE", "note": "Deve essere nZEB (A4)." },
            { "id": "costo_nzeb", "label": "Costo totale intervento", "tipo": "number", "obbligatorio": true, "unita": "€", "min": 1, "max": 10000000, "categoria": "economico", "fonte_dato": "preventivo/fattura", "note": "Dato economico." }
        ]
    },
    "II.E": {
        "nome": "Sostituzione illuminazione",
        "descrizione": "Raccolta dati per sostituzione corpi illuminanti con LED.",
        "campi": [
            { "id": "tipo_edificio_illuminazione", "label": "Tipo edificio", "tipo": "select", "opzioni": ["Edifici privati", "Edifici PA"], "obbligatorio": true, "unita": "", "categoria": "ammissibilita", "fonte_dato": "dichiarazione", "note": "Determina Cmax." },
            { "id": "superficie_illuminata_mq", "label": "Superficie illuminata", "tipo": "number", "obbligatorio": true, "unita": "mq", "min": 10, "max": 50000, "categoria": "formula", "fonte_dato": "rilievo/progetto", "note": "Superficie servita." },
            { "id": "efficienza_luminosa_lmW", "label": "Efficienza luminosa", "tipo": "number", "obbligatorio": true, "unita": "lm/W", "min": 50, "max": 250, "categoria": "formula", "fonte_dato": "scheda tecnica", "note": "Efficienza nuovi corpi." },
            { "id": "costo_illuminazione", "label": "Costo totale illuminazione", "tipo": "number", "obbligatorio": true, "unita": "€", "min": 1, "max": 1000000, "categoria": "economico", "fonte_dato": "preventivo/fattura", "note": "Dato economico." }
        ]
    },
    "III.B": {
        "nome": "Sistema ibrido/bivalente/add-on",
        "descrizione": "Raccolta dati per sistemi ibridi gas + PDC.",
        "campi": [
            { "id": "tipologia_pdc", "label": "Tipologia PDC", "tipo": "select", "opzioni": ["aria/aria", "aria/acqua", "acqua/aria", "acqua/acqua", "salamoia/aria", "salamoia/acqua"], "obbligatorio": true, "unita": "", "categoria": "ammissibilita", "fonte_dato": "scheda tecnica", "note": "Sorgente/Utenza." },
            { "id": "potenza_pdc_kw", "label": "Potenza termica nominale PDC", "tipo": "number", "obbligatorio": true, "unita": "kW", "min": 1, "max": 2000, "categoria": "formula", "fonte_dato": "scheda tecnica", "note": "Pn PDC." },
            { "id": "scop", "label": "SCOP PDC", "tipo": "number", "obbligatorio": true, "unita": "", "min": 2.0, "max": 10.0, "categoria": "formula", "fonte_dato": "scheda tecnica", "note": "Efficienza stagionale." },
            { "id": "eta_s", "label": "Efficienza stagionale (ηs)", "tipo": "number", "obbligatorio": true, "unita": "%", "min": 110, "max": 500, "categoria": "formula", "fonte_dato": "scheda tecnica", "note": "ηs per calcolo kp." },
            { "id": "tipo_sistema", "label": "Tipo sistema", "tipo": "select", "opzioni": ["Ibrido parallelo", "Bivalente", "Add-on PDC"], "obbligatorio": true, "unita": "", "categoria": "ammissibilita", "fonte_dato": "progetto", "note": "Configurazione impianto." },
            { "id": "costo_ibrido", "label": "Costo totale sistema ibrido", "tipo": "number", "obbligatorio": true, "unita": "€", "min": 1, "max": 3000000, "categoria": "economico", "fonte_dato": "preventivo/fattura", "note": "Dato economico." }
        ]
    },
    "III.C": {
        "nome": "Generatori a biomassa",
        "descrizione": "Raccolta dati per caldaie/stufe a biomassa classe 5 stelle.",
        "campi": [
            { "id": "potenza_nominale_kw", "label": "Potenza nominale", "tipo": "number", "obbligatorio": true, "unita": "kW", "min": 1, "max": 2000, "categoria": "formula", "fonte_dato": "scheda tecnica", "note": "Massimo 2.000 kW." },
            { "id": "classe_emissiva", "label": "Classe emissiva", "tipo": "select", "opzioni": ["5 stelle", "4 stelle"], "obbligatorio": true, "unita": "", "categoria": "ammissibilita", "fonte_dato": "scheda tecnica", "note": "Solo 5 stelle ammessa." },
            { "id": "tipo_biomassa", "label": "Tipo combustibile", "tipo": "select", "opzioni": ["Pellet", "Cippato", "Legna", "Altro"], "obbligatorio": true, "unita": "", "categoria": "descrittivo", "fonte_dato": "scheda tecnica", "note": "Tipologia prevalente." },
            { "id": "costo_biomassa", "label": "Costo totale generatore biomassa", "tipo": "number", "obbligatorio": true, "unita": "€", "min": 1, "max": 2000000, "categoria": "economico", "fonte_dato": "preventivo/fattura", "note": "Dato economico." }
        ]
    },
    "III.D": {
        "nome": "Solare termico",
        "descrizione": "Raccolta dati per pannelli solari termici.",
        "campi": [
            { "id": "tipo_pannello_solare", "label": "Tipo pannello", "tipo": "select", "opzioni": ["Pannelli piani vetrati", "Pannelli sottovuoto", "Pannelli non vetrati"], "obbligatorio": true, "unita": "", "categoria": "formula", "fonte_dato": "scheda tecnica", "note": "Determina Cmax." },
            { "id": "superficie_lorda_mq", "label": "Superficie lorda", "tipo": "number", "obbligatorio": true, "unita": "mq", "min": 1, "max": 2500, "categoria": "formula", "fonte_dato": "progetto", "note": "Massimo 2.500 m²." },
            { "id": "certificazione_solar_keymark", "label": "Certificazione Solar Keymark", "tipo": "select", "opzioni": ["sì", "no"], "obbligatorio": true, "unita": "", "categoria": "ammissibilita", "fonte_dato": "certificato", "note": "Obbligatoria per incentivo." },
            { "id": "costo_solare_termico", "label": "Costo totale solare termico", "tipo": "number", "obbligatorio": true, "unita": "€", "min": 1, "max": 1000000, "categoria": "economico", "fonte_dato": "preventivo/fattura", "note": "Dato economico." }
        ]
    },
    "III.E": {
        "nome": "Scaldacqua a pompa di calore",
        "descrizione": "Raccolta dati per scaldacqua PDC.",
        "campi": [
            { "id": "capacita_litri", "label": "Capacità accumulo", "tipo": "number", "obbligatorio": true, "unita": "litri", "min": 50, "max": 1000, "categoria": "formula", "fonte_dato": "scheda tecnica", "note": "Determina importo fisso." },
            { "id": "classe_energetica", "label": "Classe energetica", "tipo": "select", "opzioni": ["A+", "A", "B", "C"], "obbligatorio": true, "unita": "", "categoria": "ammissibilita", "fonte_dato": "scheda tecnica", "note": "Deve essere almeno A." },
            { "id": "costo_scaldacqua", "label": "Costo totale scaldacqua", "tipo": "number", "obbligatorio": true, "unita": "€", "min": 1, "max": 50000, "categoria": "economico", "fonte_dato": "preventivo/fattura", "note": "Dato economico." }
        ]
    },
    "II.F": {
        "nome": "Building automation",
        "descrizione": "Raccolta dati per sistemi di automazione e controllo edificio.",
        "campi": [
            { "id": "superficie_edificio_mq", "label": "Superficie asservita", "tipo": "number", "obbligatorio": true, "unita": "mq", "min": 10, "max": 50000, "categoria": "formula", "fonte_dato": "rilievo/progetto", "note": "Superficie gestita dal sistema." },
            { "id": "classe_bac", "label": "Classe BAC (EN 15232)", "tipo": "select", "opzioni": ["A", "B", "C", "D"], "obbligatorio": true, "unita": "", "categoria": "ammissibilita", "fonte_dato": "progetto", "note": "Minimo classe B per incentivo." },
            { "id": "funzioni_controllo", "label": "Funzioni implementate", "tipo": "textarea", "obbligatorio": false, "unita": "", "categoria": "descrittivo", "fonte_dato": "progetto", "note": "Elenco funzioni di controllo e gestione." },
            { "id": "costo_building_automation", "label": "Costo totale building automation", "tipo": "number", "obbligatorio": true, "unita": "€", "min": 1, "max": 500000, "categoria": "economico", "fonte_dato": "preventivo/fattura", "note": "Dato economico." }
        ]
    },
    "III.F": {
        "nome": "Allaccio a teleriscaldamento efficiente",
        "descrizione": "Raccolta dati per allaccio a rete di teleriscaldamento.",
        "campi": [
            { "id": "tipo_allaccio", "label": "Tipo allaccio", "tipo": "select", "opzioni": ["Allaccio singolo", "Allaccio multiplo"], "obbligatorio": true, "unita": "", "categoria": "formula", "fonte_dato": "contratto", "note": "Determina Cmax." },
            { "id": "potenza_allaccio_kw", "label": "Potenza allaccio", "tipo": "number", "obbligatorio": true, "unita": "kW", "min": 1, "max": 10000, "categoria": "formula", "fonte_dato": "contratto", "note": "Potenza sottostazione." },
            { "id": "teleriscaldamento_efficiente", "label": "Teleriscaldamento efficiente (Dir. 2012/27/UE)", "tipo": "select", "opzioni": ["sì", "no", "da verificare"], "obbligatorio": true, "unita": "", "categoria": "ammissibilita", "fonte_dato": "certificazione gestore", "note": "Obbligatorio." },
            { "id": "costo_allaccio", "label": "Costo totale allaccio", "tipo": "number", "obbligatorio": true, "unita": "€", "min": 1, "max": 500000, "categoria": "economico", "fonte_dato": "preventivo/fattura", "note": "Dato economico." }
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
    },
    "II.C": {
        "nome": "Schermature e ombreggiamento solare",
        "formula_status": "validato_tecnico",
        "tipo_formula": "percentuale_spesa",
        "attiva": true,
        "formula_base": "min(spesa, superficie * cmax) * percentuale",
        "richiede": ["superficie_schermata_mq", "costo_schermatura", "tipo_schermatura"],
        "mappatura_dati": {
            "spesa": "costo_schermatura",
            "superficie": "superficie_schermata_mq"
        },
        "blocchi": [],
        "versione_normativa": "CT3_DM_2025",
        "fonte": "normativa",
        "note": ["Formula identica a II.A"]
    },
    "II.D": {
        "nome": "Trasformazione nZEB",
        "formula_status": "da_validare",
        "tipo_formula": "percentuale_spesa",
        "attiva": true,
        "formula_base": "min(spesa, superficie * cmax) * percentuale",
        "richiede": ["superficie_utile_mq", "costo_nzeb", "tipo_intervento_nzeb"],
        "mappatura_dati": {
            "spesa": "costo_nzeb",
            "superficie": "superficie_utile_mq"
        },
        "blocchi": [],
        "versione_normativa": "CT3_DM_2025",
        "fonte": "normativa",
        "note": ["Intervento complesso su intero edificio"]
    },
    "II.E": {
        "nome": "Sostituzione illuminazione",
        "formula_status": "validato_tecnico",
        "tipo_formula": "percentuale_spesa",
        "attiva": true,
        "formula_base": "min(spesa, superficie * cmax) * percentuale",
        "richiede": ["superficie_illuminata_mq", "costo_illuminazione", "tipo_edificio_illuminazione"],
        "mappatura_dati": {
            "spesa": "costo_illuminazione",
            "superficie": "superficie_illuminata_mq"
        },
        "blocchi": [],
        "versione_normativa": "CT3_DM_2025",
        "fonte": "normativa",
        "note": ["Cmax differenziato per privati/PA"]
    },
    "II.F": {
        "nome": "Building automation",
        "formula_status": "validato_tecnico",
        "tipo_formula": "percentuale_spesa",
        "attiva": true,
        "formula_base": "min(spesa, superficie * cmax) * percentuale",
        "richiede": ["superficie_edificio_mq", "costo_building_automation"],
        "mappatura_dati": {
            "spesa": "costo_building_automation",
            "superficie": "superficie_edificio_mq"
        },
        "blocchi": [],
        "versione_normativa": "CT3_DM_2025",
        "fonte": "normativa",
        "note": ["Classe B EN 15232"]
    },
    "II.H": {
        "nome": "Fotovoltaico + accumulo",
        "formula_status": "validato_tecnico",
        "tipo_formula": "percentuale_spesa",
        "attiva": true,
        "formula_base": "min(spesa, potenza_fv * cmax_scaglione + accumulo_kwh * cmax_accumulo) * percentuale",
        "richiede": ["potenza_fv_kw", "costo_fv", "accumulo_presente", "capacita_accumulo_kwh"],
        "mappatura_dati": {
            "spesa": "costo_fv",
            "potenza_fv": "potenza_fv_kw",
            "accumulo_kwh": "capacita_accumulo_kwh"
        },
        "vincoli": [
            { "campo": "potenza_fv_kw", "min": 2, "max": 1000 }
        ],
        "blocchi": [],
        "versione_normativa": "CT3_DM_2025",
        "fonte": "normativa",
        "note": ["II.H non autonomo, richiede III.A"]
    },
    "III.B": {
        "nome": "Sistemi ibridi/bivalenti/add-on",
        "formula_status": "validato_tecnico",
        "tipo_formula": "prestazionale",
        "attiva": true,
        "formula_base": "k * Ei * Ci (stessa formula III.A con k ≤ 1)",
        "variabili": [
            { "codice": "kp", "espressione": "eta_s / eta_s_min_ecodesign", "descrizione": "Coefficiente di premialità" },
            { "codice": "Qu", "espressione": "Prated * Quf", "descrizione": "Calore totale prodotto stimato" },
            { "codice": "Ei", "espressione": "Qu * (1 - 1/SCOP) * kp", "descrizione": "Energia termica incentivata" },
            { "codice": "k", "descrizione": "Coefficiente riduttivo per sistemi ibridi", "valore_default": 0.7 }
        ],
        "richiede": ["potenza_pdc_kw", "tipologia_pdc", "scop", "eta_s", "tipo_sistema"],
        "mappatura_dati": {
            "Prated": "potenza_pdc_kw",
            "SCOP": "scop",
            "eta_s": "eta_s"
        },
        "blocchi": [],
        "versione_normativa": "CT3_DM_2025",
        "fonte": "normativa",
        "note": ["Non traina II.H"]
    },
    "III.C": {
        "nome": "Generatori a biomassa",
        "formula_status": "validato_tecnico",
        "tipo_formula": "percentuale_spesa",
        "attiva": true,
        "formula_base": "min(spesa, potenza * cmax) * percentuale",
        "richiede": ["potenza_nominale_kw", "costo_biomassa", "classe_emissiva"],
        "mappatura_dati": {
            "spesa": "costo_biomassa",
            "potenza": "potenza_nominale_kw"
        },
        "vincoli": [
            { "campo": "potenza_nominale_kw", "max": 2000 },
            { "campo": "classe_emissiva", "valori_ammessi": ["5 stelle"] }
        ],
        "blocchi": [],
        "versione_normativa": "CT3_DM_2025",
        "fonte": "normativa",
        "note": ["Solo classe 5 stelle"]
    },
    "III.D": {
        "nome": "Solare termico",
        "formula_status": "validato_tecnico",
        "tipo_formula": "percentuale_spesa",
        "attiva": true,
        "formula_base": "min(spesa, superficie * cmax) * percentuale",
        "richiede": ["superficie_lorda_mq", "costo_solare_termico", "tipo_pannello_solare"],
        "mappatura_dati": {
            "spesa": "costo_solare_termico",
            "superficie": "superficie_lorda_mq"
        },
        "vincoli": [
            { "campo": "superficie_lorda_mq", "max": 2500 }
        ],
        "blocchi": [],
        "versione_normativa": "CT3_DM_2025",
        "fonte": "normativa",
        "note": ["Superficie lorda ≤2.500 m²"]
    },
    "III.E": {
        "nome": "Scaldacqua a pompa di calore",
        "formula_status": "validato_tecnico",
        "tipo_formula": "percentuale_spesa",
        "attiva": true,
        "formula_base": "min(spesa, incentivo_fisso_per_scaglione)",
        "richiede": ["capacita_litri", "costo_scaldacqua"],
        "mappatura_dati": {
            "spesa": "costo_scaldacqua",
            "capacita": "capacita_litri"
        },
        "blocchi": [],
        "versione_normativa": "CT3_DM_2025",
        "fonte": "normativa",
        "note": ["Importi fissi: ≤150L=500€, ≤300L=1000€, >300L=1500€"]
    },
    "III.F": {
        "nome": "Allaccio a teleriscaldamento efficiente",
        "formula_status": "validato_tecnico",
        "tipo_formula": "percentuale_spesa",
        "attiva": true,
        "formula_base": "min(spesa, cmax_allaccio) * percentuale",
        "richiede": ["tipo_allaccio", "costo_allaccio", "potenza_allaccio_kw"],
        "mappatura_dati": {
            "spesa": "costo_allaccio",
            "tipo": "tipo_allaccio"
        },
        "blocchi": [],
        "versione_normativa": "CT3_DM_2025",
        "fonte": "normativa",
        "note": ["Cmax: 6.500€ singolo, 30.000€ multiplo"]
    }
};

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
    "II.G": { "nome": "Infrastrutture ricarica veicoli elettrici", "voci_suggerite": [ { "descrizione": "Fornitura infrastruttura di ricarica", "tipo_costo": "fornitura" }, { "descrizione": "Adeguamento elettrico e posa", "tipo_costo": "posa" }, { "descrizione": "Dichiarazioni e documentazione tecnica", "tipo_costo": "documentazione" } ] },
    "II.C": { "nome": "Schermature e ombreggiamento", "voci_suggerite": [ { "descrizione": "Fornitura sistemi schermanti", "tipo_costo": "fornitura" }, { "descrizione": "Posa e installazione", "tipo_costo": "posa" }, { "descrizione": "Motorizzazione e domotica", "tipo_costo": "fornitura" } ] },
    "II.D": { "nome": "Trasformazione nZEB", "voci_suggerite": [ { "descrizione": "Demolizione e ricostruzione", "tipo_costo": "fornitura" }, { "descrizione": "Progettazione e direzione lavori", "tipo_costo": "documentazione" }, { "descrizione": "Certificazione nZEB", "tipo_costo": "documentazione" } ] },
    "II.E": { "nome": "Illuminazione LED", "voci_suggerite": [ { "descrizione": "Fornitura corpi illuminanti LED", "tipo_costo": "fornitura" }, { "descrizione": "Adeguamento quadri e cablaggi", "tipo_costo": "posa" }, { "descrizione": "Progetto illuminotecnico", "tipo_costo": "documentazione" } ] },
    "III.B": { "nome": "Sistema ibrido gas + PDC", "voci_suggerite": [ { "descrizione": "Fornitura pompa di calore", "tipo_costo": "fornitura" }, { "descrizione": "Caldaia a gas e centralina ibrida", "tipo_costo": "fornitura" }, { "descrizione": "Posa e collegamenti", "tipo_costo": "posa" }, { "descrizione": "Configurazione e collaudo", "tipo_costo": "documentazione" } ] },
    "III.C": { "nome": "Generatore biomassa", "voci_suggerite": [ { "descrizione": "Fornitura caldaia/stufa biomassa", "tipo_costo": "fornitura" }, { "descrizione": "Posa e collegamenti", "tipo_costo": "posa" }, { "descrizione": "Sistema alimentazione e accumulo", "tipo_costo": "fornitura" }, { "descrizione": "Dichiarazione conformità", "tipo_costo": "documentazione" } ] },
    "III.D": { "nome": "Solare termico", "voci_suggerite": [ { "descrizione": "Fornitura pannelli solari termici", "tipo_costo": "fornitura" }, { "descrizione": "Accumulo e centralina", "tipo_costo": "fornitura" }, { "descrizione": "Posa e collegamenti idraulici", "tipo_costo": "posa" } ] },
    "III.E": { "nome": "Scaldacqua PDC", "voci_suggerite": [ { "descrizione": "Fornitura scaldacqua PDC", "tipo_costo": "fornitura" }, { "descrizione": "Posa e collegamenti", "tipo_costo": "posa" }, { "descrizione": "Smaltimento scaldacqua esistente", "tipo_costo": "opere_accessorie" } ] },
    "III.F": { "nome": "Allaccio teleriscaldamento", "voci_suggerite": [ { "descrizione": "Sotto-stazione di scambio", "tipo_costo": "fornitura" }, { "descrizione": "Scavo e posa tubazioni", "tipo_costo": "posa" }, { "descrizione": "Contabilizzazione", "tipo_costo": "fornitura" }, { "descrizione": "Disconnessione generatore esistente", "tipo_costo": "opere_accessorie" } ] }
};

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
        { "id": "MS-004", "nome": "Impresa terziario con richiesta preliminare prima dell'ordine", "obiettivo": "Verificare corretto percorso per impresa con effetto incentivante rispettato.", "input": { "soggetto": "Impresa", "categoria_catastale": "D/7", "ambito": "Terziario", "edificio_esistente": true, "accatastato": true, "impianto_climatizzazione_esistente": true, "interventi": [ "III.A" ], "stato_lavori": { "preliminare_inviata": "sì", "data_preliminare": "2026-01-10", "data_ordine": "2026-01-20" } }, "atteso": { "esito": "ammissibile_preliminare_o_da_verificare", "rischio_massimo_accettabile": "medio", "blocchi_attesi": [] } },
        { "id": "MS-005", "nome": "Antimafia: importo >150k senza documentazione", "obiettivo": "Verificare blocco per mancata documentazione antimafia oltre soglia.", "input": { "soggetto": "Impresa", "categoria_catastale": "D/7", "ambito": "Terziario", "edificio_esistente": true, "accatastato": true, "impianto_climatizzazione_esistente": true, "interventi": [ "III.A" ], "importo_richiesto": 180000, "documentazione_antimafia": false }, "atteso": { "esito": "non_ammissibile_o_blocco_intervento", "rischio": "alto", "blocchi_attesi": [ "Soglia ANTIMAFIA superata" ], "report_cliente_numeri": false } },
        { "id": "MS-006", "nome": "Accesso diretto: richiesta oltre 90 giorni", "obiettivo": "Verificare blocco per richiesta inviata oltre 90gg da fine lavori.", "input": { "soggetto": "Privato terziario", "categoria_catastale": "A/10", "ambito": "Terziario", "edificio_esistente": true, "accatastato": true, "impianto_climatizzazione_esistente": true, "interventi": [ "III.A" ], "data_richiesta": "2026-06-15", "data_fine_lavori": "2026-01-10", "is_prenotazione": false }, "atteso": { "esito": "non_ammissibile_o_blocco_intervento", "rischio": "medio", "blocchi_attesi": [ "ACCESSO DIRETTO: termine massimo 90 giorni" ], "report_cliente_numeri": false } },
        { "id": "MS-007", "nome": "PA comune <15.000 ab. con III.A", "obiettivo": "Verificare intensità 100% per PA con comuni sotto 15.000 abitanti.", "input": { "soggetto": "Pubblica Amministrazione", "categoria_catastale": "B/1", "ambito": "Terziario", "edificio_esistente": true, "accatastato": true, "impianto_climatizzazione_esistente": true, "interventi": [ "III.A" ], "comune_sotto_15k": true, "scuola_ospedale": false }, "atteso": { "esito": "ammissibile_preliminare_o_da_verificare", "rischio_massimo_accettabile": "basso", "intensita_attesa": 1.0, "blocchi_attesi": [] } },
        { "id": "MS-008", "nome": "Impresa multi-intervento Titolo II (II.A + II.B)", "obiettivo": "Verificare intensità 55% per multi-intervento Impresa su Titolo II.", "input": { "soggetto": "Impresa", "categoria_catastale": "D/7", "ambito": "Terziario", "edificio_esistente": true, "accatastato": true, "impianto_climatizzazione_esistente": true, "interventi": [ "II.A", "II.B" ], "multi_intervento": true }, "atteso": { "esito": "ammissibile_preliminare_o_da_verificare", "rischio_massimo_accettabile": "medio", "intensita_attesa": 0.55, "blocchi_attesi": [] } },
        { "id": "MS-009", "nome": "FV con potenza <2kW", "obiettivo": "Verificare blocco per FV sotto soglia minima 2 kW.", "input": { "soggetto": "Privato residenziale", "categoria_catastale": "A/2", "ambito": "Residenziale", "edificio_esistente": true, "accatastato": true, "impianto_climatizzazione_esistente": true, "interventi": [ "III.A", "II.H" ], "dati_tecnici": { "II.H": { "potenza_fv_kw": 1.5 } } }, "atteso": { "esito": "non_ammissibile_o_blocco_intervento", "rischio": "alto", "blocchi_attesi": [ "FV potenza minima 2 kW" ], "report_cliente_numeri": false } }
    ]
};
