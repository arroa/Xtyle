import { NextResponse } from "next/server";

import { clearDevSessionCookieOptions } from "@/lib/dev-session-token";

export async function POST() {
  const response = NextResponse.json({ ok: true });
  const session = clearDevSessionCookieOptions();
  response.cookies.set(session.name, session.value, session);
  return response;
}
