import Link from "next/link";

/** Années proposées en carrés cliquables. */
export const ANNEES = [2026, 2027, 2028, 2029, 2030];

/** Carrés des années ; « chemin » est la page à rouvrir avec ?annee=. */
export default function ChoixAnnee({ annee, chemin }: { annee: number; chemin: string }) {
  const anneeCourante = new Date().getFullYear();
  return (
    <nav aria-label="Choisir l'année" className="print:hidden grid grid-cols-5 gap-2 sm:flex sm:flex-wrap">
      {ANNEES.map((a) => (
        <Link key={a} href={`${chemin}?annee=${a}`} aria-current={a === annee ? "page" : undefined}
          className={`aspect-square sm:w-24 sm:h-24 rounded-xl border-2 flex flex-col items-center justify-center font-bold text-base sm:text-xl tabular-nums transition-colors ${
            a === annee ? "bg-sky-700 border-sky-700 text-white shadow" : "bg-white border-slate-200 text-slate-700 hover:border-sky-500 hover:text-sky-800"}`}>
          {a}
          {a === anneeCourante && <span className={`text-[9px] sm:text-[10px] font-medium uppercase tracking-wide ${a === annee ? "text-sky-100" : "text-sky-700"}`}><span className="sm:hidden">actuelle</span><span className="hidden sm:inline">cette année</span></span>}
        </Link>
      ))}
    </nav>
  );
}
