"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { dateCourte, nuits } from "@/lib/planning";
import { messageErreur } from "@/lib/types";
import { Printer } from "lucide-react";
import ChoixAnnee from "@/components/ChoixAnnee";

interface Ligne {
  id: number;
  debut: string;
  fin: string;
  occupant: string;
  nb_occupants: number;
  nuitees: number;
  montant: number | null;
  paye: boolean;
}

type Paiement = { montant: number | null; paye: boolean };

/** « 04/01 » : date courte pour l'affichage téléphone. */
const jj = (iso: string) => `${iso.slice(8, 10)}/${iso.slice(5, 7)}`;
const euros = (v: number) => v.toLocaleString("fr-FR", { style: "currency", currency: "EUR" });

/** Récapitulatif annuel : une ligne par réservation, montant à payer et case « payé » (administrateurs). */
export default function Recapitulatif({ annee }: { annee: number }) {
  const supabase = useMemo(() => createClient(), []);
  const [lignes, setLignes] = useState<Ligne[]>([]);
  const [erreur, setErreur] = useState("");
  const [charge, setCharge] = useState(false);

  const charger = useCallback(async () => {
    const { data, error } = await supabase.from("reservations")
      .select("id, debut, fin, occupant, nb_occupants, nuitees, paiements(montant, paye)")
      .gte("debut", `${annee}-01-01`).lte("debut", `${annee}-12-31`).order("debut");
    // Tant que la mise à jour de la base n'est pas faite, la table des paiements n'existe pas
    const baseAncienne = error && (error.code === "PGRST200" || error.code === "42P01" || /paiements/.test(error.message));
    setErreur(baseAncienne ? "La base de données doit d'abord être mise à jour pour afficher le récapitulatif." : error ? messageErreur(error) : "");
    setLignes(((data ?? []) as (Omit<Ligne, "montant" | "paye"> & { paiements: Paiement | Paiement[] | null })[]).map(({ paiements, ...r }) => {
      const p = Array.isArray(paiements) ? paiements[0] : paiements;
      return { ...r, nb_occupants: r.nb_occupants ?? 0, nuitees: r.nuitees ?? 0, montant: p?.montant === null || p?.montant === undefined ? null : Number(p.montant), paye: p?.paye ?? false };
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
  const totalNuitees = lignes.reduce((s, l) => s + l.nuitees, 0);
  const aCompleter = lignes.filter((l) => !l.nb_occupants || !l.nuitees).length;

  const nbPayees = lignes.filter((l) => l.paye).length;
  const sansMontant = lignes.filter((l) => l.montant === null).length;

  return (
    <main className="max-w-5xl mx-auto p-4 pb-24 md:p-8 space-y-5 print:p-0 print:max-w-none">
      <ChoixAnnee annee={annee} chemin="/recapitulatif" />
      <section className="bg-white border rounded-2xl overflow-hidden print:border-0 print:rounded-none">
        <header className="flex flex-wrap items-end justify-between gap-3 px-4 sm:px-6 pt-5 pb-4 border-b">
          <div>
            <p className="text-xs uppercase tracking-wide text-slate-500">Appartement de Saint François Longchamp</p>
            <h1 className="text-xl sm:text-2xl font-bold tabular-nums">Synthèse {annee}</h1>
          </div>
          <button type="button" onClick={() => window.print()} className="print:hidden flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-lg border hover:bg-slate-50">
            <Printer size={16} /> Imprimer
          </button>
        </header>

        {/* Chiffres clés de l'année */}
        <dl className="grid grid-cols-2 sm:grid-cols-4 divide-x divide-y sm:divide-y-0 border-b text-center">
          <Chiffre libelle="Réservations" valeur={String(lignes.length)} detail={`${totalNuits} nuit${totalNuits > 1 ? "s" : ""} · ${totalNuitees} nuitée${totalNuitees > 1 ? "s" : ""}`} />
          <Chiffre libelle="Total à payer" valeur={euros(total)} detail={sansMontant ? `${sansMontant} montant${sansMontant > 1 ? "s" : ""} à saisir` : "tous les montants saisis"} />
          <Chiffre libelle="Encaissé" valeur={euros(encaisse)} detail={`${nbPayees} / ${lignes.length} réglée${nbPayees > 1 ? "s" : ""}`} classe="text-emerald-700" />
          <Chiffre libelle="Reste dû" valeur={euros(total - encaisse)} detail={total > 0 ? `${Math.round((encaisse / total) * 100)} % encaissé` : "—"} classe={total - encaisse > 0 ? "text-amber-700" : "text-emerald-700"} />
        </dl>

        {erreur && <p className="px-4 sm:px-6 pt-3 text-sm text-red-600">{erreur}</p>}
        {charge && lignes.length === 0 && <p className="px-4 sm:px-6 py-6 text-sm text-slate-500">Aucune réservation en {annee}.</p>}
        {lignes.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full text-[13px] sm:text-sm">
              <thead className="text-xs uppercase tracking-wide text-slate-500 bg-slate-50 print:bg-transparent">
                <tr>
                  <th className="sm:hidden px-3 py-2 text-left font-medium">Séjour</th>
                  <th className="hidden sm:table-cell px-6 py-2 text-left font-medium">Arrivée</th>
                  <th className="hidden sm:table-cell px-3 py-2 text-left font-medium">Départ</th>
                  <th className="px-2 sm:px-3 py-2 text-left font-medium">Nom</th>
                  <th className="px-2 sm:px-3 py-2 text-right font-medium"><span className="sm:hidden">Pers.</span><span className="hidden sm:inline">Nbr de personnes</span></th>
                  <th className="px-2 sm:px-3 py-2 text-right font-medium">Nuitées</th>
                  <th className="px-2 sm:px-3 py-2 text-right font-medium">Montant</th>
                  <th className="px-2 sm:px-6 py-2 text-center font-medium">Payé</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {lignes.map((l) => (
                  <tr key={l.id} className="hover:bg-slate-50/60">
                    <td className="sm:hidden px-3 py-2 whitespace-nowrap tabular-nums leading-tight">{jj(l.debut)}<span className="block text-slate-500">→ {jj(l.fin)}</span></td>
                    <td className="hidden sm:table-cell px-6 py-2 whitespace-nowrap tabular-nums">{dateCourte(l.debut)}</td>
                    <td className="hidden sm:table-cell px-3 py-2 whitespace-nowrap tabular-nums">{dateCourte(l.fin)}</td>
                    <td className="px-2 sm:px-3 py-2">{l.occupant}</td>
                    <td className={`px-2 sm:px-3 py-2 text-right tabular-nums ${l.nb_occupants ? "" : "text-amber-700"}`} title={l.nb_occupants ? undefined : "À renseigner dans la réservation (planning)"}>{l.nb_occupants}</td>
                    <td className={`px-2 sm:px-3 py-2 text-right tabular-nums ${l.nuitees ? "" : "text-amber-700"}`} title={l.nuitees ? undefined : "À renseigner dans la réservation (planning)"}>{l.nuitees}</td>
                    <td className="px-2 sm:px-3 py-2 text-right"><Montant valeur={l.montant} onValider={(montant) => enregistrer(l, { montant })} /></td>
                    <td className="px-2 sm:px-6 py-2 text-center"><Paye ligne={l} onChanger={(paye) => enregistrer(l, { paye })} /></td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="border-t-2 border-slate-300 font-semibold">
                <tr>
                  <td className="sm:hidden px-3 py-2.5" colSpan={2}>Total</td>
                  <td className="hidden sm:table-cell px-6 py-2.5" colSpan={3}>Total {annee}</td>
                  <td className="px-2 sm:px-3 py-2.5"></td>
                  <td className="px-2 sm:px-3 py-2.5 text-right tabular-nums">{totalNuitees}</td>
                  <td className="px-2 sm:px-3 py-2.5 text-right tabular-nums whitespace-nowrap">{euros(total)}</td>
                  <td className="px-2 sm:px-6 py-2.5 text-center tabular-nums whitespace-nowrap">{nbPayees} / {lignes.length}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </section>
      <p className="print:hidden text-xs text-slate-500">Personnes et nuitées sont celles saisies dans chaque réservation{aCompleter ? ` (${aCompleter} réservation${aCompleter > 1 ? "s" : ""} à compléter depuis le planning, affichée${aCompleter > 1 ? "s" : ""} à 0)` : ""}. Cliquez sur un montant pour le saisir ou le corriger, et sur la case pour marquer la réservation comme payée. Visible des seuls administrateurs.</p>
    </main>
  );
}

function Chiffre({ libelle, valeur, detail, classe = "" }: { libelle: string; valeur: string; detail: string; classe?: string }) {
  return (
    <div className="px-3 py-4">
      <dt className="text-xs uppercase tracking-wide text-slate-500">{libelle}</dt>
      <dd className={`text-lg sm:text-2xl font-bold tabular-nums ${classe}`}>{valeur}</dd>
      <dd className="text-xs text-slate-500">{detail}</dd>
    </div>
  );
}

/** Montant affiché comme du texte ; un clic ouvre la saisie (Entrée ou clic ailleurs pour enregistrer, Échap pour annuler). */
function Montant({ valeur, onValider }: { valeur: number | null; onValider: (v: number | null) => void }) {
  const [edition, setEdition] = useState(false);
  const [texte, setTexte] = useState("");
  const [invalide, setInvalide] = useState(false);
  const ouvrir = () => { setTexte(valeur === null ? "" : (Number.isInteger(valeur) ? String(valeur) : valeur.toFixed(2)).replace(".", ",")); setInvalide(false); setEdition(true); };
  const valider = () => {
    const propre = texte.replace(/\s|€/g, "").replace(",", ".");
    if (propre === "") { setEdition(false); if (valeur !== null) onValider(null); return; }
    const n = Math.round(Number(propre) * 100) / 100;
    if (!Number.isFinite(n) || n < 0) { setInvalide(true); return; }
    setEdition(false);
    if (n !== valeur) onValider(n);
  };
  if (!edition) return (
    <button type="button" onClick={ouvrir} title="Saisir le montant"
      className={`tabular-nums whitespace-nowrap rounded px-1.5 -mx-1.5 py-0.5 hover:bg-sky-50 hover:text-sky-800 ${valeur === null ? "text-slate-400 print:text-transparent" : ""}`}>
      {valeur === null ? "à saisir" : euros(valeur)}
    </button>
  );
  return (
    <input autoFocus inputMode="decimal" value={texte} aria-label="Montant à payer" aria-invalid={invalide}
      onChange={(e) => setTexte(e.target.value)} onBlur={valider}
      onKeyDown={(e) => { if (e.key === "Enter") valider(); if (e.key === "Escape") setEdition(false); }}
      className={`w-24 p-1 border rounded text-sm text-right tabular-nums outline-none focus:ring-2 focus:ring-sky-500 ${invalide ? "border-red-400" : "border-slate-300"}`} />
  );
}

function Paye({ ligne, onChanger }: { ligne: Ligne; onChanger: (v: boolean) => void }) {
  return (
    <label className="inline-flex items-center gap-1.5 cursor-pointer">
      <input type="checkbox" checked={ligne.paye} onChange={(e) => onChanger(e.target.checked)} className="w-4 h-4 accent-emerald-600 print:hidden"
        aria-label={`Payé : ${ligne.occupant}`} />
      <span className={`hidden sm:inline print:inline text-xs font-medium ${ligne.paye ? "text-emerald-700" : "text-slate-400"}`}>{ligne.paye ? "Oui" : "Non"}</span>
    </label>
  );
}
