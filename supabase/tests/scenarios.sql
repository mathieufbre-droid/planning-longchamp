-- Scénarios de vérification des règles (à lancer après stubs + migrations)
\set ON_ERROR_STOP on
GRANT USAGE ON SCHEMA public TO authenticated;

INSERT INTO auth.users VALUES
 ('00000000-0000-0000-0000-00000000000a','admin@x.fr','{"nom":"Martin","prenom":"Anne"}'),
 ('00000000-0000-0000-0000-00000000000b','lecteur@x.fr','{"nom":"Martin","prenom":"Paul"}'),
 ('00000000-0000-0000-0000-00000000000c','nouveau@x.fr','{}');
UPDATE membres SET actif = true, role = 'ADMINISTRATEUR', proprietaire = true WHERE email = 'admin@x.fr';
UPDATE membres SET actif = true WHERE email = 'lecteur@x.fr';

SET ROLE authenticated;

-- Admin : réserve une semaine (lundi → vendredi), le week-end qui suit et une autre semaine
SELECT set_config('request.jwt.claim.sub','00000000-0000-0000-0000-00000000000a',false);
INSERT INTO reservations (debut, fin, type, occupant) VALUES
 ('2027-01-04','2027-01-08','SEMAINE','Famille Martin'),
 ('2027-01-09','2027-01-10','WEEK_END','Paul'),
 ('2027-01-11','2027-01-15','SEMAINE','Cousins Durand');
DO $$ BEGIN
  IF (SELECT count(*) FROM reservations) <> 3 THEN RAISE EXCEPTION 'réservations manquantes'; END IF;
  IF (SELECT cree_par FROM reservations WHERE occupant = 'Paul') <> auth.uid() THEN RAISE EXCEPTION 'cree_par non renseigné'; END IF;
  -- Chevauchement refusé
  BEGIN
    INSERT INTO reservations (debut, fin, occupant) VALUES ('2027-01-08','2027-01-08','Intrus');
    RAISE EXCEPTION 'chevauchement accepté';
  EXCEPTION WHEN exclusion_violation THEN NULL; END;
  -- Dates incohérentes refusées
  BEGIN
    INSERT INTO reservations (debut, fin, occupant) VALUES ('2027-02-10','2027-02-09','À l''envers');
    RAISE EXCEPTION 'fin avant début acceptée';
  EXCEPTION WHEN check_violation THEN NULL; END;
  -- Occupant obligatoire
  BEGIN
    INSERT INTO reservations (debut, fin, occupant) VALUES ('2027-03-01','2027-03-03','  ');
    RAISE EXCEPTION 'occupant vide accepté';
  EXCEPTION WHEN check_violation THEN NULL; END;
  -- Modification et suppression
  UPDATE reservations SET note = 'Arrivée tardive' WHERE occupant = 'Paul';
  IF (SELECT note FROM reservations WHERE occupant = 'Paul') <> 'Arrivée tardive' THEN RAISE EXCEPTION 'modification admin refusée'; END IF;
  -- Le dernier administrateur ne peut pas se rétrograder
  BEGIN
    UPDATE membres SET role = 'LECTEUR' WHERE id = auth.uid();
    RAISE EXCEPTION 'dernier admin rétrogradé';
  EXCEPTION WHEN raise_exception THEN
    IF SQLERRM NOT LIKE 'Il doit rester%' THEN RAISE; END IF;
  END;
  -- Active le nouveau compte
  UPDATE membres SET actif = true, prenom = 'Léa' WHERE email = 'nouveau@x.fr';
END $$;

-- Lecteur : voit le planning et son seul profil, ne modifie rien
SELECT set_config('request.jwt.claim.sub','00000000-0000-0000-0000-00000000000b',false);
DO $$ DECLARE n INT; BEGIN
  IF (SELECT count(*) FROM reservations) <> 3 THEN RAISE EXCEPTION 'lecteur ne voit pas les réservations'; END IF;
  IF (SELECT count(*) FROM membres) <> 1 THEN RAISE EXCEPTION 'lecteur voit la liste des membres'; END IF;
  BEGIN
    INSERT INTO reservations (debut, fin, occupant) VALUES ('2027-04-01','2027-04-03','Moi');
    RAISE EXCEPTION 'lecteur a pu réserver';
  EXCEPTION WHEN insufficient_privilege THEN NULL; END;
  UPDATE reservations SET occupant = 'Pirate'; GET DIAGNOSTICS n = ROW_COUNT;
  IF n <> 0 THEN RAISE EXCEPTION 'lecteur a modifié une réservation'; END IF;
  DELETE FROM reservations; GET DIAGNOSTICS n = ROW_COUNT;
  IF n <> 0 THEN RAISE EXCEPTION 'lecteur a supprimé une réservation'; END IF;
  UPDATE membres SET role = 'ADMINISTRATEUR' WHERE id = auth.uid(); GET DIAGNOSTICS n = ROW_COUNT;
  IF n <> 0 THEN RAISE EXCEPTION 'lecteur s''est promu administrateur'; END IF;
