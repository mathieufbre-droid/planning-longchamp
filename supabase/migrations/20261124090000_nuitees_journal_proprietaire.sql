-- Demandes de Mathieu (24/11/2026) :
--   * le nombre de nuitées se saisit dans la réservation ; le récapitulatif reprend ce nombre ;
--   * le journal des modifications n'est visible que du propriétaire de l'application (Mathieu).

ALTER TABLE reservations ADD COLUMN nuitees INTEGER NOT NULL DEFAULT 0 CHECK (nuitees BETWEEN 0 AND 5000);
-- Réservations où le nombre de personnes est déjà saisi : on reprend personnes × nuits
UPDATE reservations SET nuitees = nb_occupants * (fin - debut) WHERE nb_occupants > 0;

DROP POLICY "Admin lit le journal" ON journal;
CREATE POLICY "Propriétaire lit le journal" ON journal FOR SELECT USING (est_proprietaire());
