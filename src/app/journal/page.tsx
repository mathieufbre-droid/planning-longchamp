import Navigation from "@/components/Navigation";
import JournalModifications from "@/components/JournalModifications";
import { redirect } from "next/navigation";
import { exigerProfil } from "@/lib/supabase/server";

export default async function PageJournal() {
  const profil = await exigerProfil(["ADMINISTRATEUR"]);
  // Journal réservé au propriétaire de l'application (Mathieu)
  if (!profil.proprietaire) redirect("/");
  return (
    <>
      <Navigation profil={profil} />
      <JournalModifications />
    </>
  );
}
