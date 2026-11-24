import { test } from "node:test";
import assert from "node:assert/strict";
import { semainesDeLAnnee, verifierPeriode, reservationsSur, intervalle, jours, dateCourte } from "./planning.ts";

const jourSemaine = (iso: string) => new Date(iso + "T00:00:00Z").getUTCDay();

test("les semaines commencent le lundi et couvrent l'année", () => {
  const s = semainesDeLAnnee(2027);
  assert.equal(s[0].debut, "2027-01-04"); // 1er lundi de 2027
  assert.equal(s[0].fin, "2027-01-10");
  assert.equal(s.length, 52);
  assert.equal(s.at(-1)!.debut, "2027-12-27");
  assert.ok(s.every((x) => jourSemaine(x.debut) === 1));
  assert.equal(semainesDeLAnnee(2026)[0].debut, "2026-01-05");
});

test("semaine du lundi au vendredi, week-end samedi et dimanche", () => {
  const s = semainesDeLAnnee(2027)[0];
  assert.deepEqual(s.jours, { debut: "2027-01-04", fin: "2027-01-08" });
  assert.deepEqual(s.weekEnd, { debut: "2027-01-09", fin: "2027-01-10" });
  assert.equal(jours(s.jours), 5);
  assert.equal(jours(s.weekEnd), 2);
  assert.equal(dateCourte(s.jours.fin), "ven. 8 janv.");
  assert.equal(dateCourte(s.weekEnd.debut), "sam. 9 janv.");
});

test("le passage à l'heure d'été ne décale pas les dates", () => {
  const s = semainesDeLAnnee(2027).find((x) => x.debut === "2027-03-22")!;
  assert.equal(s.fin, "2027-03-28");
  assert.equal(s.weekEnd.fin, "2027-03-28");
});

test("vérification des périodes (jours inclus)", () => {
  const existantes = [{ id: 1, debut: "2027-01-04", fin: "2027-01-08" }];
  // Le week-end qui suit est libre
  assert.equal(verifierPeriode({ debut: "2027-01-09", fin: "2027-01-10" }, existantes), null);
  // Jour de changement : arrivée le vendredi après-midi quand l'autre part le vendredi matin
  assert.equal(verifierPeriode({ debut: "2027-01-08", fin: "2027-01-10" }, existantes), null);
  // Mais pas de nuit partagée
  assert.match(verifierPeriode({ debut: "2027-01-07", fin: "2027-01-10" }, existantes)!, /chevauchent/);
  assert.equal(verifierPeriode({ debut: "2027-01-05", fin: "2027-01-06" }, existantes, 1), null);
  // Une seule journée est acceptée, une fin avant le début non
  assert.equal(verifierPeriode({ debut: "2027-02-01", fin: "2027-02-01" }, []), null);
  assert.match(verifierPeriode({ debut: "2027-02-02", fin: "2027-02-01" }, [])!, /après/);
});

test("occupation d'une semaine et libellés", () => {
  const r = [{ debut: "2027-01-09", fin: "2027-01-10" }];
  const [s1, s2] = semainesDeLAnnee(2027);
  assert.equal(reservationsSur(s1, r).length, 1);
  assert.equal(reservationsSur(s1.jours, r).length, 0);
  assert.equal(reservationsSur(s2, r).length, 0);
  assert.equal(intervalle({ debut: "2026-12-28", fin: "2027-01-03" }), "28 déc. → 3 janv.");
  assert.equal(intervalle({ debut: "2027-01-04", fin: "2027-01-08" }), "4 → 8 janv.");
});

test("identifiant simple ou email", async () => {
  const { emailDeConnexion } = await import("./identifiant.ts");
  assert.equal(emailDeConnexion(" MathieuFabre "), "mathieufabre@longchamps.local");
  assert.equal(emailDeConnexion("a@b.fr"), "a@b.fr");
});

