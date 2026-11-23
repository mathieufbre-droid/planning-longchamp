import Navigation from "@/components/Navigation";
import GestionMembres from "@/components/GestionMembres";
import { exigerProfil } from "@/lib/supabase/server";

export default async function PageMembres() {
  const profil = await exigerProfil(["ADMINISTRATEUR"]);
  return (
    <>
      <Navigation profil={profil} />
      <GestionMembres moi={profil.id} />
    </>
  );
}
