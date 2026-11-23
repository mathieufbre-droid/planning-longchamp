"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { decrire, horodatage, type EntreeJournal, type ObjetJournal } from "@/lib/journal";
import { messageErreur } from "@/lib/types";

const PAR_PAGE = 100;
const COULEUR_ACTION = { AJOUT: "bg-emerald-100 text-emerald-800", MODIFICATION: "bg-amber-100 text-amber-800", SUPPRESSION: "bg-red-100 text-red-800" };
const LIBELLE_ACTION = { AJOUT: "Ajout", MODIFICATION: "Modification", SUPPRESSION: "Suppression" };

/** Journal des modifications (administrateurs) : qui a fait quoi et quand. */
export default function JournalModifications() {
  const supabase = useMemo(() => createClient(), []);
  const [entrees, setEntrees] = useState<EntreeJournal[]>([]);
  const [objet, setObjet] = useState<ObjetJournal | "">("");
  const [limite, setLimite] = useState(PAR_PAGE);
  const [erreur, setErreur] = useState("");

  const charger = useCallback(async () => {
    let requete = supabase.from("journal").select("id, le, auteur, action, objet, objet_id, avant, apres").order("le", { ascending: false }).limit(limite);
    if (objet) requete = requete.eq("objet", objet);
    const { data, error } = await requete;
    setErreur(error ? messageErreur(error) : "");
    setEntrees((data as EntreeJournal[]) ?? []);
  }, [supabase, objet, limite]);

  useEffect(() => { charger(); }, [charger]);

  return (
    <main className="max-w-5xl mx-auto p-4 pb-24 md:p-8 space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-lg font-bold">Journal des modifications</h1>
        <select value={objet} onChange={(e) => { setObjet(e.target.value as ObjetJournal | ""); setLimite(PAR_PAGE); }} className="ml-auto p-2 border rounded text-sm" aria-label="Filtrer">
          <option value="">Tout</option>
          <option value="RESERVATION">Réservations</option>
          <option value="MEMBRE">Membres</option>
        </select>
      </div>
      <p className="text-sm text-slate-500">Chaque ajout, modification ou suppression est enregistré automatiquement par la base, avec la date, l&apos;heure (heure de Paris) et la personne. Le journal ne peut pas être modifié.</p>
      {erreur && <p className="text-sm text-red-600">{erreur}</p>}
      {entrees.length === 0 ? <p className="text-sm text-slate-500">Aucune modification enregistrée.</p> : (
        <ol className="bg-white border rounded-xl divide-y">
          {entrees.map((e) => {
            const { titre, detail } = decrire(e);
            return (
              <li key={e.id} className="p-3 sm:flex sm:gap-4 text-sm">
                <div className="sm:w-48 shrink-0 text-slate-500">
                  <time dateTime={e.le} className="block">{horodatage(e.le)}</time>
                  <span className="font-medium text-slate-800">{e.auteur}</span>
                </div>
                <div className="mt-1 sm:mt-0 space-y-1">
                  <p><span className={`mr-2 text-xs px-2 py-0.5 rounded-full ${COULEUR_ACTION[e.action]}`}>{LIBELLE_ACTION[e.action]}</span>{titre}</p>
                  {detail.length > 0 && <ul className="text-slate-600 list-disc pl-5">{detail.map((d) => <li key={d}>{d}</li>)}</ul>}
                </div>
              </li>
            );
          })}
        </ol>
      )}
      {entrees.length === limite && (
        <button type="button" onClick={() => setLimite(limite + PAR_PAGE)} className="text-sm px-3 py-2 rounded border hover:bg-slate-100">Afficher plus</button>
      )}
    </main>
  );
}
