import type { Periode } from "./planning.ts";

/** Vacances scolaires de l'académie de Lyon (zone A), source officielle du ministère de l'Éducation nationale. */
export const SOURCE_VACANCES =
  "https://data.education.gouv.fr/api/explore/v2.1/catalog/datasets/fr-en-calendrier-scolaire/records" +
  "?where=location%3D%22Lyon%22&limit=100&order_by=start_date";

export interface Vacances extends Periode {
  libelle: string;
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

/** Vacances qui touchent la période (ex. du lundi au vendredi d'une semaine). */
export const vacancesSur = (periode: Periode, vacances: Vacances[]) =>
  vacances.filter((v) => v.debut <= periode.fin && periode.debut <= v.fin);

/** Récupère le calendrier (mis en cache une journée). En cas d'échec, le planning s'affiche sans marqueur. */
export async function chargerVacances(): Promise<Vacances[]> {
  try {
    const reponse = await fetch(process.env.VACANCES_SOURCE || SOURCE_VACANCES, { next: { revalidate: 86_400 } } as RequestInit);
    if (!reponse.ok) { console.warn(`Vacances scolaires indisponibles (HTTP ${reponse.status})`); return []; }
    const json = (await reponse.json()) as { results?: Enregistrement[] };
    return lireVacances(json.results ?? []);
  } catch (e) {
    console.warn("Vacances scolaires indisponibles", e);
    return [];
  }
}