test("jours restés libres dans une semaine partiellement réservée", async () => {
  const { plagesLibres, plusLonguePlageLibre } = await import("./planning.ts");
  const semaine = { debut: "2027-01-25", fin: "2027-01-29" }; // lun. → ven.
  // Réservation du sam. 23 au mar. 26 (départ mardi matin) : il reste mar. 26 → ven. 29
  const r = [{ debut: "2027-01-23", fin: "2027-01-26" }];
  assert.deepEqual(plagesLibres(semaine, r), [{ debut: "2027-01-26", fin: "2027-01-29" }]);
  assert.deepEqual(plusLonguePlageLibre(semaine, r), { debut: "2027-01-26", fin: "2027-01-29" });
  // Une nuit prise au milieu (mar. → mer.) : lun. → mar. et mer. → ven. restent, la plus longue est mer. → ven.
  const r2 = [{ debut: "2027-01-26", fin: "2027-01-27" }];
  assert.deepEqual(plagesLibres(semaine, r2), [{ debut: "2027-01-25", fin: "2027-01-26" }, { debut: "2027-01-27", fin: "2027-01-29" }]);
  assert.deepEqual(plusLonguePlageLibre(semaine, r2), { debut: "2027-01-27", fin: "2027-01-29" });
  // Tout pris / rien de pris
  assert.equal(plusLonguePlageLibre(semaine, [{ debut: "2027-01-20", fin: "2027-02-05" }]), null);
  assert.deepEqual(plusLonguePlageLibre(semaine, []), semaine);
});

test("nuits : arrivée le premier jour, départ le dernier", async () => {
  const { nuits } = await import("./planning.ts");
  assert.equal(nuits({ debut: "2027-01-04", fin: "2027-01-08" }), 4);
  assert.equal(nuits({ debut: "2027-01-09", fin: "2027-01-10" }), 1);
  assert.equal(nuits({ debut: "2027-01-09", fin: "2027-01-09" }), 0);
});

test("clic sur un jour : semaine ou week-end libre qui le contient", async () => {
  const { periodeAReserver, joursDuMois } = await import("./planning.ts");
  const resas = [{ debut: "2027-01-23", fin: "2027-01-26" }];
  assert.deepEqual(periodeAReserver("2027-01-13", resas), { periode: { debut: "2027-01-11", fin: "2027-01-15" }, type: "SEMAINE" });
  assert.deepEqual(periodeAReserver("2027-01-17", resas), { periode: { debut: "2027-01-16", fin: "2027-01-17" }, type: "WEEK_END" });
  assert.deepEqual(periodeAReserver("2027-01-28", resas), { periode: { debut: "2027-01-26", fin: "2027-01-29" }, type: "AUTRE" });
  assert.equal(periodeAReserver("2027-01-24", resas), null);
  // Vendredi : arrivée l'après-midi pour le week-end (vendredi → dimanche)
  assert.deepEqual(periodeAReserver("2027-01-15", resas), { periode: { debut: "2027-01-15", fin: "2027-01-17" }, type: "WEEK_END" });
  assert.equal(joursDuMois(2028, 1), 29);
});

test("déplacer une réservation : décalage et type recalculé", async () => {
  const { decaler, typePour, ecartJours } = await import("./planning.ts");
  assert.equal(ecartJours("2027-01-28", "2027-02-02"), 5);
  const semaine = { debut: "2027-01-04", fin: "2027-01-08" };
  assert.deepEqual(decaler(semaine, 7), { debut: "2027-01-11", fin: "2027-01-15" });
  assert.equal(typePour(decaler(semaine, 7)), "SEMAINE");
  assert.equal(typePour(decaler(semaine, 2)), "AUTRE");
  assert.equal(typePour({ debut: "2027-01-09", fin: "2027-01-10" }), "WEEK_END");
});

test("jour de changement : au plus deux réservations le même jour", async () => {
  const { seGenent, nuitPrise } = await import("./planning.ts");
  const semaine = { debut: "2027-01-04", fin: "2027-01-08" };
  assert.equal(seGenent(semaine, { debut: "2027-01-08", fin: "2027-01-10" }), false); // départ ven. matin, arrivée ven. après-midi
  assert.equal(seGenent(semaine, { debut: "2027-01-01", fin: "2027-01-04" }), false); // l'autre part lun. matin
  assert.equal(seGenent(semaine, { debut: "2027-01-07", fin: "2027-01-07" }), true); // un jour en pleine semaine
  assert.equal(seGenent({ debut: "2027-01-08", fin: "2027-01-08" }, { debut: "2027-01-08", fin: "2027-01-10" }), true);
  assert.equal(nuitPrise("2027-01-07", [semaine]), true);
  assert.equal(nuitPrise("2027-01-08", [semaine]), false);
});

test("nuitées = occupants × nuits", async () => {
  const { nuitees } = await import("./planning.ts");
  assert.equal(nuitees({ debut: "2026-12-28", fin: "2027-01-01", nb_occupants: 3 }), 12);
  assert.equal(nuitees({ debut: "2026-12-28", fin: "2027-01-01", nb_occupants: null }), 0);
});
