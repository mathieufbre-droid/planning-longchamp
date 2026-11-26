-- =====================================================================
-- Journal des modifications : chaque ajout, modification ou suppression
-- de réservation ou de membre est enregistré par la base (date, auteur, détail).
-- Lisible par les administrateurs uniquement, et impossible à modifier.
-- =====================================================================

CREATE TABLE journal (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    le TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    auteur_id UUID,
    -- Nom figé au moment de l'action : reste lisible même si le membre est renommé ou supprimé
    auteur TEXT NOT NULL,
    action TEXT NOT NULL CHECK (action IN ('AJOUT', 'MODIFICATION', 'SUPPRESSION')),
    objet TEXT NOT NULL CHECK (objet IN ('RESERVATION', 'MEMBRE')),
    objet_id TEXT NOT NULL,
    avant JSONB,
    apres JSONB
);

CREATE INDEX journal_le_idx ON journal (le DESC);

CREATE OR REPLACE FUNCTION public.journaliser()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
    v_auteur TEXT;
    v_avant JSONB := CASE WHEN TG_OP <> 'INSERT' THEN to_jsonb(OLD) - 'updated_at' - 'created_at' END;
    v_apres JSONB := CASE WHEN TG_OP <> 'DELETE' THEN to_jsonb(NEW) - 'updated_at' - 'created_at' END;
BEGIN
    -- Une mise à jour qui ne change rien n'encombre pas le journal
    IF TG_OP = 'UPDATE' AND v_avant = v_apres THEN RETURN NULL; END IF;
    SELECT COALESCE(NULLIF(btrim(prenom || ' ' || nom), ''), email) INTO v_auteur FROM membres WHERE id = auth.uid();
    INSERT INTO journal (auteur_id, auteur, action, objet, objet_id, avant, apres)
    VALUES (
        auth.uid(),
        COALESCE(v_auteur, 'Système (invitation Supabase)'),
        CASE TG_OP WHEN 'INSERT' THEN 'AJOUT' WHEN 'UPDATE' THEN 'MODIFICATION' ELSE 'SUPPRESSION' END,
        CASE TG_TABLE_NAME WHEN 'reservations' THEN 'RESERVATION' ELSE 'MEMBRE' END,
        COALESCE(NEW.id, OLD.id)::TEXT,
        v_avant, v_apres
    );
    RETURN NULL;
END $$;

CREATE TRIGGER reservations_journal
    AFTER INSERT OR UPDATE OR DELETE ON reservations
    FOR EACH ROW EXECUTE FUNCTION public.journaliser();

CREATE TRIGGER membres_journal
    AFTER INSERT OR UPDATE OR DELETE ON membres
    FOR EACH ROW EXECUTE FUNCTION public.journaliser();

ALTER TABLE journal ENABLE ROW LEVEL SECURITY;
-- Lecture seule pour les administrateurs ; aucune politique d'écriture : seul le trigger écrit.
CREATE POLICY "Admin lit le journal" ON journal FOR SELECT USING (est_admin());
REVOKE ALL ON journal FROM anon, authenticated;
GRANT SELECT ON journal TO authenticated;
