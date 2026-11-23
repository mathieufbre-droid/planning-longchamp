"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { LIBELLES_ROLE, messageErreur, type Profil, type Role } from "@/lib/types";

/** Membres de la famille : activation, rôle, nom affiché. Réservé aux administrateurs. */
export default function GestionMembres({ moi }: { moi: string }) {
  const supabase = useMemo(() => createClient(), []);
  const [membres, setMembres] = useState<Profil[]>([]);
  const [message, setMessage] = useState("");

  const charger = useCallback(async () => {
    const { data } = await supabase.from("membres").select("id, nom, prenom, email, role, actif").order("actif").order("prenom");
    setMembres((data as Profil[]) ?? []);
  }, [supabase]);

  useEffect(() => { charger(); }, [charger]);

  const maj = async (id: string, changements: Partial<Pick<Profil, "role" | "actif" | "nom" | "prenom">>) => {
    const { error } = await supabase.from("membres").update(changements).eq("id", id);
    setMessage(error ? messageErreur(error) : "");
    charger();
  };

  const champ = "p-2 border rounded text-sm";
  const enAttente = membres.filter((m) => !m.actif).length;

  return (
    <main className="max-w-5xl mx-auto p-4 md:p-8 space-y-4">
      <h1 className="text-lg font-bold">Membres</h1>
      <div className="text-sm text-slate-600 space-y-1">
        <p>Pour ajouter quelqu&apos;un : Supabase &gt; Authentication &gt; Users &gt; <strong>Invite user</strong>. La personne apparaît ici désactivée : renseignez son nom, choisissez son rôle et activez-la.</p>
        <p><strong>Administrateur</strong> : réserve, modifie et supprime les séjours, gère les membres. <strong>Lecteur</strong> : consulte le planning.</p>
      </div>
      {enAttente > 0 && <p className="text-sm bg-amber-50 border border-amber-200 text-amber-900 rounded p-2">{enAttente} compte{enAttente > 1 ? "s" : ""} en attente d&apos;activation.</p>}
      {message && <p className="text-sm text-red-600">{message}</p>}
      <div className="bg-white border rounded-xl overflow-x-auto">
        <table className="w-full text-sm text-left">
          <thead className="bg-slate-50 text-xs uppercase text-slate-500">
            <tr><th className="p-3">Prénom</th><th className="p-3">Nom</th><th className="p-3">Email</th><th className="p-3">Rôle</th><th className="p-3">Accès</th></tr>
          </thead>
          <tbody className="divide-y">
            {membres.map((m) => (
              <tr key={m.id} className={m.actif ? "" : "bg-amber-50/50"}>
                <td className="p-3"><ChampTexte valeur={m.prenom} placeholder="Prénom" onValider={(prenom) => maj(m.id, { prenom })} /></td>
                <td className="p-3"><ChampTexte valeur={m.nom} placeholder="Nom" onValider={(nom) => maj(m.id, { nom })} /></td>
                <td className="p-3 text-slate-600">{m.email}</td>
                <td className="p-3">
                  <select value={m.role} disabled={m.id === moi} onChange={(e) => maj(m.id, { role: e.target.value as Role })} className={champ} aria-label={`Rôle de ${m.email}`}>
                    {(Object.keys(LIBELLES_ROLE) as Role[]).map((r) => <option key={r} value={r}>{LIBELLES_ROLE[r]}</option>)}
                  </select>
                </td>
                <td className="p-3">
                  <input type="checkbox" checked={m.actif} disabled={m.id === moi} onChange={(e) => maj(m.id, { actif: e.target.checked })} aria-label={`Activer ${m.email}`} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-slate-500">Décocher « Accès » retire immédiatement l&apos;accès au planning. Pour supprimer aussi le compte de connexion, supprimez-le dans Supabase &gt; Authentication &gt; Users.</p>
    </main>
  );
}

function ChampTexte({ valeur, placeholder, onValider }: { valeur: string; placeholder: string; onValider: (v: string) => void }) {
  const [texte, setTexte] = useState(valeur);
  useEffect(() => setTexte(valeur), [valeur]);
  return (
    <input value={texte} placeholder={placeholder} onChange={(e) => setTexte(e.target.value)}
      onBlur={() => { if (texte.trim() !== valeur) onValider(texte.trim()); }}
      onKeyDown={(e) => { if (e.key === "Enter") (e.target as HTMLInputElement).blur(); }}
      className="w-28 p-1.5 border border-transparent hover:border-slate-300 rounded text-sm focus:border-slate-400 outline-none" />
  );
}
