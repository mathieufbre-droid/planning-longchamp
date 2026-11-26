-- Imitation minimale de l'environnement Supabase (schémas auth et storage, rôles)
-- pour tester la migration sur un PostgreSQL local. Ne pas exécuter sur Supabase.
CREATE ROLE authenticated NOLOGIN;
CREATE ROLE anon NOLOGIN;
CREATE SCHEMA auth;
CREATE TABLE auth.users (id UUID PRIMARY KEY, email TEXT, raw_user_meta_data JSONB DEFAULT '{}',
  instance_id UUID, aud TEXT, role TEXT, encrypted_password TEXT, email_confirmed_at TIMESTAMPTZ, raw_app_meta_data JSONB,
  created_at TIMESTAMPTZ, updated_at TIMESTAMPTZ, confirmation_token TEXT, email_change TEXT, email_change_token_new TEXT,
  recovery_token TEXT, email_change_token_current TEXT, phone_change TEXT, phone_change_token TEXT, reauthentication_token TEXT);
CREATE TABLE auth.identities (id UUID PRIMARY KEY, provider_id TEXT, user_id UUID REFERENCES auth.users ON DELETE CASCADE,
  identity_data JSONB, provider TEXT, last_sign_in_at TIMESTAMPTZ, created_at TIMESTAMPTZ, updated_at TIMESTAMPTZ);
CREATE SCHEMA extensions;
CREATE EXTENSION pgcrypto SCHEMA extensions;
CREATE FUNCTION auth.uid() RETURNS UUID LANGUAGE sql STABLE AS
  $$ SELECT NULLIF(current_setting('request.jwt.claim.sub', true), '')::UUID $$;
CREATE FUNCTION auth.role() RETURNS TEXT LANGUAGE sql STABLE AS
  $$ SELECT current_setting('request.jwt.claim.role', true) $$;
CREATE SCHEMA storage;
CREATE TABLE storage.buckets (id TEXT PRIMARY KEY, name TEXT, public BOOLEAN, file_size_limit BIGINT, allowed_mime_types TEXT[]);
CREATE TABLE storage.objects (id SERIAL PRIMARY KEY, bucket_id TEXT, name TEXT);
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;
GRANT USAGE ON SCHEMA auth, storage TO authenticated;
