"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CalendarDays, History, Mountain, ReceiptEuro, Users } from "lucide-react";
import BoutonDeconnexion from "@/components/BoutonDeconnexion";
import { LIBELLES_ROLE, type Profil } from "@/lib/types";

/** En-tête sur ordinateur ; sur téléphone, barre du haut compacte + barre d'onglets en bas, comme une application. */
export default function Navigation({ profil }: { profil: Profil }) {
  const chemin = usePathname();
  const onglets = [
    { href: "/", libelle: "Planning", Icone: CalendarDays },
    ...(profil.role === "ADMINISTRATEUR" ? [{ href: "/recapitulatif", libelle: "Récapitulatif", Icone: ReceiptEuro }] : []),
    // Tout le monde : seul Mathieu y voit tous les membres, les autres leur propre compte
    { href: "/membres", libelle: "Membres", Icone: Users },
    // Journal : réservé au propriétaire de l'application
    ...(profil.proprietaire && profil.role === "ADMINISTRATEUR" ? [{ href: "/journal", libelle: "Journal", Icone: History }] : []),
  ];
  const actif = (href: string) => (href === "/" ? chemin === "/" : chemin.startsWith(href));
  const nom = [profil.prenom, profil.nom].filter(Boolean).join(" ") || profil.email;

  return (
    <>
      <header className="print:hidden bg-white border-b sticky top-0 z-40 pt-[env(safe-area-inset-top)]">
        <div className="max-w-6xl mx-auto px-4 h-14 flex items-center gap-6">
          <Link href="/" className="flex items-center gap-2 font-bold text-sky-800">
            <Mountain size={20} aria-hidden /> Longchamp
          </Link>
          <nav className="hidden md:flex items-center gap-5">
            {onglets.map(({ href, libelle, Icone }) => (
              <Link key={href} href={href} className={`flex items-center gap-1.5 text-sm ${actif(href) ? "text-sky-800 font-semibold" : "text-slate-600 hover:text-slate-900"}`}>
                <Icone size={16} /> {libelle}
              </Link>
            ))}
          </nav>
          <div className="ml-auto flex items-center gap-4">
            <span className="text-sm text-slate-500 truncate max-w-[40vw]">
              {nom}
              <span className="hidden sm:inline ml-2 text-xs px-2 py-0.5 rounded-full bg-slate-100">{LIBELLES_ROLE[profil.role]}</span>
            </span>
            <BoutonDeconnexion />
          </div>
        </div>
      </header>
      {onglets.length > 1 && (
        <nav className="print:hidden md:hidden fixed bottom-0 inset-x-0 z-40 bg-white border-t pb-[env(safe-area-inset-bottom)]" aria-label="Navigation">
          <div className="grid" style={{ gridTemplateColumns: `repeat(${onglets.length}, 1fr)` }}>
            {onglets.map(({ href, libelle, Icone }) => (
              <Link key={href} href={href} aria-current={actif(href) ? "page" : undefined}
                className={`flex flex-col items-center gap-0.5 py-2 text-xs ${actif(href) ? "text-sky-700 font-semibold" : "text-slate-500"}`}>
                <Icone size={22} /> {libelle}
              </Link>
            ))}
          </div>
        </nav>
      )}
    </>
  );
}
