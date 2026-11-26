import type { Periode } from "./planning.ts";

/** Vacances scolaires de l'académie de Lyon (zone A), source officielle du ministère de l'Éducation nationale. */
export const SOURCE_VACANCES =
  "https://data.education.gouv.fr/api/explore/v2.1/catalog/datasets/fr-en-calendrier-scolaire/records" +
  // Les plus récentes d'abord : triée dans l'ordre croissant, la liste complète (depuis 2017) dépassait la limite de 100 lignes
  "?where=location%3D%22Lyon%22&limit=100&order_by=start_date%20desc";

export interface Vacances extends Periode {
  libelle: string;
  /** Dates estimées tant que le ministère n'a pas publié le calendrier officiel */
  provisoire?: boolean;
}

interface Enregistrement {
  description?: string;
  population?: string;
  start_date?: string;
  end_date?: string | null;
}

const JOUR = 86_400_000;
const versJourParis = (horodatage: string) =>
  horodatage.includes("T")
    ? new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Paris" }).format(new Date(horodatage))
    : horodatage.slice(0, 10);
const veille = (iso: string) => new Date(Date.parse(`${iso}T00:00:00Z`) - JOUR).toISOString().slice(0, 10);

/**
 * Convertit les enregistrements de l'API en périodes de jours inclus.
 * L'API donne le premier jour de vacances et le jour de la reprise : le dernier jour de vacances est la veille.
 * Les lignes réservées aux enseignants sont ignorées.
 */
export function lireVacances(enregistrements: Enregistrement[]): Vacances[] {
  const vues = new Set<string>();
  const liste: Vacances[] = [];
  for (const e of enregistrements) {
    if (!e.start_date || /enseignant/i.test(e.population ?? "")) continue;
    const debut = versJourParis(e.start_date);
    const reprise = e.end_date ? versJourParis(e.end_date) : `${debut.slice(0, 4)}-09-01`;
    const fin = reprise > debut ? veille(reprise) : debut;
    const cle = `${debut}|${fin}`;
    if (vues.has(cle)) continue;
    vues.add(cle);
    liste.push({ debut, fin, libelle: (e.description ?? "Vacances").trim() });
  }
  return liste.sort((a, b) => a.debut.localeCompare(b.debut));
}

const samediEntre = (annee: number, mois: number, jourMin: number) => {
  // Premier samedi à partir du jour donné (mois 1-12)
  const d = new Date(Date.UTC(annee, mois - 1, jourMin));
  d.setUTCDate(d.getUTCDate() + ((6 - d.getUTCDay() + 7) % 7));
  return d.toISOString().slice(0, 10);
};
const plusJours = (iso: string, n: number) => new Date(Date.parse(`${iso}T00:00:00Z`) + n * JOUR).toISOString().slice(0, 10);

/**
 * Dates provisoires pour les années que le ministère n'a pas encore publiées, d'après les règles des dernières années :
 * Toussaint (2 semaines à partir du samedi entre le 17 et le 23 octobre), Noël (2 semaines à partir du samedi
 * entre le 18 et le 24 décembre), été (du samedi entre le 3 et le 9 juillet au 31 août).
 * Les vacances d'hiver et de printemps changent de zone chaque année : elles n'apparaissent qu'une fois publiées.
 * Une date provisoire disparaît dès que le calendrier officiel couvre la même période.
 */
export function completerVacances(officielles: Vacances[], anneeMin: number, anneeMax: number): Vacances[] {
  const estimees: Vacances[] = [];
  for (let a = anneeMin - 1; a <= anneeMax; a++) {
    const toussaint = samediEntre(a, 10, 17), noel = samediEntre(a, 12, 18), ete = samediEntre(a + 1, 7, 3);
    estimees.push(
      { debut: toussaint, fin: plusJours(toussaint, 15), libelle: "Vacances de la Toussaint (dates provisoires)", provisoire: true },
      { debut: noel, fin: plusJours(noel, 15), libelle: "Vacances de Noël (dates provisoires)", provisoire: true },
      { debut: ete, fin: `${a + 1}-08-31`, libelle: "Vacances d'été (dates provisoires)", provisoire: true },
    );
  }
  const manquantes = estimees.filter((e) => e.debut.slice(0, 4) <= String(anneeMax) && e.fin.slice(0, 4) >= String(anneeMin) && vacancesSur(e, officielles).length === 0);
  return [...officielles, ...manquantes].sort((a, b) => a.debut.localeCompare(b.debut));
}

/** Vacances qui touchent la période (ex. du lundi au vendredi d'une semaine). */
export const vacancesSur = (periode: Periode, vacances: Vacances[]) =>
  vacances.filter((v) => v.debut <= periode.fin && periode.debut <= v.fin);

/** Récupère le calendrier (mis en cache une journée). En cas d'échec, le planning s'affiche sans marqueur. */
export async function chargerVacances(): Promise<Vacances[]> {
  try {
    const reponse = await fetch(process.env.VACANCES_SOURCE || SOURCE_VACANCES, { next: { revalidate: 86_400 } } as RequestInit);
    if (!reponse.ok) { console.warn(`Vacances scolaires indisponibles (HTTP ${reponse.status})`); return completerVacances([], 2026, 2030); }
    const json = (await reponse.json()) as { results?: Enregistrement[] };
    return completerVacances(lireVacances(json.results ?? []), 2026, 2030);
  } catch (e) {
    console.warn("Vacances scolaires indisponibles", e);
    return completerVacances([], 2026, 2030);
  }
}
