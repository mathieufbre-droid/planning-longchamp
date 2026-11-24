// Mise en phrases des lignes du journal des modifications.
import { dateCourte } from "./planning.ts";

export type ActionJournal = "AJOUT" | "MODIFICATION" | "SUPPRESSION";
export type ObjetJournal = "RESERVATION" | "MEMBRE";
type Ligne = Record<string, unknown> | null;

export interface EntreeJournal {
  id: number;
  le: string;
  auteur: string;
  action: ActionJournal;
  objet: ObjetJournal;
  objet_id: string;
  avant: Ligne;
  apres: Ligne;
}

const TYPES: Record<string, string> = { SEMAINE: "semaine", WEEK_END: "week-end", AUTRE: "séjour" };
const ROLES: Record<string, string> = { ADMINISTRATEUR: "administrateur", LECTEUR: "lecteur" };
const txt = (v: unknown) => (v === null || v === undefined || v === "" ? "—" : String(v));
const annee = (iso: unknown) => String(iso).slice(0, 4);
const euros = (v: unknown) => (v === null || v === undefined || v === "" ? "—" : `${Number(v).toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €`);

const resumeReservation = (r: Record<string, unknown>) =>
  `${txt(r.occupant)}, ${dateCourte(String(r.debut))} → ${dateCourte(String(r.fin))} ${annee(r.fin)} (${TYPES[String(r.type)] ?? txt(r.type)})`;

const nomMembre = (m: Record<string, unknown>) => {
  const nom = [m.prenom, m.nom].filter(Boolean).join(" ");
  return nom ? `${nom} (${txt(m.email)})` : txt(m.email);
};

/** Liste des changements champ par champ, en français. */
function differences(e: EntreeJournal): string[] {
  const a = e.avant ?? {}, b = e.apres ?? {};
  const champs: [string, string, (v: unknown) => string][] = e.objet === "RESERVATION"
    ? [["occupant", "occupant", txt], ["nb_occupants", "nombre d'occupants", txt], ["nuitees", "nuitées", txt], ["debut", "premier jour", (v) => `${dateCourte(String(v))} ${annee(v)}`],
       ["fin", "dernier jour", (v) => `${dateCourte(String(v))} ${annee(v)}`], ["type", "type", (v) => TYPES[String(v)] ?? txt(v)], ["note", "note", txt],
       ["montant", "montant à payer", euros], ["paye", "payé", (v) => (v ? "oui" : "non")]]
    : [["prenom", "prénom", txt], ["nom", "nom", txt], ["role", "rôle", (v) => ROLES[String(v)] ?? txt(v)]];
  const liste = champs.filter(([k]) => JSON.stringify(a[k]) !== JSON.stringify(b[k])).map(([k, libelle, f]) => `${libelle} : ${f(a[k])} → ${f(b[k])}`);
  if (e.objet === "MEMBRE" && a.actif !== b.actif) liste.push(b.actif ? "accès activé" : "accès retiré");
  if (e.objet === "MEMBRE" && b.mot_de_passe) liste.push("mot de passe changé");
  return liste;
}

/** Ce qui a été fait, en une phrase et un détail éventuel. */
export function decrire(e: EntreeJournal): { titre: string; detail: string[] } {
  if (e.objet === "RESERVATION") {
    if (e.action === "AJOUT") return { titre: `Réservation ajoutée : ${resumeReservation(e.apres!)}`, detail: [] };
    if (e.action === "SUPPRESSION") return { titre: `Réservation supprimée : ${resumeReservation(e.avant!)}`, detail: [] };
    return { titre: `Réservation modifiée : ${resumeReservation(e.avant!)}`, detail: differences(e) };
  }
  if (e.action === "AJOUT") return { titre: `Nouveau compte : ${nomMembre(e.apres!)}`, detail: [] };
  if (e.action === "SUPPRESSION") return { titre: `Membre supprimé : ${nomMembre(e.avant!)}`, detail: [] };
  return { titre: `Membre modifié : ${nomMembre(e.avant!)}`, detail: differences(e) };
}

/** « lun. 23 nov. 2026 à 08:47 », heure de Paris. */
export const horodatage = (iso: string) =>
  new Intl.DateTimeFormat("fr-FR", { timeZone: "Europe/Paris", weekday: "short", day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })
    .format(new Date(iso));
