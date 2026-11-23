import { test } from "node:test";
import assert from "node:assert/strict";
import { decrire, horodatage, type EntreeJournal } from "./journal.ts";

const base = { id: 1, le: "2026-11-23T07:47:00Z", auteur: "Mathieu Fabre", objet_id: "1" };
const resa = { id: 1, debut: "2027-01-04", fin: "2027-01-08", type: "SEMAINE", occupant: "Famille Martin", note: "" };

test("réservation ajoutée, modifiée, supprimée", () => {
  assert.equal(decrire({ ...base, action: "AJOUT", objet: "RESERVATION", avant: null, apres: resa } as EntreeJournal).titre,
    "Réservation ajoutée : Famille Martin, lun. 4 janv. → ven. 8 janv. 2027 (semaine)");
  const modif = decrire({ ...base, action: "MODIFICATION", objet: "RESERVATION", avant: resa, apres: { ...resa, occupant: "Paul", note: "Ménage" } } as EntreeJournal);
  assert.deepEqual(modif.detail, ["occupant : Famille Martin → Paul", "note : — → Ménage"]);
  assert.match(decrire({ ...base, action: "SUPPRESSION", objet: "RESERVATION", avant: resa, apres: null } as EntreeJournal).titre, /^Réservation supprimée/);
});

test("membre activé et promu", () => {
  const m = { id: "u", prenom: "Claire", nom: "F.", email: "c@x.fr", role: "LECTEUR", actif: false };
  const d = decrire({ ...base, action: "MODIFICATION", objet: "MEMBRE", avant: m, apres: { ...m, role: "ADMINISTRATEUR", actif: true } } as EntreeJournal);
  assert.equal(d.titre, "Membre modifié : Claire F. (c@x.fr)");
  assert.deepEqual(d.detail, ["rôle : lecteur → administrateur", "accès activé"]);
});

test("heure de Paris", () => {
  assert.match(horodatage("2026-11-23T07:47:00Z"), /08:47/);
});

test("changement de mot de passe", () => {
  const m = { id: "u", prenom: "Claire", nom: "", email: "claire@longchamps.local", role: "LECTEUR", actif: true };
  const d = decrire({ ...base, action: "MODIFICATION", objet: "MEMBRE", avant: m, apres: { ...m, mot_de_passe: "modifié" } } as EntreeJournal);
  assert.deepEqual(d.detail, ["mot de passe changé"]);
});

test("montant et paiement d'une réservation", () => {
  const avant = { ...resa, montant: null, paye: false };
  const e = decrire({ ...base, action: "MODIFICATION", objet: "RESERVATION", avant, apres: { ...avant, montant: 450.5, paye: true } } as EntreeJournal);
  assert.equal(e.detail.length, 2);
  assert.match(e.detail[0], /^montant à payer : — → 450,50\s€$/);
  assert.equal(e.detail[1], "payé : non → oui");
});
