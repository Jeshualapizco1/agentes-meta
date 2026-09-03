import { NextResponse, type NextRequest } from "next/server";
import { authClient } from "@/lib/supabase/server";
export async function POST(req: NextRequest) { const sb = await authClient(); await sb.auth.signOut(); return NextResponse.redirect(new URL("/login", req.url), { status: 303 }); }
