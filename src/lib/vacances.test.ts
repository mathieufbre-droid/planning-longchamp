import { test } from "node:test";
import assert from "node:assert/strict";
import { lireVacances, vacancesSur } from "./vacances.ts";

test("vacances de l'API converties en jours inclus (heure de Paris), enseignants et doublons ignorés", () => {
  const v = lireVacances([
    { description: "Vacances de Noël", population: "-", start_date: "2025-12-19T23:00:00+00:00", end_date: "2026-01-04T23:00:00+00:00" },
    { description: "Vacances de la Toussaint", population: "Élèves", start_date: "2025-10-17T22:00:00+00:00", end_date: "2025-11-02T23:00:00+00:00" },
    { description: "Vacances de la Toussaint", population: "Enseignants", start_date: "2025-10-16T22:00:00+00:00", end_date: "2025-11-02T23:00:00+00:00" },
    { description: "Vacances de la Toussaint", population: "-", start_date: "2025-10-17T22:00:00+00:00", end_date: "2025-11-02T23:00:00+00:00" },
    { description: "Vacances d'Été", population: "-", start_date: "2026-07-03T22:00:00+00:00", end_date: null },
  ]);
  assert.deepEqual(v, [
    { debut: "2025-10-18", fin: "2025-11-02", libelle: "Vacances de la Toussaint" },
    { debut: "2025-12-20", fin: "2026-01-04", libelle: "Vacances de Noël" },
    { debut: "2026-07-04", fin: "2026-08-31", libelle: "Vacances d'Été" },
  ]);
  // Semaine du lundi 27 octobre 2025 : en vacances ; semaine du 3 novembre : reprise
  assert.equal(vacancesSur({ debut: "2025-10-27", fin: "2025-10-31" }, v).length, 1);
  assert.equal(vacancesSur({ debut: "2025-11-03", fin: "2025-11-07" }, v).length, 0);
});

test("dates provisoires pour les années non publiées, remplacées par l'officiel", async () => {
  const { completerVacances } = await import("./vacances.ts");
  const officielles = [{ debut: "2026-10-17", fin: "2026-11-01", libelle: "Vacances de la Toussaint" }];
  const v = completerVacances(officielles, 2026, 2028);
  // Toussaint 2026 officielle conservée, pas de doublon provisoire
  assert.equal(v.filter((x) => x.debut.startsWith("2026-10")).length, 1);
  assert.ok(!v.find((x) => x.debut.startsWith("2026-10"))?.provisoire);
  // Règles connues : Noël 2025 = 20 déc. → 4 janv., Toussaint 2025 = 18 oct., été 2026 = 4 juillet
  assert.ok(v.some((x) => x.provisoire && x.debut === "2025-12-20" && x.fin === "2026-01-04"));
  assert.ok(v.some((x) => x.provisoire && x.debut === "2026-07-04" && x.fin === "2026-08-31"));
  // 2028 : Toussaint, Noël et été estimés
  const v2028 = v.filter((x) => x.provisoire && x.debut.startsWith("2028"));
  assert.deepEqual(v2028.map((x) => x.debut), ["2028-07-08", "2028-10-21", "2028-12-23"]);
});
