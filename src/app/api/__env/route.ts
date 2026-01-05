// src/app/api/__env/route.ts
import { NextResponse } from "next/server";

export async function GET() {
  // В production этот endpoint НЕ должен существовать
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ message: "Not found" }, { status: 404 });
  }

  // В dev — только минимальная диагностика (без секретов)
  return NextResponse.json({
    nodeEnv: process.env.NODE_ENV ?? null,
  });
}
