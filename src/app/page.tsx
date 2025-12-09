// src/app/page.tsx
import { HomeHero } from "@/components/home/HomeHero";

export default function HomePage() {
  return (
    <main className="min-h-screen bg-page-gradient px-4 py-8 text-slate-50 md:px-8 md:py-10">
      <HomeHero />
    </main>
  );
}
