-- =====================================================================
-- Règles de Mathieu (23/11/2026) :
--   * les lecteurs ne voient que le planning : la liste des membres est réservée aux administrateurs ;
--   * seul le propriétaire de l'application (le compte « mathieufabre ») nomme des administrateurs.
-- Les autres administrateurs gèrent les réservations et les lecteurs, mais ne peuvent ni créer,
-- ni promouvoir, ni rétrograder, ni désactiver, ni supprimer un administrateur, ni changer son
-- mot de passe (sauf le leur). Le compte du propriétaire n'est modifiable que par lui-même.
-- Ces règles ne s'appliquent qu'aux appels depuis l'application (auth.uid() renseigné) :
-- le tableau de bord Supabase garde la main en cas de besoin.
-- =====================================================================

ALTER TABLE membres ADD COLUMN proprietaire BOOLEAN NOT NULL DEFAULT FALSE;
CREATE UNIQUE INDEX membres_un_seul_proprietaire ON membres (proprietaire) WHERE proprietaire;
UPDATE membres SET proprietaire = TRUE WHERE email = 'mathieufabre@longchamps.local';

CREATE OR REPLACE FUNCTION public.est_proprietaire()
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
    SELECT EXISTS (SELECT 1 FROM membres WHERE id = auth.uid() AND actif AND proprietaire AND role = 'ADMINISTRATEUR')
$$;

-- Lecteurs : seulement leur propre profil
DROP POLICY "Lecture des membres" ON membres;
CREATE POLICY "Lecture des membres" ON membres FOR SELECT USING (id = auth.uid() OR est_admin());

CREATE OR REPLACE FUNCTION public.proteger_administrateurs()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
    IF auth.uid() IS NULL OR est_proprietaire() THEN
        IF TG_OP = 'UPDATE' AND NEW.proprietaire IS DISTINCT FROM OLD.proprietaire AND auth.uid() IS NOT NULL THEN
            RAISE EXCEPTION 'Le propriétaire de l''application ne se change que depuis Supabase.';
        END IF;
        RETURN COALESCE(NEW, OLD);
    END IF;

    IF TG_OP = 'UPDATE' AND NEW.proprietaire IS DISTINCT FROM OLD.proprietaire THEN
        RAISE EXCEPTION 'Le propriétaire de l''application ne se change que depuis Supabase.';
    END IF;
    IF OLD.proprietaire THEN
        RAISE EXCEPTION 'Seul Mathieu peut modifier son propre compte.';
    END IF;
    IF TG_OP = 'UPDATE' AND NEW.role = 'ADMINISTRATEUR' AND OLD.role <> 'ADMINISTRATEUR' THEN
        RAISE EXCEPTION 'Seul Mathieu peut nommer un administrateur.';
    END IF;
    IF OLD.role = 'ADMINISTRATEUR' AND OLD.id <> auth.uid()
       AND (TG_OP = 'DELETE' OR NEW.role <> OLD.role OR NEW.actif <> OLD.actif) THEN
        RAISE EXCEPTION 'Seul Mathieu peut gérer les administrateurs.';
    END IF;
    RETURN COALESCE(NEW, OLD);
END $$;

CREATE TRIGGER membres_proteger_admins
    BEFORE UPDATE OR DELETE ON membres
    FOR EACH ROW EXECUTE FUNCTION public.proteger_administrateurs();

REVOKE EXECUTE ON FUNCTION public.proteger_administrateurs() FROM PUBLIC, anon, authenticated;

-- Ajout direct d'un administrateur : même règle, avec un message clair avant de créer le compte
CREATE OR REPLACE FUNCTION public.ajouter_membre(
    p_identifiant TEXT, p_mot_de_passe TEXT, p_prenom TEXT, p_nom TEXT, p_role role_membre DEFAULT 'LECTEUR'
) RETURNS UUID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, extensions AS $$
DECLARE
    v_email TEXT := lower(btrim(p_identifiant));
    v_id UUID := gen_random_uuid();
