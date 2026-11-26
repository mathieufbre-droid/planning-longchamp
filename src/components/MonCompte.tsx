"use client";

import { useMemo, useState } from "react";
import { KeyRound } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { LIBELLES_ROLE, messageErreur, type Profil } from "@/lib/types";
import { DOMAINE_IDENTIFIANTS } from "@/lib/identifiant";

const identifiant = (email: string) => (email.endsWith(`@${DOMAINE_IDENTIFIANTS}`) ? email.slice(0, -DOMAINE_IDENTIFIANTS.length - 1) : email);

/** Page Membres de tous sauf Mathieu : uniquement son propre compte, avec changement de mot de passe. */
export default function MonCompte({ profil }: { profil: Profil }) {
  const supabase = useMemo(() => createClient(), []);
  const [mdp, setMdp] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [erreur, setErreur] = useState("");
  const [succes, setSucces] = useState("");
  const [envoi, setEnvoi] = useState(false);

  const changer = async (e: React.FormEvent) => {
    e.preventDefault();
    setSucces("");
    if (mdp.length < 8) return setErreur("Le mot de passe doit faire au moins 8 caractères.");
    if (mdp !== confirmation) return setErreur("Les deux mots de passe ne sont pas identiques.");
    setEnvoi(true);
    const { error } = await supabase.rpc("definir_mot_de_passe", { p_membre: profil.id, p_mot_de_passe: mdp });
    setEnvoi(false);
    if (error) return setErreur(messageErreur(error));
    setErreur(""); setMdp(""); setConfirmation("");
    setSucces("Mot de passe changé. Utilisez-le à la prochaine connexion.");
  };

  const nom = [profil.prenom, profil.nom].filter(Boolean).join(" ") || identifiant(profil.email);
  const champ = "w-full p-2 border border-slate-300 rounded text-sm outline-none focus:ring-2 focus:ring-sky-500";

  return (
    <main className="max-w-md mx-auto p-4 pb-24 md:p-8 space-y-4">
      <h1 className="text-lg font-bold">Mon compte</h1>
      <section className="bg-white border rounded-xl p-4 space-y-1 text-sm">
        <p className="font-semibold text-base">{nom}</p>
        <p className="text-slate-600">Identifiant : <span className="font-medium text-slate-900">{identifiant(profil.email)}</span></p>
        <p className="text-slate-600">Rôle : {LIBELLES_ROLE[profil.role]}</p>
      </section>
      <form onSubmit={changer} className="bg-white border rounded-xl p-4 space-y-3">
        <h2 className="font-semibold flex items-center gap-2"><KeyRound size={16} /> Changer mon mot de passe</h2>
        <label className="text-sm space-y-1 block">
          <span className="text-slate-600">Nouveau mot de passe (8 caractères minimum)</span>
          <input type="password" autoComplete="new-password" value={mdp} onChange={(e) => setMdp(e.target.value)} className={champ} />
        </label>
        <label className="text-sm space-y-1 block">
          <span className="text-slate-600">Confirmer le mot de passe</span>
          <input type="password" autoComplete="new-password" value={confirmation} onChange={(e) => setConfirmation(e.target.value)} className={champ} />
        </label>
        {erreur && <p className="text-sm text-red-600">{erreur}</p>}
        {succes && <p className="text-sm text-emerald-700">{succes}</p>}
        <button disabled={envoi || !mdp} className="text-sm px-4 py-2 rounded bg-sky-700 text-white font-semibold hover:bg-sky-800 disabled:opacity-50">
          {envoi ? "Enregistrement…" : "Changer le mot de passe"}
        </button>
      </form>
    </main>
  );
}
