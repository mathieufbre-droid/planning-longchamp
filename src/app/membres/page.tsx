import Navigation from "@/components/Navigation";
import GestionMembres from "@/components/GestionMembres";
import MonCompte from "@/components/MonCompte";
import { exigerProfil } from "@/lib/supabase/server";

/** Mathieu (propriétaire) : tous les membres. Tous les autres, administrateurs compris : uniquement leur propre compte (la base ne leur renvoie de toute façon que leur fiche). */
export default async function PageMembres() {
  const profil = await exigerProfil();
  return (
    <>
      <Navigation profil={profil} />
      {profil.proprietaire && profil.role === "ADMINISTRATEUR"
        ? <GestionMembres moi={profil.id} proprietaire={profil.proprietaire} />
        : <MonCompte profil={profil} />}
    </>
  );
}
