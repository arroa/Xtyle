import { NextResponse } from "next/server";

import { requireUser } from "@/lib/api-auth";
import { listFieldSuggestions } from "@/lib/products";

export async function GET() {
  const auth = await requireUser();
  if ("error" in auth) return auth.error;

  const suggestions = await listFieldSuggestions();
  return NextResponse.json(suggestions);
}
