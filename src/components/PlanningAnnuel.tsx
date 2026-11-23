"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { ChevronDown, ChevronRight, Plus } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import {
  couleurBarre, dateCourte, estWeekEnd, jours, joursDuMois, nomMois, nomMoisCourt, periodeAReserver, semainesDeLAnnee, versDate, versIso,
  type Periode, type TypeReservation,
} from "@/lib/planning";
import { messageErreur, type Reservation } from "@/lib/types";
import { vacancesSur, type Vacances } from "@/lib/vacances";
import ChoixAnnee from "@/components/ChoixAnnee";
import FicheReservation, { type Brouillon } from "@/components/FicheReservation";

/** Vue annuelle synthétique : une ligne par mois avec tous ses jours ; semaine lundi → vendredi, week-end samedi → dimanche. */
export default function PlanningAnnuel({ annee, admin, vacances }: { annee: number; admin: boolean; vacances: Vacances[] }) {
  const supabase = useMemo(() => createClient(), []);
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [occupantsConnus, setOccupantsConnus] = useState<string[]>([]);
  const [erreur, setErreur] = useState("");
  const [fiche, setFiche] = useState<Brouillon | null>(null);
  const [passesVisibles, setPassesVisibles] = useState(false);
  const aujourdhui = versIso(new Date());
  // Mois entièrement passés : repliés par défaut
  const nbPasses = Array.from({ length: 12 }, (_, m) => `${annee}-${String(m + 1).padStart(2, "0")}-${String(joursDuMois(annee, m)).padStart(2, "0")}`)
    .filter((fin) => fin < aujourdhui).length;
  const moisAffiches = Array.from({ length: 12 }, (_, m) => m).filter((m) => passesVisibles || m >= nbPasses);

  const charger = useCallback(async () => {
    const debut = `${annee}-01-01`;
    const fin = semainesDeLAnnee(annee).at(-1)!.fin;
    const [{ data, error }, { data: membres }] = await Promise.all([
      supabase.from("reservations").select("id, debut, fin, type, occupant, note")
        .lte("debut", fin).gte("fin", debut).order("debut"),
      supabase.from("membres").select("prenom, nom").eq("actif", true),
    ]);
    setErreur(error ? messageErreur(error) : "");
    const liste = (data as Reservation[]) ?? [];
    setReservations(liste);
    const noms = new Set<string>();
    (membres ?? []).forEach((m: { prenom: string; nom: string }) => { const n = [m.prenom, m.nom].filter(Boolean).join(" "); if (n) noms.add(n); });
    liste.forEach((r) => noms.add(r.occupant));
    setOccupantsConnus([...noms].sort((a, b) => a.localeCompare(b, "fr")));
  }, [supabase, annee]);

  useEffect(() => { charger(); }, [charger]);

  const nouvelle = (p: Periode, type: TypeReservation) => setFiche({ debut: p.debut, fin: p.fin, type, occupant: "", note: "" });
  const ouvrir = (r: Reservation) => setFiche({ ...r });

  const totalJours = reservations.reduce((t, r) => t + jours(r), 0);

  return (
    <main className="max-w-6xl mx-auto p-4 pb-24 md:p-8 space-y-5">
      <ChoixAnnee annee={annee} chemin="/" />
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-xl sm:text-2xl font-bold tabular-nums">Planning {annee}</h1>
        <p className="text-sm text-slate-500">{reservations.length} réservation{reservations.length > 1 ? "s" : ""} · {totalJours} jour{totalJours > 1 ? "s" : ""}</p>
        {admin && (
          <button type="button" onClick={() => nouvelle({ debut: "", fin: "" }, "AUTRE")}
            className="w-full sm:w-auto sm:ml-auto flex items-center justify-center gap-1.5 text-sm bg-sky-700 text-white px-3 py-2.5 sm:py-2 rounded-lg hover:bg-sky-800">
            <Plus size={16} /> Autres dates
          </button>
        )}
      </div>
      <Legende admin={admin} vacances={vacances.length > 0} />
      {erreur && <p className="text-sm text-red-600">{erreur}</p>}

      {nbPasses > 0 && (
        <button type="button" onClick={() => setPassesVisibles((v) => !v)} aria-expanded={passesVisibles}
          className="flex items-center gap-1 text-sm text-slate-500 hover:text-slate-800">
          {passesVisibles ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
          {passesVisibles ? "Masquer" : "Afficher"} {nbPasses === 1 ? "le mois passé" : `les ${nbPasses} mois passés`}
        </button>
      )}
      <GrilleAnnee annee={annee} mois={moisAffiches} reservations={reservations} vacances={vacances} aujourdhui={aujourdhui}
        admin={admin} onReserver={nouvelle} onOuvrir={ouvrir} />

      {fiche && (
        <FicheReservation brouillon={fiche} admin={admin} reservations={reservations} occupantsConnus={occupantsConnus}
          onFermer={() => setFiche(null)} onEnregistre={() => { setFiche(null); charger(); }} />
      )}
    </main>
  );
}

const JOURS_LETTRES = ["D", "L", "M", "M", "J", "V", "S"];
const iso = (annee: number, mois: number, jour: number) => `${annee}-${String(mois + 1).padStart(2, "0")}-${String(jour).padStart(2, "0")}`;

/**
 * Vue synthétique : une ligne par mois, une colonne par jour (1 → 31).
 * Week-ends sur fond gris, vacances scolaires soulignées en ambre, réservations en barres de couleur avec le nom.
 */
function GrilleAnnee({ annee, mois, reservations, vacances, aujourdhui, admin, onReserver, onOuvrir }: {
  annee: number; mois: number[]; reservations: Reservation[]; vacances: Vacances[]; aujourdhui: string; admin: boolean;
  onReserver: (p: Periode, type: TypeReservation) => void; onOuvrir: (r: Reservation) => void;
}) {
  const colonnes = { gridTemplateColumns: "repeat(31, minmax(0, 1fr))" };
  return (
    <div className="overflow-x-auto -mx-4 px-4 md:mx-0 md:px-0">
      <div className="min-w-[820px] md:min-w-[900px] bg-white border rounded-xl overflow-hidden">
        <div className="flex border-b bg-slate-50 text-[11px] text-slate-500 tabular-nums">
          <div className="sticky left-0 z-20 w-16 md:w-24 shrink-0 bg-slate-50" />
          <div className="grid flex-1" style={colonnes}>
            {Array.from({ length: 31 }, (_, i) => <div key={i} className="py-1 text-center">{i + 1}</div>)}
          </div>
        </div>
        {mois.map((m) => {
          const nb = joursDuMois(annee, m);
          const debutMois = iso(annee, m, 1), finMois = iso(annee, m, nb);
          const passe = finMois < aujourdhui;
          const barres = reservations.filter((r) => r.debut <= finMois && r.fin >= debutMois);
          return (
            <div key={m} className={`flex border-b last:border-b-0 ${passe ? "opacity-60" : ""}`}>
              <div className="sticky left-0 z-20 w-16 md:w-24 shrink-0 bg-white border-r px-2 flex items-center text-xs font-semibold uppercase tracking-wide text-sky-800">
                <span className="md:hidden">{nomMoisCourt(m)}</span><span className="hidden md:inline">{nomMois(m)}</span>
              </div>
              <div className="grid flex-1 relative h-12" style={colonnes}>
                {Array.from({ length: 31 }, (_, i) => {
                  const jour = i + 1;
                  if (jour > nb) return <div key={i} style={{ gridColumn: jour, gridRow: 1, backgroundImage: "repeating-linear-gradient(135deg, #f1f5f9 0 4px, #fff 4px 8px)" }} />;
                  const date = iso(annee, m, jour);
                  const we = estWeekEnd(date);
                  const conge = vacancesSur({ debut: date, fin: date }, vacances)[0];
                  const libre = !reservations.some((r) => r.debut <= date && date <= r.fin);
                  const cliquable = admin && libre && date >= aujourdhui;
                  const classe = `relative border-r last:border-r-0 border-slate-100 flex flex-col items-center pt-0.5 text-[10px] ${we ? "bg-slate-200/70 text-slate-600 font-medium" : "text-slate-400"} ${date === aujourdhui ? "ring-2 ring-inset ring-sky-500" : ""}`;
                  const contenu = (
                    <>
                      {JOURS_LETTRES[versDate(date).getUTCDay()]}
                      {conge && <span className="absolute inset-x-0 bottom-0 h-1 bg-amber-400" />}
                    </>
                  );
                  const titre = `${dateCourte(date)}${conge ? ` · ${conge.libelle}` : ""}`;
                  return cliquable ? (
                    <button key={i} type="button" style={{ gridColumn: jour, gridRow: 1 }} title={`${titre} · réserver`}
                      onClick={() => { const p = periodeAReserver(date, reservations); if (p) onReserver(p.periode, p.type); }}
                      className={`${classe} hover:bg-sky-100`}>{contenu}</button>
                  ) : <div key={i} style={{ gridColumn: jour, gridRow: 1 }} title={titre} className={classe}>{contenu}</div>;
                })}
                {barres.map((r) => {
                  const d = r.debut < debutMois ? debutMois : r.debut;
                  const f = r.fin > finMois ? finMois : r.fin;
                  const de = versDate(d).getUTCDate(), a = versDate(f).getUTCDate();
                  const arrondi = `${r.debut >= debutMois ? "rounded-l-md ml-0.5" : ""} ${r.fin <= finMois ? "rounded-r-md mr-0.5" : ""}`;
                  return (
                    <button key={r.id} type="button" onClick={() => onOuvrir(r)}
                      title={`${r.occupant} · ${dateCourte(r.debut)} → ${dateCourte(r.fin)}${r.note ? ` · ${r.note}` : ""}`}
                      style={{ gridColumn: `${de} / ${a + 1}`, gridRow: 1 }}
                      className={`z-10 self-end mb-1.5 h-6 px-1.5 text-left text-[11px] font-semibold leading-6 text-white truncate shadow-sm hover:brightness-110 ${couleurBarre(r.occupant)} ${arrondi}`}>
                      {r.occupant}
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function Legende({ admin, vacances }: { admin: boolean; vacances: boolean }) {
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500">
      <span className="flex items-center gap-1.5"><span className="w-4 h-3 rounded-sm bg-slate-200/70 border border-slate-300" /> Samedi et dimanche</span>
      {vacances && <span className="flex items-center gap-1.5"><span className="w-4 h-1 bg-amber-400" /> Vacances scolaires zone A (Lyon)</span>}
      <span className="flex items-center gap-1.5"><span className="w-4 h-3 rounded-sm ring-2 ring-inset ring-sky-500" /> Aujourd&apos;hui</span>
      <span>{admin ? "Cliquez sur un jour libre pour réserver sa semaine ou son week-end, ou sur une barre pour la modifier." : "Lecture seule : seuls les administrateurs réservent."}</span>
    </div>
  );
}