END $$;

-- Compte désactivé : ne voit que son profil
RESET ROLE;
UPDATE membres SET actif = false WHERE email = 'nouveau@x.fr';
SET ROLE authenticated;
SELECT set_config('request.jwt.claim.sub','00000000-0000-0000-0000-00000000000c',false);
DO $$ BEGIN
  IF (SELECT count(*) FROM reservations) <> 0 THEN RAISE EXCEPTION 'inactif voit les réservations'; END IF;
  IF (SELECT count(*) FROM membres) <> 1 THEN RAISE EXCEPTION 'inactif voit les autres membres'; END IF;
END $$;

-- Admin propriétaire : promeut un second administrateur, peut alors se rétrograder ; suppression d'une réservation
SELECT set_config('request.jwt.claim.sub','00000000-0000-0000-0000-00000000000a',false);
DO $$ DECLARE n INT; BEGIN
  UPDATE membres SET role = 'ADMINISTRATEUR' WHERE email = 'lecteur@x.fr';
  DELETE FROM reservations WHERE occupant = 'Paul'; GET DIAGNOSTICS n = ROW_COUNT;
  IF n <> 1 THEN RAISE EXCEPTION 'admin ne peut pas supprimer'; END IF;
  UPDATE membres SET role = 'LECTEUR' WHERE id = auth.uid();
END $$;

-- Anne est maintenant lectrice : ne lit plus le journal
DO $$ BEGIN
  IF (SELECT count(*) FROM journal) <> 0 THEN RAISE EXCEPTION 'lecteur lit le journal'; END IF;
END $$;
SELECT set_config('request.jwt.claim.sub','00000000-0000-0000-0000-00000000000b',false);
-- Journal : tout est tracé avec l'auteur ; seul l'admin le lit ; personne ne le modifie
DO $$ DECLARE n INT; BEGIN
  IF (SELECT count(*) FROM journal WHERE objet = 'RESERVATION' AND action = 'AJOUT' AND auteur = 'Anne Martin') <> 3 THEN RAISE EXCEPTION 'ajouts non journalisés'; END IF;
  IF NOT EXISTS (SELECT 1 FROM journal WHERE objet = 'RESERVATION' AND action = 'MODIFICATION' AND avant->>'note' = '' AND apres->>'note' = 'Arrivée tardive') THEN RAISE EXCEPTION 'modification non journalisée'; END IF;
  IF NOT EXISTS (SELECT 1 FROM journal WHERE objet = 'RESERVATION' AND action = 'SUPPRESSION' AND avant->>'occupant' = 'Paul') THEN RAISE EXCEPTION 'suppression non journalisée'; END IF;
  IF NOT EXISTS (SELECT 1 FROM journal WHERE objet = 'MEMBRE' AND action = 'MODIFICATION' AND apres->>'role' = 'LECTEUR' AND avant->>'role' = 'ADMINISTRATEUR') THEN RAISE EXCEPTION 'changement de rôle non journalisé'; END IF;
  IF EXISTS (SELECT 1 FROM journal WHERE action = 'MODIFICATION' AND avant = apres) THEN RAISE EXCEPTION 'modification vide journalisée'; END IF;
END $$;
DO $$ DECLARE n INT; BEGIN
  BEGIN
    DELETE FROM journal;
    RAISE EXCEPTION 'journal effaçable';
  EXCEPTION WHEN insufficient_privilege THEN NULL; END;
  BEGIN
    INSERT INTO journal (auteur, action, objet, objet_id) VALUES ('Faux', 'AJOUT', 'MEMBRE', 'x');
    RAISE EXCEPTION 'journal falsifiable';
  EXCEPTION WHEN insufficient_privilege THEN NULL; END;
END $$;

