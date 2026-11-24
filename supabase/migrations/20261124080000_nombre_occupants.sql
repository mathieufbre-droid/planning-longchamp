-- Nombre de personnes présentes pendant le séjour (demande de Mathieu, 24/11/2026).
-- Sert au récapitulatif : nuitées = nombre d'occupants × nombre de nuits.
-- Vide pour les réservations déjà saisies, à compléter dans la fiche.
ALTER TABLE reservations ADD COLUMN nb_occupants SMALLINT CHECK (nb_occupants BETWEEN 1 AND 50);
