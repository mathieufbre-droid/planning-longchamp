import type { TypeReservation } from "@/lib/planning";

export type Role = "ADMINISTRATEUR" | "LECTEUR";

export interface Profil {
  id: string;
  nom: string;
  prenom: string;
  email: string;
  role: Role;
  actif: boolean;
}

export interface Reservation {
  id: number;
  debut: string;
  fin: string;
  type: TypeReservation;
  occupant: string;
  note: string;
}

export const LIBELLES_ROLE: Record<Role, string> = { ADMINISTRATEUR: "Administrateur", LECTEUR: "Lecteur" };
export const LIBELLES_TYPE: Record<TypeReservation, string> = { SEMAINE: "Semaine", WEEK_END: "Week-end", AUTRE: "Séjour" };

export const messageErreur = (e: unknown) => {
  const m = e && typeof e === "object" && "message" in e ? String((e as { message: unknown }).message) : "Erreur inconnue";
  if (m.includes("reservations_sans_chevauchement")) return "Ces dates chevauchent une autre réservation.";
  if (m.includes("row-level security")) return "Action réservée aux administrateurs.";
  return m;
};
