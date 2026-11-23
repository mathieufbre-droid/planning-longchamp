-- Durcissement signalé par l'analyse de sécurité Supabase :
-- les fonctions de trigger ne doivent pas être appelables par l'API (/rest/v1/rpc/...).
-- est_actif() et est_admin() restent appelables : les politiques RLS en ont besoin
-- et elles ne renseignent que sur l'utilisateur connecté lui-même.
ALTER FUNCTION public.horodater_reservation() SET search_path = public;
REVOKE EXECUTE ON FUNCTION public.creer_profil_membre(), public.garder_un_administrateur(),
    public.journaliser(), public.horodater_reservation() FROM PUBLIC, anon, authenticated;
