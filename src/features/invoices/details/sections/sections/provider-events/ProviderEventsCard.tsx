"use client";

import type { ProviderEvent } from "@/shared/api/pspApi";
import { formatDateTimeCH } from "@/shared/lib/formatters";
import { CopyButton } from "@/shared/ui/components/CopyButton";

interface Props {
  events: ProviderEvent[];
  loading: boolean;
}

export function ProviderEventsCard({ events, loading }: Props) {
  return (
    <div className="space-y-4">
      {loading ? (
        <p className="text-xs text-slate-400">Loading provider events…</p>
      ) : events.length === 0 ? (
        <p className="text-xs text-slate-500">
          No provider events yet. This section will populate when the payment
          provider emits lifecycle callbacks.
        </p>
      ) : (
        <table className="min-w-full border-separate border-spacing-y-1 text-[11px]">
          <thead>
            <tr className="text-[10px] font-medium uppercase tracking-[0.16em] text-slate-500">
              <th className="px-2 py-1 text-left">Provider</th>
              <th className="px-2 py-1 text-left">Event</th>
              <th className="px-2 py-1 text-left">External ID</th>
              <th className="px-2 py-1 text-left">Received</th>
            </tr>
          </thead>

          <tbody>
            {events.map((ev, idx) => (
              <tr
                key={`${ev.provider}-${ev.externalId ?? idx}`}
                className="rounded-2xl bg-slate-900/60 text-slate-200 shadow-[0_10px_30px_rgba(0,0,0,0.55)]"
              >
                <td className="px-2 py-2">{ev.provider}</td>
                <td className="px-2 py-2">{ev.eventType}</td>

                <td className="px-2 py-2">
                  {ev.externalId ? (
                    <div className="flex items-center gap-2">
                      <span className="block max-w-56 truncate font-mono text-slate-300">
                        {ev.externalId}
                      </span>
                      <CopyButton value={ev.externalId} size="sm" />
                    </div>
                  ) : (
                    <span className="text-slate-500">—</span>
                  )}
                </td>

                <td className="px-2 py-2 text-slate-400">
                  {formatDateTimeCH(ev.receivedAt)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
