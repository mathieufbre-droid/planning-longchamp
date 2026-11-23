"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ChevronDown, ChevronRight, Plus } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import {
  couleurOccupant, dateCourte, intervalle, jours, nomMois, reservationsSur, semainesDeLAnnee, versIso,
  type Periode, type Semaine, type TypeReservation,
} from "@/lib/planning";
import { LIBELLES_TYPE, messageErreur, type Reservation } from "@/lib/types";
import FicheReservation, { type Brouillon } from "@/components/FicheReservation";

/** Années proposées en carrés cliquables. */
const ANNEES = [2026, 2027, 2028, 2029, 2030];

/** Vue annuelle : semaines du lundi au dimanche regroupées par mois ; semaine lundi → vendredi, week-end samedi → dimanche. */
export default function PlanningAnnuel({ annee, admin }: { annee: number; admin: boolean }) {
  const supabase = useMemo(() => createClient(), []);
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [occupantsConnus, setOccupantsConnus] = useState<string[]>([]);
  const [erreur, setErreur] = useState("");
  const [fiche, setFiche] = useState<Brouillon | null>(null);
  const [moisOuverts, setMoisOuverts] = useState<Set<number>>(new Set());
  const basculerMois = (m: number) => setMoisOuverts((o) => { const n = new Set(o); if (n.has(m)) n.delete(m); else n.add(m); return n; });

  const semaines = useMemo(() => semainesDeLAnnee(annee), [annee]);
  const aujourdhui = versIso(new Date());
  const anneeCourante = new Date().getFullYear();

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

  const parMois = useMemo(() => {
    const groupes: { mois: number; semaines: Semaine[] }[] = [];
    semaines.forEach((s) => {
      const dernier = groupes.at(-1);
      if (dernier?.mois === s.mois) dernier.semaines.push(s);
      else groupes.push({ mois: s.mois, semaines: [s] });
    });
    return groupes;
  }, [semaines]);

  const totalJours = reservations.reduce((t, r) => t + jours(r), 0);

  return (
    <main className="max-w-6xl mx-auto p-4 md:p-8 space-y-6">
      <nav aria-label="Choisir l'année" className="flex flex-wrap gap-2">
        {ANNEES.map((a) => (
          <Link key={a} href={`/?annee=${a}`} aria-current={a === annee ? "page" : undefined}
            className={`w-20 h-20 sm:w-24 sm:h-24 rounded-xl border-2 flex flex-col items-center justify-center font-bold text-xl tabular-nums transition-colors ${
              a === annee ? "bg-sky-700 border-sky-700 text-white shadow" : "bg-white border-slate-200 text-slate-700 hover:border-sky-500 hover:text-sky-800"}`}>
            {a}
            {a === anneeCourante && <span className={`text-[10px] font-medium uppercase tracking-wide ${a === annee ? "text-sky-100" : "text-sky-700"}`}>cette année</span>}
          </Link>
        ))}
      </nav>
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-2xl font-bold tabular-nums">Planning {annee}</h1>
        <p className="text-sm text-slate-500">{reservations.length} réservation{reservations.length > 1 ? "s" : ""} · {totalJours} jour{totalJours > 1 ? "s" : ""}</p>
        {admin && (
          <button type="button" onClick={() => nouvelle({ debut: "", fin: "" }, "AUTRE")}
            className="ml-auto flex items-center gap-1.5 text-sm bg-sky-700 text-white px-3 py-2 rounded hover:bg-sky-800">
            <Plus size={16} /> Autres dates
          </button>
        )}
      </div>
      <p className="text-sm text-slate-500">
        Semaine du lundi au vendredi, week-end le samedi et le dimanche.
        {admin ? " Cliquez sur une semaine ou un week-end libre pour le réserver, ou sur une réservation pour la modifier." : " Lecture seule : seuls les administrateurs réservent."}
      </p>
      {erreur && <p className="text-sm text-red-600">{erreur}</p>}

      <div className="space-y-3">
        {parMois.map(({ mois, semaines }) => {
          const passe = semaines.at(-1)!.fin < aujourdhui;
          const ouvert = !passe || moisOuverts.has(mois);
          const nbResas = new Set(semaines.flatMap((s) => reservationsSur(s, reservations).map((r) => r.id))).size;
          return (
            <section key={mois} className={`grid gap-3 md:grid-cols-[8rem_1fr] ${passe ? "" : "border-t pt-3"}`}>
              <h2 className="md:pt-3">
                {passe ? (
                  <button type="button" onClick={() => basculerMois(mois)} aria-expanded={ouvert}
                    className="flex items-center gap-1 text-sm font-semibold uppercase tracking-wide text-slate-400 hover:text-slate-700">
                    {ouvert ? <ChevronDown size={16} /> : <ChevronRight size={16} />} {nomMois(mois)}
                  </button>
                ) : <span className="text-sm font-semibold uppercase tracking-wide text-sky-800">{nomMois(mois)}</span>}
              </h2>
              {ouvert ? (
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                  {semaines.map((s) => (
                    <CarteSemaine key={s.debut} semaine={s} reservations={reservations} admin={admin}
                      passee={s.fin < aujourdhui} enCours={s.debut <= aujourdhui && aujourdhui <= s.fin}
                      onReserver={nouvelle} onOuvrir={ouvrir} />
                  ))}
                </div>
              ) : (
                <button type="button" onClick={() => basculerMois(mois)}
                  className="text-left text-sm text-slate-400 md:pt-3 hover:text-slate-700">
                  Mois passé · {nbResas === 0 ? "aucune réservation" : `${nbResas} réservation${nbResas > 1 ? "s" : ""}`} · afficher
                </button>
              )}
            </section>
          );
        })}
      </div>

      <section className="space-y-2">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Toutes les réservations {annee}</h2>
        {reservations.length === 0 ? <p className="text-sm text-slate-500">Aucune réservation pour l&apos;instant.</p> : (
          <div className="bg-white border rounded-xl overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                <tr><th className="p-3">Dates</th><th className="p-3">Type</th><th className="p-3">Occupant</th><th className="p-3">Jours</th><th className="p-3">Note</th></tr>
              </thead>
              <tbody className="divide-y">
                {reservations.map((r) => (
                  <tr key={r.id} onClick={() => ouvrir(r)} className="cursor-pointer hover:bg-slate-50">
                    <td className="p-3 whitespace-nowrap">{dateCourte(r.debut)} → {dateCourte(r.fin)}</td>
                    <td className="p-3">{LIBELLES_TYPE[r.type]}</td>
                    <td className="p-3"><span className={`px-2 py-0.5 rounded border ${couleurOccupant(r.occupant)}`}>{r.occupant}</span></td>
                    <td className="p-3 tabular-nums">{jours(r)}</td>
                    <td className="p-3 text-slate-600">{r.note}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {fiche && (
        <FicheReservation brouillon={fiche} admin={admin} reservations={reservations} occupantsConnus={occupantsConnus}
          onFermer={() => setFiche(null)} onEnregistre={() => { setFiche(null); charger(); }} />
      )}
    </main>
  );
}

function CarteSemaine({ semaine, reservations, admin, passee, enCours, onReserver, onOuvrir }: {
  semaine: Semaine; reservations: Reservation[]; admin: boolean; passee: boolean; enCours: boolean;
  onReserver: (p: Periode, type: TypeReservation) => void; onOuvrir: (r: Reservation) => void;
}) {
  const occupees = reservationsSur(semaine, reservations);
  const toutLibre = occupees.length === 0;
  const semaineLibre = reservationsSur(semaine.jours, reservations).length === 0;
  const weekEndLibre = reservationsSur(semaine.weekEnd, reservations).length === 0;
  const bouton = "flex-1 text-xs py-1.5 rounded border border-dashed border-slate-300 text-slate-600 hover:border-sky-500 hover:text-sky-800 hover:bg-sky-50 disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:border-slate-300 disabled:hover:text-slate-600";

  return (
    <article className={`bg-white border rounded-xl p-3 space-y-2 ${enCours ? "ring-2 ring-sky-500" : ""} ${passee ? "opacity-60" : ""}`}>
      <div className="flex items-baseline justify-between gap-2">
        <h3 className="text-sm font-semibold">{intervalle(semaine)}</h3>
        {toutLibre && <span className="text-xs text-emerald-700">Libre</span>}
      </div>
      {occupees.length > 0 && (
        <ul className="space-y-1">
          {occupees.map((r) => (
            <li key={r.id}>
              <button type="button" onClick={() => onOuvrir(r)} className={`w-full text-left text-xs px-2 py-1.5 rounded border ${couleurOccupant(r.occupant)}`}>
                <span className="font-semibold">{r.occupant}</span>
                <span className="block opacity-80">{LIBELLES_TYPE[r.type]} · {dateCourte(r.debut)} → {dateCourte(r.fin)}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
      {admin && !passee && (
        <div className="flex gap-2">
          <button type="button" disabled={!semaineLibre} onClick={() => onReserver(semaine.jours, "SEMAINE")} className={bouton}
            title={semaineLibre ? `Réserver ${dateCourte(semaine.jours.debut)} → ${dateCourte(semaine.jours.fin)}` : "Semaine déjà occupée"}>Semaine</button>
          <button type="button" disabled={!weekEndLibre} onClick={() => onReserver(semaine.weekEnd, "WEEK_END")} className={bouton}
            title={weekEndLibre ? `Réserver ${dateCourte(semaine.weekEnd.debut)} → ${dateCourte(semaine.weekEnd.fin)}` : "Week-end déjà occupé"}>Week-end</button>
        </div>
      )}
      
    </article>
  );
}
