"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { dateCourte, nuits } from "@/lib/planning";
import { messageErreur } from "@/lib/types";
import ChoixAnnee from "@/components/ChoixAnnee";

interface Ligne {
  id: number;
  debut: string;
  fin: string;
  occupant: string;
  montant: number | null;
  paye: boolean;
}

type Paiement = { montant: number | null; paye: boolean };

const euros = (v: number) => v.toLocaleString("fr-FR", { style: "currency", currency: "EUR" });
const dateLongue = (iso: string) => `${dateCourte(iso)} ${iso.slice(0, 4)}`;

/** Récapitulatif annuel : une ligne par réservation, montant à payer et case « payé » (administrateurs). */
export default function Recapitulatif({ annee }: { annee: number }) {
  const supabase = useMemo(() => createClient(), []);
  const [lignes, setLignes] = useState<Ligne[]>([]);
  const [erreur, setErreur] = useState("");
  const [charge, setCharge] = useState(false);

  const charger = useCallback(async () => {
    const { data, error } = await supabase.from("reservations")
      .select("id, debut, fin, occupant, paiements(montant, paye)")
      .gte("debut", `${annee}-01-01`).lte("debut", `${annee}-12-31`).order("debut");
    setErreur(error ? messageErreur(error) : "");
    setLignes(((data ?? []) as (Omit<Ligne, "montant" | "paye"> & { paiements: Paiement | Paiement[] | null })[]).map(({ paiements, ...r }) => {
      const p = Array.isArray(paiements) ? paiements[0] : paiements;
      return { ...r, montant: p?.montant === null || p?.montant === undefined ? null : Number(p.montant), paye: p?.paye ?? false };
    }));
    setCharge(true);
  }, [supabase, annee]);

  useEffect(() => { charger(); }, [charger]);

  const enregistrer = async (l: Ligne, changement: Partial<Paiement>) => {
    const valeurs = { montant: l.montant, paye: l.paye, ...changement };
    setLignes((ls) => ls.map((x) => (x.id === l.id ? { ...x, ...valeurs } : x)));
    const { error } = await supabase.from("paiements").upsert({ reservation_id: l.id, ...valeurs });
    if (error) { setErreur(messageErreur(error)); charger(); } else setErreur("");
  };

  const total = lignes.reduce((s, l) => s + (l.montant ?? 0), 0);
  const encaisse = lignes.reduce((s, l) => s + (l.paye ? l.montant ?? 0 : 0), 0);
  const totalNuits = lignes.reduce((s, l) => s + nuits(l), 0);

  return (
    <main className="max-w-6xl mx-auto p-4 pb-24 md:p-8 space-y-5">
      <ChoixAnnee annee={annee} chemin="/recapitulatif" />
      <div className="flex flex-wrap items-baseline gap-3">
        <h1 className="text-xl sm:text-2xl font-bold tabular-nums">Récapitulatif {annee}</h1>
        <p className="text-sm text-slate-500">{lignes.length} réservation{lignes.length > 1 ? "s" : ""} · {totalNuits} nuit{totalNuits > 1 ? "s" : ""}</p>
      </div>
      <div className="grid grid-cols-3 gap-2 sm:max-w-xl">
        <Total libelle="À payer" valeur={euros(total)} />
        <Total libelle="Payé" valeur={euros(encaisse)} classe="text-emerald-700" />
        <Total libelle="Reste dû" valeur={euros(total - encaisse)} classe={total - encaisse > 0 ? "text-amber-700" : ""} />
      </div>
      {erreur && <p className="text-sm text-red-600">{erreur}</p>}
      {charge && lignes.length === 0 && <p className="text-sm text-slate-500">Aucune réservation en {annee}.</p>}
      {lignes.length > 0 && (
        <>
          <div className="hidden md:block bg-white border rounded-xl overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                <tr>
                  <th className="p-3">Arrivée</th><th className="p-3">Départ</th><th className="p-3">Nom prénom</th>
                  <th className="p-3 text-right">Nuits</th><th className="p-3">Montant à payer</th><th className="p-3 text-center">Payé</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {lignes.map((l) => (
                  <tr key={l.id} className={l.paye ? "bg-emerald-50/40" : ""}>
                    <td className="p-3 whitespace-nowrap">{dateLongue(l.debut)}</td>
                    <td className="p-3 whitespace-nowrap">{dateLongue(l.fin)}</td>
                    <td className="p-3 font-medium">{l.occupant}</td>
                    <td className="p-3 text-right tabular-nums">{nuits(l)}</td>
                    <td className="p-3"><ChampMontant valeur={l.montant} onValider={(montant) => enregistrer(l, { montant })} /></td>
                    <td className="p-3 text-center"><CasePaye ligne={l} onChanger={(paye) => enregistrer(l, { paye })} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {/* Téléphone : une carte par réservation */}
          <ul className="md:hidden space-y-3">
            {lignes.map((l) => (
              <li key={l.id} className={`bg-white border rounded-xl p-3 space-y-2 ${l.paye ? "border-emerald-200" : ""}`}>
                <div className="flex items-baseline justify-between gap-2">
                  <span className="font-semibold">{l.occupant}</span>
                  <span className="text-xs text-slate-500 tabular-nums">{nuits(l)} nuit{nuits(l) > 1 ? "s" : ""}</span>
                </div>
                <p className="text-sm text-slate-600">Arrivée {dateLongue(l.debut)} · départ {dateLongue(l.fin)}</p>
                <div className="flex items-center justify-between gap-3">
                  <ChampMontant valeur={l.montant} onValider={(montant) => enregistrer(l, { montant })} />
                  <CasePaye ligne={l} onChanger={(paye) => enregistrer(l, { paye })} avecTexte />
                </div>
              </li>
            ))}
          </ul>
        </>
      )}
      <p className="text-xs text-slate-500">Arrivée le premier jour réservé, départ le dernier. Montants et paiements visibles des seuls administrateurs ; chaque changement est noté dans le journal.</p>
    </main>
  );
}

function Total({ libelle, valeur, classe = "" }: { libelle: string; valeur: string; classe?: string }) {
  return (
    <div className="bg-white border rounded-xl p-3">
      <p className="text-xs text-slate-500">{libelle}</p>
      <p className={`font-bold tabular-nums ${classe}`}>{valeur}</p>
    </div>
  );
}

/** Montant en euros, enregistré quand on quitte le champ ou appuie sur Entrée. Vide = pas encore fixé. */
function ChampMontant({ valeur, onValider }: { valeur: number | null; onValider: (v: number | null) => void }) {
  const texteDe = (v: number | null) => (v === null ? "" : (Number.isInteger(v) ? String(v) : v.toFixed(2)).replace(".", ","));
  const [texte, setTexte] = useState(texteDe(valeur));
  const [invalide, setInvalide] = useState(false);
  useEffect(() => setTexte(texteDe(valeur)), [valeur]);
  const valider = () => {
    const propre = texte.replace(/\s|€/g, "").replace(",", ".");
    if (propre === "") { setInvalide(false); if (valeur !== null) onValider(null); return; }
    const n = Math.round(Number(propre) * 100) / 100;
    if (!Number.isFinite(n) || n < 0) { setInvalide(true); return; }
    setInvalide(false);
    if (n !== valeur) onValider(n);
  };
  return (
    <span className="inline-flex items-center gap-1">
      <input inputMode="decimal" placeholder="—" value={texte} aria-label="Montant à payer" aria-invalid={invalide}
        onChange={(e) => setTexte(e.target.value)} onBlur={valider}
        onKeyDown={(e) => { if (e.key === "Enter") (e.target as HTMLInputElement).blur(); }}
        className={`w-28 p-1.5 border rounded text-sm text-right tabular-nums outline-none focus:ring-2 focus:ring-sky-500 ${invalide ? "border-red-400" : "border-slate-300"}`} />
      <span className="text-sm text-slate-500">€</span>
    </span>
  );
}

function CasePaye({ ligne, onChanger, avecTexte }: { ligne: Ligne; onChanger: (v: boolean) => void; avecTexte?: boolean }) {
  return (
    <label className="inline-flex items-center gap-2 text-sm cursor-pointer">
      <input type="checkbox" checked={ligne.paye} onChange={(e) => onChanger(e.target.checked)} className="w-5 h-5 accent-emerald-600"
        aria-label={`Payé : ${ligne.occupant}`} />
      {avecTexte && (ligne.paye ? <span className="text-emerald-700 font-medium">Payé</span> : <span className="text-slate-500">Non payé</span>)}
    </label>
  );
}