BEGIN
    IF NOT est_admin() THEN RAISE EXCEPTION 'Action réservée aux administrateurs.'; END IF;
    IF p_role = 'ADMINISTRATEUR' AND NOT est_proprietaire() THEN RAISE EXCEPTION 'Seul Mathieu peut nommer un administrateur.'; END IF;
    IF v_email = '' THEN RAISE EXCEPTION 'Indiquez un identifiant ou un email.'; END IF;
    IF v_email !~ '^[a-z0-9._@+-]+$' THEN RAISE EXCEPTION 'L''identifiant ne peut contenir que des lettres sans accent, des chiffres, des points et des tirets.'; END IF;
    IF position('@' IN v_email) = 0 THEN v_email := v_email || '@longchamps.local'; END IF;
    IF length(coalesce(p_mot_de_passe, '')) < 8 THEN RAISE EXCEPTION 'Le mot de passe doit faire au moins 8 caractères.'; END IF;
    IF EXISTS (SELECT 1 FROM auth.users WHERE lower(email) = v_email) THEN RAISE EXCEPTION 'Ce compte existe déjà.'; END IF;

    INSERT INTO auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
        raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
        confirmation_token, email_change, email_change_token_new, recovery_token,
        email_change_token_current, phone_change, phone_change_token, reauthentication_token)
    VALUES ('00000000-0000-0000-0000-000000000000', v_id, 'authenticated', 'authenticated', v_email,
        crypt(p_mot_de_passe, gen_salt('bf')), NOW(),
        '{"provider":"email","providers":["email"]}',
        jsonb_build_object('prenom', btrim(coalesce(p_prenom, '')), 'nom', btrim(coalesce(p_nom, ''))),
        NOW(), NOW(), '', '', '', '', '', '', '', '');
    INSERT INTO auth.identities (id, provider_id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
    VALUES (gen_random_uuid(), v_id::TEXT, v_id,
        jsonb_build_object('sub', v_id::TEXT, 'email', v_email, 'email_verified', true), 'email', NOW(), NOW(), NOW());

    UPDATE membres SET actif = true, role = p_role WHERE id = v_id;
    RETURN v_id;
END $$;

-- Mot de passe d'un autre administrateur : réservé au propriétaire
CREATE OR REPLACE FUNCTION public.definir_mot_de_passe(p_membre UUID, p_mot_de_passe TEXT)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, extensions AS $$
BEGIN
    IF NOT est_admin() THEN RAISE EXCEPTION 'Action réservée aux administrateurs.'; END IF;
    IF p_membre <> auth.uid() AND NOT est_proprietaire()
       AND EXISTS (SELECT 1 FROM membres WHERE id = p_membre AND (role = 'ADMINISTRATEUR' OR proprietaire)) THEN
        RAISE EXCEPTION 'Seul Mathieu peut changer le mot de passe d''un administrateur.';
    END IF;
    IF length(coalesce(p_mot_de_passe, '')) < 8 THEN RAISE EXCEPTION 'Le mot de passe doit faire au moins 8 caractères.'; END IF;
    UPDATE auth.users SET encrypted_password = crypt(p_mot_de_passe, gen_salt('bf')), updated_at = NOW() WHERE id = p_membre;
    IF NOT FOUND THEN RAISE EXCEPTION 'Membre introuvable.'; END IF;
    INSERT INTO journal (auteur_id, auteur, action, objet, objet_id, avant, apres)
    SELECT auth.uid(), COALESCE((SELECT NULLIF(btrim(prenom || ' ' || nom), '') FROM membres WHERE id = auth.uid()), 'Administrateur'),
           'MODIFICATION', 'MEMBRE', m.id::TEXT, to_jsonb(m) - 'created_at', (to_jsonb(m) - 'created_at') || '{"mot_de_passe": "modifié"}'
    FROM membres m WHERE m.id = p_membre;
END $$;
