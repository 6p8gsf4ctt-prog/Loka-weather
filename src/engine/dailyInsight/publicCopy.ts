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

function ordinal(value: number, feminine = false): string {
  if (value === 1) return feminine ? "1re" : "1er";
  return `${value}e`;
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
      editorialLine: warm ? "Une chaleur remarquable\npour la période." : "Une fraîcheur remarquable\npour la période.",
      sourceNote: referenceDate
        ? `Ici, pas vu depuis le ${referenceDate}.`
        : "Comparaison établie à partir de l’historique météo local.",
      comparison: null
    };
  }

  if (candidate.detectorId === "C01") {
    const winter = candidate.valueLabel.includes("−");
    return {
      headline: "1 HEURE",
      subtitle: "",
      editorialLine: winter ? "Cette nuit, nous passons\nà l’heure d’hiver." : "Cette nuit, nous passons\nà l’heure d’été.",
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
    const startValue = first ? `${first} ${firstUnit}` : null;
    const endValue = second ? `${second} ${secondUnit}` : null;
    return {
      headline: `${amount(candidate.valueLabel)} °C`,
      subtitle: "",
      editorialLine: drop ? "Une chute rapide des températures\nce soir." : "Une hausse rapide des températures\naujourd’hui.",
      sourceNote: startValue && endValue && firstHour && secondHour
        ? `Il fera ${startValue} à ${firstHour}, mais ${drop ? "seulement " : "jusqu’à "}${endValue} à ${secondHour}.`
        : candidate.proofLine,
      comparison: compared(
        first ? `${first} ${firstUnit}` : null, firstHour ?? "AU DÉPART",
        second ? `${second} ${secondUnit}` : null, secondHour ?? "À LA FIN"
      ) ?? fallbackComparison
    };
  }

  if (candidate.detectorId === "T05") {
    const low = /BAS|fraîch/i.test(`${candidate.valueLabel} ${candidate.headline}`);
    const morning = /matin|tmin/i.test(`${candidate.proofLine} ${candidate.evidence[0]?.metric ?? ""}`);
    const rankEvidence = candidate.evidence.find((item) => item.metric === "rolling_rank_100" && typeof item.value === "number");
    const rank = typeof rankEvidence?.value === "number" ? Math.round(rankEvidence.value) : null;
    const sampleSize = Number(rankEvidence?.window.replace(/^P/, "")) || 100;
    const subject = morning ? "matinée" : "journée";
    return {
      headline: first ? `${first} °C` : candidate.valueLabel,
      subtitle: "",
      editorialLine: low ? `Une ${subject} parmi les plus fraîches\nde ces derniers mois.` : `Une ${subject} parmi les plus chaudes\nde ces derniers mois.`,
      sourceNote: rank && rank <= 5
        ? `Ce serait la ${ordinal(rank, true)} ${subject} la plus ${low ? "fraîche" : "chaude"} des ${sampleSize} dernières.`
        : `Un niveau inhabituel pour cette période de l’année.`,
      comparison: compared(
        first ? `${first} ${firstUnit}` : null, morning ? "CE MATIN" : "AUJOURD’HUI",
        second ? `${second} ${secondUnit}` : null, `SEUIL DES 5 % LES PLUS ${low ? "FRAIS" : "CHAUDS"}`
      ) ?? fallbackComparison
    };
  }

  if (candidate.detectorId === "T11") {
    const warmer = candidate.valueLabel.includes("+");
    const period = /^([^,]+),/.exec(candidate.headline)?.[1]?.toUpperCase() ?? "AUJOURD’HUI";
    return {
      headline: `${amount(candidate.valueLabel)} °C`,
      subtitle: "",
      editorialLine: `${period.charAt(0)}${period.slice(1).toLowerCase()}, un net changement\npar rapport à hier.`,
      sourceNote: candidate.proofLine,
      comparison: fallbackComparison
    };
  }

  if (candidate.detectorId === "T06") {
    const above = candidate.valueLabel.includes("+") || /au-dessus/i.test(candidate.headline);
    return {
      headline: `${amount(candidate.valueLabel)} °C`,
      subtitle: "",
      editorialLine: `${above ? "Plus chaud" : "Plus frais"} que d’habitude\npour la saison.`,
      sourceNote: "Comparaison avec les journées locales de la même période.",
      comparison: fallbackComparison
    };
  }

  if (candidate.detectorId === "R01") return {
    headline: `${amount(candidate.valueLabel)} JOURS`,
    subtitle: "",
    editorialLine: "Une longue séquence presque sèche\nse poursuit.",
    sourceNote: candidate.proofLine,
    comparison: null
  };

  if (candidate.detectorId === "R02") return {
    headline: `${amount(candidate.valueLabel)} JOURS`,
    subtitle: "",
    editorialLine: "La pluie devrait faire son retour\naujourd’hui.",
    sourceNote: candidate.proofLine,
    comparison: null
  };

  if (candidate.detectorId === "R04") return {
    headline: first ? `${first} MM` : candidate.valueLabel,
    subtitle: "",
    editorialLine: "Une journée particulièrement pluvieuse\npour la saison.",
    sourceNote: "Un cumul inhabituellement élevé est attendu aujourd’hui.",
    comparison: compared(
      first ? `${first} ${firstUnit}` : null, "CUMUL PRÉVU",
      second ? `${second} ${secondUnit}` : null, "SEUIL DES 5 % LES PLUS ARROSÉS"
    ) ?? fallbackComparison
  };

  if (candidate.detectorId === "R05") return {
    headline: first ? `${first} MM` : candidate.valueLabel,
    subtitle: "",
    editorialLine: "Un passage pluvieux marqué\nest attendu aujourd’hui.",
    sourceNote: candidate.proofLine,
    comparison: compared(
      first ? `${first} ${firstUnit}` : null, "SUR LA JOURNÉE",
      second ? `${second} ${secondUnit}` : null, secondHour ? `PIC VERS ${secondHour.toUpperCase()}` : "AU PLUS FORT"
    ) ?? fallbackComparison
  };

  if (candidate.detectorId === "V03") return {
    headline: `${amount(candidate.valueLabel)} KM/H`,
    subtitle: "",
    editorialLine: "De fortes rafales sont attendues\naujourd’hui.",
    sourceNote: candidate.proofLine,
    comparison: null
  };

  if (candidate.detectorId === "V02") return {
    headline: `${amount(candidate.valueLabel)} KM/H`,
    subtitle: "",
    editorialLine: "Le vent devrait nettement se renforcer\ncet après-midi.",
    sourceNote: first && second && firstHour && secondHour
      ? `Les rafales passeront de ${first} km/h à ${firstHour} à ${second} km/h à ${secondHour}.`
      : candidate.proofLine,
    comparison: compared(
      first ? `${first} ${firstUnit}` : null, firstHour ?? "AU DÉPART",
      second ? `${second} ${secondUnit}` : null, secondHour ?? "AU PLUS FORT"
    ) ?? fallbackComparison
  };

  if (candidate.detectorId === "B01") return {
    headline: `${amount(candidate.valueLabel)} H`,
    subtitle: "",
    editorialLine: "Le brouillard pourrait durer\nune bonne partie de la matinée.",
    sourceNote: candidate.proofLine,
    comparison: null
  };

  if (candidate.detectorId === "A01") {
    const rise = candidate.valueLabel.includes("+");
    return {
      headline: `${amount(candidate.valueLabel)} HPA`,
      subtitle: "",
      editorialLine: `La pression devrait fortement ${rise ? "remonter" : "chuter"}\nau fil de la journée.`,
      sourceNote: candidate.proofLine,
      comparison: null
    };
  }

  if (candidate.detectorId === "M01") return {
    headline: `${amount(candidate.valueLabel)} °C`,
    subtitle: "",
    editorialLine: "Un fort contraste entre la plage\net l’océan.",
    sourceNote: first && second ? `Il fera ${first} °C dans l’air, contre ${second} °C dans l’eau.` : candidate.proofLine,
    comparison: compared(
      first ? `${first} ${firstUnit}` : null, "DANS L’AIR",
      second ? `${second} ${secondUnit}` : null, "DANS L’OCÉAN"
    ) ?? fallbackComparison
  };

  if (candidate.detectorId === "P304") return {
    headline: `${amount(candidate.valueLabel)} °C`,
    subtitle: "",
    editorialLine: "Un grand écart de température\nau fil de la journée.",
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
    headline: `${amount(candidate.valueLabel)} H`,
    subtitle: "",
    editorialLine: "Une vraie fenêtre sans pluie\ndans la journée.",
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
