import Navigation from "@/components/Navigation";
import Recapitulatif from "@/components/Recapitulatif";
import { exigerProfil } from "@/lib/supabase/server";

export default async function PageRecapitulatif({ searchParams }: { searchParams: Promise<{ annee?: string }> }) {
  const [profil, { annee }] = await Promise.all([exigerProfil(["ADMINISTRATEUR"]), searchParams]);
  const n = Number(annee);
  const anneeAffichee = Number.isInteger(n) && n > 2000 && n < 2100 ? n : new Date().getFullYear();
  return (
    <>
      <Navigation profil={profil} />
      <Recapitulatif annee={anneeAffichee} />
    </>
  );
}
