"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { UserPlus } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { DOMAINE_IDENTIFIANTS } from "@/lib/identifiant";
import { LIBELLES_ROLE, messageErreur, type Profil, type Role } from "@/lib/types";

/** Membres de la famille : ajout, activation, rôle, nom affiché, mot de passe. Réservé aux administrateurs. */
export default function GestionMembres({ moi }: { moi: string }) {
  const supabase = useMemo(() => createClient(), []);
  const [membres, setMembres] = useState<Profil[]>([]);
  const [message, setMessage] = useState("");
  const [succes, setSucces] = useState("");
  const [mdpOuvert, setMdpOuvert] = useState<string | null>(null);

  const charger = useCallback(async () => {
    const { data } = await supabase.from("membres").select("id, nom, prenom, email, role, actif").order("actif").order("prenom");
    setMembres((data as Profil[]) ?? []);
  }, [supabase]);

  useEffect(() => { charger(); }, [charger]);

  const maj = async (id: string, changements: Partial<Pick<Profil, "role" | "actif" | "nom" | "prenom">>) => {
    const { error } = await supabase.from("membres").update(changements).eq("id", id);
    setMessage(error ? messageErreur(error) : "");
    setSucces("");
    charger();
  };

  const changerMotDePasse = async (m: Profil, motDePasse: string) => {
    const { error } = await supabase.rpc("definir_mot_de_passe", { p_membre: m.id, p_mot_de_passe: motDePasse });
    setMessage(error ? messageErreur(error) : "");
    setSucces(error ? "" : `Mot de passe de ${m.prenom || identifiant(m.email)} changé.`);
    if (!error) setMdpOuvert(null);
  };

  const champ = "p-2 border rounded text-sm";
  const enAttente = membres.filter((m) => !m.actif).length;

  return (
    <main className="max-w-5xl mx-auto p-4 md:p-8 space-y-4">
      <h1 className="text-lg font-bold">Membres</h1>
      <div className="text-sm text-slate-600 space-y-1">
        <p><strong>Administrateur</strong> : réserve, modifie et supprime les séjours, gère les membres. <strong>Lecteur</strong> : consulte le planning.</p>
      </div>
      {enAttente > 0 && <p className="text-sm bg-amber-50 border border-amber-200 text-amber-900 rounded p-2">{enAttente} compte{enAttente > 1 ? "s" : ""} en attente d&apos;activation.</p>}
      <FormulaireAjout onAjoute={(nom) => { setMessage(""); setSucces(`${nom} a été ajouté(e). Communiquez-lui son identifiant et son mot de passe.`); charger(); }} onErreur={(e) => { setSucces(""); setMessage(e); }} />
      {message && <p className="text-sm text-red-600">{message}</p>}
      {succes && <p className="text-sm text-emerald-700">{succes}</p>}
      <div className="bg-white border rounded-xl overflow-x-auto">
        <table className="w-full text-sm text-left">
          <thead className="bg-slate-50 text-xs uppercase text-slate-500">
            <tr><th className="p-3">Prénom</th><th className="p-3">Nom</th><th className="p-3">Identifiant</th><th className="p-3">Rôle</th><th className="p-3">Accès</th><th className="p-3">Mot de passe</th></tr>
          </thead>
          <tbody className="divide-y">
            {membres.map((m) => (
              <tr key={m.id} className={m.actif ? "" : "bg-amber-50/50"}>
                <td className="p-3"><ChampTexte valeur={m.prenom} placeholder="Prénom" onValider={(prenom) => maj(m.id, { prenom })} /></td>
                <td className="p-3"><ChampTexte valeur={m.nom} placeholder="Nom" onValider={(nom) => maj(m.id, { nom })} /></td>
                <td className="p-3 text-slate-600">{identifiant(m.email)}</td>
                <td className="p-3">
                  <select value={m.role} disabled={m.id === moi} onChange={(e) => maj(m.id, { role: e.target.value as Role })} className={champ} aria-label={`Rôle de ${m.email}`}>
                    {(Object.keys(LIBELLES_ROLE) as Role[]).map((r) => <option key={r} value={r}>{LIBELLES_ROLE[r]}</option>)}
                  </select>
                </td>
                <td className="p-3">
                  <input type="checkbox" checked={m.actif} disabled={m.id === moi} onChange={(e) => maj(m.id, { actif: e.target.checked })} aria-label={`Activer ${m.email}`} />
                </td>
                <td className="p-3 whitespace-nowrap">
                  {mdpOuvert === m.id
                    ? <NouveauMotDePasse onValider={(mdp) => changerMotDePasse(m, mdp)} onAnnuler={() => setMdpOuvert(null)} />
                    : <button type="button" onClick={() => setMdpOuvert(m.id)} className="text-xs px-2 py-1 rounded border hover:bg-slate-100">Changer</button>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-slate-500">Décocher « Accès » retire immédiatement l&apos;accès au planning. Un membre invité par email depuis Supabase apparaît ici désactivé jusqu&apos;à ce que vous cochiez « Accès ».</p>
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

/** « mathieufabre@longchamps.local » s'affiche « mathieufabre » ; un vrai email reste tel quel. */
const identifiant = (email: string) => email.endsWith(`@${DOMAINE_IDENTIFIANTS}`) ? email.slice(0, -DOMAINE_IDENTIFIANTS.length - 1) : email;

function FormulaireAjout({ onAjoute, onErreur }: { onAjoute: (nom: string) => void; onErreur: (e: string) => void }) {
  const supabase = useMemo(() => createClient(), []);
  const vide = { prenom: "", nom: "", identifiant: "", motDePasse: "", role: "LECTEUR" as Role };
  const [f, setF] = useState(vide);
  const [envoi, setEnvoi] = useState(false);
  const champ = "w-full p-2 border border-slate-300 rounded text-sm outline-none focus:ring-2 focus:ring-sky-500";

  const ajouter = async (e: React.FormEvent) => {
    e.preventDefault();
    setEnvoi(true);
    const { error } = await supabase.rpc("ajouter_membre", {
      p_identifiant: f.identifiant, p_mot_de_passe: f.motDePasse, p_prenom: f.prenom, p_nom: f.nom, p_role: f.role,
    });
    setEnvoi(false);
    if (error) return onErreur(messageErreur(error));
    onAjoute([f.prenom, f.nom].filter(Boolean).join(" ") || f.identifiant);
    setF(vide);
  };

  return (
    <form onSubmit={ajouter} className="bg-white border rounded-xl p-4 space-y-3">
      <h2 className="font-semibold text-sm flex items-center gap-2"><UserPlus size={16} /> Ajouter un membre</h2>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <label className="text-sm space-y-1"><span className="text-slate-600">Prénom</span>
          <input value={f.prenom} onChange={(e) => setF({ ...f, prenom: e.target.value })} className={champ} /></label>
        <label className="text-sm space-y-1"><span className="text-slate-600">Nom</span>
          <input value={f.nom} onChange={(e) => setF({ ...f, nom: e.target.value })} className={champ} /></label>
        <label className="text-sm space-y-1"><span className="text-slate-600">Identifiant ou email</span>
          <input required autoCapitalize="none" autoComplete="off" placeholder="ex. claire" value={f.identifiant}
            onChange={(e) => setF({ ...f, identifiant: e.target.value })} className={champ} /></label>
        <label className="text-sm space-y-1"><span className="text-slate-600">Mot de passe</span>
          <input required minLength={8} type="text" autoComplete="new-password" placeholder="8 caractères min." value={f.motDePasse}
            onChange={(e) => setF({ ...f, motDePasse: e.target.value })} className={champ} /></label>
        <label className="text-sm space-y-1"><span className="text-slate-600">Rôle</span>
          <select value={f.role} onChange={(e) => setF({ ...f, role: e.target.value as Role })} className={champ}>
            {(Object.keys(LIBELLES_ROLE) as Role[]).map((r) => <option key={r} value={r}>{LIBELLES_ROLE[r]}</option>)}
          </select></label>
      </div>
      <button disabled={envoi} className="text-sm px-4 py-2 rounded bg-sky-700 text-white font-semibold hover:bg-sky-800 disabled:opacity-60">
        {envoi ? "Ajout…" : "Ajouter"}
      </button>
    </form>
  );
}

function NouveauMotDePasse({ onValider, onAnnuler }: { onValider: (mdp: string) => void; onAnnuler: () => void }) {
  const [mdp, setMdp] = useState("");
  return (
    <span className="inline-flex items-center gap-1">
      <input autoFocus type="text" autoComplete="new-password" placeholder="Nouveau (8 min.)" value={mdp} onChange={(e) => setMdp(e.target.value)}
        onKeyDown={(e) => { if (e.key === "Enter" && mdp.length >= 8) onValider(mdp); if (e.key === "Escape") onAnnuler(); }}
        className="w-36 p-1.5 border border-slate-300 rounded text-sm" />
      <button type="button" disabled={mdp.length < 8} onClick={() => onValider(mdp)} className="text-xs px-2 py-1 rounded bg-sky-700 text-white disabled:opacity-40">OK</button>
      <button type="button" onClick={onAnnuler} className="text-xs px-2 py-1 rounded hover:bg-slate-100">Annuler</button>
    </span>
  );
}
