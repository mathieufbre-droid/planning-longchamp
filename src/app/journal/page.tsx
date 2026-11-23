import Navigation from "@/components/Navigation";
import JournalModifications from "@/components/JournalModifications";
import { exigerProfil } from "@/lib/supabase/server";

export default async function PageJournal() {
  const profil = await exigerProfil(["ADMINISTRATEUR"]);
  return (
    <>
      <Navigation profil={profil} />
      <JournalModifications />
    </>
  );
}
