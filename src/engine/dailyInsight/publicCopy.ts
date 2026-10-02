import type { WeeklyComplementaryComparisonItem } from "../weekly/complementarySlides";
import type { DailyInsightCandidateV2, DailyInsightEvidenceV2 } from "./editorialSelection";

export interface DailyInsightPublicCopy {
  headline: string;
  subtitle: string;
  editorialLine: string;
  sourceNote: string;
  comparison: { left: WeeklyComplementaryComparisonItem; right: WeeklyComplementaryComparisonItem } | null;
}

function numeric(candidate: DailyInsightCandidateV2, index: number): number | null {
  const value = candidate.evidence[index]?.value;
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function numberText(value: number | null): string | null {
  return value === null ? null : new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 1 }).format(value);
}

function amount(value: string): string {
  return value.match(/\d+(?:[,.]\d+)?/)?.[0] ?? value;
}

function hour(item: DailyInsightEvidenceV2 | undefined): string | null {
  if (!item) return null;
  const exact = item.window.match(/T(\d{2}):(\d{2})/);
  if (exact) return `${Number(exact[1])} h${exact[2] === "00" ? "" : ` ${exact[2]}`}`;
  const loose = item.window.match(/\b(\d{1,2})\s*h\b/i);
  return loose ? `${Number(loose[1])} h` : null;
}

function frenchDate(value: string): string | null {
  const iso = value.match(/\b(\d{4})-(\d{2})-(\d{2})\b/);
  if (!iso) return null;
  const date = new Date(`${iso[1]}-${iso[2]}-${iso[3]}T12:00:00Z`);
  return new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "long", timeZone: "UTC" }).format(date);
}

function publicReferenceDate(candidate: DailyInsightCandidateV2): string | null {
  const source = `${candidate.proofLine} ${candidate.evidence.map((item) => `${item.window} ${item.detail}`).join(" ")}`;
  return frenchDate(source) ?? source.match(/\b\d{1,2}\s+(?:janvier|février|mars|avril|mai|juin|juillet|août|septembre|octobre|novembre|décembre)\b/i)?.[0] ?? null;
}

function compared(
  leftValue: string | null,
  leftLabel: string,
  rightValue: string | null,
  rightLabel: string
): DailyInsightPublicCopy["comparison"] {
  return leftValue && rightValue ? {
    left: { value: leftValue, label: leftLabel },
    right: { value: rightValue, label: rightLabel }
  } : null;
}

/**
 * Converts technical detector output into language readable in two seconds.
 * Percentiles, internal windows and database terminology never reach the
 * public Story; they remain available in the laboratory audit.
 */
