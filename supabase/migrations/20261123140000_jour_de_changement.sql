-- =====================================================================
-- Jour de changement (demande de Mathieu, 23/11/2026) : une location peut finir le
-- vendredi matin et une autre commencer le vendredi après-midi.
-- Une réservation occupe désormais les nuits de « debut » à la veille de « fin »
-- (une réservation d'un seul jour occupe ce jour) : deux réservations ne peuvent pas
-- partager une nuit, et au plus deux se croisent le même jour (départ puis arrivée).
-- =====================================================================

ALTER TABLE reservations DROP CONSTRAINT reservations_sans_chevauchement;
ALTER TABLE reservations ADD CONSTRAINT reservations_sans_chevauchement
    EXCLUDE USING gist (daterange(debut, CASE WHEN fin > debut THEN fin ELSE fin + 1 END, '[)') WITH &&);
