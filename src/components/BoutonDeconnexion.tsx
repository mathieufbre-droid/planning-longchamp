"use client";

import { LogOut } from "lucide-react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function BoutonDeconnexion() {
  const router = useRouter();
  return (
    <button
      type="button"
      onClick={async () => {
        await createClient().auth.signOut();
        router.replace("/login");
        router.refresh();
      }}
      className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-900"
    >
      <LogOut size={16} /> Déconnexion
    </button>
  );
}