-- Ajout de membres depuis l'application (b est administrateur à ce stade)
DO $$ DECLARE v UUID; BEGIN
  v := ajouter_membre('Claire', 'motdepasse1', 'Claire', 'Durand', 'LECTEUR');
  IF NOT EXISTS (SELECT 1 FROM membres WHERE id = v AND email = 'claire@longchamps.local' AND actif AND role = 'LECTEUR' AND prenom = 'Claire') THEN RAISE EXCEPTION 'membre mal créé'; END IF;
  IF NOT EXISTS (SELECT 1 FROM journal WHERE objet = 'MEMBRE' AND action = 'AJOUT' AND objet_id = v::TEXT AND auteur = 'Paul Martin') THEN RAISE EXCEPTION 'ajout de membre non journalisé'; END IF;
  BEGIN PERFORM ajouter_membre('claire', 'autremotdepasse', '', '', 'LECTEUR'); RAISE EXCEPTION 'doublon accepté';
  EXCEPTION WHEN raise_exception THEN IF SQLERRM NOT LIKE 'Ce compte existe%' THEN RAISE; END IF; END;
  BEGIN PERFORM ajouter_membre('court', '1234', '', '', 'LECTEUR'); RAISE EXCEPTION 'mot de passe court accepté';
  EXCEPTION WHEN raise_exception THEN IF SQLERRM NOT LIKE 'Le mot de passe%' THEN RAISE; END IF; END;
  PERFORM definir_mot_de_passe(v, 'nouveaumdp1');
  IF NOT EXISTS (SELECT 1 FROM journal WHERE objet_id = v::TEXT AND apres->>'mot_de_passe' = 'modifié') THEN RAISE EXCEPTION 'changement de mot de passe non journalisé'; END IF;
  IF EXISTS (SELECT 1 FROM journal WHERE apres::TEXT LIKE '%nouveaumdp1%' OR avant::TEXT LIKE '%nouveaumdp1%') THEN RAISE EXCEPTION 'mot de passe en clair dans le journal'; END IF;
END $$;
RESET ROLE;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'claire@longchamps.local' AND encrypted_password = extensions.crypt('nouveaumdp1', encrypted_password)) THEN RAISE EXCEPTION 'mot de passe non changé'; END IF;
END $$;
SET ROLE authenticated;
-- Un lecteur ne peut pas ajouter de membre
SELECT set_config('request.jwt.claim.sub','00000000-0000-0000-0000-00000000000a',false);
DO $$ BEGIN
  BEGIN PERFORM ajouter_membre('pirate', 'motdepasse1', '', '', 'ADMINISTRATEUR'); RAISE EXCEPTION 'lecteur a ajouté un membre';
  EXCEPTION WHEN raise_exception THEN IF SQLERRM NOT LIKE 'Action réservée%' THEN RAISE; END IF; END;
  BEGIN PERFORM definir_mot_de_passe('00000000-0000-0000-0000-00000000000b', 'motdepasse1'); RAISE EXCEPTION 'lecteur a changé un mot de passe';
  EXCEPTION WHEN raise_exception THEN IF SQLERRM NOT LIKE 'Action réservée%' THEN RAISE; END IF; END;
END $$;

-- Seul le propriétaire (Anne ici, Mathieu en production) nomme et gère les administrateurs
RESET ROLE;
SELECT set_config('request.jwt.claim.sub','',false); -- tableau de bord Supabase
UPDATE membres SET role = 'ADMINISTRATEUR' WHERE email = 'admin@x.fr';
SET ROLE authenticated;
SELECT set_config('request.jwt.claim.sub','00000000-0000-0000-0000-00000000000a',false);
DO $$ BEGIN
  PERFORM ajouter_membre('second', 'motdepasse1', 'Second', 'Admin', 'ADMINISTRATEUR');
  IF NOT EXISTS (SELECT 1 FROM membres WHERE email = 'second@longchamps.local' AND role = 'ADMINISTRATEUR') THEN RAISE EXCEPTION 'propriétaire ne peut pas créer d''admin'; END IF;
