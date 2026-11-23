import { test } from "node:test";
import assert from "node:assert/strict";
import { semainesDeLAnnee, verifierPeriode, reservationsSur, intervalle, nuits, dateCourte } from "./planning.ts";

test("les semaines vont du samedi au samedi et couvrent l'année", () => {
  const s = semainesDeLAnnee(2027);
  assert.equal(s[0].arrivee, "2027-01-02"); // 1er samedi de 2027
  assert.equal(s[0].depart, "2027-01-09");
  assert.equal(s.length, 52);
  assert.equal(s.at(-1)!.arrivee, "2027-12-25");
  assert.ok(s.every((x) => new Date(x.arrivee + "T00:00:00Z").getUTCDay() === 6));
  assert.equal(semainesDeLAnnee(2026)[0].arrivee, "2026-01-03");
});

test("le week-end va du vendredi au dimanche", () => {
  const w = semainesDeLAnnee(2027)[0].weekEnd;
  assert.deepEqual(w, { arrivee: "2027-01-08", depart: "2027-01-10" });
  assert.equal(nuits(w), 2);
  assert.equal(dateCourte(w.arrivee), "ven. 8 janv.");
});

test("le passage à l'heure d'été ne décale pas les dates", () => {
  const s = semainesDeLAnnee(2027).find((x) => x.arrivee === "2027-03-27")!;
  assert.equal(s.depart, "2027-04-03");
});

test("vérification des périodes", () => {
  const existantes = [{ id: 1, arrivee: "2026-12-19", depart: "2026-12-26" }];
  assert.equal(verifierPeriode({ arrivee: "2026-12-26", depart: "2027-01-02" }, existantes), null);
  assert.match(verifierPeriode({ arrivee: "2026-12-25", depart: "2026-12-27" }, existantes)!, /chevauchent/);
  assert.equal(verifierPeriode({ arrivee: "2026-12-20", depart: "2026-12-24" }, existantes, 1), null);
  assert.match(verifierPeriode({ arrivee: "2026-12-20", depart: "2026-12-20" }, [])!, /après/);
});

test("occupation d'une semaine et libellés", () => {
  const r = [{ arrivee: "2027-01-08", depart: "2027-01-10" }];
  assert.equal(reservationsSur({ arrivee: "2027-01-02", depart: "2027-01-09" }, r).length, 1);
  assert.equal(reservationsSur({ arrivee: "2027-01-10", depart: "2027-01-17" }, r).length, 0);
  assert.equal(intervalle({ arrivee: "2026-12-26", depart: "2027-01-02" }), "26 déc. → 2 janv.");
  assert.equal(intervalle({ arrivee: "2026-12-19", depart: "2026-12-26" }), "19 → 26 déc.");
});
