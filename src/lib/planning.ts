// Découpage de l'année en semaines et week-ends.
// Toutes les dates sont des chaînes « AAAA-MM-JJ » manipulées en UTC : pas de décalage de fuseau.
// Une période occupe les jours de « debut » à « fin », tous deux inclus.

export type TypeReservation = "SEMAINE" | "WEEK_END" | "AUTRE";

export interface Periode {
  debut: string;
  fin: string;
}

export interface Semaine {
  /** Du lundi au dimanche : sert à afficher la carte et ce qui l'occupe */
  debut: string;
  fin: string;
  /** Semaine réservable : lundi → vendredi */
  jours: Periode;
  /** Week-end réservable : samedi → dimanche */
  weekEnd: Periode;
  /** Mois (0-11) du lundi : sert à regrouper l'affichage */
  mois: number;
}

const JOUR = 86_400_000;

export const versDate = (iso: string) => new Date(`${iso}T00:00:00Z`);
export const versIso = (d: Date) => d.toISOString().slice(0, 10);
export const ajouterJours = (iso: string, n: number) => versIso(new Date(versDate(iso).getTime() + n * JOUR));
/** Nombre de jours occupés, bornes incluses. */
/** Nuits passées : arrivée le premier jour, départ le dernier jour. */
export const nuits = (p: Periode) => Math.max(0, jours(p) - 1);

/** Nuitées : nombre d'occupants × nombre de nuits (0 tant que le nombre d'occupants n'est pas saisi). */
export const nuitees = (p: Periode & { nb_occupants: number | null }) => (p.nb_occupants ?? 0) * nuits(p);

export const jours = (p: Periode) => Math.round((versDate(p.fin).getTime() - versDate(p.debut).getTime()) / JOUR) + 1;

/** Les semaines du lundi au dimanche dont le lundi tombe dans l'année. */
export function semainesDeLAnnee(annee: number): Semaine[] {
  const premier = new Date(Date.UTC(annee, 0, 1));
  // 1 = lundi
  const decalage = (1 - premier.getUTCDay() + 7) % 7;
  const semaines: Semaine[] = [];
  for (let lundi = ajouterJours(versIso(premier), decalage); versDate(lundi).getUTCFullYear() === annee; lundi = ajouterJours(lundi, 7)) {
    semaines.push({
      debut: lundi,
      fin: ajouterJours(lundi, 6),
      jours: { debut: lundi, fin: ajouterJours(lundi, 4) },
      weekEnd: { debut: ajouterJours(lundi, 5), fin: ajouterJours(lundi, 6) },
      mois: versDate(lundi).getUTCMonth(),
    });
  }
  return semaines;
}

export const seChevauchent = (a: Periode, b: Periode) => a.debut <= b.fin && b.debut <= a.fin;

/**
 * Jour de changement : on part le matin du dernier jour, le suivant peut arriver l'après-midi.
 * Une réservation occupe donc les nuits de « debut » à la veille de « fin » (une réservation d'un seul jour occupe ce jour).
 * Deux réservations se gênent si elles partagent une nuit ; au plus deux se croisent le même jour.
 */
export const finNuits = (p: Periode) => (p.fin > p.debut ? p.fin : ajouterJours(p.fin, 1));
export const seGenent = (a: Periode, b: Periode) => a.debut < finNuits(b) && b.debut < finNuits(a);
/** La nuit du jour est-elle prise ? */
export const nuitPrise = (jour: string, reservations: Periode[]) => reservations.some((r) => r.debut <= jour && jour < finNuits(r));

/** Réservations qui occupent au moins un jour de la période. */
export const reservationsSur = <T extends Periode>(periode: Periode, reservations: T[]) =>
  reservations.filter((r) => seChevauchent(periode, r));

/** Vérifie une période avant envoi ; renvoie un message d'erreur ou null. */
export function verifierPeriode(p: Periode, existantes: (Periode & { id?: number })[], idModifie?: number): string | null {
  if (!p.debut || !p.fin) return "Indiquez le premier et le dernier jour.";
  if (p.fin < p.debut) return "Le dernier jour doit être après le premier.";
  if (jours(p) > 62) return "Une réservation ne peut pas dépasser 62 jours.";
  if (existantes.some((r) => r.id !== idModifie && seGenent(p, r))) return "Ces dates chevauchent une autre réservation (seul le jour de départ peut être le jour d'arrivée suivant).";
  return null;
}

const MOIS = ["janvier", "février", "mars", "avril", "mai", "juin", "juillet", "août", "septembre", "octobre", "novembre", "décembre"];
const MOIS_COURTS = ["janv.", "févr.", "mars", "avr.", "mai", "juin", "juil.", "août", "sept.", "oct.", "nov.", "déc."];
const JOURS = ["dim.", "lun.", "mar.", "mer.", "jeu.", "ven.", "sam."];

