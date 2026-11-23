"use client";

import { useEffect, useMemo, useState } from "react";
import { X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { dateCourte, jours, verifierPeriode, type TypeReservation } from "@/lib/planning";
import { LIBELLES_TYPE, messageErreur, type Reservation } from "@/lib/types";

export interface Brouillon {
  id?: number;
  debut: string;
  fin: string;
  type: TypeReservation;
  occupant: string;
  note: string;
}

/** Fenêtre de création / modification d'une réservation (lecture seule pour les lecteurs). */
export default function FicheReservation({ brouillon, admin, reservations, occupantsConnus, onFermer, onEnregistre }: {
  brouillon: Brouillon; admin: boolean; reservations: Reservation[]; occupantsConnus: string[];
  onFermer: () => void; onEnregistre: () => void;
}) {
  const supabase = useMemo(() => createClient(), []);
  const [f, setF] = useState(brouillon);
  const [erreur, setErreur] = useState("");
  const [envoi, setEnvoi] = useState(false);
  const [confirmerSuppression, setConfirmerSuppression] = useState(false);

  useEffect(() => {
    const echap = (e: KeyboardEvent) => { if (e.key === "Escape") onFermer(); };
    window.addEventListener("keydown", echap);
    return () => window.removeEventListener("keydown", echap);
  }, [onFermer]);

  const enregistrer = async (e: React.FormEvent) => {
    e.preventDefault();
    const probleme = verifierPeriode(f, reservations, f.id) ?? (f.occupant.trim() ? null : "Indiquez qui occupe l'appartement.");
    if (probleme) return setErreur(probleme);
    setEnvoi(true);
    const valeurs = { debut: f.debut, fin: f.fin, type: f.type, occupant: f.occupant.trim(), note: f.note.trim() };
    const { error } = f.id
      ? await supabase.from("reservations").update(valeurs).eq("id", f.id)
      : await supabase.from("reservations").insert(valeurs);
    setEnvoi(false);
    if (error) return setErreur(messageErreur(error));
    onEnregistre();
  };

  const supprimer = async () => {
    if (!f.id) return;
    setEnvoi(true);
    const { error } = await supabase.from("reservations").delete().eq("id", f.id);
    setEnvoi(false);
    if (error) return setErreur(messageErreur(error));
    onEnregistre();
  };

  const champ = "w-full p-2 border border-slate-300 rounded text-sm outline-none focus:ring-2 focus:ring-sky-500 disabled:bg-slate-50";
  const duree = f.debut && f.fin && f.fin >= f.debut ? jours(f) : 0;

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/40 flex items-end sm:items-center justify-center p-0 sm:p-4" onClick={onFermer}>
      <form onSubmit={enregistrer} onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" aria-labelledby="titre-fiche"
        className="w-full sm:max-w-md max-h-[90dvh] overflow-y-auto bg-white rounded-t-2xl sm:rounded-2xl p-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] space-y-4 shadow-xl">
        <div className="flex items-center justify-between">
          <h2 id="titre-fiche" className="font-bold">
            {!admin ? "Réservation" : f.id ? "Modifier la réservation" : `Réserver ${f.type === "AUTRE" ? "des dates" : f.type === "SEMAINE" ? "la semaine" : "le week-end"}`}
          </h2>
          <button type="button" onClick={onFermer} aria-label="Fermer" className="p-1 rounded hover:bg-slate-100"><X size={18} /></button>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <label className="text-sm space-y-1">
            <span className="text-slate-600">Premier jour</span>
            <input type="date" required disabled={!admin} value={f.debut} onChange={(e) => setF({ ...f, debut: e.target.value })} className={champ} />
          </label>
          <label className="text-sm space-y-1">
            <span className="text-slate-600">Dernier jour</span>
            <input type="date" required disabled={!admin} value={f.fin} min={f.debut || undefined} onChange={(e) => setF({ ...f, fin: e.target.value })} className={champ} />
          </label>
        </div>
        {duree > 0 && <p className="text-xs text-slate-500 -mt-2">{dateCourte(f.debut)} → {dateCourte(f.fin)} · {duree} jour{duree > 1 ? "s" : ""}</p>}

        <label className="text-sm space-y-1 block">
          <span className="text-slate-600">Type</span>
          <select disabled={!admin} value={f.type} onChange={(e) => setF({ ...f, type: e.target.value as TypeReservation })} className={champ}>
            {(Object.keys(LIBELLES_TYPE) as TypeReservation[]).map((t) => <option key={t} value={t}>{LIBELLES_TYPE[t]}</option>)}
          </select>
        </label>

        <label className="text-sm space-y-1 block">
          <span className="text-slate-600">Occupant</span>
          <input required disabled={!admin} list="occupants" placeholder="Ex. : Famille Martin" value={f.occupant}
            onChange={(e) => setF({ ...f, occupant: e.target.value })} className={champ} autoFocus={admin} />
          <datalist id="occupants">{occupantsConnus.map((o) => <option key={o} value={o} />)}</datalist>
        </label>

        <label className="text-sm space-y-1 block">
          <span className="text-slate-600">Note</span>
          <textarea disabled={!admin} rows={2} placeholder="Arrivée tardive, ménage, nombre de personnes…" value={f.note}
            onChange={(e) => setF({ ...f, note: e.target.value })} className={champ} />
        </label>

        {erreur && <p className="text-sm text-red-600">{erreur}</p>}

        {admin && (
          <div className="flex items-center gap-2 pt-1">
            {f.id && (confirmerSuppression
              ? <button type="button" disabled={envoi} onClick={supprimer} className="text-sm px-3 py-2 rounded bg-red-600 text-white hover:bg-red-700">Confirmer la suppression</button>
              : <button type="button" onClick={() => setConfirmerSuppression(true)} className="text-sm px-3 py-2 rounded text-red-700 hover:bg-red-50">Supprimer</button>)}
            <button type="button" onClick={onFermer} className="ml-auto text-sm px-3 py-2 rounded hover:bg-slate-100">Annuler</button>
            <button disabled={envoi} className="text-sm px-4 py-2 rounded bg-sky-700 text-white font-semibold hover:bg-sky-800 disabled:opacity-60">
              {envoi ? "Enregistrement…" : "Enregistrer"}
            </button>
          </div>
        )}
      </form>
    </div>
  );
}
