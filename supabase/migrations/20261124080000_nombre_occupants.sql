-- Nombre de personnes présentes pendant le séjour (demande de Mathieu, 24/11/2026).
-- Sert au récapitulatif : nuitées = nombre d'occupants × nombre de nuits.
-- 0 = pas encore renseigné (réservations déjà saisies) ; l'application exige au moins 1 à l'enregistrement.
ALTER TABLE reservations ADD COLUMN nb_occupants SMALLINT NOT NULL DEFAULT 0 CHECK (nb_occupants BETWEEN 0 AND 50);
