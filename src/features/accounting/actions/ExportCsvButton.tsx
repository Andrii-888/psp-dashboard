"use client";

import { useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import ExportCsvModal from "./ExportCsvModal";

type AnyRow = Record<string, unknown>;

function pickRows(payload: unknown): AnyRow[] {
  if (Array.isArray(payload)) return payload as AnyRow[];

  if (payload && typeof payload === "object") {
    const obj = payload as Record<string, unknown>;
    const candidates = [obj.entries, obj.items, obj.data, obj.rows];
    for (const c of candidates) {
      if (Array.isArray(c)) return c as AnyRow[];
    }
  }
  return [];
}

function stringifyCell(v: unknown): string {
  if (v === null || v === undefined) return "";
  if (typeof v === "string") return v;
  if (typeof v === "number" || typeof v === "boolean") return String(v);
  try {
    return JSON.stringify(v);
  } catch {
    return String(v);
  }
}

function escapeCsv(s: string): string {
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

function rowsToCsv(rows: AnyRow[]): string {
  const keys = Array.from(new Set(rows.flatMap((r) => Object.keys(r ?? {}))));
  if (keys.length === 0) return "no_data\n";

  const header = keys.map(escapeCsv).join(",");
  const lines = rows.map((r) =>
    keys.map((k) => escapeCsv(stringifyCell(r[k]))).join(",")
  );

  return [header, ...lines].join("\n");
}

function downloadTextFile(filename: string, content: string, mime: string) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();

  URL.revokeObjectURL(url);
}

async function sha256Hex(text: string): Promise<string> {
  const bytes = new TextEncoder().encode(text);
  const hashBuf = await crypto.subtle.digest("SHA-256", bytes);
  const hashArr = Array.from(new Uint8Array(hashBuf));
  return hashArr.map((b) => b.toString(16).padStart(2, "0")).join("");
}

export default function ExportCsvButton({
  endpointPath = "/api/psp/accounting/entries",
  className = "",
}: {
  endpointPath?: string;
  className?: string;
}) {
  const sp = useSearchParams();

  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  // чтобы не было Next overlay — НЕ throw'аем, держим ошибку внутри компонента
  const [errorText, setErrorText] = useState<string>("");

  const params = useMemo(() => {
    const merchantId = (sp.get("merchantId") ?? "demo-merchant").trim();
    const from = (sp.get("from") ?? "").trim();
    const to = (sp.get("to") ?? "").trim();

    const rawLimit = (sp.get("limit") ?? "").trim();
    const limit = Number(rawLimit);
    const safeLimit = Number.isFinite(limit) && limit > 0 ? limit : 20;

    return { merchantId, from, to, limit: safeLimit };
  }, [sp]);

  const isActive = useMemo(() => {
    if (params.merchantId && params.merchantId !== "demo-merchant") return true;
    if (params.from || params.to) return true;
    return false;
  }, [params]);

  const filename = useMemo(() => {
    const parts = [
      "accounting",
      params.merchantId || "merchant",
      params.from ? `from_${params.from}` : "",
      params.to ? `to_${params.to}` : "",
    ].filter(Boolean);

    return `${parts.join("__")}.csv`;
  }, [params]);

  const exportLimit = 200;

  async function doExport() {
    setErrorText("");
    setLoading(true);

    try {
      const q = new URLSearchParams();
      q.set("merchantId", params.merchantId || "demo-merchant");

      q.set("limit", String(exportLimit));

      if (params.from) q.set("from", params.from);
      if (params.to) q.set("to", params.to);

      const res = await fetch(`${endpointPath}?${q.toString()}`, {
        method: "GET",
        headers: { Accept: "application/json" },
      });

      // ✅ никаких throw → никаких Next overlay
      if (!res.ok) {
        let detail = "";
        try {
          detail = await res.text();
        } catch {
          detail = "";
        }

        setErrorText(
          `Export failed: ${res.status} ${res.statusText}${
            detail ? ` — ${detail}` : ""
          }`
        );
        return;
      }

      const contentType = res.headers.get("content-type") ?? "";

      // Если вдруг backend отдаст CSV напрямую — поддержим
      if (contentType.includes("text/csv")) {
        const csvText = await res.text();

        const exportedAt = new Date().toISOString();
        const hash = await sha256Hex(csvText);

        const meta = {
          exportedAt,
          sha256: hash,
          merchantId: params.merchantId || "demo-merchant",
          from: params.from || null,
          to: params.to || null,
          exportLimit,
          endpointPath,
          policies: {
            feeSumCrypto: "invoice.confirmed.feeAmount (final confirmed)",
            feeFiatSum: "fee_charged.feeAmount (CHF)",
            finality: "invoice.confirmed minus invoice.confirmed_reversed",
          },
        };

        downloadTextFile(filename, csvText, "text/csv;charset=utf-8");
        downloadTextFile(
          filename.replace(/\.csv$/i, "") + ".sha256.txt",
          `${hash}  ${filename}\n\n${JSON.stringify(meta, null, 2)}\n`,
          "text/plain;charset=utf-8"
        );

        setOpen(false);
        return;
      }

      const payload = (await res.json()) as unknown;
      const rows = pickRows(payload);

      const csv = rowsToCsv(rows);

      const exportedAt = new Date().toISOString();
      const hash = await sha256Hex(csv);

      const meta = {
        exportedAt,
        sha256: hash,
        merchantId: params.merchantId || "demo-merchant",
        from: params.from || null,
        to: params.to || null,
        exportLimit,
        endpointPath,
        policies: {
          feeSumCrypto: "invoice.confirmed.feeAmount (final confirmed)",
          feeFiatSum: "fee_charged.feeAmount (CHF)",
          finality: "invoice.confirmed minus invoice.confirmed_reversed",
        },
      };

      downloadTextFile(filename, csv, "text/csv;charset=utf-8");
      downloadTextFile(
        filename.replace(/\.csv$/i, "") + ".sha256.txt",
        `${hash}  ${filename}\n\n${JSON.stringify(meta, null, 2)}\n`,
        "text/plain;charset=utf-8"
      );

      setOpen(false);
    } catch (e) {
      console.error(e);
      setErrorText("Export failed. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  const details = useMemo(
    () => [
      { label: "Merchant", value: params.merchantId || "demo-merchant" },
      { label: "From", value: params.from || "—" },
      { label: "To", value: params.to || "—" },
    ],
    [params]
  );

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setErrorText("");
          setOpen(true);
        }}
        className={[
          "inline-flex items-center rounded-full border px-4 py-2 text-sm font-semibold backdrop-blur transition",
          isActive
            ? "border-slate-600 bg-slate-900/80 text-white hover:bg-slate-800 hover:border-slate-500"
            : "border-slate-700 bg-slate-900/40 text-slate-300 hover:bg-slate-900/55",
          "disabled:cursor-not-allowed disabled:opacity-60",
          className,
        ].join(" ")}
      >
        Download CSV
      </button>

      <ExportCsvModal
        open={open}
        onClose={() => (loading ? null : setOpen(false))}
        onConfirm={doExport}
        loading={loading}
        details={details}
        confirmText="Download CSV"
        cancelText="Cancel"
      />

      {/* Сообщение об ошибке — без вторых окон и без Next overlay */}
      {open && errorText ? (
        <div className="fixed inset-x-0 bottom-6 z-50 flex justify-center px-4">
          <div className="w-full max-w-md rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700 shadow-sm">
            {errorText}
          </div>
        </div>
      ) : null}
    </>
  );
}
