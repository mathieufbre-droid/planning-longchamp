// Découpage de l'année en semaines et week-ends.
// Toutes les dates sont des chaînes « AAAA-MM-JJ » manipulées en UTC : pas de décalage de fuseau.
// Une période occupe les nuits de « arrivee » (incluse) à « depart » (exclu).

export type TypeReservation = "SEMAINE" | "WEEK_END" | "AUTRE";

export interface Periode {
  arrivee: string;
  depart: string;
}

export interface Semaine {
  /** Samedi d'arrivée */
  arrivee: string;
  /** Samedi de départ */
  depart: string;
  /** Week-end qui commence dans cette semaine : vendredi → dimanche */
  weekEnd: Periode;
  /** Mois (0-11) du samedi d'arrivée : sert à regrouper l'affichage */
  mois: number;
}

const JOUR = 86_400_000;

export const versDate = (iso: string) => new Date(`${iso}T00:00:00Z`);
export const versIso = (d: Date) => d.toISOString().slice(0, 10);
export const ajouterJours = (iso: string, n: number) => versIso(new Date(versDate(iso).getTime() + n * JOUR));
export const nuits = (p: Periode) => Math.round((versDate(p.depart).getTime() - versDate(p.arrivee).getTime()) / JOUR);

/** Les semaines samedi → samedi dont le samedi d'arrivée tombe dans l'année. */
export function semainesDeLAnnee(annee: number): Semaine[] {
  const premier = new Date(Date.UTC(annee, 0, 1));
  // 6 = samedi
  const decalage = (6 - premier.getUTCDay() + 7) % 7;
  const semaines: Semaine[] = [];
  for (let samedi = ajouterJours(versIso(premier), decalage); versDate(samedi).getUTCFullYear() === annee; samedi = ajouterJours(samedi, 7)) {
    semaines.push({
      arrivee: samedi,
      depart: ajouterJours(samedi, 7),
      weekEnd: { arrivee: ajouterJours(samedi, 6), depart: ajouterJours(samedi, 8) },
      mois: versDate(samedi).getUTCMonth(),
    });
  }
  return semaines;
}

export const seChevauchent = (a: Periode, b: Periode) => a.arrivee < b.depart && b.arrivee < a.depart;

/** Réservations qui occupent au moins une nuit de la période. */
export const reservationsSur = <T extends Periode>(periode: Periode, reservations: T[]) =>
  reservations.filter((r) => seChevauchent(periode, r));

/** Vérifie une période avant envoi ; renvoie un message d'erreur ou null. */
export function verifierPeriode(p: Periode, existantes: (Periode & { id?: number })[], idModifie?: number): string | null {
  if (!p.arrivee || !p.depart) return "Indiquez les dates d'arrivée et de départ.";
  if (p.depart <= p.arrivee) return "Le départ doit être après l'arrivée.";
  if (nuits(p) > 62) return "Une réservation ne peut pas dépasser 62 nuits.";
  if (existantes.some((r) => r.id !== idModifie && seChevauchent(p, r))) return "Ces dates chevauchent une autre réservation.";
  return null;
}

const MOIS = ["janvier", "février", "mars", "avril", "mai", "juin", "juillet", "août", "septembre", "octobre", "novembre", "décembre"];
const MOIS_COURTS = ["janv.", "févr.", "mars", "avr.", "mai", "juin", "juil.", "août", "sept.", "oct.", "nov.", "déc."];
const JOURS = ["dim.", "lun.", "mar.", "mer.", "jeu.", "ven.", "sam."];

export const nomMois = (m: number) => MOIS[m];
/** « sam. 19 déc. » */
export const dateCourte = (iso: string) => {
  const d = versDate(iso);
  return `${JOURS[d.getUTCDay()]} ${d.getUTCDate()} ${MOIS_COURTS[d.getUTCMonth()]}`;
};
/** « 19 → 26 déc. » ou « 26 déc. → 2 janv. » */
export const intervalle = (p: Periode) => {
  const a = versDate(p.arrivee), d = versDate(p.depart);
  const memeMois = a.getUTCMonth() === d.getUTCMonth();
  return `${a.getUTCDate()}${memeMois ? "" : ` ${MOIS_COURTS[a.getUTCMonth()]}`} → ${d.getUTCDate()} ${MOIS_COURTS[d.getUTCMonth()]}`;
};

/** Couleur stable par occupant, pour repérer d'un coup d'œil qui est là. */
const COULEURS = ["bg-sky-100 text-sky-900 border-sky-300", "bg-emerald-100 text-emerald-900 border-emerald-300", "bg-amber-100 text-amber-900 border-amber-300",
  "bg-rose-100 text-rose-900 border-rose-300", "bg-violet-100 text-violet-900 border-violet-300", "bg-teal-100 text-teal-900 border-teal-300",
  "bg-orange-100 text-orange-900 border-orange-300", "bg-indigo-100 text-indigo-900 border-indigo-300"];
export function couleurOccupant(occupant: string) {
  let h = 0;
  for (const c of occupant.trim().toLowerCase()) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return COULEURS[h % COULEURS.length];
}
