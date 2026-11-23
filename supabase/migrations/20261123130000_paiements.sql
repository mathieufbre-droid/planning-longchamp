-- =====================================================================
-- Récapitulatif annuel (demande de Mathieu, 23/11/2026) : pour chaque réservation,
-- un montant à payer saisi par un administrateur et une case « payé ».
-- Table à part pour que les lecteurs, qui lisent les réservations, ne voient pas les montants.
-- Chaque changement est tracé dans le journal comme une modification de la réservation.
-- =====================================================================

CREATE TABLE paiements (
    reservation_id BIGINT PRIMARY KEY REFERENCES reservations(id) ON DELETE CASCADE,
    montant NUMERIC(10, 2) CHECK (montant >= 0),
    paye BOOLEAN NOT NULL DEFAULT FALSE
);

ALTER TABLE paiements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admin gère les paiements" ON paiements FOR ALL USING (est_admin()) WITH CHECK (est_admin());
REVOKE ALL ON paiements FROM anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON paiements TO authenticated;

-- Déclencheur « après » : avec un upsert, seule l'opération réellement faite est tracée
CREATE OR REPLACE FUNCTION public.journaliser_paiement()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
    v_resa JSONB;
    v_auteur TEXT;
    v_avant JSONB;
    v_apres JSONB;
BEGIN
    SELECT to_jsonb(r) - 'updated_at' - 'created_at' INTO v_resa FROM reservations r WHERE r.id = NEW.reservation_id;
    v_avant := v_resa || jsonb_build_object('montant', CASE WHEN TG_OP = 'UPDATE' THEN OLD.montant END,
                                            'paye', CASE WHEN TG_OP = 'UPDATE' THEN OLD.paye ELSE FALSE END);
    v_apres := v_resa || jsonb_build_object('montant', NEW.montant, 'paye', NEW.paye);
    IF v_avant = v_apres THEN RETURN NULL; END IF;
    SELECT COALESCE(NULLIF(btrim(prenom || ' ' || nom), ''), email) INTO v_auteur FROM membres WHERE id = auth.uid();
    INSERT INTO journal (auteur_id, auteur, action, objet, objet_id, avant, apres)
    VALUES (auth.uid(), COALESCE(v_auteur, 'Système'), 'MODIFICATION', 'RESERVATION', NEW.reservation_id::TEXT, v_avant, v_apres);
    RETURN NULL;
END $$;

CREATE TRIGGER paiements_journal
    AFTER INSERT OR UPDATE ON paiements
    FOR EACH ROW EXECUTE FUNCTION public.journaliser_paiement();

REVOKE EXECUTE ON FUNCTION public.journaliser_paiement() FROM PUBLIC, anon, authenticated;
