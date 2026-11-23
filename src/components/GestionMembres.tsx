"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { UserPlus } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { DOMAINE_IDENTIFIANTS } from "@/lib/identifiant";
import { LIBELLES_ROLE, messageErreur, type Profil, type Role } from "@/lib/types";

/** Membres de la famille : ajout, activation, rôle, nom affiché, mot de passe. Réservé aux administrateurs. */
export default function GestionMembres({ moi, proprietaire }: { moi: string; proprietaire: boolean }) {
  const supabase = useMemo(() => createClient(), []);
  const [membres, setMembres] = useState<Profil[]>([]);
  const [message, setMessage] = useState("");
  const [succes, setSucces] = useState("");
  const [mdpOuvert, setMdpOuvert] = useState<string | null>(null);

  const charger = useCallback(async () => {
    const { data } = await supabase.from("membres").select("id, nom, prenom, email, role, actif, proprietaire").order("actif").order("prenom");
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

  // Seul Mathieu (propriétaire) gère les administrateurs ; les autres admins gèrent les lecteurs et leur propre compte.
  const gerable = (m: Profil) => proprietaire || (!m.proprietaire && (m.role !== "ADMINISTRATEUR" || m.id === moi));
  const roleModifiable = (m: Profil) => proprietaire && m.id !== moi;
  const champ = "p-2 border rounded text-sm disabled:bg-slate-50 disabled:text-slate-500";
  const enAttente = membres.filter((m) => !m.actif).length;

  return (
    <main className="max-w-5xl mx-auto p-4 pb-24 md:p-8 space-y-4">
      <h1 className="text-lg font-bold">Membres</h1>
      <div className="text-sm text-slate-600 space-y-1">
        <p><strong>Administrateur</strong> : réserve, modifie et supprime les séjours, gère les lecteurs. <strong>Lecteur</strong> : consulte uniquement le planning.</p>
        <p>Seul Mathieu peut nommer, modifier ou retirer un administrateur.</p>
      </div>
      {enAttente > 0 && <p className="text-sm bg-amber-50 border border-amber-200 text-amber-900 rounded p-2">{enAttente} compte{enAttente > 1 ? "s" : ""} en attente d&apos;activation.</p>}
      <FormulaireAjout proprietaire={proprietaire} onAjoute={(nom) => { setMessage(""); setSucces(`${nom} a été ajouté(e). Communiquez-lui son identifiant et son mot de passe.`); charger(); }} onErreur={(e) => { setSucces(""); setMessage(e); }} />
      {message && <p className="text-sm text-red-600">{message}</p>}
      {succes && <p className="text-sm text-emerald-700">{succes}</p>}
      <div className="hidden md:block bg-white border rounded-xl overflow-x-auto">
        <table className="w-full text-sm text-left">
          <thead className="bg-slate-50 text-xs uppercase text-slate-500">
            <tr><th className="p-3">Prénom</th><th className="p-3">Nom</th><th className="p-3">Identifiant</th><th className="p-3">Rôle</th><th className="p-3">Accès</th><th className="p-3">Mot de passe</th></tr>
          </thead>
          <tbody className="divide-y">
            {membres.map((m) => (
              <tr key={m.id} className={m.actif ? "" : "bg-amber-50/50"}>
                <td className="p-3"><ChampTexte valeur={m.prenom} placeholder="Prénom" disabled={!gerable(m)} onValider={(prenom) => maj(m.id, { prenom })} /></td>
                <td className="p-3"><ChampTexte valeur={m.nom} placeholder="Nom" disabled={!gerable(m)} onValider={(nom) => maj(m.id, { nom })} /></td>
                <td className="p-3 text-slate-600">{identifiant(m.email)}{m.proprietaire && <span className="ml-1 text-xs text-sky-700">(propriétaire)</span>}</td>
                <td className="p-3">
                  <select value={m.role} disabled={!roleModifiable(m)} onChange={(e) => maj(m.id, { role: e.target.value as Role })} className={champ} aria-label={`Rôle de ${m.email}`}>
                    {(Object.keys(LIBELLES_ROLE) as Role[]).map((r) => <option key={r} value={r}>{LIBELLES_ROLE[r]}</option>)}
                  </select>
                </td>
                <td className="p-3">
                  <input type="checkbox" checked={m.actif} disabled={m.id === moi || !gerable(m)} onChange={(e) => maj(m.id, { actif: e.target.checked })} aria-label={`Activer ${m.email}`} />
                </td>
                <td className="p-3 whitespace-nowrap">
                  {!gerable(m) ? <span className="text-xs text-slate-400">Réservé à Mathieu</span> : mdpOuvert === m.id
                    ? <NouveauMotDePasse onValider={(mdp) => changerMotDePasse(m, mdp)} onAnnuler={() => setMdpOuvert(null)} />
                    : <button type="button" onClick={() => setMdpOuvert(m.id)} className="text-xs px-2 py-1 rounded border hover:bg-slate-100">Changer</button>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {/* Téléphone : une carte par membre */}
      <ul className="md:hidden space-y-3">
        {membres.map((m) => (
          <li key={m.id} className={`bg-white border rounded-xl p-3 space-y-2 ${m.actif ? "" : "bg-amber-50/60 border-amber-200"}`}>
            <div className="flex items-center gap-1">
              <ChampTexte valeur={m.prenom} placeholder="Prénom" disabled={!gerable(m)} onValider={(prenom) => maj(m.id, { prenom })} />
              <ChampTexte valeur={m.nom} placeholder="Nom" disabled={!gerable(m)} onValider={(nom) => maj(m.id, { nom })} />
            </div>
            <p className="text-sm text-slate-500 px-1.5">{identifiant(m.email)}{m.proprietaire && <span className="ml-1 text-xs text-sky-700">(propriétaire)</span>}</p>
            <div className="flex items-center gap-3 px-1.5">
              <select value={m.role} disabled={!roleModifiable(m)} onChange={(e) => maj(m.id, { role: e.target.value as Role })} className={champ} aria-label={`Rôle de ${m.email}`}>
                {(Object.keys(LIBELLES_ROLE) as Role[]).map((r) => <option key={r} value={r}>{LIBELLES_ROLE[r]}</option>)}
              </select>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={m.actif} disabled={m.id === moi || !gerable(m)} onChange={(e) => maj(m.id, { actif: e.target.checked })} className="w-5 h-5" />
                Accès
              </label>
            </div>
            <div className="px-1.5">
              {!gerable(m) ? <span className="text-xs text-slate-400">Administrateur : géré par Mathieu</span> : mdpOuvert === m.id
                ? <NouveauMotDePasse onValider={(mdp) => changerMotDePasse(m, mdp)} onAnnuler={() => setMdpOuvert(null)} />
                : <button type="button" onClick={() => setMdpOuvert(m.id)} className="text-sm px-3 py-1.5 rounded border hover:bg-slate-100">Changer le mot de passe</button>}
            </div>
          </li>
        ))}
      </ul>
      <p className="text-xs text-slate-500">Décocher « Accès » retire immédiatement l&apos;accès au planning. Un membre invité par email depuis Supabase apparaît ici désactivé jusqu&apos;à ce que vous cochiez « Accès ».</p>
    </main>
  );
}

function ChampTexte({ valeur, placeholder, disabled, onValider }: { valeur: string; placeholder: string; disabled?: boolean; onValider: (v: string) => void }) {
  const [texte, setTexte] = useState(valeur);
  useEffect(() => setTexte(valeur), [valeur]);
  return (
    <input value={texte} placeholder={placeholder} disabled={disabled} onChange={(e) => setTexte(e.target.value)}
      onBlur={() => { if (texte.trim() !== valeur) onValider(texte.trim()); }}
      onKeyDown={(e) => { if (e.key === "Enter") (e.target as HTMLInputElement).blur(); }}
      className="w-28 p-1.5 border border-transparent hover:border-slate-300 rounded text-sm focus:border-slate-400 outline-none" />
  );
}

/** « mathieufabre@longchamps.local » s'affiche « mathieufabre » ; un vrai email reste tel quel. */
const identifiant = (email: string) => email.endsWith(`@${DOMAINE_IDENTIFIANTS}`) ? email.slice(0, -DOMAINE_IDENTIFIANTS.length - 1) : email;

function FormulaireAjout({ proprietaire, onAjoute, onErreur }: { proprietaire: boolean; onAjoute: (nom: string) => void; onErreur: (e: string) => void }) {
  const supabase = useMemo(() => createClient(), []);
  const vide = { prenom: "", nom: "", identifiant: "", motDePasse: "", role: "LECTEUR" as Role };
  const [f, setF] = useState(vide);
  const [envoi, setEnvoi] = useState(false);
  const [ouvert, setOuvert] = useState(false);
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
    setOuvert(false);
  };

  if (!ouvert) return (
    <button type="button" onClick={() => setOuvert(true)}
      className="w-full sm:w-auto flex items-center justify-center gap-2 text-sm px-4 py-2.5 rounded-lg bg-sky-700 text-white font-semibold hover:bg-sky-800">
      <UserPlus size={16} /> Ajouter un membre
    </button>
  );

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
          <select value={f.role} disabled={!proprietaire} onChange={(e) => setF({ ...f, role: e.target.value as Role })} className={champ}>
            {(Object.keys(LIBELLES_ROLE) as Role[]).map((r) => <option key={r} value={r} disabled={r === "ADMINISTRATEUR" && !proprietaire}>{LIBELLES_ROLE[r]}</option>)}
          </select></label>
      </div>
      <div className="flex gap-2">
        <button disabled={envoi} className="text-sm px-4 py-2 rounded bg-sky-700 text-white font-semibold hover:bg-sky-800 disabled:opacity-60">
          {envoi ? "Ajout…" : "Ajouter"}
        </button>
        <button type="button" onClick={() => setOuvert(false)} className="text-sm px-3 py-2 rounded hover:bg-slate-100">Annuler</button>
      </div>
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