END $$;
-- Paul, administrateur non propriétaire
SELECT set_config('request.jwt.claim.sub','00000000-0000-0000-0000-00000000000b',false);
DO $$ DECLARE n INT; BEGIN
  IF (SELECT count(*) FROM membres) < 4 THEN RAISE EXCEPTION 'admin ne voit pas les membres'; END IF;
  BEGIN PERFORM ajouter_membre('pirate2', 'motdepasse1', '', '', 'ADMINISTRATEUR'); RAISE EXCEPTION 'admin non propriétaire a créé un admin';
  EXCEPTION WHEN raise_exception THEN IF SQLERRM NOT LIKE 'Seul Mathieu%' THEN RAISE; END IF; END;
  IF EXISTS (SELECT 1 FROM membres WHERE email LIKE 'pirate2%') THEN RAISE EXCEPTION 'compte pirate2 créé'; END IF;
  BEGIN UPDATE membres SET role = 'ADMINISTRATEUR' WHERE email = 'claire@longchamps.local'; RAISE EXCEPTION 'admin non propriétaire a promu';
  EXCEPTION WHEN raise_exception THEN IF SQLERRM NOT LIKE 'Seul Mathieu%' THEN RAISE; END IF; END;
  BEGIN UPDATE membres SET role = 'LECTEUR' WHERE email = 'second@longchamps.local'; RAISE EXCEPTION 'admin non propriétaire a rétrogradé un admin';
  EXCEPTION WHEN raise_exception THEN IF SQLERRM NOT LIKE 'Seul Mathieu%' THEN RAISE; END IF; END;
  BEGIN UPDATE membres SET actif = false WHERE email = 'second@longchamps.local'; RAISE EXCEPTION 'admin non propriétaire a désactivé un admin';
  EXCEPTION WHEN raise_exception THEN IF SQLERRM NOT LIKE 'Seul Mathieu%' THEN RAISE; END IF; END;
  BEGIN DELETE FROM membres WHERE email = 'second@longchamps.local'; RAISE EXCEPTION 'admin non propriétaire a supprimé un admin';
  EXCEPTION WHEN raise_exception THEN IF SQLERRM NOT LIKE 'Seul Mathieu%' THEN RAISE; END IF; END;
  BEGIN UPDATE membres SET prenom = 'X' WHERE email = 'admin@x.fr'; RAISE EXCEPTION 'admin non propriétaire a modifié le propriétaire';
  EXCEPTION WHEN raise_exception THEN IF SQLERRM NOT LIKE 'Seul Mathieu%' THEN RAISE; END IF; END;
  BEGIN UPDATE membres SET proprietaire = true WHERE id = auth.uid(); RAISE EXCEPTION 'admin s''est déclaré propriétaire';
  EXCEPTION WHEN raise_exception OR unique_violation THEN NULL; END;
  BEGIN PERFORM definir_mot_de_passe((SELECT id FROM membres WHERE email = 'second@longchamps.local'), 'motdepasse2'); RAISE EXCEPTION 'admin non propriétaire a changé le mot de passe d''un admin';
  EXCEPTION WHEN raise_exception THEN IF SQLERRM NOT LIKE 'Seul Mathieu%' THEN RAISE; END IF; END;
  BEGIN PERFORM definir_mot_de_passe('00000000-0000-0000-0000-00000000000a', 'motdepasse2'); RAISE EXCEPTION 'admin non propriétaire a changé le mot de passe du propriétaire';
  EXCEPTION WHEN raise_exception THEN IF SQLERRM NOT LIKE 'Seul Mathieu%' THEN RAISE; END IF; END;
  -- Il gère toujours les lecteurs et son propre compte
  PERFORM definir_mot_de_passe(auth.uid(), 'monmotdepasse');
  PERFORM definir_mot_de_passe((SELECT id FROM membres WHERE email = 'claire@longchamps.local'), 'motdepasse3');
  UPDATE membres SET actif = false WHERE email = 'claire@longchamps.local'; GET DIAGNOSTICS n = ROW_COUNT;
  IF n <> 1 THEN RAISE EXCEPTION 'admin ne peut plus gérer les lecteurs'; END IF;
  UPDATE membres SET prenom = 'Paulo' WHERE id = auth.uid();
END $$;
-- Le propriétaire, lui, gère les administrateurs
SELECT set_config('request.jwt.claim.sub','00000000-0000-0000-0000-00000000000a',false);
DO $$ BEGIN
  UPDATE membres SET role = 'LECTEUR' WHERE email = 'second@longchamps.local';
  UPDATE membres SET role = 'ADMINISTRATEUR' WHERE email = 'claire@longchamps.local';
  PERFORM definir_mot_de_passe('00000000-0000-0000-0000-00000000000b', 'motdepasse4');
  BEGIN UPDATE membres SET proprietaire = false WHERE id = auth.uid(); RAISE EXCEPTION 'propriétaire changé depuis l''application';
  EXCEPTION WHEN raise_exception THEN IF SQLERRM NOT LIKE 'Le propriétaire%' THEN RAISE; END IF; END;
END $$;

\echo 'TOUS LES SCÉNARIOS PASSENT'
