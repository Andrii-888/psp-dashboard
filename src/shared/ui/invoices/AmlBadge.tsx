"use client";

export type AmlStatus = "clean" | "warning" | "risky";
export type AssetStatus = "clean" | "suspicious" | "blocked";

interface AmlBadgeProps {
  // приходят из Invoice как string | null
  amlStatus: string | null;
  riskScore: number | null;
  assetStatus?: string | null;
  assetRiskScore?: number | null;

  // ✅ NEW
  variant?: "table" | "details";
}

// Цвета для статуса AML (rich / details)
function getAmlClasses(status: string | null) {
  switch (status) {
    case "clean":
      return "bg-emerald-500/10 text-emerald-100 ring-1 ring-emerald-500/25";
    case "suspicious":
      return "bg-amber-500/10 text-amber-100 ring-1 ring-amber-500/25";
    case "blocked":
      return "bg-rose-500/10 text-rose-100 ring-1 ring-rose-500/25";
    default:
      return "bg-white/5 text-slate-200 ring-1 ring-white/10";
  }
}

// Цвета для статуса «чистоты актива» (rich / details)
function getAssetClasses(status: string | null | undefined) {
  switch (status) {
    case "clean":
      return "bg-emerald-500/10 text-emerald-100 ring-1 ring-emerald-500/25";
    case "suspicious":
      return "bg-amber-500/10 text-amber-100 ring-1 ring-amber-500/25";
    case "blocked":
      return "bg-rose-500/10 text-rose-100 ring-1 ring-rose-500/25";
    default:
      return "bg-white/5 text-slate-200 ring-1 ring-white/10";
  }
}

export function AmlBadge({
  amlStatus,
  riskScore,
  assetStatus = null,
  assetRiskScore = null,
  variant = "details",
}: AmlBadgeProps) {
  const hasAnyData =
    amlStatus !== null ||
    riskScore !== null ||
    assetStatus !== null ||
    assetRiskScore !== null;

  // Если вообще нет данных — маленький нейтральный чип
  if (!hasAnyData) {
    return (
      <div className="inline-flex items-center rounded-full bg-slate-800/80 px-3 py-1 text-[11px] text-slate-300 ring-1 ring-slate-700/80">
        <span className="mr-1 inline-block h-1.5 w-1.5 rounded-full bg-slate-500" />
        No AML data
      </div>
    );
  }

  const label =
    amlStatus === "clean"
      ? "CLEAN"
      : amlStatus === "warning"
      ? "WARNING"
      : amlStatus === "risky"
      ? "HIGH RISK"
      : "AML STATUS";

  const riskLabel =
    typeof riskScore === "number" ? `Score: ${riskScore}` : undefined;

  const assetLabel =
    typeof assetRiskScore === "number"
      ? `Asset score: ${assetRiskScore}`
      : undefined;

  const assetText =
    assetStatus === "clean"
      ? "Stablecoin: clean"
      : assetStatus === "suspicious"
      ? "Stablecoin: suspicious"
      : assetStatus === "blocked"
      ? "Stablecoin: blocked"
      : "Stablecoin: not checked";

  const isFlagged = amlStatus === "risky" || amlStatus === "warning";

  // ✅ TABLE variant (compact, no heavy shadow, fixed width)
  if (variant === "table") {
    const amlTableClass =
      amlStatus === "clean"
        ? "bg-emerald-500/10 text-emerald-200 ring-1 ring-emerald-400/25"
        : amlStatus === "warning"
        ? "bg-amber-500/10 text-amber-200 ring-1 ring-amber-400/25"
        : amlStatus === "risky"
        ? "bg-rose-500/10 text-rose-200 ring-1 ring-rose-400/25"
        : "bg-slate-800/60 text-slate-200 ring-1 ring-slate-700/70";

    const assetTableClass =
      assetStatus === "clean"
        ? "bg-emerald-500/8 text-emerald-200 ring-1 ring-emerald-400/20"
        : assetStatus === "suspicious"
        ? "bg-amber-500/8 text-amber-200 ring-1 ring-amber-400/20"
        : assetStatus === "blocked"
        ? "bg-rose-500/8 text-rose-200 ring-1 ring-rose-400/20"
        : "bg-slate-800/60 text-slate-300 ring-1 ring-slate-700/70";

    return (
      <div className="flex flex-col items-center gap-1.5 text-[11px]">
        <div
          className={[
            "w-44 rounded-2xl px-3 py-2 text-center",
            amlTableClass,
          ].join(" ")}
        >
          <div className="flex items-center justify-center gap-1.5">
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-current" />
            <span className="text-[11px] font-semibold tracking-[0.16em] uppercase">
              {label}
            </span>
          </div>

          {riskLabel ? (
            <div className="mt-0.5 text-[10px] opacity-80">{riskLabel}</div>
          ) : null}

          <div className="mt-1 text-[10px] opacity-85">
            Provider: demo
            {isFlagged ? (
              <span className="ml-2 font-semibold tracking-[0.16em] uppercase text-[10px]">
                • FLAGGED
              </span>
            ) : null}
          </div>
        </div>

        <div
          className={[
            "w-44 rounded-2xl px-3 py-1.5 text-center text-[10px]",
            assetTableClass,
          ].join(" ")}
        >
          <div className="truncate">{assetText}</div>
          {assetLabel ? <div className="opacity-80">{assetLabel}</div> : null}
        </div>
      </div>
    );
  }

  // ✅ DETAILS variant (rich, centered, your current style)
  const amlClass = getAmlClasses(amlStatus);
  const assetClass = getAssetClasses(assetStatus);

  return (
    <div className="inline-flex flex-col items-center gap-2 text-[11px]">
      {/* Основной AML-бейдж */}
      <div className={`w-44 rounded-2xl px-3 py-2 ${amlClass}`}>
        <div className="flex flex-col items-center gap-1 text-center">
          <div className="flex items-center justify-center gap-1.5">
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-current" />
            <span className="text-[11px] font-semibold tracking-[0.16em] uppercase">
              {label}
            </span>
          </div>

          {riskLabel ? (
            <span className="text-[10px] opacity-80">{riskLabel}</span>
          ) : null}
        </div>

        <div className="mt-1 text-[10px] opacity-85 text-center">
          Provider: demo
          {isFlagged ? (
            <span className="ml-2 font-semibold tracking-[0.16em] uppercase text-[10px]">
              • FLAGGED
            </span>
          ) : null}
        </div>
      </div>

      {/* Доп. блок про чистоту актива */}
      <div
        className={`w-44 flex flex-col items-center gap-0.5 rounded-2xl px-3 py-1.5 text-[10px] text-center ${assetClass}`}
      >
        <span className="truncate">{assetText}</span>
        {assetLabel ? <span className="opacity-80">{assetLabel}</span> : null}
      </div>
    </div>
  );
}