export const nomMois = (m: number) => MOIS[m];
export const nomMoisCourt = (m: number) => MOIS_COURTS[m];
/** « lun. 4 janv. » */
export const dateCourte = (iso: string) => {
  const d = versDate(iso);
  return `${JOURS[d.getUTCDay()]} ${d.getUTCDate()} ${MOIS_COURTS[d.getUTCMonth()]}`;
};
/** « 4 → 10 janv. » ou « 28 déc. → 3 janv. » */
export const intervalle = (p: Periode) => {
  const a = versDate(p.debut), d = versDate(p.fin);
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

/**
 * Plages encore réservables dans une période, d'après les nuits libres (dans l'ordre).
 * Ex. lun. → ven. avec un séjour qui part le mardi matin : il reste mar. → ven.
 */
export function plagesLibres(periode: Periode, reservations: Periode[]): Periode[] {
  const plages: Periode[] = [];
  let debutLibre: string | null = null;
  const derniereNuit = ajouterJours(finNuits(periode), -1);
  for (let jour = periode.debut; jour <= derniereNuit; jour = ajouterJours(jour, 1)) {
    const pris = nuitPrise(jour, reservations);
    if (!pris && debutLibre === null) debutLibre = jour;
    if (pris && debutLibre !== null) { plages.push({ debut: debutLibre, fin: jour }); debutLibre = null; }
  }
  if (debutLibre !== null) plages.push({ debut: debutLibre, fin: periode.fin });
  return plages;
}

/** La plus longue plage libre (la première en cas d'égalité), ou null si tout est pris. */
export const plusLonguePlageLibre = (periode: Periode, reservations: Periode[]) =>
  plagesLibres(periode, reservations).reduce<Periode | null>((meilleure, p) => (!meilleure || jours(p) > jours(meilleure) ? p : meilleure), null);

/** Couleur pleine par occupant pour les barres du planning (même répartition que couleurOccupant). */
const BARRES = ["bg-sky-600", "bg-emerald-600", "bg-rose-500", "bg-violet-600", "bg-teal-600", "bg-orange-500", "bg-indigo-600", "bg-fuchsia-600"];
export function couleurBarre(occupant: string) {
  let h = 0;
  for (const c of occupant.trim().toLowerCase()) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return BARRES[h % BARRES.length];
}

export const joursDuMois = (annee: number, mois: number) => new Date(Date.UTC(annee, mois + 1, 0)).getUTCDate();
export const estWeekEnd = (iso: string) => [0, 6].includes(versDate(iso).getUTCDay());

/**
 * Clic sur un jour libre : propose la partie libre de sa semaine (lundi → vendredi)
 * ou de son week-end (samedi → dimanche) qui contient ce jour.
 */
export function periodeAReserver(jour: string, reservations: Periode[]): { periode: Periode; type: TypeReservation } | null {
  const j = versDate(jour).getUTCDay(); // 0 = dimanche
  const lundi = ajouterJours(jour, -((j + 6) % 7));
  // Le vendredi, on propose le week-end avec arrivée l'après-midi (vendredi → dimanche)
  const base = estWeekEnd(jour) ? { debut: ajouterJours(lundi, 5), fin: ajouterJours(lundi, 6) }
    : j === 5 ? { debut: jour, fin: ajouterJours(lundi, 6) }
    : { debut: lundi, fin: ajouterJours(lundi, 4) };
  const plage = plagesLibres(base, reservations).find((p) => p.debut <= jour && jour < p.fin)
    ?? plagesLibres(base, reservations).find((p) => p.debut <= jour && jour <= p.fin);
  if (!plage) return null;
  const complet = plage.debut === base.debut && plage.fin === base.fin;
  return { periode: plage, type: complet ? (estWeekEnd(jour) || j === 5 ? "WEEK_END" : "SEMAINE") : "AUTRE" };
}

/** Écart en jours entre deux dates (b − a). */
export const ecartJours = (a: string, b: string) => Math.round((versDate(b).getTime() - versDate(a).getTime()) / JOUR);

/** Décale une période de n jours en gardant sa durée. */
export const decaler = (p: Periode, n: number): Periode => ({ debut: ajouterJours(p.debut, n), fin: ajouterJours(p.fin, n) });

/** Type déduit des dates : lundi → vendredi = semaine, samedi (ou vendredi) → dimanche = week-end, sinon séjour. */
export function typePour(p: Periode): TypeReservation {
  const d = versDate(p.debut).getUTCDay();
  if (d === 1 && ecartJours(p.debut, p.fin) === 4) return "SEMAINE";
  if ((d === 6 && ecartJours(p.debut, p.fin) === 1) || (d === 5 && ecartJours(p.debut, p.fin) === 2)) return "WEEK_END";
  return "AUTRE";
}
