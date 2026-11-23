import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import type { Profil, Role } from "@/lib/types";

export async function createClient() {
  const cookieStore = await cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: (toSet) => {
          try {
            toSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
          } catch {
            // Appelé depuis un Server Component : le proxy rafraîchit la session.
          }
        },
      },
    },
  );
}

/** Profil de l'utilisateur connecté ; redirige vers /login ou /en-attente si besoin. */
export async function exigerProfil(roles?: Role[]): Promise<Profil> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profil } = await supabase
    .from("membres")
    .select("id, nom, prenom, email, role, actif, proprietaire")
    .eq("id", user.id)
    .single<Profil>();

  if (!profil || !profil.actif) redirect("/en-attente");
  if (roles && !roles.includes(profil.role)) redirect("/");
  return profil;
}