export function dailyInsightPublicCopy(
  candidate: DailyInsightCandidateV2,
  fallbackComparison: DailyInsightPublicCopy["comparison"]
): DailyInsightPublicCopy | null {
  const first = numberText(numeric(candidate, 0));
  const second = numberText(numeric(candidate, 1));
  const firstUnit = candidate.evidence[0]?.unit ?? "";
  const secondUnit = candidate.evidence[1]?.unit ?? "";
  const firstHour = hour(candidate.evidence[0]);
  const secondHour = hour(candidate.evidence[1]);

  if (candidate.detectorId === "T01" || candidate.detectorId === "T02") {
    const forecastEvidence = [...candidate.evidence].reverse().find((item) => typeof item.value === "number" && item.unit === "°C");
    const forecast = typeof forecastEvidence?.value === "number" ? numberText(forecastEvidence.value) : first;
    const referenceDate = publicReferenceDate(candidate);
    const warm = candidate.detectorId === "T02";
    return {
      headline: forecast ? `${forecast} °C` : candidate.valueLabel,
      subtitle: "",
      editorialLine: warm ? "Une chaleur remarquable pour la période." : "Une fraîcheur remarquable pour la période.",
      sourceNote: referenceDate
        ? `Valeur comparable observée le ${referenceDate}.`
        : "Comparaison établie à partir de l’historique météo local.",
      comparison: null
    };
  }

  if (candidate.detectorId === "C01") {
    const winter = candidate.valueLabel.includes("−");
    return {
      headline: "CHANGEMENT D’HEURE",
      subtitle: winter ? "CETTE NUIT, PASSAGE À L’HEURE D’HIVER" : "CETTE NUIT, PASSAGE À L’HEURE D’ÉTÉ",
      editorialLine: candidate.headline,
      sourceNote: candidate.proofLine,
      comparison: null
    };
  }

  if (candidate.detectorId === "C04") return {
    headline: "NOUVELLE SAISON",
    subtitle: candidate.headline.toUpperCase(),
    editorialLine: candidate.headline,
    sourceNote: candidate.proofLine,
    comparison: null
  };

  if (["T08", "T09", "P301"].includes(candidate.detectorId)) {
    const drop = candidate.valueLabel.includes("−") || /perdre|chute/i.test(`${candidate.headline} ${candidate.proofLine}`);
    const period = firstHour && secondHour ? `ENTRE ${firstHour.toUpperCase()} ET ${secondHour.toUpperCase()}` : "EN QUELQUES HEURES";
    return {
      headline: `${amount(candidate.valueLabel)} °C DE ${drop ? "MOINS" : "PLUS"}`,
      subtitle: `${period}${drop ? " CE SOIR" : " AUJOURD’HUI"}`,
      editorialLine: drop ? "La température devrait chuter rapidement." : "La température devrait grimper rapidement.",
      sourceNote: candidate.proofLine,
      comparison: compared(
        first ? `${first} ${firstUnit}` : null, firstHour ?? "AU DÉPART",
        second ? `${second} ${secondUnit}` : null, secondHour ?? "À LA FIN"
      ) ?? fallbackComparison
    };
  }

  if (candidate.detectorId === "T05") {
    const low = /BAS|fraîch/i.test(`${candidate.valueLabel} ${candidate.headline}`);
    const period = /matin/i.test(candidate.proofLine) ? "CE MATIN" : "AUJOURD’HUI";
    return {
      headline: first ? `${first} °C ${period}` : low ? "FRAÎCHEUR INHABITUELLE" : "CHALEUR INHABITUELLE",
      subtitle: `PARMI LES 5 % DES ${low ? "PLUS FRAIS" : "PLUS CHAUDS"} DE LA PÉRIODE`,
      editorialLine: low ? "Une matinée particulièrement fraîche pour la saison." : "Une journée particulièrement chaude pour la saison.",
      sourceNote: candidate.proofLine.replace(/comparés? à \d+ (?:journées|matinées) locales\.?/i, "dans l’historique météo local."),
      comparison: compared(
        first ? `${first} ${firstUnit}` : null, period,
        second ? `${second} ${secondUnit}` : null, `SEUIL DES 5 % LES PLUS ${low ? "FRAIS" : "CHAUDS"}`
      ) ?? fallbackComparison
    };
  }

  if (candidate.detectorId === "T11") {
    const warmer = candidate.valueLabel.includes("+");
    const period = /^([^,]+),/.exec(candidate.headline)?.[1]?.toUpperCase() ?? "AUJOURD’HUI";
    return {
      headline: `${amount(candidate.valueLabel)} °C DE ${warmer ? "PLUS" : "MOINS"}`,
      subtitle: `${period} PAR RAPPORT À HIER`,
      editorialLine: candidate.headline,
      sourceNote: candidate.proofLine,
      comparison: fallbackComparison
    };
  }

  if (candidate.detectorId === "T06") {
    const above = candidate.valueLabel.includes("+") || /au-dessus/i.test(candidate.headline);
    return {
      headline: `${amount(candidate.valueLabel)} °C ${above ? "AU-DESSUS" : "EN DESSOUS"}`,
      subtitle: `${above ? "PLUS CHAUD" : "PLUS FRAIS"} QUE D’HABITUDE POUR LA SAISON`,
      editorialLine: candidate.headline.replace("notre référence locale", "la valeur habituelle"),
      sourceNote: "Comparaison avec les journées locales de la même période.",
      comparison: fallbackComparison
    };
  }

  if (candidate.detectorId === "R01") return {
    headline: `${amount(candidate.valueLabel)} JOURS PRESQUE SECS`,
    subtitle: "MOINS DE 1 MM DE PLUIE PAR JOUR",
    editorialLine: candidate.headline,
    sourceNote: candidate.proofLine,
    comparison: null
  };

  if (candidate.detectorId === "R02") return {
    headline: `PLUIE APRÈS ${amount(candidate.valueLabel)} JOURS`,
    subtitle: "LE RETOUR D’UN TEMPS PLUS ARROSÉ AUJOURD’HUI",
    editorialLine: candidate.headline,
    sourceNote: candidate.proofLine,
    comparison: null
  };

  if (candidate.detectorId === "R04") return {
    headline: first ? `${first} MM ATTENDUS` : "PLUIE REMARQUABLE",
    subtitle: "PARMI LES 5 % DES CUMULS LES PLUS ÉLEVÉS DE LA PÉRIODE",
    editorialLine: "Une journée particulièrement pluvieuse pour la saison pourrait se profiler.",
    sourceNote: candidate.proofLine.replace(/P95/gi, "des 5 % les plus élevés"),
    comparison: compared(
      first ? `${first} ${firstUnit}` : null, "CUMUL PRÉVU",
      second ? `${second} ${secondUnit}` : null, "SEUIL DES 5 % LES PLUS ARROSÉS"
    ) ?? fallbackComparison
  };

  if (candidate.detectorId === "R05") return {
    headline: first ? `${first} MM ATTENDUS` : candidate.valueLabel,
    subtitle: "UN PASSAGE PLUVIEUX MARQUÉ AUJOURD’HUI",
    editorialLine: candidate.headline,
    sourceNote: candidate.proofLine,
    comparison: compared(
      first ? `${first} ${firstUnit}` : null, "SUR LA JOURNÉE",
      second ? `${second} ${secondUnit}` : null, secondHour ? `PIC VERS ${secondHour.toUpperCase()}` : "AU PLUS FORT"
    ) ?? fallbackComparison
  };

  if (candidate.detectorId === "V03") return {
    headline: `RAFALES À ${amount(candidate.valueLabel)} KM/H`,
    subtitle: "UN VENT FORT ATTENDU AUJOURD’HUI",
    editorialLine: candidate.headline,
    sourceNote: candidate.proofLine,
    comparison: null
  };

  if (candidate.detectorId === "V02") return {
    headline: "RAFALES EN FORTE HAUSSE",
    subtitle: first && second ? `DE ${first} À ${second} KM/H CET APRÈS-MIDI` : "LE VENT VA NETTEMENT SE RENFORCER",
    editorialLine: candidate.headline,
    sourceNote: candidate.proofLine,
    comparison: compared(
      first ? `${first} ${firstUnit}` : null, firstHour ?? "AU DÉPART",
      second ? `${second} ${secondUnit}` : null, secondHour ?? "AU PLUS FORT"
    ) ?? fallbackComparison
  };

  if (candidate.detectorId === "B01") return {
    headline: `${amount(candidate.valueLabel)} H DE BROUILLARD`,
    subtitle: "UNE VISIBILITÉ RÉDUITE JUSQU’EN MATINÉE",
    editorialLine: candidate.headline,
    sourceNote: candidate.proofLine,
    comparison: null
  };

  if (candidate.detectorId === "A01") {
    const rise = candidate.valueLabel.includes("+");
    return {
      headline: `PRESSION EN FORTE ${rise ? "HAUSSE" : "BAISSE"}`,
      subtitle: `${amount(candidate.valueLabel)} HPA D’ÉCART DANS LA JOURNÉE`,
      editorialLine: candidate.headline,
      sourceNote: candidate.proofLine,
      comparison: null
    };
  }

  if (candidate.detectorId === "M01") return {
    headline: `${amount(candidate.valueLabel)} °C D’ÉCART`,
    subtitle: "ENTRE L’AIR ET L’OCÉAN AUJOURD’HUI",
    editorialLine: candidate.headline,
    sourceNote: candidate.proofLine,
    comparison: compared(
      first ? `${first} ${firstUnit}` : null, "DANS L’AIR",
      second ? `${second} ${secondUnit}` : null, "DANS L’OCÉAN"
    ) ?? fallbackComparison
  };

  if (candidate.detectorId === "P304") return {
    headline: `${amount(candidate.valueLabel)} °C D’AMPLITUDE`,
    subtitle: "ENTRE LE MOMENT LE PLUS FRAIS ET LE PLUS DOUX",
    editorialLine: candidate.headline,
    sourceNote: candidate.proofLine,
    comparison: compared(
      first ? `${first} ${firstUnit}` : null, "AU PLUS FRAIS",
      second ? `${second} ${secondUnit}` : null, "AU PLUS DOUX"
    ) ?? fallbackComparison
  };

  if (candidate.detectorId === "P302") return {
    headline: `MEILLEUR CRÉNEAU : ${candidate.valueLabel}`,
    subtitle: "LE MOMENT LE PLUS FAVORABLE DE LA JOURNÉE",
    editorialLine: candidate.headline,
    sourceNote: candidate.proofLine,
    comparison: null
  };

  if (candidate.detectorId === "P303") return {
    headline: `${amount(candidate.valueLabel)} H SANS PLUIE`,
    subtitle: "LA PLUS LONGUE PÉRIODE SÈCHE DE LA JOURNÉE",
    editorialLine: candidate.headline,
    sourceNote: candidate.proofLine,
    comparison: null
  };

  if (candidate.detectorId === "H01") return {
    headline: "UNE JOURNÉE DÉJÀ-VUE",
    subtitle: "UN PROFIL TRÈS PROCHE D’UNE JOURNÉE RÉCENTE",
    editorialLine: candidate.headline,
    sourceNote: candidate.proofLine,
    comparison: null
  };

  return null;
}
