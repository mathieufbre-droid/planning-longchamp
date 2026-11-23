/**
 * Supabase identifie les comptes par email. Un identifiant simple (sans « @ »),
 * par exemple « mathieufabre », correspond au compte « mathieufabre@longchamps.local ».
 * Les membres invités par email se connectent avec leur email.
 */
export const DOMAINE_IDENTIFIANTS = "longchamps.local";

export const emailDeConnexion = (saisie: string) => {
  const v = saisie.trim().toLowerCase();
  return v.includes("@") ? v : `${v}@${DOMAINE_IDENTIFIANTS}`;
};
