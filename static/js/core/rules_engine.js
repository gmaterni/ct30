/**
 * rules_engine.js - Motore di validazione delle regole del Conto Termico 3.0.
 *
 * Gestisce la logica di ammissibilità basata su tipo di soggetto,
 * categoria catastale, anagrafiche, accesso diretto/prenotazione,
 * Titolo V per imprese, abbinamenti SA/SR e vincoli normativi generali.
 *
 * @module  rules_engine
 * @version 2.0.0
 * @date    2026-06-02
 */

"use strict";

import {
  RULES,
  CATASTO,
  SOGGETTI_CONFIG,
  MATRICE_SA_INTERVENTI,
  MATRICE_SA_SR,
  PROCEDURA_CONFIG,
  TERMINI_TEMPORALI,
  TERMINI_CONFIG,
  SOTTO_CATEGORIE_SA,
  INTERVENTI,
} from "./normativa.js";

import { CrossRuleEngine } from "./cross_rule_engine.js";

/**
 * Factory per il motore delle regole.
 *
 * @returns {Object} API pubblica del motore.
 */
const UaRulesEngine = function () {
  // 1. STATO PRIVATO

  /**
   * Recupera le configurazioni correnti (incluse le nuove matrici).
   * @returns {Object} Oggetto con regole, tabelle catastali e matrici.
   * @private
   */
  const _getEngineData = function () {
    return {
      rules: RULES,
      categories: CATASTO,
      soggetti: SOGGETTI_CONFIG,
      procedura: PROCEDURA_CONFIG,
      termini: TERMINI_TEMPORALI,
      terminiConfig: TERMINI_CONFIG,
      matriceSaInterventi: MATRICE_SA_INTERVENTI,
      matriceSaSr: MATRICE_SA_SR,
      sottoCategorie: SOTTO_CATEGORIE_SA,
    };
  };

  // 2. FUNZIONI DI UTILITÀ (MAPPING)

  /**
   * Mappa il tipo soggetto (chiave SOGGETTI_CONFIG) alla chiave
   * usata in MATRICE_SA_INTERVENTI e MATRICE_SA_SR.
   * @param {string} subjectType
   * @returns {string|null}
   * @private
   */
  const _mapToMatriceKey = function (subjectType) {
    const map = {
      "Pubblica Amministrazione": "pa",
      "Privato residenziale": "privato_residenziale",
      Condominio: "privato_residenziale",
      "Privato terziario": "privato_terziario",
      Impresa: "privato_terziario",
      "ETS non economico": "ets_non_economico",
      "ETS economico": "ets_economico",
      "Cooperativa edilizia": "cooperativa_edilizia",
      IAP: "iap",
    };
    return map[subjectType] || null;
  };

  /**
   * Mappa il tipo SR (chiave SOGGETTI_CONFIG) al valore usato
   * in MATRICE_SA_SR[x].sr_ammessi.
   * @param {string} srType
   * @returns {string|null}
   * @private
   */
  const _mapSRToMatriceValue = function (srType) {
    const map = {
      "Pubblica Amministrazione": "pa",
      "Privato residenziale": "privato",
      Condominio: "privato",
      "Privato terziario": "privato",
      Impresa: "privato",
      "ETS non economico": "ets_non_economico",
      "ETS economico": "privato",
      "Cooperativa edilizia": "pa",
      IAP: "privato",
      ESCO: "esco",
      CER: "cer",
      AUC: "auc",
    };
    return map[srType] || null;
  };

  /**
   * Verifica se il tipo soggetto richiede la richiesta preliminare
   * (effetto incentivante), usando SOTTO_CATEGORIE_SA quando applicabile.
   * @param {string} subjectType
   * @returns {boolean}
   * @private
   */
  const _checkRichiestaPreliminare = function (subjectType) {
    const soggetti = _getEngineData().soggetti;
    const soggetto = soggetti[subjectType];
    if (!soggetto) return false;

    // Controllo diretto dal flag in SOGGETTI_CONFIG
    if (soggetto.richiesta_preliminare === true) return true;

    // Controllo tramite sotto-categoria (es. impresa -> SOTTO_CATEGORIE_SA.impresa.regole.richiesta_preliminare)
    const sottoCat = soggetto.sotto_categoria;
    if (sottoCat && SOTTO_CATEGORIE_SA[sottoCat]) {
      const regole = SOTTO_CATEGORIE_SA[sottoCat].regole;
      if (regole && regole.richiesta_preliminare === true) return true;
    }

    return false;
  };

  // 3. FUNZIONI PRIVATE (ESISTENTI, MODIFICATE DOVE RICHIESTO)

  /**
   * Verifica l'effetto incentivante (Richiesta Preliminare).
   * Obbligatorio per Imprese, ETS economici ed ESCO.
   * La richiesta deve essere inviata PRIMA di qualunque impegno
   * giuridicamente vincolante (ordine/inizio lavori).
   *
   * MODIFICATA: ora usa _checkRichiestaPreliminare che deriva da
   * SOTTO_CATEGORIE_SA.impresa.regole.richiesta_preliminare oltre
   * che dal flag diretto in SOGGETTI_CONFIG.
   *
   * @private
   */
  const _checkEffettoIncentivante = function (input) {
    const requiresPreliminary = _checkRichiestaPreliminare(input.subjectType);

    const result = { success: true, error: "" };

    if (requiresPreliminary) {
      if (!input.richiestaPreliminareInviata) {
        result.success = false;
        result.error =
          "EFFETTO INCENTIVANTE: Per le imprese è obbligatorio inviare la Richiesta Preliminare PRIMA di firmare contratti o emettere ordini.";
      } else {
        if (input.dataRichiestaPreliminare && input.dataPrimoImpegno) {
          const d1 = new Date(input.dataRichiestaPreliminare);
          const d2 = new Date(input.dataPrimoImpegno);
          if (d1 >= d2) {
            result.success = false;
            result.error =
              "EFFETTO INCENTIVANTE: La data della Richiesta Preliminare deve essere precedente alla data del primo impegno (ordine/contratto).";
          }
        }
      }
    }

    return result;
  };

  /**
   * Valida se un soggetto può accedere a un determinato titolo di intervento.
   *
   * MODIFICATA: ora usa MATRICE_SA_INTERVENTI invece di
   * SOGGETTI_CONFIG[x].titoli_ammessi.
   *
   * @param {string} subjectType - Tipo di soggetto (es. 'Pubblica Amministrazione').
   * @param {string} titleCode - Titolo (es. 'II', 'III', 'DE').
   * @returns {boolean} True se compatibile.
   * @private
   */
  const _isSubjectCompatible = function (subjectType, titleCode) {
    if (!subjectType || !titleCode) {
      return false;
    }

    const matriceKey = _mapToMatriceKey(subjectType);
    if (!matriceKey) {
      console.error(
        "_isSubjectCompatible: Soggetto '" +
          subjectType +
          "' non mappabile in MATRICE_SA_INTERVENTI.",
      );
      return false;
    }

    const entry = MATRICE_SA_INTERVENTI[matriceKey];
    if (!entry) {
      return false;
    }

    const fieldMap = {
      II: "titolo_ii",
      III: "titolo_iii",
      DE: "diagnosi",
    };

    const field = fieldMap[titleCode];
    if (!field) {
      return false;
    }

    return entry[field] === true;
  };

  /**
   * Valida l'ammissibilità basata sulla categoria catastale.
   *
   * Categorie di lusso (A/1, A/8, A/9) ammesse solo per PA o ETS non economico.
   *
   * @param {string} categoryCode - Codice catastale (es. 'A/1', 'C/2').
   * @param {string} subjectType - Tipo di soggetto (opzionale, per validare eccezioni).
   * @returns {Object} Risultato con status e titoli ammessi.
   * @private
   */
  const _checkCatastale = function (categoryCode, subjectType) {
    const data = _getEngineData();
    const categories = data.categories ? data.categories.categorie : null;

    const result = {
      isAllowed: false,
      allowedTitles: [],
      reason: "",
    };

    if (!categories) {
      result.reason = "Dati catastali non caricati.";
      return result;
    }

    if (!categoryCode) {
      result.reason = "Categoria catastale mancante.";
      return result;
    }

    const normalizedCode = categoryCode.trim().toUpperCase();
    const catInfo = categories[normalizedCode];

    if (!catInfo) {
      result.reason = "Categoria '" + normalizedCode + "' non riconosciuta.";
      return result;
    }

    // Categoriale assolutamente escluse (per tutti i soggetti)
    if (catInfo.ammissibile === false && !catInfo.motivo?.includes("salvo")) {
      result.isAllowed = false;
      result.reason = catInfo.motivo || "Categoria esclusa dagli incentivi.";
      return result;
    }

    // Categorie di lusso: A/1, A/8, A/9 ammesse solo per PA o ETS non economico
    const categoriesLuxury = ["A/1", "A/8", "A/9"];

    if (categoriesLuxury.includes(normalizedCode)) {
      const isPA =
        subjectType === "Pubblica Amministrazione" || subjectType === "PA";
      const isETSNonEcon = subjectType === "ETS non economico";

      if (!isPA && !isETSNonEcon) {
        result.isAllowed = false;
        result.reason =
          "La categoria " +
          normalizedCode +
          " è esclusa per il soggetto " +
          (subjectType || "Privato") +
          ". Ammessa solo per PA o ETS non economico.";
        return result;
      }
    }

    result.isAllowed = true;
    result.allowedTitles = ["II", "III"];

    return result;
  };

  /**
   * Verifica l'obbligo di sostituzione dell'impianto esistente (Art. 25 D.M. 7 Agosto 2025).
   *
   * @param {number} potenzaEsistenteKw - Potenza del generatore esistente in kW.
   * @returns {Object} Risultato della validazione.
   * @private
   */
  const _checkSostituzioneObbligatoria = function (potenzaEsistenteKw) {
    const res = { success: true, error: "" };

    if (potenzaEsistenteKw === undefined || potenzaEsistenteKw === null) {
      res.success = false;
      res.error =
        "Art. 25 (Sostituzione): Dati sulla potenza esistente mancanti.";
      return res;
    }

    const pn = parseFloat(potenzaEsistenteKw) || 0;

    if (pn <= 0) {
      res.success = false;
      res.error =
        "Art. 25 (Sostituzione): L'accesso agli incentivi per interventi di climatizzazione richiede la sostituzione di un impianto esistente (Potenza > 0 kW).";
      return res;
    }

    return res;
  };

  /**
   * Verifica la soglia antimafia (Art. 5 comma 5 D.M. 7/8/2025).
   *
   * @param {number} importoRichiesto - Importo complessivo richiesto.
   * @param {boolean} documentazioneAntimafia - Flag se la doc. antimafia è presente.
   * @returns {Object} Risultato della validazione.
   * @private
   */
  const _checkAntimafia = function (importoRichiesto, documentazioneAntimafia) {
    const res = { success: true, error: "" };
    const soglia = PROCEDURA_CONFIG.SOGLIA_ANTIMAFIA;

    if (importoRichiesto > soglia && !documentazioneAntimafia) {
      res.success = false;
      res.error =
        "Soglia ANTIMAFIA: L'importo richiesto (" +
        importoRichiesto.toLocaleString("it-IT") +
        "€) supera la soglia di " +
        soglia.toLocaleString("it-IT") +
        "€. È obbligatoria la documentazione antimafia (D.Lgs. 159/2011).";
    }

    return res;
  };

  /**
   * Verifica il termine di 60 giorni per accesso diretto (Art. 10 comma 1 D.M. 7/8/2025).
   *
   * @param {boolean} isPrenotazione - Se l'accesso è in prenotazione.
   * @param {string} dataRichiesta - Data di invio della richiesta (YYYY-MM-DD).
   * @param {string} dataFineLavori - Data di fine lavori / collaudo (YYYY-MM-DD).
   * @returns {Object} Risultato della validazione.
   * @private
   */
  const _checkAccessoDiretto = function (
    isPrenotazione,
    dataRichiesta,
    dataFineLavori,
  ) {
    const res = { success: true, error: "" };
    const termineGiorni = TERMINI_TEMPORALI.accesso_diretto_domanda_gg;

    if (isPrenotazione) {
      return res;
    }

    if (!dataRichiesta || !dataFineLavori) {
      res.success = false;
      res.error =
        "ACCESSO DIRETTO: Per completare la verifica del termine di " +
        termineGiorni +
        " giorni, sono necessarie la data di richiesta e la data di fine lavori.";
      return res;
    }

    const dtRichiesta = new Date(dataRichiesta);
    const dtFineLavori = new Date(dataFineLavori);

    if (isNaN(dtRichiesta.getTime()) || isNaN(dtFineLavori.getTime())) {
      res.success = false;
      res.error =
        "ACCESSO DIRETTO: Date non valide per la verifica del termine.";
      return res;
    }

    const diffGiorni = Math.floor(
      (dtRichiesta - dtFineLavori) / (1000 * 60 * 60 * 24),
    );

    if (diffGiorni < 0) {
      res.success = false;
      res.error =
        "ACCESSO DIRETTO: La richiesta (" +
        dataRichiesta +
        ") è stata inviata prima della fine lavori (" +
        dataFineLavori +
        "). La richiesta deve essere inviata DOPO il collaudo.";
    } else if (diffGiorni > termineGiorni) {
      res.success = false;
      res.error =
        "ACCESSO DIRETTO: La richiesta è stata inviata " +
        diffGiorni +
        " giorni dopo la fine lavori. Il termine massimo è di " +
        termineGiorni +
        " giorni (Art. 10 comma 1).";
    }

    return res;
  };

  /**
   * Verifica se la tipologia di intervento è ammissibile per il soggetto.
   * Gestisce regole specifiche come l'esclusione di PDC a gas per Imprese ed ETS economici.
   *
   * @param {string} subjectType - Tipo di soggetto (es. 'Impresa', 'ETS economico').
   * @param {string} interventoCode - Codice intervento (es. 'III.A').
   * @param {Object} interventoDati - Dati tecnici dell'intervento.
   * @returns {Object} Risultato della validazione.
   * @private
   */
  const _checkInterventoAmmissibilita = function (
    subjectType,
    interventoCode,
    interventoDati,
  ) {
    const res = { success: true, error: "" };

    if (!subjectType || !interventoCode) {
      return res;
    }

    // Verifica compatibilità soggetto/titolo (MATRICE_SA_INTERVENTI)
    var code = interventoCode || "";
    var titleCode =
      code.indexOf("II.") === 0
        ? "II"
        : code.indexOf("III.") === 0
          ? "III"
          : null;
    if (titleCode && !_isSubjectCompatible(subjectType, titleCode)) {
      var errMsg =
        "INTERVENTO: Il codice " +
        code +
        " (Titolo " +
        titleCode +
        ") non è ammesso per il soggetto '" +
        subjectType +
        "'.";
      res.success = false;
      res.error = errMsg;
      return res;
    }

    // Regola specifica: Esclusione PDC a gas per Imprese ed ETS economici (Art. 25 comma 2)
    const soggettiEsclusiPdCGas = ["Impresa", "ETS economico"];
    const tipologieGasEscluse = ["ibrido", "gas", "hybrid", "metano", "gpl"];

    if (
      soggettiEsclusiPdCGas.includes(subjectType) &&
      interventoCode === "III.A"
    ) {
      const dati = interventoDati || {};
      const tipologiaPdc = (
        dati.tipologia_pdc ||
        dati.tipologia ||
        ""
      ).toLowerCase();

      const isPdCGas = tipologieGasEscluse.some(function (t) {
        return tipologiaPdc.includes(t);
      });

      if (isPdCGas) {
        res.success = false;
        res.error =
          "Art. 25 comma 2: Le PDC a gas o ibride non sono ammesse per " +
          subjectType +
          ".";
        return res;
      }
    }

    // III.B: rapporto PdC/caldaia ≤0.5 per sistemi ibridi (Manuale Analitico Sez.6)
    if (interventoCode === "III.B") {
      const dati = interventoDati || {};
      const tipoSistema = (dati.tipo_sistema || "").toLowerCase();
      const potenzaPdc = parseFloat(dati.potenza_pdc_kw) || 0;
      const potenzaCaldaia = parseFloat(dati.potenza_caldaia_kw) || 0;
      if (
        tipoSistema.indexOf("ibrido") !== -1 &&
        potenzaCaldaia > 0 &&
        potenzaPdc / potenzaCaldaia > 0.5
      ) {
        res.success = false;
        res.error =
          "III.B: rapporto PdC/caldaia " +
          (potenzaPdc / potenzaCaldaia).toFixed(2) +
          " supera il limite 0.5 per sistemi ibridi factory made (Manuale Analitico Sez.6).";
        return res;
      }
    }

    // III.D Solar Cooling: DEC ≥8 m²/(1000 m³/h) (Manuale Analitico Sez.6)
    if (interventoCode === "III.D") {
      const dati = interventoDati || {};
      const uso = (dati.uso_solare || "").trim();
      if (uso === "Solar Cooling") {
        const sup = parseFloat(dati.superficie_lorda_mq) || 0;
        const potAss = parseFloat(dati.potenza_assorbitore_kw) || 0;
        const portAria = parseFloat(dati.portata_aria_m3h) || 0;
        if (potAss > 0) {
          const rapporto = sup / potAss;
          if (rapporto < 2 || rapporto > 2.75) {
            res.success = false;
            res.error =
              "III.D Solar Cooling: rapporto superficie/potenza assorbitore " +
              rapporto.toFixed(2) +
              " m²/kW fuori range [2.0–2.75] (Manuale Analitico Sez.6).";
            return res;
          }
        }
        if (portAria > 0) {
          const dec = sup / (portAria / 1000);
          if (dec < 8) {
            res.success = false;
            res.error =
              "III.D Solar Cooling: DEC " +
              dec.toFixed(2) +
              " m²/(1000 m³/h) inferiore al minimo 8 (Manuale Analitico Sez.6).";
            return res;
          }
        }
      }
    }

    return res;
  };

  // 4. NUOVE FUNZIONI PRIVATE

  /**
   * Valida le tre anagrafiche obbligatorie: proprietario, richiedente (SA),
   * responsabile (SR). Verifica completezza, flag di coincidenza e
   * documenti accessori obbligatori.
   *
   * @param {Object} anagraficheData - { proprietario, richiedente, responsabile, delegato }
   * @returns {Object} { success, errors, warnings }
   * @private
   */
  const validateAnagrafiche = function (anagraficheData) {
    const errors = [];
    const warnings = [];

    if (!anagraficheData) {
      return {
        success: false,
        errors: ["Dati anagrafici mancanti."],
        warnings: [],
      };
    }

    const prop = anagraficheData.proprietario;
    const rich = anagraficheData.richiedente;
    const resp = anagraficheData.responsabile;

    // 1. Tutte e tre le anagrafiche obbligatorie devono esistere
    if (!prop) {
      errors.push(
        "PROPRIETARIO: Dati anagrafici del proprietario mancanti. Ogni pratica CT3.0 richiede la scheda proprietario.",
      );
    }
    if (!rich) {
      errors.push(
        "RICHIEDENTE/SA: Dati anagrafici del richiedente mancanti. Ogni pratica CT3.0 richiede la scheda richiedente.",
      );
    }
    if (!resp) {
      errors.push(
        "RESPONSABILE/SR: Dati anagrafici del responsabile mancanti. Ogni pratica CT3.0 richiede la scheda responsabile.",
      );
    }

    if (!prop || !rich || !resp) {
      return { success: false, errors: errors, warnings: warnings };
    }

    // 2. Coerenza flag coincide_con_* rispetto ai CF/P.IVA
    const propCf = (prop.cf_piva || "").trim().toUpperCase();
    const richCf = (rich.cf_piva || "").trim().toUpperCase();
    const respCf = (resp.cf_piva || "").trim().toUpperCase();

    const propUgualeRich = propCf && richCf && propCf === richCf;
    const propUgualeResp = propCf && respCf && propCf === respCf;
    const richUgualeResp = richCf && respCf && richCf === respCf;

    // Se CF uguali, i flag devono rifletterlo
    if (propUgualeRich && !rich.coincide_con_proprietario) {
      warnings.push(
        "PROPRIETARIO/RICHIEDENTE: CF/P.IVA coincidenti ma flag 'coincide_con_proprietario' non impostato per il richiedente.",
      );
    }
    if (propUgualeResp && !resp.coincide_con_proprietario) {
      warnings.push(
        "PROPRIETARIO/RESPONSABILE: CF/P.IVA coincidenti ma flag 'coincide_con_proprietario' non impostato per il responsabile.",
      );
    }
    if (richUgualeResp && !resp.coincide_con_richiedente) {
      warnings.push(
        "RICHIEDENTE/RESPONSABILE: CF/P.IVA coincidenti ma flag 'coincide_con_richiedente' non impostato per il responsabile.",
      );
    }

    // Se CF diversi, i flag non devono essere attivi
    if (!propUgualeRich && rich.coincide_con_proprietario === true) {
      warnings.push(
        "PROPRIETARIO/RICHIEDENTE: CF/P.IVA diversi ma flag 'coincide_con_proprietario' attivo per il richiedente.",
      );
    }
    if (!propUgualeResp && resp.coincide_con_proprietario === true) {
      warnings.push(
        "PROPRIETARIO/RESPONSABILE: CF/P.IVA diversi ma flag 'coincide_con_proprietario' attivo per il responsabile.",
      );
    }
    if (!richUgualeResp && resp.coincide_con_richiedente === true) {
      warnings.push(
        "RICHIEDENTE/RESPONSABILE: CF/P.IVA diversi ma flag 'coincide_con_richiedente' attivo per il responsabile.",
      );
    }

    // 3. Proprietario ≠ Richiedente → Atto di Assenso obbligatorio
    // Se il richiedente ha titolo di possesso (usufrutto, locazione, comodato),
    // è SA legittimo e non serve atto di assenso (RA §3.1)
    const propCoincideRich =
      rich.coincide_con_proprietario === true ||
      prop.coincide_con_richiedente === true;
    const haTitoloPossesso = rich.titolo_possesso === true;
    if (!propCoincideRich && !propUgualeRich && !haTitoloPossesso) {
      if (!rich.atto_assenso && !prop.atto_assenso) {
        errors.push(
          "PROPRIETARIO: Se il proprietario è diverso dal Richiedente (SA), è obbligatorio disporre dell'Atto di Assenso del proprietario.",
        );
      }
    }

    // 4. Richiedente = Condominio → verbale assemblea + tabella millesimale
    const tipoRich = rich.tipo_soggetto || "";
    if (tipoRich === "Condominio") {
      if (!rich.verbale_assemblea) {
        errors.push(
          "CONDOMINIO: È obbligatorio il verbale dell'assemblea condominiale che approva l'intervento.",
        );
      }
      if (!rich.tabella_millesimale) {
        errors.push(
          "CONDOMINIO: È obbligatoria la tabella millesimale per la ripartizione delle spese.",
        );
      }
    }

    // 5. Responsabile ≠ Richiedente e SR = ESCO → contratto EPC obbligatorio
    const respCoincideRich =
      resp.coincide_con_richiedente === true ||
      rich.coincide_con_responsabile === true;
    const tipoResp = resp.tipo_soggetto || "";
    if (!respCoincideRich && tipoResp === "ESCO") {
      if (!resp.contratto_epc) {
        errors.push(
          "RESPONSABILE/SR: Se il SR è ESCO ed è diverso dal Richiedente, è obbligatorio allegare il contratto EPC (UNI CEI EN 17669).",
        );
      }
    }

    // ESCO: certificazione UNI CEI 11352 valida
    if (tipoResp === "ESCO") {
      if (!resp.certificazione_11352_valida) {
        errors.push(
          "RESPONSABILE/SR: L'ESCO deve possedere certificazione UNI CEI 11352 valida al momento della richiesta.",
        );
      }
    }

    // 6. Mandato irrevocabile all'incasso obbligatorio se SR ≠ PA
    const isSRPA = tipoResp === "Pubblica Amministrazione" || tipoResp === "PA";
    if (!isSRPA) {
      if (!resp.mandato_incasso) {
        errors.push(
          "RESPONSABILE/SR: Per soggetti non PA è obbligatorio conferire il mandato irrevocabile all'incasso (Art. 13 comma 5).",
        );
      }
    }

    return {
      success: errors.length === 0,
      errors: errors,
      warnings: warnings,
    };
  };

  /**
   * Valida la modalità di accesso (diretto vs prenotazione).
   *
   * @param {string} modalitaAccesso - "diretto" | "prenotazione"
   * @param {Object} datiPratica - { soggetto, dataFineLavori, dataRichiesta, isPrenotazione, cup, ... }
   * @returns {Object} { success, errors, warnings }
   * @private
   */
  const validateAccesso = function (modalitaAccesso, datiPratica) {
    const errors = [];
    const warnings = [];

    if (!modalitaAccesso) {
      return {
        success: false,
        errors: ["Modalità di accesso non specificata."],
        warnings: [],
      };
    }

    if (!datiPratica) {
      return {
        success: false,
        errors: [
          "Dati della pratica mancanti per la validazione dell'accesso.",
        ],
        warnings: [],
      };
    }

    const norm = modalitaAccesso.toLowerCase();

    if (norm === "diretto") {
      // Accesso diretto: qualsiasi soggetto, post-intervento, entro 60 giorni

      // Intervento già completato (dataFineLavori passata)
      if (datiPratica.dataFineLavori) {
        const dataFine = new Date(datiPratica.dataFineLavori);
        if (isNaN(dataFine.getTime())) {
          errors.push("ACCESSO DIRETTO: Data fine lavori non valida.");
        } else if (dataFine > new Date()) {
          errors.push(
            "ACCESSO DIRETTO: L'intervento deve essere già concluso. La data fine lavori (" +
              datiPratica.dataFineLavori +
              ") è futura.",
          );
        }
      } else {
        errors.push(
          "ACCESSO DIRETTO: Per accesso diretto è richiesta la data di conclusione lavori.",
        );
      }

      // Verifica termine 60 giorni (richiama la funzione esistente)
      const check60 = _checkAccessoDiretto(
        false,
        datiPratica.dataRichiesta,
        datiPratica.dataFineLavori,
      );
      if (!check60.success) {
        errors.push(check60.error);
      }
    } else if (norm === "prenotazione") {
      // Accesso su prenotazione: solo PA o ETS non economico

      const tipoSoggetto = datiPratica.soggetto || "";

      // Verifica che il soggetto sia abilitato alla prenotazione
      const soggettiConfig = _getEngineData().soggetti;
      const configSoggetto = soggettiConfig[tipoSoggetto];
      const puoPrenotare =
        configSoggetto && configSoggetto.prenotazione === true;

      if (!puoPrenotare) {
        errors.push(
          "PRENOTAZIONE: Solo la Pubblica Amministrazione e gli ETS non economici possono accedere alla prenotazione. Il soggetto '" +
            tipoSoggetto +
            "' non è abilitato.",
        );
      }

      // Intervento NON ancora realizzato
      if (datiPratica.dataFineLavori) {
        const dataFine = new Date(datiPratica.dataFineLavori);
        if (!isNaN(dataFine.getTime()) && dataFine < new Date()) {
          errors.push(
            "PRENOTAZIONE: L'intervento non deve essere ancora realizzato. La prenotazione è per interventi a preventivo.",
          );
        }
      }

      // CUP obbligatorio
      if (!datiPratica.cup) {
        errors.push(
          "PRENOTAZIONE: Per l'accesso su prenotazione è obbligatorio il Codice Unico di Progetto (CUP).",
        );
      }

      // 50% del budget PA (warning informativo)
      warnings.push(
        "PRENOTAZIONE: L'istanza sarà valutata nei limiti del contingente PA (50% del budget annuo complessivo).",
      );
    } else {
      errors.push(
        "Modalità di accesso '" +
          modalitaAccesso +
          "' non riconosciuta. Valori ammessi: 'diretto', 'prenotazione'.",
      );
    }

    return {
      success: errors.length === 0,
      errors: errors,
      warnings: warnings,
    };
  };

  /**
   * Valida le regole del Titolo V per le Imprese.
   *
   * @param {Object} datiImpresa - { tipoSoggetto, dimensione, richiestaPreliminareInviata,
   *        dataRichiestaPreliminare, dataPrimoImpegno, apePreDisponibile,
   *        apePostDisponibile, haCombustibiliFossili, riduzioneEP }
   * @param {string[]} interventi - Lista codici intervento (es. ["II.A", "III.A"])
   * @returns {Object} { success, errors, warnings, intensitaBase, maggiorazioneDimensione }
   * @private
   */
  const validateTitoloV = function (datiImpresa, interventi) {
    const errors = [];
    const warnings = [];

    if (!datiImpresa) {
      return {
        success: false,
        errors: ["Dati impresa mancanti per validazione Titolo V."],
        warnings: [],
        intensitaBase: 0,
        maggiorazioneDimensione: 0,
      };
    }

    const regoleImpresa = SOTTO_CATEGORIE_SA.impresa.regole;

    // Determina se è multi-intervento
    const isMulti =
      interventi && Array.isArray(interventi) && interventi.length >= 2;

    // Determina i titoli coinvolti
    const hasTitoloII =
      interventi &&
      Array.isArray(interventi) &&
      interventi.some(function (c) {
        return c.startsWith("II.");
      });
    const hasTitoloIII =
      interventi &&
      Array.isArray(interventi) &&
      interventi.some(function (c) {
        return c.startsWith("III.");
      });

    // 1. Richiesta PRELIMINARE obbligatoria prima avvio lavori
    if (!datiImpresa.richiestaPreliminareInviata) {
      errors.push(
        "TITOLO V (R01): Richiesta preliminare obbligatoria prima dell'avvio lavori. Inviare tramite PEC a preliminareimpreseCT3@pec.gse.it.",
      );
    } else {
      // 2. Data richiesta preliminare < data primo impegno
      if (
        datiImpresa.dataRichiestaPreliminare &&
        datiImpresa.dataPrimoImpegno
      ) {
        const dPrel = new Date(datiImpresa.dataRichiestaPreliminare);
        const dImp = new Date(datiImpresa.dataPrimoImpegno);
        if (!isNaN(dPrel.getTime()) && !isNaN(dImp.getTime())) {
          if (dPrel >= dImp) {
            errors.push(
              "TITOLO V (R02): La data della richiesta preliminare (" +
                datiImpresa.dataRichiestaPreliminare +
                ") deve essere antecedente alla data del primo impegno di spesa (" +
                datiImpresa.dataPrimoImpegno +
                ").",
            );
          }
        }
      }
    }

    // 3. Riduzione domanda energia primaria
    if (
      datiImpresa.riduzioneEP !== undefined &&
      datiImpresa.riduzioneEP !== null
    ) {
      const riduzione = parseFloat(datiImpresa.riduzioneEP);
      const sogliaMinima = isMulti
        ? regoleImpresa.riduzione_ep_multi
        : regoleImpresa.riduzione_ep_singolo;

      if (!isNaN(riduzione)) {
        if (riduzione < sogliaMinima) {
          const label = isMulti
            ? "≥ 20% (multi-intervento)"
            : "≥ 10% (singolo intervento)";
          errors.push(
            "TITOLO V (R03): Riduzione domanda energia primaria insufficiente (" +
              Number(riduzione).toLocaleString("it-IT") +
              "%). Richiesto " +
              label +
              ".",
          );
        }
      } else {
        warnings.push(
          "TITOLO V: Dato 'riduzioneEP' non numerico. Verifica riduzione energia primaria non eseguita.",
        );
      }
    } else {
      warnings.push(
        "TITOLO V: Riduzione domanda energia primaria non fornita. Obbligatorio: ≥ " +
          (isMulti ? "20" : "10") +
          "%.",
      );
    }

    // 4. APE pre e post obbligatorio
    if (!datiImpresa.apePreDisponibile) {
      errors.push(
        "TITOLO V (R04): APE pre-intervento obbligatorio per le imprese (Art. 25 D.M. 7/8/2025).",
      );
    }
    if (!datiImpresa.apePostDisponibile) {
      errors.push(
        "TITOLO V (R04): APE post-intervento obbligatorio per le imprese (Art. 25 D.M. 7/8/2025).",
      );
    }

    // 5. Divieto combustibili fossili
    if (
      datiImpresa.haCombustibiliFossili === true ||
      datiImpresa.haCombustibiliFossili === "si" ||
      datiImpresa.haCombustibiliFossili === "Sì"
    ) {
      errors.push(
        "TITOLO V (R05): Vietati apparecchi a combustibili fossili (incluso gas naturale). L'impresa non può installare generatori alimentati a combustibili fossili.",
      );
    }

    // 6. Limite singola impresa: 30 M€/intervento
    if (
      datiImpresa.costoIntervento !== undefined &&
      datiImpresa.costoIntervento !== null
    ) {
      const costo = parseFloat(datiImpresa.costoIntervento);
      const limite = regoleImpresa.limite_singolo_intervento_milioni * 1000000;
      if (!isNaN(costo) && costo > limite) {
        errors.push(
          "TITOLO V (R06): Costo intervento (" +
            costo.toLocaleString("it-IT") +
            "€) supera il limite di " +
            Number(
              regoleImpresa.limite_singolo_intervento_milioni,
            ).toLocaleString("it-IT") +
            " M€ per singola impresa.",
        );
      }
    }

    // 7. Intensità base
    let intensitaBase = 0;
    const intensitaII = isMulti
      ? regoleImpresa.intensita_titolo_ii_multi ||
        regoleImpresa.intensita_titolo_ii_base
      : regoleImpresa.intensita_titolo_ii_base;
    if (hasTitoloII && hasTitoloIII) {
      intensitaBase = Math.max(
        intensitaII,
        regoleImpresa.intensita_titolo_iii_base,
      );
    } else if (hasTitoloII) {
      intensitaBase = intensitaII;
    } else if (hasTitoloIII) {
      intensitaBase = regoleImpresa.intensita_titolo_iii_base;
    }

    // 8. Maggiorazione dimensionale
    let maggiorazioneDimensione = 0;
    const dim = (datiImpresa.dimensione || "").toLowerCase();
    if (dim === "piccola") {
      maggiorazioneDimensione = regoleImpresa.maggiorazione_piccola_impresa;
    } else if (dim === "media") {
      maggiorazioneDimensione = regoleImpresa.maggiorazione_media_impresa;
    } else if (dim === "grande") {
      maggiorazioneDimensione = regoleImpresa.maggiorazione_grande_impresa;
    }

    // 9. Multi-intervento max 65% cumulativo
    if (isMulti) {
      const cumulativo = intensitaBase + maggiorazioneDimensione;
      if (cumulativo > regoleImpresa.intensita_multi_cumulativo_max) {
        warnings.push(
          "TITOLO V: L'intensità cumulativa (" +
            (cumulativo * 100).toFixed(0) +
            "%) supera il massimo del " +
            (regoleImpresa.intensita_multi_cumulativo_max * 100).toFixed(0) +
            "% per multi-intervento. Verrà applicato il tetto massimo.",
        );
      }
    }

    // 10. Cap II.D/II.G/II.H: intensità massima 30% (RA §4.2.1 nota 6)
    const interventiCap30 = ["II.D", "II.G", "II.H"];
    const haCap30 =
      interventi &&
      Array.isArray(interventi) &&
      interventi.some(function (c) {
        return interventiCap30.includes(c);
      });
    if (haCap30) {
      const finale = intensitaBase + maggiorazioneDimensione;
      if (finale > 0.3) {
        warnings.push(
          "TITOLO V: Intensità max 30% per interventi II.D/II.G/II.H (RA §4.2.1 nota 6). L'intensità calcolata (" +
            (finale * 100).toFixed(0) +
            "%) verrà cappata a 30%.",
        );
        intensitaBase = 0.3;
        maggiorazioneDimensione = 0;
      }
    }

    // 11. Conservazione documenti: 10 anni (avviso informativo)
    warnings.push(
      "TITOLO V: Obbligo di conservazione documentale per " +
        regoleImpresa.conservazione_documenti_anni +
        " anni (aiuti di Stato).",
    );

    return {
      success: errors.length === 0,
      errors: errors,
      warnings: warnings,
      intensitaBase: intensitaBase,
      maggiorazioneDimensione: maggiorazioneDimensione,
    };
  };

  /**
   * Valida che il tipo SR sia compatibile con il tipo SA
   * secondo la matrice MATRICE_SA_SR.
   *
   * @param {string} tipoSA - Tipo soggetto SA (chiave SOGGETTI_CONFIG)
   * @param {string} tipoSR - Tipo soggetto SR (chiave SOGGETTI_CONFIG)
   * @returns {Object} { success, error }
   * @private
   */
  const validateCoincidenzaSRSA = function (tipoSA, tipoSR) {
    if (!tipoSA || !tipoSR) {
      return {
        success: false,
        error:
          "Tipo SA e tipo SR sono obbligatori per la verifica di compatibilità.",
      };
    }

    const saKey = _mapToMatriceKey(tipoSA);
    if (!saKey) {
      return {
        success: false,
        error: "Tipo SA '" + tipoSA + "' non riconosciuto nella matrice SA→SR.",
      };
    }

    const srValue = _mapSRToMatriceValue(tipoSR);
    if (!srValue) {
      return {
        success: false,
        error: "Tipo SR '" + tipoSR + "' non riconosciuto nella matrice SA→SR.",
      };
    }

    const matriceRow = MATRICE_SA_SR[saKey];
    if (!matriceRow) {
      return {
        success: false,
        error:
          "Nessuna regola di abbinamento SR per SA di tipo '" + tipoSA + "'.",
      };
    }

    const ammessi = matriceRow.sr_ammessi || [];
    const isAmmesso = ammessi.indexOf(srValue) !== -1;

    if (!isAmmesso) {
      return {
        success: false,
        error:
          "ABBINAMENTO SA→SR: Il soggetto '" +
          tipoSR +
          "' non è un Responsabile (SR) ammesso per il Richiedente (SA) di tipo '" +
          tipoSA +
          "'. SR ammessi: " +
          ammessi.join(", ") +
          ".",
      };
    }

    return { success: true, error: "" };
  };

  /**
   * Valida che ogni intervento selezionato sia ammesso per il
   * tipo SA e ambito specificati, utilizzando MATRICE_SA_INTERVENTI.
   * Verifica anche gli abbinamenti obbligati tra interventi.
   *
   * @param {string} tipoSA - Tipo soggetto SA (chiave SOGGETTI_CONFIG)
   * @param {string} ambito - "residenziale" | "terziario" | "entrambi"
   * @param {string[]} codiciIntervento - Lista codici intervento
   * @returns {Object} { success, errors, warnings }
   * @private
   */
  const validateInterventiPerSoggetto = function (
    tipoSA,
    ambito,
    codiciIntervento,
  ) {
    const errors = [];
    const warnings = [];

    if (!tipoSA) {
      return {
        success: false,
        errors: ["Tipo SA non specificato."],
        warnings: [],
      };
    }

    if (
      !codiciIntervento ||
      !Array.isArray(codiciIntervento) ||
      codiciIntervento.length === 0
    ) {
      return {
        success: false,
        errors: ["Nessun intervento selezionato."],
        warnings: [],
      };
    }

    const matriceKey = _mapToMatriceKey(tipoSA);
    if (!matriceKey) {
      return {
        success: false,
        errors: [
          "Tipo SA '" + tipoSA + "' non mappabile nella matrice SA→Interventi.",
        ],
        warnings: [],
      };
    }

    const entry = MATRICE_SA_INTERVENTI[matriceKey];
    if (!entry) {
      return {
        success: false,
        errors: [
          "Nessuna regola di ammissibilità interventi per SA '" + tipoSA + "'.",
        ],
        warnings: [],
      };
    }

    const isTitoloIIPermesso = entry.titolo_ii === true;
    const isTitoloIIIPermesso = entry.titolo_iii === true;

    codiciIntervento.forEach(function (codice) {
      const parts = codice.split(".");
      const titolo = parts[0]; // "II" o "III"

      if (titolo === "II" && !isTitoloIIPermesso) {
        errors.push(
          "INTERVENTO: Il codice " +
            codice +
            " (Titolo II) non è ammesso per il soggetto '" +
            tipoSA +
            "' (ambito " +
            (ambito || "non specificato") +
            ").",
        );
      } else if (titolo === "III" && !isTitoloIIIPermesso) {
        errors.push(
          "INTERVENTO: Il codice " +
            codice +
            " (Titolo III) non è ammesso per il soggetto '" +
            tipoSA +
            "'.",
        );
      }
    });

    // Verifica abbinamenti obbligati: II.H e II.G richiedono III.A
    const hasIII_A = codiciIntervento.indexOf("III.A") !== -1;

    if (codiciIntervento.indexOf("II.H") !== -1 && !hasIII_A) {
      errors.push(
        "INTERVENTO: II.H (Fotovoltaico+Accumulo) richiede obbligatoriamente III.A (Pompa di calore elettrica).",
      );
    }

    if (codiciIntervento.indexOf("II.G") !== -1 && !hasIII_A) {
      errors.push(
        "INTERVENTO: II.G (Ricarica veicoli) richiede obbligatoriamente III.A (Pompa di calore elettrica).",
      );
    }

    // Verifica interventi collegati obbligatori dai dati INTERVENTI
    codiciIntervento.forEach(function (codice) {
      var meta = INTERVENTI[codice];
      if (meta && meta.interventi_collegati_obbligatori) {
        meta.interventi_collegati_obbligatori.forEach(function (req) {
          if (codiciIntervento.indexOf(req) === -1) {
            errors.push(
              "INTERVENTO: " +
                codice +
                " richiede obbligatoriamente " +
                req +
                ".",
            );
          }
        });
      }
    });

    return {
      success: errors.length === 0,
      errors: errors,
      warnings: warnings,
    };
  };

  /**
   * Valida la coerenza e completezza dei ruoli GSE.
   *
   * @param {Object} ruoli - Struttura ruoli della pratica.
   * @returns {Object} Esito della validazione.
   */
  const validateRoles = function (ruoli) {
    const errors = [];

    if (!ruoli) {
      return { success: false, errors: ["Dati ruoli mancanti"] };
    }

    if (
      !ruoli.proprietario.coincide_con_sa &&
      !ruoli.proprietario.atto_assenso
    ) {
      errors.push(
        "PROPRIETARIO: Se il proprietario è diverso dal Soggetto Ammesso (SA), è obbligatorio disporre dell'Atto di Assenso.",
      );
    }

    if (!ruoli.sr.coincide_con_sa) {
      if (!ruoli.sr.cf_piva || ruoli.sr.cf_piva.length < 11) {
        errors.push(
          "SR: Codice Fiscale o Partita IVA del Soggetto Responsabile non valido.",
        );
      }
    }

    if (ruoli.sr.iban && ruoli.sr.iban.length < 27) {
      errors.push("SR: Formato IBAN non valido (troppo corto).");
    }

    if (
      ruoli.sa.tipo === "Privato residenziale" &&
      !ruoli.sa.titolo_godimento
    ) {
      errors.push(
        "SA: È obbligatorio specificare il titolo di godimento dell'immobile.",
      );
    }

    return {
      success: errors.length === 0,
      errors: errors,
    };
  };

  /**
   * Valida i termini procedurali CT 3.0 (Art.10, 14, 18, 25, 30).
   * Utilizza TERMINI_CONFIG per durate e soglie.
   *
   * @param {Object} pratica - Dati della pratica { modalita_accesso, dataRichiesta, dataFineLavori, ... }
   * @param {Object} opts - Opzioni aggiuntive { dataAccoglimento, dataAvvioLavori, dataTrasmissioneDiagnosi, variazionePercentuale, reiterazione }
   * @returns {Object} { success, errors, warnings }
   * @private
   */
  const validateTermini = function (pratica, opts) {
    const errors = [];
    const warnings = [];
    const tc = TERMINI_CONFIG;

    if (!pratica) {
      return {
        success: false,
        errors: [
          "Dati pratica mancanti per la validazione termini procedurali.",
        ],
        warnings: [],
      };
    }

    const mod = (pratica.modalita_accesso || "").toLowerCase();

    // 1. Accesso diretto: termine gg da data_fine_lavori
    if (mod === "diretto") {
      if (pratica.data_fine_lavori && pratica.data_richiesta) {
        const dtFine = new Date(pratica.data_fine_lavori);
        const dtRich = new Date(pratica.data_richiesta);
        if (!isNaN(dtFine.getTime()) && !isNaN(dtRich.getTime())) {
          const diffGg = Math.round((dtRich - dtFine) / (1000 * 60 * 60 * 24));
          if (diffGg > tc.accesso_diretto_gg) {
            errors.push(
              "TERMINI: La richiesta è stata inviata " +
                diffGg +
                " giorni dopo la fine lavori. Limite: " +
                tc.accesso_diretto_gg +
                " giorni (Art.10 c.1).",
            );
          }
        }
      }
    }

    // 2. Prenotazione: avvio lavori entro 18 mesi dall'accoglimento
    if (mod === "prenotazione" && opts) {
      if (opts.dataAccoglimento && opts.dataAvvioLavori) {
        const dtAcc = new Date(opts.dataAccoglimento);
        const dtAvv = new Date(opts.dataAvvioLavori);
        if (!isNaN(dtAcc.getTime()) && !isNaN(dtAvv.getTime())) {
          const diffMesi =
            (dtAvv.getFullYear() - dtAcc.getFullYear()) * 12 +
            (dtAvv.getMonth() - dtAcc.getMonth());
          if (diffMesi > tc.prenotazione_avvio_mesi) {
            errors.push(
              "TERMINI: L'avvio lavori deve avvenire entro " +
                tc.prenotazione_avvio_mesi +
                " mesi dall'accoglimento (Art.14 c.3). Trascorsi " +
                diffMesi +
                " mesi.",
            );
          }
        }
      }

      // 3. Prenotazione: conclusione entro 12 mesi (36 NZEB)
      if (opts.dataAvvioLavori && pratica.data_fine_lavori) {
        const dtAvv = new Date(opts.dataAvvioLavori);
        const dtFine = new Date(pratica.data_fine_lavori);
        if (!isNaN(dtAvv.getTime()) && !isNaN(dtFine.getTime())) {
          const isNzeb = opts.isNzeb === true;
          const termineMesi = isNzeb
            ? tc.prenotazione_conclusione_nzeb_mesi
            : tc.prenotazione_conclusione_mesi;
          const diffMesi =
            (dtFine.getFullYear() - dtAvv.getFullYear()) * 12 +
            (dtFine.getMonth() - dtAvv.getMonth());
          if (diffMesi > termineMesi) {
            errors.push(
              "TERMINI: La conclusione lavori deve avvenire entro " +
                termineMesi +
                " mesi dall'avvio (Art.14 c.4). Trascorsi " +
                diffMesi +
                " mesi.",
            );
          }
        }
      }
    }

    // 4. Trasmissione diagnosi entro 12 mesi dalla fine lavori
    if (opts && opts.dataTrasmissioneDiagnosi && pratica.data_fine_lavori) {
      const dtFine = new Date(pratica.data_fine_lavori);
      const dtDiag = new Date(opts.dataTrasmissioneDiagnosi);
      if (!isNaN(dtFine.getTime()) && !isNaN(dtDiag.getTime())) {
        const diffMesi =
          (dtDiag.getFullYear() - dtFine.getFullYear()) * 12 +
          (dtDiag.getMonth() - dtFine.getMonth());
        if (diffMesi > tc.diagnosi_trasmissione_mesi) {
          errors.push(
            "TERMINI: La diagnosi energetica deve essere trasmessa entro " +
              tc.diagnosi_trasmissione_mesi +
              " mesi dalla fine lavori (Art.18 c.2). Trascorsi " +
              diffMesi +
              " mesi.",
          );
        }
      } else {
        warnings.push(
          "TERMINI: Verifica trasmissione diagnosi non eseguita (date mancanti).",
        );
      }
    }

    // 5. Variazioni > soglia → approvazione GSE preventiva
    if (opts && opts.variazionePercentuale !== undefined) {
      const varPerc = parseFloat(opts.variazionePercentuale);
      if (!isNaN(varPerc) && Math.abs(varPerc) > tc.variazione_soglia_perc) {
        errors.push(
          "TERMINI: Variazione del " +
            varPerc.toFixed(1) +
            "% superiore alla soglia del " +
            tc.variazione_soglia_perc +
            "%. Richiesta approvazione GSE preventiva (Art.25 c.2).",
        );
      }
    }

    // 6. Divieto reiterazione 1 anno
    if (opts && opts.reiterazione === true) {
      errors.push(
        "TERMINI: La pratica reitera una domanda già respinta/rinunciata prima del termine di " +
          tc.reiterazione_divieto_anni +
          " anno(i) dalla comunicazione GSE (Art.30 c.1).",
      );
    }

    return {
      success: errors.length === 0,
      errors: errors,
      warnings: warnings,
    };
  };

  // 5. FUNZIONI PUBBLICHE (ESISTENTI)

  /**
   * Esegue una verifica completa di ammissibilità preliminare.
   *
   * @param {Object} input - Dati della pratica.
   * @returns {Object} Esito della validazione.
   */
  const validateAmmissibilita = function (input) {
    if (!input) {
      console.error("validateAmmissibilita: Input mancante.");
      const errRes = {
        success: false,
        message: "Dati mancanti",
        errors: ["Dati mancanti"],
      };
      return errRes;
    }

    const errors = [];
    const warnings = [];

    // 1. Verifica Esistenza Edificio (Requisito Fondamentale CT 3.0)
    if (input.buildingStatus !== "esistente") {
      errors.push("L'edificio deve essere esistente (accatastato o con F/2).");
    }

    // 2. Verifica Obbligo Sostituzione (Art. 25 D.M. 7/8/2025)
    // Eccezione: III.D (solare termico) e III.E (scaldacqua PDC) non richiedono impianto esistente
    const interventiSenzaObbligo = ["III.D", "III.E"];
    const soloEsenzioni = input.selectedInterventi
      ? input.selectedInterventi.every(function (c) {
          return interventiSenzaObbligo.indexOf(c) !== -1;
        })
      : false;

    if (!soloEsenzioni && input.potenzaEsistenteKw !== undefined) {
      const sostituzioneCheck = _checkSostituzioneObbligatoria(
        input.potenzaEsistenteKw,
      );
      if (!sostituzioneCheck.success) {
        errors.push(sostituzioneCheck.error);
      }
    }

    if (
      !soloEsenzioni &&
      input.potenzaEsistenteKw === undefined &&
      input.buildingStatus === "esistente"
    ) {
      warnings.push(
        "Attenzione: Dati sulla potenza del generatore esistente non forniti. Validazione obbligo sostituzione non eseguita.",
      );
    }

    // 3. Verifica Categoria Catastale (con soggetto per eccezioni)
    const category = input.category || "";
    const subjectType = input.subjectType || null;
    const catCheck = _checkCatastale(category, subjectType);
    if (!catCheck.isAllowed) {
      errors.push("Incompatibilità catastale: " + catCheck.reason);
    }

    // 4. Incrocio Soggetto / Titoli potenziali
    const potentialTitles = catCheck.allowedTitles;
    const validTitles = potentialTitles.filter(function (title) {
      return _isSubjectCompatible(input.subjectType, title);
    });

    if (validTitles.length === 0 && errors.length === 0) {
      const subject = input.subjectType;
      errors.push(
        "Il soggetto '" +
          subject +
          "' non può accedere ai titoli previsti per la categoria '" +
          category +
          "'.",
      );
    }

    // 5. Verifica Effetto Incentivante (Specifico CT 3.0 per Imprese)
    const effettoCheck = _checkEffettoIncentivante(input);
    if (!effettoCheck.success) {
      errors.push(effettoCheck.error);
    }

    // 6. Validazione interventi specifici (se forniti)
    if (input.selectedInterventi && Array.isArray(input.selectedInterventi)) {
      const interventiData = input.interventiData || {};

      input.selectedInterventi.forEach(function (interventoCode) {
        const interventoDati = interventiData[interventoCode] || {};
        const interventoCheck = _checkInterventoAmmissibilita(
          input.subjectType,
          interventoCode,
          interventoDati,
        );

        if (!interventoCheck.success) {
          errors.push(interventoCheck.error);
        }
      });
    }

    // 7. Verifica Soglia Antimafia (Art. 5 comma 5)
    if (input.importoRichiesto !== undefined) {
      const antimafiaCheck = _checkAntimafia(
        input.importoRichiesto,
        input.documentazioneAntimafia,
      );
      if (!antimafiaCheck.success) {
        errors.push(antimafiaCheck.error);
      }
    }

    // 8. Verifica Accesso Diretto 60gg (Art. 10 comma 1)
    if (input.dataRichiesta || input.dataFineLavori) {
      const isPrenotazione = input.isPrenotazione || false;
      const accessoCheck = _checkAccessoDiretto(
        isPrenotazione,
        input.dataRichiesta,
        input.dataFineLavori,
      );
      if (!accessoCheck.success) {
        errors.push(accessoCheck.error);
      }
    }

    // 9. Warning se selectedInterventi fornito ma senza dati tecnici
    if (input.selectedInterventi && !input.interventiData) {
      warnings.push(
        "Attenzione: Validazione interventi specifici non completata (dati tecnici mancanti).",
      );
    }

    const msg =
      errors.length > 0
        ? "Pratica non ammissibile: " + errors.join("; ")
        : "Pratica ammissibile. Titoli validi: " + validTitles.join(", ") + ".";
    const validationResult = {
      success: errors.length === 0,
      message: msg,
      validTitles: validTitles,
      errors: errors,
      warnings: warnings,
      timestamp: new Date().toISOString(),
    };

    return validationResult;
  };

  /**
   * Restituisce la lista dei soggetti ammissibili configurati.
   * @returns {string[]} Lista tipi soggetto.
   */
  const getSubjectTypes = function () {
    const data = _getEngineData();
    const soggetti = data.soggetti;

    var types = [];
    if (soggetti) {
      types = Object.keys(soggetti);
    }

    return types;
  };

  /**
   * Verifica la compatibilità di un singolo intervento basandosi sul suo codice (Titolo).
   *
   * @param {string} interventoCode - Codice intervento (es. 'III.A', 'II.H').
   * @param {string[]} allowedTitles - Lista titoli ammessi (es. ['III']).
   * @returns {Object} Oggetto con status e motivo eventuale.
   */
  const getInterventoCompatibility = function (interventoCode, allowedTitles) {
    const result = { isCompatible: false, reason: "" };

    if (!interventoCode || !allowedTitles) {
      result.reason = "Dati per verifica compatibilità mancanti.";
      return result;
    }

    const codeParts = interventoCode.split(".");
    const titleOfIntervento = codeParts[0];

    if (allowedTitles.indexOf(titleOfIntervento) !== -1) {
      result.isCompatible = true;
    } else {
      result.isCompatible = false;
      result.reason =
        "Questo intervento appartiene al Titolo " +
        titleOfIntervento +
        ", non ammesso per il tuo profilo.";
    }

    return result;
  };

  // 6. API PUBBLICA
  const api = {
    // Nuove funzioni
    validateAnagrafiche: validateAnagrafiche,
    validateAccesso: validateAccesso,
    validateTitoloV: validateTitoloV,
    validateCoincidenzaSRSA: validateCoincidenzaSRSA,
    validateInterventiPerSoggetto: validateInterventiPerSoggetto,
    validateTermini: validateTermini,

    // Funzioni esistenti modificate
    checkEffettoIncentivante: _checkEffettoIncentivante,
    isSubjectCompatible: _isSubjectCompatible,

    // Funzioni esistenti
    checkCatastale: _checkCatastale,
    checkSostituzioneObbligatoria: _checkSostituzioneObbligatoria,
    validateAmmissibilita: validateAmmissibilita,
    validateRoles: validateRoles,
    getSubjectTypes: getSubjectTypes,
    getInterventoCompatibility: getInterventoCompatibility,
    getEngineData: _getEngineData,
  };

  return api;
};

// Esportazione Singleton
export const RulesEngine = UaRulesEngine();
