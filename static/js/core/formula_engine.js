"use strict";

import {
  RULES,
  FORMULE_INCENTIVO,
  PROCEDURA_CONFIG,
  MAGGIORAZIONI,
  SOTTO_CATEGORIE_SA,
  PREMIALITA_CONFIG,
} from "./normativa.js";

const MAGGIORAZIONI_KEYS = Object.keys(MAGGIORAZIONI);

const UaFormulaEngine = function () {
  const _getPotenzaNominaleKw = function (code, dati) {
    if (!dati) {
      return 0;
    }

    const potenzaFieldMap = {
      "III.A": ["potenza_pdc_kw", "potenza_termica_nominale", "pn_nominale"],
      "III.B": ["potenza_nominale_Pn_pdc", "potenza_pdc_kw"],
      "III.C": ["potenza_nominale_kw"],
      "III.D": ["superficie_lorda_mq"],
      "III.E": ["potenza_termica_nominale"],
      "III.F": ["potenza_allaccio_kw"],
      "II.C": ["superficie_schermata_mq"],
      "II.D": ["superficie_utile_mq"],
      "II.E": ["superficie_illuminata_mq"],
      "II.F": ["superficie_edificio_mq"],
      "II.H": ["potenza_fv_kw", "potenza_picco_kW", "_trainante_potenza_kw"],
      "II.G": ["potenza_ricarica_kw", "potenza_kw", "_trainante_potenza_kw"],
      "III.G": ["potenza_elettrica"],
    };

    const fields = potenzaFieldMap[code] || [];

    let potenza = 0;
    for (const field of fields) {
      if (dati[field] !== undefined) {
        potenza = parseFloat(dati[field]) || 0;
        break;
      }
    }

    return potenza;
  };

  const _isPAorETS = function (soggettoType) {
    return (
      soggettoType === "Pubblica Amministrazione" ||
      soggettoType === "PA" ||
      soggettoType === "ETS non economico"
    );
  };

  const _calculatePaymentPlan = function (
    totalAmount,
    code,
    dati,
    soggettoType,
    modalitaAccesso,
  ) {
    if (typeof totalAmount !== "number" || totalAmount < 0) {
      console.error(
        "_calculatePaymentPlan: totalAmount non valido",
        totalAmount,
      );
      return null;
    }

    if (!code) {
      console.error("_calculatePaymentPlan: codice intervento mancante");
      return null;
    }

    // PA/ETS non economico: unica rata solo in accesso diretto (art.11 c.6)
    if (_isPAorETS(soggettoType) && modalitaAccesso === "diretto") {
      const plan = {
        total: parseFloat(totalAmount.toFixed(2)),
        numInstallments: 1,
        installments: [],
        isSinglePayment: true,
      };
      plan.installments.push({
        n: 1,
        amount: parseFloat(totalAmount.toFixed(2)),
        label: "Unica soluzione",
      });
      return plan;
    }

    const DURATA_PICCOLA_POTENZA =
      PROCEDURA_CONFIG.DURATA_STANDARD_PICCOLA_POTENZA;
    const DURATA_GRANDE_POTENZA =
      PROCEDURA_CONFIG.DURATA_STANDARD_GRANDE_POTENZA;
    const SOGLIA_POTENZA_KW = PROCEDURA_CONFIG.SOGLIA_POTENZA_PICCOLA || 35;

    const plan = {
      total: parseFloat(totalAmount.toFixed(2)),
      numInstallments: 1,
      installments: [],
      isSinglePayment: false,
    };

    let years = DURATA_GRANDE_POTENZA;
    const interventionRules = RULES.interventi[code];

    if (interventionRules && typeof interventionRules.durata === "number") {
      years = interventionRules.durata;
    } else {
      const potenzaKw = _getPotenzaNominaleKw(code, dati);

      if (potenzaKw > 0) {
        var soglia =
          interventionRules &&
          typeof interventionRules.soglia_superficie === "number"
            ? interventionRules.soglia_superficie
            : SOGLIA_POTENZA_KW;
        years =
          potenzaKw <= soglia ? DURATA_PICCOLA_POTENZA : DURATA_GRANDE_POTENZA;
      } else if (
        interventionRules &&
        typeof interventionRules.durata === "object"
      ) {
        years = DURATA_GRANDE_POTENZA;
      }
    }

    plan.numInstallments = years;
    const installmentAmount = totalAmount / years;

    const roundedInstallment = parseFloat(installmentAmount.toFixed(2));
    let sumInstallments = 0;

    for (let i = 1; i <= years; i++) {
      const isLast = i === years;
      const amount = isLast
        ? parseFloat((totalAmount - sumInstallments).toFixed(2))
        : roundedInstallment;

      if (!isLast) {
        sumInstallments += amount;
      }

      plan.installments.push({
        n: i,
        amount: amount,
        label: `Rata ${i} di ${years}`,
      });
    }

    return plan;
  };

  const _calculateMaggiorazioni = function (contesto) {
    const result = { totale: 0, dettaglio: [] };
    if (!contesto) return result;

    if (contesto.piccolaImpresa) {
      result.totale += MAGGIORAZIONI.piccola_impresa.percentuale;
      result.dettaglio.push({
        codice: "piccola_impresa",
        label: MAGGIORAZIONI.piccola_impresa.label,
        percentuale: MAGGIORAZIONI.piccola_impresa.percentuale,
      });
    }

    if (contesto.mediaImpresa) {
      result.totale += MAGGIORAZIONI.media_impresa.percentuale;
      result.dettaglio.push({
        codice: "media_impresa",
        label: MAGGIORAZIONI.media_impresa.label,
        percentuale: MAGGIORAZIONI.media_impresa.percentuale,
      });
    }

    return result;
  };

  const _calculatePremialita = function (code, dati, contesto) {
    const result = { totale: 0, dettaglio: [] };
    if (!contesto) return result;

    if (
      dati.made_in_eu === "sì" &&
      PREMIALITA_CONFIG.made_in_eu.applicabile_a.includes(code)
    ) {
      result.totale += PREMIALITA_CONFIG.made_in_eu.bonus_perc;
      result.dettaglio.push({
        codice: "made_in_eu",
        label: PREMIALITA_CONFIG.made_in_eu.label,
        percentuale: PREMIALITA_CONFIG.made_in_eu.bonus_perc,
      });
    }

    if (code === "II.H" && dati.registro_enea === "sì") {
      const fvReg = PREMIALITA_CONFIG.registro_enea_fv;
      if (dati.ue_production === "sì") {
        result.totale += fvReg.varianti.ue_prod.bonus_perc;
        result.dettaglio.push({
          codice: "fv_ue_prod",
          label: fvReg.varianti.ue_prod.label,
          percentuale: fvReg.varianti.ue_prod.bonus_perc,
        });
      } else if (dati.same_section === "sì") {
        result.totale += fvReg.varianti.same_sec.bonus_perc;
        result.dettaglio.push({
          codice: "fv_same_sec",
          label: fvReg.varianti.same_sec.label,
          percentuale: fvReg.varianti.same_sec.bonus_perc,
        });
      } else {
        result.totale += fvReg.varianti.iscritti.bonus_perc;
        result.dettaglio.push({
          codice: "fv_iscritti",
          label: fvReg.varianti.iscritti.label,
          percentuale: fvReg.varianti.iscritti.bonus_perc,
        });
      }
    }

    if (
      dati.miglioramento_ep_40 === "sì" &&
      PREMIALITA_CONFIG.miglioramento_ep_40.applicabile_a.includes(code)
    ) {
      result.totale += PREMIALITA_CONFIG.miglioramento_ep_40.bonus_perc;
      result.dettaglio.push({
        codice: "miglioramento_ep_40",
        label: PREMIALITA_CONFIG.miglioramento_ep_40.label,
        percentuale: PREMIALITA_CONFIG.miglioramento_ep_40.bonus_perc,
      });
    }

    if (
      dati.zona_assistita_a === "sì" &&
      PREMIALITA_CONFIG.zona_assistita_a.applicabile_a.some(function (p) {
        return code.startsWith(p) || code === p;
      })
    ) {
      result.totale += PREMIALITA_CONFIG.zona_assistita_a.bonus_perc;
      result.dettaglio.push({
        codice: "zona_assistita_a",
        label: PREMIALITA_CONFIG.zona_assistita_a.label,
        percentuale: PREMIALITA_CONFIG.zona_assistita_a.bonus_perc,
      });
    }

    if (
      dati.zona_assistita_c === "sì" &&
      PREMIALITA_CONFIG.zona_assistita_c.applicabile_a.some(function (p) {
        return code.startsWith(p) || code === p;
      })
    ) {
      result.totale += PREMIALITA_CONFIG.zona_assistita_c.bonus_perc;
      result.dettaglio.push({
        codice: "zona_assistita_c",
        label: PREMIALITA_CONFIG.zona_assistita_c.label,
        percentuale: PREMIALITA_CONFIG.zona_assistita_c.bonus_perc,
      });
    }

    return result;
  };

  const _calculateCorrispettivoGSE = function (incentivoTotale) {
    if (!incentivoTotale || incentivoTotale <= 0) {
      return { importo: 0, percentuale: 1, massimale: 250 };
    }

    const percentuale = 1;
    const massimale = 250;
    let importo = incentivoTotale * (percentuale / 100);
    importo = Math.min(importo, massimale);

    return {
      importo: parseFloat(importo.toFixed(2)),
      percentuale: percentuale,
      massimale: massimale,
    };
  };

  const _resolvePercentuale = function (code, percDefault, contesto, dati) {
    var soggetto = contesto?.soggetto || "";
    var intensita = PROCEDURA_CONFIG.INTENSITA_MASSIMA || {};
    var isMulti = contesto?.isMultiIntervento === true;
    var isPAorETS =
      soggetto === "Pubblica Amministrazione" ||
      soggetto === "PA" ||
      soggetto === "ETS non economico";

    var breakdown = {
      base: percDefault,
      madeInEuBonus: 0,
      maggiorazioneTotale: 0,
      premialitaTotale: 0,
      anteCap: 0,
      cap: 0,
      capped30: false,
      valore: 0,
    };

    if (isPAorETS) {
      var isComuneSotto15k = contesto?.comuneSotto15k === true;
      var isScuolaOspedale = contesto?.scuolaOspedale === true;
      if (isComuneSotto15k || isScuolaOspedale) {
        breakdown.base = intensita.PA_scuole_ospedali || 1.0;
        breakdown.valore = breakdown.base;
        return breakdown;
      }
      if (code === "II.D") {
        breakdown.base = 1.0;
        breakdown.valore = breakdown.base;
        return breakdown;
      }
      breakdown.base = intensita.PA_altri || 0.65;
      breakdown.valore = breakdown.base;
      return breakdown;
    }

    if (soggetto === "Impresa") {
      if (code.startsWith("II.")) {
        breakdown.base = isMulti
          ? intensita.Impresa_multi_Titolo_II || 0.3
          : intensita.Impresa_singolo_Titolo_II || 0.25;
      } else {
        breakdown.base = intensita.Impresa_Titolo_III || 0.45;
      }
    }

    // perc_multi: se abbinato a III.A/B/C/D/E/F, usa perc_multi invece del default
    if (!isPAorETS && soggetto !== "Impresa") {
      var interventoRules = RULES.interventi[code];
      var hasPercMulti =
        interventoRules && typeof interventoRules.perc_multi === "number";
      if (hasPercMulti) {
        var selezionati = contesto?.codiciSelezionati || [];
        var hasAbbinamentoIII = selezionati.some(function (c) {
          return [
            "III.A",
            "III.B",
            "III.C",
            "III.D",
            "III.E",
            "III.F",
          ].includes(c);
        });
        if (hasAbbinamentoIII) {
          breakdown.base = interventoRules.perc_multi;
        }
      }
    }

    var maggiorazioni = _calculateMaggiorazioni(contesto);
    breakdown.maggiorazioneTotale = maggiorazioni.totale / 100;

    var premialita = _calculatePremialita(code, dati || {}, contesto);
    breakdown.premialitaTotale = premialita.totale;

    // made_in_eu: moltiplicativo (×1.10 sul base), Manuale Analitico Sez.9
    breakdown.madeInEuBonus =
      dati?.made_in_eu === "sì" &&
      PREMIALITA_CONFIG.made_in_eu.applicabile_a.includes(code)
        ? PREMIALITA_CONFIG.made_in_eu.bonus_perc
        : 0;

    var anteCap =
      breakdown.base * (1 + breakdown.madeInEuBonus) +
      breakdown.maggiorazioneTotale +
      (breakdown.premialitaTotale - breakdown.madeInEuBonus);

    breakdown.anteCap = parseFloat(anteCap.toFixed(4));

    // II.D/II.G/II.H: cap 30% per imprese (RA §4.2.1 nota 6)
    var codiciCap30 = ["II.D", "II.G", "II.H"];
    if (soggetto === "Impresa" && codiciCap30.includes(code)) {
      anteCap = Math.min(anteCap, 0.3);
      breakdown.capped30 = true;
    }

    breakdown.cap = isPAorETS ? 1.0 : 0.65;
    breakdown.valore = parseFloat(Math.min(anteCap, breakdown.cap).toFixed(4));

    return breakdown;
  };

  const _resolveQuf = function (zona) {
    const zonaKey = zona.startsWith("Zona ") ? zona : `Zona ${zona}`;
    return RULES.fasce_climatiche[zonaKey]?.quf || 0;
  };

  const _resolveCiPdc = function (dati) {
    const pn = parseFloat(dati.potenza_pdc_kw) || 0;
    const tipologia = dati.tipologia_pdc || "";
    const config = RULES.interventi["III.A"].coefficienti_ci;

    let key = "";
    if (tipologia === "aria/aria") {
      if (pn <= 12) key = "Ci_PDC_aria_aria_split_le12kW";
      else if (pn <= 35) key = "Ci_PDC_aria_aria_VRF_12_35kW";
      else key = "Ci_PDC_aria_aria_VRF_gt35kW";
    } else if (tipologia === "aria/acqua") {
      key = pn <= 35 ? "Ci_PDC_aria_acqua_le35kW" : "Ci_PDC_aria_acqua_gt35kW";
    } else if (tipologia === "acqua/aria") {
      key = pn <= 35 ? "Ci_PDC_acqua_aria_le35kW" : "Ci_PDC_acqua_aria_gt35kW";
    } else if (tipologia === "acqua/acqua" || tipologia === "geotermica") {
      key =
        pn <= 35 ? "Ci_PDC_acqua_acqua_le35kW" : "Ci_PDC_acqua_acqua_gt35kW";
    } else if (tipologia === "salamoia/aria") {
      key =
        pn <= 35
          ? "Ci_PDC_salamoia_aria_le35kW"
          : "Ci_PDC_salamoia_aria_gt35kW";
    } else if (tipologia === "salamoia/acqua") {
      key =
        pn <= 35
          ? "Ci_PDC_salamoia_acqua_le35kW"
          : "Ci_PDC_salamoia_acqua_gt35kW";
    } else if (tipologia === "gas/acqua") {
      key = pn <= 35 ? "Ci_PDC_gas_acqua_le35kW" : "Ci_PDC_gas_acqua_gt35kW";
    }

    return config[key] || 0;
  };

  const _resolveCmaxIsolamento = function (tipo) {
    const config = RULES.interventi["II.A"].varianti;
    const base = config[tipo]?.cmax || 0;
    const isInterno = tipo && tipo.indexOf("Intern") !== -1;
    if (isInterno) {
      const maggiorato = Math.round(base * 1.3);
      return maggiorato;
    }
    return base;
  };

  const _resolveEtaMinEcodesign = function (tipologia, potenza) {
    const pn = parseFloat(potenza) || 0;
    const tipo = (tipologia || "").toLowerCase();
    const isGas = tipo.indexOf("gas") !== -1;
    if (isGas) {
      if (tipo === "gas/acqua") return 110;
      if (tipo.indexOf("aria/aria") !== -1) return 130;
      if (tipo.indexOf("acqua/aria") !== -1) return 130;
      if (tipo.indexOf("salamoia/aria") !== -1) return 130;
      if (tipo.indexOf("salamoia/acqua") !== -1) return 125;
      return 110;
    }
    if (tipo === "aria/aria") return pn <= 12 ? 149 : 137;
    if (tipo === "aria/acqua") return 110;
    if (tipo === "acqua/aria") return 137;
    if (tipo === "acqua/acqua") return 110;
    if (tipo === "salamoia/aria") return pn <= 12 ? 149 : 137;
    if (tipo === "salamoia/acqua") return 110;
    return 110;
  };

  const _executeGenericFormula = function (code, dati, contesto) {
    const metadata = FORMULE_INCENTIVO[code];
    const zona = contesto.zonaClimatica || "Zona E";
    const warnings = [];

    const params = {
      zona: zona,
      quf: _resolveQuf(zona),
    };

    if (metadata.mappatura_dati) {
      for (const [varName, dataKey] of Object.entries(
        metadata.mappatura_dati,
      )) {
        params[varName] = parseFloat(dati[dataKey]) || 0;
      }
    }

    // IVA: ammissibile per PA/ETS non econ (costo reale non recuperabile)
    // IVA non ammissibile per Impresa/ETS economico (RA §4.2.1, §3.3)
    const soggettiIvaEsclusa = ["Impresa", "ETS economico"];
    if (
      soggettiIvaEsclusa.includes(contesto?.soggetto) &&
      dati.importo_iva > 0
    ) {
      const iva = parseFloat(dati.importo_iva) || 0;
      if (params.spesa !== undefined) {
        params.spesa = Math.max(0, params.spesa - iva);
      }
    }

    if (code === "III.A" || code === "III.B") {
      params.Ci = _resolveCiPdc(dati);
      params.Quf = params.quf;
      params.CC = (dati.tipologia_pdc || "").indexOf("gas") !== -1 ? 2.5 : 1.0;
      if (params.CC === 2.5) {
        warnings.push(
          code +
            ": pompa di calore a gas rilevata. Coefficiente CC=2.5 applicato (Manuale Analitico Sez.6).",
        );
      }
      if (code === "III.B") {
        const tipoSistema = (dati.tipo_sistema || "").toLowerCase();
        if (tipoSistema.indexOf("bivalente") !== -1) {
          const potenzaPdc = parseFloat(dati.potenza_pdc_kw) || 0;
          params.k = potenzaPdc > 35 ? 1.1 : 1.0;
        } else {
          params.k = 1.25;
        }
      } else {
        params.k = 1.0;
      }
      params.eta_s_min_ecodesign = _resolveEtaMinEcodesign(
        dati.tipologia_pdc,
        dati.potenza_pdc_kw,
      );
    } else if (code === "II.A") {
      const tipoSuperficie = dati.tipo_superficie_opaca || "";
      params.cmax = _resolveCmaxIsolamento(tipoSuperficie);
      params.percentuale = zona === "Zona E" || zona === "Zona F" ? 0.5 : 0.4;
      const isInterno = tipoSuperficie.indexOf("Intern") !== -1;
      if (isInterno) {
        warnings.push(
          "Rischio condensa interstiziale: verificare UNI 13788 per isolamento da interno.",
        );
      }
    } else if (code === "II.B") {
      const cmaxKey =
        zona === "Zona A" || zona === "Zona B" || zona === "Zona C"
          ? "Zone A,B,C"
          : "Zone D,E,F";
      params.cmax = RULES.interventi["II.B"].varianti[cmaxKey]?.cmax || 700;
      params.percentuale = RULES.interventi["II.B"].perc || 0.4;
    } else if (code === "II.C") {
      const tipo = dati.tipo_schermatura || "Schermature mobili";
      params.cmax = RULES.interventi["II.C"].varianti[tipo]?.cmax || 150;
      params.percentuale = RULES.interventi["II.C"].perc || 0.4;
    } else if (code === "II.D") {
      const tipo = dati.tipo_intervento_nzeb || "Demolizione e ricostruzione";
      params.cmax = RULES.interventi["II.D"].varianti[tipo]?.cmax || 1300;
      params.percentuale = RULES.interventi["II.D"].perc || 0.4;
      if (tipo.indexOf("Ampliamento") !== -1) {
        const volEsistente = parseFloat(dati.volume_esistente_mc) || 0;
        const volNuovo = parseFloat(dati.volume_nuovo_mc) || 0;
        if (volEsistente > 0 && volNuovo > volEsistente * 0.25) {
          warnings.push(
            "Ampliamento volumetrico " +
              volNuovo +
              " mc eccede il limite del 25% (" +
              volEsistente * 0.25 +
              " mc) previsto per l'intervento II.D.",
          );
        }
      }
    } else if (code === "II.E") {
      const tipo = dati.tipo_edificio_illuminazione || "Edifici privati";
      params.cmax = RULES.interventi["II.E"].varianti[tipo]?.cmax || 35;
      params.percentuale = RULES.interventi["II.E"].perc || 0.4;
    } else if (code === "II.F") {
      const bacClass = dati.classe_bac || "B";
      const bacKey = `Classe ${bacClass} EN 15232`;
      params.cmax = RULES.interventi["II.F"].varianti[bacKey]?.cmax || 60;
      params.percentuale = RULES.interventi["II.F"].perc || 0.4;
    } else if (code === "II.G") {
      const potenza = parseFloat(dati.potenza_ricarica_kw) || 0;
      const nPunti = parseFloat(dati.numero_punti_ricarica) || 1;
      const tipo = dati.tipo_ricarica || "monofase";
      if (potenza > 100) {
        params.cmax_scelto =
          RULES.interventi["II.G"].varianti["Potenza > 100 kW"]
            ?.cmax_fisso_infrastruttura || 110000;
      } else if (potenza > 50) {
        params.cmax_scelto =
          RULES.interventi["II.G"].varianti["Potenza > 50 kW e ≤ 100 kW"]
            ?.cmax_fisso_infrastruttura || 60000;
      } else {
        const varKey = tipo.toLowerCase().includes("trifase")
          ? "Punto ricarica Trifase"
          : "Punto ricarica Monofase";
        const cmaxFisso =
          RULES.interventi["II.G"].varianti[varKey]?.cmax_fisso || 2400;
        if (potenza > 22) {
          const cmaxKw =
            RULES.interventi["II.G"].varianti["Potenza > 22 kW e ≤ 50 kW"]
              ?.cmax_kw || 1200;
          params.cmax_scelto = nPunti * cmaxFisso + (potenza - 22) * cmaxKw;
        } else {
          params.cmax_scelto = nPunti * cmaxFisso;
        }
      }
      params.percentuale = 0.3;
    } else if (code === "II.H") {
      const potenza = parseFloat(dati.potenza_fv_kw) || 0;
      const scaglioni = RULES.interventi["II.H"].scaglioni_fv || [];
      let cmax = 1050;
      for (const s of scaglioni) {
        if (potenza <= s.fino_a) {
          cmax = s.cmax;
          break;
        }
      }
      params.cmax_scaglione = cmax;
      params.cmax_accumulo = RULES.interventi["II.H"].accumulo?.cmax || 1000;
      params.percentuale = RULES.interventi["II.H"].perc || 0.2;
    } else if (code === "III.E") {
      const capacita = parseFloat(dati.capacita_litri) || 0;
      const classe = dati.classe_energetica || "A";
      const scaglioni =
        RULES.interventi["III.E"].scaglioni_classe[classe] ||
        RULES.interventi["III.E"].scaglioni_classe["A"];
      let fisso = 500;
      for (const s of scaglioni) {
        if (s.fino_a !== undefined && capacita <= s.fino_a) {
          fisso = s.incentivo_fisso;
          break;
        }
        if (s.oltre) {
          fisso = s.incentivo_fisso;
          break;
        }
      }
      params.incentivo_fisso_per_scaglione = fisso;
      params.percentuale = RULES.interventi["III.E"].perc || 0.4;
    } else if (code === "III.C") {
      const ruleIII_C = RULES.interventi["III.C"];
      params.cmax = ruleIII_C.varianti["Biomassa classe 5 stelle"]?.cmax || 600;
      params.percentuale =
        ruleIII_C.varianti["Biomassa classe 5 stelle"]?.perc || 0.65;
      const potenza = parseFloat(dati.potenza_nominale_kw) || 0;
      const tipoGen = dati.tipo_generatore || "Caldaia";
      const tipoBio = dati.tipo_biomassa || "Pellet";
      const coeffCiMap = ruleIII_C.coeff_ci || {};
      let ciArr = coeffCiMap[tipoGen];
      if (Array.isArray(ciArr)) {
      } else if (ciArr && typeof ciArr === "object") {
        ciArr = ciArr[tipoBio] || ciArr["_default"] || [];
      } else {
        ciArr = [];
      }
      let ciVal = 0.025;
      for (const c of ciArr) {
        if (potenza >= c.min_kw && potenza <= c.max_kw) {
          ciVal = c.ci;
          break;
        }
      }
      params.Ci = ciVal;
      const hrZonale = params.quf || 0;
      params.ore_funzionamento_annue =
        parseFloat(dati.ore_funzionamento_annue) ||
        hrZonale ||
        ruleIII_C.ore_funzionamento_default ||
        1500;
      params.tipo_generatore = dati.tipo_generatore || "Caldaia";
      params.riduzione_pp = dati.riduzione_pp || "≤20%";
      params.zona_non_metanizzata = dati.zona_non_metanizzata || "no";
      params.tipo_biomassa = dati.tipo_biomassa || "Pellet";
      params.in_centrale_tlr = dati.in_centrale_tlr || "no";
    } else if (code === "III.D") {
      const tipo = dati.tipo_pannello_solare || "Pannelli piani vetrati";
      const ruleIII_D = RULES.interventi["III.D"];
      params.cmax = ruleIII_D.varianti[tipo]?.cmax || 550;
      params.percentuale = ruleIII_D.perc || 0.65;
      const superficie = parseFloat(dati.superficie_lorda_mq) || 0;
      const spesa = parseFloat(dati.costo_solare_termico) || 0;
      const quUtente =
        parseFloat(dati.produzione_termica_specifica_kwh_mq) || 0;
      const quDefault = ruleIII_D.produzione_termica_default?.[tipo] || 525;
      let quBase = quUtente > 0 ? quUtente : quDefault;
      const tempCorrezione = {
        "50°C (ACS)": 1.0,
        "75°C (ACS+riscaldamento)": 0.85,
        "150°C (media temperatura)": 0.55,
      };
      const fattoreTemp = tempCorrezione[dati.temperatura_funzionamento] || 1.0;
      params.Qu = quBase * fattoreTemp;
      if (fattoreTemp !== 1.0) {
        warnings.push(
          "III.D: correzione temperatura " +
            dati.temperatura_funzionamento +
            " applicata (fattore " +
            fattoreTemp +
            "). Qu corretto da " +
            quBase.toFixed(0) +
            " a " +
            params.Qu.toFixed(0) +
            " kWh/m².",
        );
      }
      const uso = (dati.uso_solare || "ACS/Riscaldamento").trim();
      params.uso_solare = uso;
      if (uso === "Solar Cooling") {
        const potAss = parseFloat(dati.potenza_assorbitore_kw) || 0;
        const portAria = parseFloat(dati.portata_aria_m3h) || 0;
        if (potAss > 0 && superficie > 0) {
          const rapporto = superficie / potAss;
          if (rapporto >= 2 && rapporto <= 2.75) {
            params.isSolarCoolingValid = true;
          }
        }
        if (portAria > 0 && superficie > 0) {
          const dec = superficie / (portAria / 1000);
          params.dec = dec;
        }
        warnings.push(
          "III.D Solar Cooling: verifica rapporto superficie/potenza assorbitore e DEC.",
        );
      }
      let ci = 0.1;
      const coeffsByUso = ruleIII_D.coefficienti_ci || {};
      const coeffs = coeffsByUso[uso] || coeffsByUso["ACS/Riscaldamento"] || [];
      for (const c of coeffs) {
        if (superficie <= c.sl_max) {
          ci = c.ci;
          break;
        }
      }
      params.Ci = ci;
      params.Sl = superficie;
      const prestazionaleRaw = params.Ci * params.Qu * params.Sl;
      const percentualeCap =
        Math.min(spesa, superficie * params.cmax) * params.percentuale;
      if (prestazionaleRaw > 0 && percentualeCap > 0) {
        params.prestazionaleAmount = parseFloat(prestazionaleRaw.toFixed(2));
        params.percentualeCap = parseFloat(percentualeCap.toFixed(2));
      }
    } else if (code === "III.F") {
      const potenza = parseFloat(dati.potenza_allaccio_kw) || 0;
      const fasce = RULES.interventi["III.F"].fasce_potenza || [];
      let cmaxKw = 200;
      let imaxFascia = 6500;
      for (const f of fasce) {
        if (f.max_kw !== undefined && potenza <= f.max_kw) {
          cmaxKw = f.cmax_kw;
          imaxFascia = f.imax;
          break;
        }
        if (
          f.min_kw !== undefined &&
          f.max_kw === undefined &&
          potenza > f.min_kw
        ) {
          cmaxKw = f.cmax_kw;
          imaxFascia = f.imax;
          break;
        }
      }
      params.cmax_kw = cmaxKw;
      params.imax_fascia = imaxFascia;
      params.percentuale = RULES.interventi["III.F"].perc || 0.65;
    } else if (code === "III.G") {
      const ruleConfig = RULES.interventi["III.G"];
      params.percentuale = ruleConfig?.perc || 0.65;
      params.cmax = ruleConfig?.cmax || 5000;
      params.imax = ruleConfig?.imax || 100000;
    }

    if (
      metadata.tipo_formula === "percentuale_spesa" &&
      params.percentuale === undefined
    ) {
      params.percentuale = RULES.interventi[code]?.perc || 0;
    }

    if (params.percentuale !== undefined && contesto?.soggetto) {
      var percResult = _resolvePercentuale(
        code,
        params.percentuale,
        contesto,
        dati,
      );
      params.percentuale = percResult.valore;
      if (percResult.base !== undefined) {
        params._intensitaBreakdown = percResult;
      }
    }

    const steps = [];
    const variables = { ...params };

    if (metadata.variabili) {
      for (const v of metadata.variabili) {
        if (
          v.valore_default !== undefined &&
          variables[v.codice] === undefined
        ) {
          variables[v.codice] = v.valore_default;
        }
      }

      let pending = metadata.variabili.filter((v) => v.espressione);
      let progress = true;
      let iterations = 0;
      const maxIterations = pending.length * 2;

      while (progress && pending.length > 0 && iterations < maxIterations) {
        progress = false;
        iterations++;
        const stillPending = [];

        for (const v of pending) {
          try {
            const func = new Function(
              "ctx",
              "min",
              "max",
              "log",
              `with(ctx) { return ${v.espressione}; }`,
            );
            const result = func(variables, Math.min, Math.max, Math.log);

            variables[v.codice] = result;
            steps.push({
              desc: v.descrizione,
              label: v.codice,
              formula: v.espressione,
              value: parseFloat(result.toFixed(2)),
            });
            progress = true;
          } catch (e) {
            if (e instanceof ReferenceError) {
              stillPending.push(v);
            } else {
              console.error(`Errore valutazione variabile ${v.codice}:`, e);
              steps.push({
                desc: v.descrizione,
                label: v.codice,
                formula: v.espressione,
                value: null,
                error: e.message,
              });
            }
          }
        }
        pending = stillPending;
      }

      if (pending.length > 0) {
        pending.forEach((v) => {
          console.error(
            `Variabile ${v.codice} non risolta per dipendenze mancanti.`,
          );
          steps.push({
            desc: v.descrizione,
            label: v.codice,
            formula: v.espressione,
            value: null,
            error: "Dipendenze non risolte",
          });
        });
      }
    }

    let finalFormula = metadata.formula_base;
    if (!finalFormula) {
      return {
        amount: 0,
        params: variables,
        steps: steps,
        errors: ["Formula base non definita."],
        warnings: warnings,
      };
    }

    let amount = 0;
    try {
      const func = new Function(
        "ctx",
        "min",
        "max",
        "log",
        `with(ctx) { return ${finalFormula}; }`,
      );
      amount = func(variables, Math.min, Math.max, Math.log);

      const roundedAmount = parseFloat(amount.toFixed(2));
      steps.push({
        desc: "Calcolo Incentivo Finale",
        label: "I_tot",
        formula: finalFormula,
        value: roundedAmount,
        unit: "€",
      });
    } catch (e) {
      console.error(`Errore valutazione formula finale per ${code}:`, e);
      return {
        amount: 0,
        params: variables,
        steps: steps,
        errors: [`Errore calcolo: ${e.message}`],
        warnings: warnings,
      };
    }

    return {
      amount: parseFloat(amount.toFixed(2)),
      params: variables,
      warnings: warnings,
      steps: steps,
      isEstimate: true,
    };
  };

  const canCalculate = function (code, dati) {
    const config = FORMULE_INCENTIVO[code];

    const result = {
      allowed: true,
      motivi: [],
      status: "Sconosciuto",
      isBlocked: false,
    };

    if (!config) {
      result.allowed = false;
      result.motivi.push(`Configurazione formula per ${code} non trovata.`);
      return result;
    }

    result.status = config.formula_status;

    if (config.formula_status === "non_validata") {
      result.isBlocked = true;
      result.motivi.push(`La formula per ${code} non è ancora stata validata.`);
    }

    const richiesti = config.richiede || [];
    const mancanti = richiesti.filter((p) => !dati[p]);

    if (mancanti.length > 0) {
      result.allowed = false;
      result.motivi.push(`Dati mancanti: ${mancanti.join(", ")}`);
    }

    if (result.isBlocked) result.allowed = false;

    if (code === "II.F" && dati) {
      const bac = dati.classe_bac || "B";
      if (bac !== "A" && bac !== "B") {
        result.allowed = false;
        result.motivi.push(
          "II.F: la classe BAC deve essere almeno B (minimo per incentivo). Rilevato: " +
            bac,
        );
      }
    }

    if (code === "II.B" && dati) {
      const valvole = (dati.valvole_termostatiche || "").trim();
      if (valvole === "non presenti") {
        result.allowed = false;
        result.motivi.push(
          "II.B: valvole termostatiche/termoregolazione non presenti. Devono essere già presenti o installate contestualmente.",
        );
      }
    }

    if (code === "II.E" && dati) {
      const eff = parseFloat(dati.efficienza_luminosa_lmW) || 0;
      if (eff > 0 && eff < 80) {
        result.allowed = false;
        result.motivi.push(
          "II.E: efficienza luminosa " +
            eff +
            " lm/W inferiore al minimo 80 lm/W (Manuale Analitico Sez.4).",
        );
      }
      const criVal = (dati.cri || "").trim();
      if (criVal === "non applicabile") {
        result.allowed = false;
        result.motivi.push(
          "II.E: CRI obbligatorio >80 per interni, >60 per esterni (Manuale Analitico Sez.4).",
        );
      }
    }

    if (code === "II.D" && dati) {
      const tipoNzeb = (dati.tipo_intervento_nzeb || "").trim();
      if (tipoNzeb.indexOf("Ampliamento") !== -1) {
        const volEsistente = parseFloat(dati.volume_esistente_mc) || 0;
        const volNuovo = parseFloat(dati.volume_nuovo_mc) || 0;
        if (volEsistente > 0 && volNuovo > volEsistente * 0.25) {
          result.allowed = false;
          result.motivi.push(
            "II.D: ampliamento volumetrico " +
              volNuovo +
              " mc eccede il limite del 25% (" +
              volEsistente * 0.25 +
              " mc).",
          );
        }
      }
    }

    if ((code === "III.A" || code === "III.B") && dati) {
      const tipologia = (dati.tipologia_pdc || "").toLowerCase();
      const isGas = tipologia.indexOf("gas") !== -1;
      const scop = parseFloat(dati.scop) || 0;
      if (!isGas && scop > 0 && scop < 2.6) {
        result.allowed = false;
        result.motivi.push(
          code +
            ": SCOP " +
            scop +
            " inferiore al minimo 2.6 richiesto per pompe di calore (Manuale Analitico Sez.6).",
        );
      }
    }

    if (code === "III.B" && dati) {
      const tipoSistema = (dati.tipo_sistema || "").toLowerCase();
      const potenzaPdc = parseFloat(dati.potenza_pdc_kw) || 0;
      const potenzaCaldaia = parseFloat(dati.potenza_caldaia_kw) || 0;
      const etaSCaldaia = parseFloat(dati.eta_s_caldaia) || 0;
      if (
        tipoSistema.indexOf("ibrido") !== -1 &&
        potenzaCaldaia > 0 &&
        potenzaPdc / potenzaCaldaia > 0.5
      ) {
        result.allowed = false;
        result.motivi.push(
          "III.B: rapporto PdC/caldaia " +
            (potenzaPdc / potenzaCaldaia).toFixed(2) +
            " supera il limite 0.5 per sistemi ibridi factory made (Manuale Analitico Sez.6).",
        );
      }
      if (etaSCaldaia > 0) {
        const potCal = parseFloat(dati.potenza_caldaia_kw) || 0;
        if (potCal < 400 && etaSCaldaia <= 90) {
          result.allowed = false;
          result.motivi.push(
            "III.B: η_s caldaia " +
              etaSCaldaia +
              "% inferiore al minimo 90% per potenza <400 kW (Manuale Analitico Sez.6).",
          );
        }
        if (potCal >= 400 && etaSCaldaia <= 98) {
          result.allowed = false;
          result.motivi.push(
            "III.B: η_s caldaia " +
              etaSCaldaia +
              "% inferiore al minimo 98% per potenza ≥400 kW (Manuale Analitico Sez.6).",
          );
        }
      }
    }

    if (code === "III.C" && dati) {
      const classe = (dati.classe_emissiva || "").trim();
      if (classe && classe !== "5 stelle") {
        result.allowed = false;
        result.motivi.push(
          'III.C: classe emissiva "' +
            classe +
            '" non ammessa. Solo classe 5 stelle (Manuale Analitico Sez.6).',
        );
      }
    }

    if (code === "III.D" && dati) {
      const uso = (dati.uso_solare || "").trim();
      if (uso === "Solar Cooling") {
        const sup = parseFloat(dati.superficie_lorda_mq) || 0;
        const potAss = parseFloat(dati.potenza_assorbitore_kw) || 0;
        const portAria = parseFloat(dati.portata_aria_m3h) || 0;
        if (potAss > 0) {
          const rapporto = sup / potAss;
          if (rapporto < 2 || rapporto > 2.75) {
            result.allowed = false;
            result.motivi.push(
              "III.D Solar Cooling: rapporto superficie/potenza assorbitore " +
                rapporto.toFixed(2) +
                " m²/kW fuori range [2.0–2.75] (Manuale Analitico Sez.6).",
            );
          }
        }
        if (portAria > 0) {
          const dec = sup / (portAria / 1000);
          if (dec < 8) {
            result.allowed = false;
            result.motivi.push(
              "III.D Solar Cooling: DEC " +
                dec.toFixed(2) +
                " m²/(1000 m³/h) inferiore al minimo 8 (Manuale Analitico Sez.6).",
            );
          }
        }
      }
    }

    if (code === "III.G" && dati) {
      const pesVal = parseFloat(dati.pes) || 0;
      if (pesVal > 0 && pesVal < 10) {
        result.allowed = false;
        result.motivi.push(
          "III.G: PES " +
            pesVal +
            "% inferiore al minimo 10% (Manuale Analitico Sez.6).",
        );
      }
      const potEle = parseFloat(dati.potenza_elettrica) || 0;
      if (potEle > 0 && potEle > 50) {
        result.allowed = false;
        result.motivi.push(
          "III.G: potenza elettrica " +
            potEle +
            " kWe superiore al massimo 50 kWe (Manuale Analitico Sez.6).",
        );
      }
    }

    if (code === "II.H" && dati) {
      const potenzaFv = parseFloat(dati.potenza_fv_kw) || 0;
      if (potenzaFv > 0) {
        const minKw = PROCEDURA_CONFIG.FV_POTENZA_MIN_KW || 2;
        const maxKw = PROCEDURA_CONFIG.FV_POTENZA_MAX_KW || 1000;
        if (potenzaFv < minKw) {
          result.allowed = false;
          result.motivi.push(
            "II.H: potenza FV " +
              potenzaFv +
              " kW inferiore al minimo " +
              minKw +
              " kW.",
          );
        } else if (potenzaFv > maxKw) {
          result.allowed = false;
          result.motivi.push(
            "II.H: potenza FV " +
              potenzaFv +
              " kW superiore al massimo " +
              maxKw +
              " kW.",
          );
        }
        const trainanteKw = parseFloat(dati._trainante_potenza_kw) || 0;
        if (trainanteKw > 0 && potenzaFv > trainanteKw * 1.05) {
          result.allowed = false;
          result.motivi.push(
            "II.H: potenza FV " +
              potenzaFv +
              " kW eccede il 105% della potenza della PdC trainante (" +
              (trainanteKw * 1.05).toFixed(2) +
              " kW). Sovradimensionamento massimo 5%.",
          );
        }
      }
      if (dati.accumulo_presente === "sì") {
        const capAccumulo = parseFloat(dati.capacita_accumulo_kwh) || 0;
        if (capAccumulo > 0 && potenzaFv > 0) {
          const ratio = capAccumulo / potenzaFv;
          if (ratio < 0.5) {
            result.allowed = false;
            result.motivi.push(
              "II.H: accumulo " +
                capAccumulo +
                " kWh insufficiente per " +
                potenzaFv +
                " kWp (min 0.5 kWh/kWp, ratio " +
                ratio.toFixed(2) +
                ").",
            );
          } else if (ratio > 2) {
            result.allowed = false;
            result.motivi.push(
              "II.H: accumulo " +
                capAccumulo +
                " kWh eccede il limite per " +
                potenzaFv +
                " kWp (max 2 kWh/kWp, ratio " +
                ratio.toFixed(2) +
                ").",
            );
          }
        }
      }
    }

    return result;
  };

  const calculate = function (code, datiTecnici, contesto) {
    const metadata = FORMULE_INCENTIVO[code];

    let calculationResult = {
      amount: 0,
      params: {},
      steps: [],
      isEstimate: false,
      errors: [],
      warnings: [],
      status: metadata ? metadata.formula_status : "Bozza",
      note: metadata ? metadata.note : [],
      isBlocked: false,
    };

    const trainatiCodes = ["II.H", "II.G"];
    if (
      trainatiCodes.includes(code) &&
      contesto?.allInterventiData?.["III.A"]
    ) {
      const iiiAData = contesto.allInterventiData["III.A"];
      const iiiAPotenza =
        iiiAData.potenza_pdc_kw || iiiAData.potenza_termica_nominale;
      if (iiiAPotenza) {
        datiTecnici = {
          ...datiTecnici,
          _trainante_potenza_kw: parseFloat(iiiAPotenza),
        };
      }
    }

    const check = canCalculate(code, datiTecnici);
    if (!check.allowed) {
      calculationResult.errors = check.motivi;
      calculationResult.isBlocked = check.isBlocked;
      calculationResult.status = check.status;
      return calculationResult;
    }

    try {
      const res = _executeGenericFormula(code, datiTecnici, contesto);
      calculationResult = { ...calculationResult, ...res };

      if (contesto) {
        calculationResult.maggiorazioni = _calculateMaggiorazioni(contesto);
      }

      if (calculationResult.amount > 0) {
        calculationResult.corrispettivoGSE = _calculateCorrispettivoGSE(
          calculationResult.amount,
        );
        calculationResult.incentivoNetto = parseFloat(
          (
            calculationResult.amount -
            calculationResult.corrispettivoGSE.importo
          ).toFixed(2),
        );
      }

      if (
        calculationResult.amount > 0 &&
        calculationResult.errors.length === 0
      ) {
        const soggettoType = contesto?.soggetto || "";
        const modalitaAccesso = contesto?.modalita_accesso || "diretto";
        calculationResult.paymentPlan = _calculatePaymentPlan(
          calculationResult.amount,
          code,
          datiTecnici,
          soggettoType,
          modalitaAccesso,
        );
      }
    } catch (err) {
      console.error(`FormulaEngine.calculate error:`, err);
      calculationResult.errors.push(`Errore interno: ${err.message}`);
    }

    return calculationResult;
  };

  return {
    canCalculate,
    calculate,
    calculateMaggiorazioni: _calculateMaggiorazioni,
    calculateCorrispettivoGSE: _calculateCorrispettivoGSE,
    calculatePaymentPlan: _calculatePaymentPlan,
  };
};

const FORMULA_ENGINE_VERSION = "v3-20260609";
const FORMULA_ENGINE_CODE_FEATURES = {
  hasCondensaWarning: true,
  hasCmaxMaggiorazione30: true,
  hasEtaMinPerTipo: true,
  hasHrZonale: true,
  hasAucSoggetto: true,
};

export const FormulaEngine = UaFormulaEngine();
FormulaEngine._version = FORMULA_ENGINE_VERSION;
FormulaEngine._features = FORMULA_ENGINE_CODE_FEATURES;
