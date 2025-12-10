// src/components/home/HomeHero.tsx
"use client";

import Link from "next/link";

export function HomeHero() {
  return (
    <section className="flex h-[85vh] w-full items-center justify-center bg-[#0A0A0A] px-4">
      <div className="text-center">
        {/* Заголовок */}
        <h1 className="text-2xl font-semibold text-white md:text-2xl">
          PSP Dashboard - CryptoPay PSP Core
        </h1>

        {/* Кнопка как у Apple */}
        <Link
          href="/invoices"
          className="
            mt-10 inline-flex items-center justify-center
            rounded-full bg-white px-6 py-3
            text-sm font-medium text-black
            shadow-[0_4px_16px_rgba(255,255,255,0.15)]
            transition 
            hover:shadow-[0_6px_20px_rgba(255,255,255,0.25)]
            hover:bg-white/90
          "
        >
          Open...
        </Link>
      </div>
    </section>
  );
}
