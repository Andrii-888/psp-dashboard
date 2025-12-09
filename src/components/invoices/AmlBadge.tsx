"use client";

export type AmlStatus = "clean" | "warning" | "risky";
export type AssetStatus = "clean" | "suspicious" | "blocked";

interface AmlBadgeProps {
  amlStatus: AmlStatus | null;
  riskScore: number | null;
  assetStatus?: AssetStatus | null;
  assetRiskScore?: number | null;
}

// Цвета для статуса AML
function getAmlClasses(status: AmlStatus | null) {
  switch (status) {
    case "clean":
      return "bg-emerald-500/15 text-emerald-100 border border-emerald-500/40 shadow-[0_14px_40px_rgba(16,185,129,0.45)]";
    case "warning":
      return "bg-amber-500/15 text-amber-100 border border-amber-500/40 shadow-[0_14px_40px_rgba(245,158,11,0.45)]";
    case "risky":
      return "bg-rose-500/15 text-rose-100 border border-rose-500/40 shadow-[0_14px_40px_rgba(244,63,94,0.45)]";
    default:
      return "bg-slate-800/70 text-slate-200 border border-slate-600/60";
  }
}

// Цвета для статуса «чистоты актива»
function getAssetClasses(status: AssetStatus | null | undefined) {
  switch (status) {
    case "clean":
      return "bg-emerald-500/10 text-emerald-100 border border-emerald-500/40";
    case "suspicious":
      return "bg-amber-500/10 text-amber-100 border border-amber-500/40";
    case "blocked":
      return "bg-rose-500/10 text-rose-100 border border-rose-500/40";
    default:
      return "bg-slate-800/70 text-slate-200 border border-slate-600/60";
  }
}

export function AmlBadge({
  amlStatus,
  riskScore,
  assetStatus = null,
  assetRiskScore = null,
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

  const amlClass = getAmlClasses(amlStatus);
  const assetClass = getAssetClasses(assetStatus);

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

  return (
    <div className="inline-flex flex-col gap-2 text-[11px]">
      {/* Основной AML-бейдж */}
      <div
        className={`min-w-[190px] max-w-xs rounded-2xl px-3 py-2 ${amlClass}`}
      >
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5">
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-current" />
            <span className="text-[11px] font-semibold tracking-[0.16em] uppercase">
              {label}
            </span>
          </div>
          {riskLabel && (
            <span className="text-[10px] opacity-80">{riskLabel}</span>
          )}
        </div>

        <div className="mt-1 text-[10px] opacity-85">
          Provider: demo
          {amlStatus === "risky" || amlStatus === "warning" ? (
            <span className="ml-2 font-semibold tracking-[0.16em] uppercase text-[10px]">
              • FLAGGED
            </span>
          ) : null}
        </div>
      </div>

      {/* Доп. блок про чистоту актива */}
      <div
        className={`inline-flex max-w-xs items-center justify-between gap-2 rounded-2xl px-3 py-1.5 text-[10px] ${assetClass}`}
      >
        <span className="truncate">{assetText}</span>
        {assetLabel && (
          <span className="whitespace-nowrap opacity-80">{assetLabel}</span>
        )}
      </div>
    </div>
  );
}
