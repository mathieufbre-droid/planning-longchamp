import Navigation from "@/components/Navigation";
import PlanningAnnuel from "@/components/PlanningAnnuel";
import { exigerProfil } from "@/lib/supabase/server";
import { chargerVacances } from "@/lib/vacances";

export default async function Accueil({ searchParams }: { searchParams: Promise<{ annee?: string }> }) {
  const [profil, { annee }, vacances] = await Promise.all([exigerProfil(), searchParams, chargerVacances()]);
  const n = Number(annee);
  const anneeAffichee = Number.isInteger(n) && n > 2000 && n < 2100 ? n : new Date().getFullYear();
  return (
    <>
      <Navigation profil={profil} />
      <PlanningAnnuel annee={anneeAffichee} admin={profil.role === "ADMINISTRATEUR"} vacances={vacances} />
    </>
  );
}
