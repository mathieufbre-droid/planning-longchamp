import type { NextRequest } from "next/server";
import { rafraichirSession } from "@/lib/supabase/proxy";

export async function proxy(request: NextRequest) {
  return rafraichirSession(request);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|manifest.webmanifest|.*\\.(?:svg|png|jpg|jpeg|webp)$).*)"],
};
