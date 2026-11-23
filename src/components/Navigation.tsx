import Link from "next/link";
import { CalendarDays, Mountain, Users } from "lucide-react";
import BoutonDeconnexion from "@/components/BoutonDeconnexion";
import { LIBELLES_ROLE, type Profil } from "@/lib/types";

export default function Navigation({ profil }: { profil: Profil }) {
  const lien = "flex items-center gap-1.5 text-sm text-slate-600 hover:text-slate-900";
  return (
    <header className="bg-white border-b">
      <div className="max-w-6xl mx-auto px-4 py-3 flex flex-wrap items-center gap-x-6 gap-y-2">
        <Link href="/" className="flex items-center gap-2 font-bold text-sky-800">
          <Mountain size={20} aria-hidden /> Longchamps
        </Link>
        <nav className="flex items-center gap-5">
          <Link href="/" className={lien}><CalendarDays size={16} /> Planning</Link>
          {profil.role === "ADMINISTRATEUR" && <Link href="/membres" className={lien}><Users size={16} /> Membres</Link>}
        </nav>
        <div className="ml-auto flex items-center gap-4">
          <span className="text-sm text-slate-500">
            {[profil.prenom, profil.nom].filter(Boolean).join(" ") || profil.email}
            <span className="ml-2 text-xs px-2 py-0.5 rounded-full bg-slate-100">{LIBELLES_ROLE[profil.role]}</span>
          </span>
          <BoutonDeconnexion />
        </div>
      </div>
    </header>
  );
}
