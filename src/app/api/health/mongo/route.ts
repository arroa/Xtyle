import { NextResponse } from "next/server";
import { getDb } from "@/lib/mongodb";

export async function GET() {
  try {
    const db = await getDb();
    await db.command({ ping: 1 });

    return NextResponse.json({
      ok: true,
      database: db.databaseName,
      message: "MongoDB conectado",
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { ok: false, message },
      { status: 500 },
    );
  }
}
