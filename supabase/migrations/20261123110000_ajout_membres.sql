-- =====================================================================
-- Ajout de membres et changement de mot de passe directement depuis l'application.
-- Réservé aux administrateurs, vérifié ici (est_admin) et non seulement par l'écran.
-- Un identifiant sans « @ » (ex. « claire ») devient « claire@longchamps.local ».
-- =====================================================================

CREATE OR REPLACE FUNCTION public.ajouter_membre(
    p_identifiant TEXT, p_mot_de_passe TEXT, p_prenom TEXT, p_nom TEXT, p_role role_membre DEFAULT 'LECTEUR'
) RETURNS UUID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, extensions AS $$
DECLARE
    v_email TEXT := lower(btrim(p_identifiant));
    v_id UUID := gen_random_uuid();
BEGIN
    IF NOT est_admin() THEN RAISE EXCEPTION 'Action réservée aux administrateurs.'; END IF;
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

    -- Le profil a été créé par le trigger d'inscription : on l'active directement avec son rôle
    UPDATE membres SET actif = true, role = p_role WHERE id = v_id;
    RETURN v_id;
END $$;

CREATE OR REPLACE FUNCTION public.definir_mot_de_passe(p_membre UUID, p_mot_de_passe TEXT)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, extensions AS $$
BEGIN
    IF NOT est_admin() THEN RAISE EXCEPTION 'Action réservée aux administrateurs.'; END IF;
    IF length(coalesce(p_mot_de_passe, '')) < 8 THEN RAISE EXCEPTION 'Le mot de passe doit faire au moins 8 caractères.'; END IF;
    UPDATE auth.users SET encrypted_password = crypt(p_mot_de_passe, gen_salt('bf')), updated_at = NOW() WHERE id = p_membre;
    IF NOT FOUND THEN RAISE EXCEPTION 'Membre introuvable.'; END IF;
    -- Le mot de passe lui-même n'est jamais écrit dans le journal
    INSERT INTO journal (auteur_id, auteur, action, objet, objet_id, avant, apres)
    SELECT auth.uid(), COALESCE((SELECT NULLIF(btrim(prenom || ' ' || nom), '') FROM membres WHERE id = auth.uid()), 'Administrateur'),
           'MODIFICATION', 'MEMBRE', m.id::TEXT, to_jsonb(m) - 'created_at', (to_jsonb(m) - 'created_at') || '{"mot_de_passe": "modifié"}'
    FROM membres m WHERE m.id = p_membre;
END $$;

REVOKE EXECUTE ON FUNCTION public.ajouter_membre(TEXT, TEXT, TEXT, TEXT, role_membre), public.definir_mot_de_passe(UUID, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.ajouter_membre(TEXT, TEXT, TEXT, TEXT, role_membre), public.definir_mot_de_passe(UUID, TEXT) TO authenticated;
