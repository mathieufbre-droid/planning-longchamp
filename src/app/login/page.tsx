"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Mountain } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

export default function Connexion() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [motDePasse, setMotDePasse] = useState("");
  const [erreur, setErreur] = useState("");
  const [chargement, setChargement] = useState(false);

  const seConnecter = async (e: React.FormEvent) => {
    e.preventDefault();
    setChargement(true);
    setErreur("");
    const { error } = await createClient().auth.signInWithPassword({ email, password: motDePasse });
    setChargement(false);
    if (error) return setErreur("Identifiants incorrects.");
    router.replace("/");
    router.refresh();
  };

  return (
    <main className="min-h-screen flex items-center justify-center p-4">
      <form onSubmit={seConnecter} className="w-full max-w-sm bg-white p-6 rounded-xl border border-gray-200 shadow-sm space-y-4">
        <div className="text-center space-y-1">
          <Mountain className="mx-auto text-sky-700" size={36} aria-hidden />
          <h1 className="font-bold text-lg">Saint François Longchamps</h1>
          <p className="text-sm text-gray-500">Planning familial de l&apos;appartement</p>
        </div>
        <input required type="email" autoComplete="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full text-sm p-2.5 border border-gray-300 rounded outline-none focus:ring-2 focus:ring-sky-500" />
        <input required type="password" autoComplete="current-password" placeholder="Mot de passe" value={motDePasse} onChange={(e) => setMotDePasse(e.target.value)} className="w-full text-sm p-2.5 border border-gray-300 rounded outline-none focus:ring-2 focus:ring-sky-500" />
        {erreur && <p className="text-sm text-red-600">{erreur}</p>}
        <button disabled={chargement} className="w-full bg-sky-600 text-white font-semibold py-2.5 rounded hover:bg-sky-700 disabled:opacity-60 text-sm">
          {chargement ? "Connexion..." : "Se connecter"}
        </button>
      </form>
    </main>
  );
}
