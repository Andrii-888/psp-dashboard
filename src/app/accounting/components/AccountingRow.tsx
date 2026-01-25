// src/app/accounting/components/AccountingRow.tsx

import type { AccountingEntryRaw } from "../lib/types";
import { fmtDate, fmtMoney, shortId, toNumber } from "../lib/format";
import { getAddressUrl, getTxUrl } from "../lib/explorer";

export default function AccountingRow({
  entry,
}: {
  entry: AccountingEntryRaw;
}) {
  const gross = toNumber(entry.grossAmount, 0);
  const fee = toNumber(entry.feeAmount, 0);
  const net = toNumber(entry.netAmount, 0);

  const deposit = entry.depositAddress;
  const sender = entry.senderAddress ?? "";
  const tx = entry.txHash ?? "";

  const depositUrl = deposit ? getAddressUrl(entry.network, deposit) : null;
  const senderUrl = sender ? getAddressUrl(entry.network, sender) : null;
  const txUrl = tx ? getTxUrl(entry.network, tx) : null;

  return (
    <>
      {/* Created */}
      <td className="px-4 py-3 font-mono text-xs text-zinc-500">
        {fmtDate(entry.createdAt)}
      </td>

      {/* Invoice */}
      <td className="px-4 py-3 font-mono text-sm text-zinc-900">
        {entry.invoiceId}
      </td>

      {/* Event */}
      <td className="px-4 py-3 font-mono text-xs text-zinc-600">
        {entry.eventType}
      </td>

      {/* Gross */}
      <td className="px-4 py-3 text-right font-mono text-sm tabular-nums text-zinc-900">
        {gross ? fmtMoney(gross) : "—"}
      </td>

      {/* Fee */}
      <td className="px-4 py-3 text-right font-mono text-sm tabular-nums text-zinc-700">
        {fee ? fmtMoney(fee) : "—"}
      </td>

      {/* Net */}
      <td className="px-4 py-3 text-right font-mono text-sm tabular-nums text-zinc-900">
        {net ? fmtMoney(net) : "—"}
      </td>

      {/* Asset */}
      <td className="px-4 py-3 font-mono text-sm text-zinc-800">
        {entry.currency}
      </td>

      {/* Network */}
      <td className="px-4 py-3 font-mono text-sm text-zinc-600">
        {entry.network}
      </td>

      {/* Deposit */}
      <td className="px-4 py-3 font-mono text-xs text-zinc-600">
        {deposit ? (
          depositUrl ? (
            <a
              href={depositUrl}
              target="_blank"
              rel="noreferrer"
              className="text-sky-600 hover:text-sky-700 hover:underline"
              title={deposit}
            >
              {shortId(deposit, 8, 6)}
            </a>
          ) : (
            <span title={deposit}>{shortId(deposit, 8, 6)}</span>
          )
        ) : (
          "—"
        )}
      </td>

      {/* Sender */}
      <td className="px-4 py-3 font-mono text-xs text-zinc-600">
        {sender ? (
          senderUrl ? (
            <a
              href={senderUrl}
              target="_blank"
              rel="noreferrer"
              className="text-sky-600 hover:text-sky-700 hover:underline"
              title={sender}
            >
              {shortId(sender, 8, 6)}
            </a>
          ) : (
            <span title={sender}>{shortId(sender, 8, 6)}</span>
          )
        ) : (
          "—"
        )}
      </td>

      {/* Tx */}
      <td className="px-4 py-3 font-mono text-xs text-zinc-600">
        {tx ? (
          txUrl ? (
            <a
              href={txUrl}
              target="_blank"
              rel="noreferrer"
              className="text-sky-600 hover:text-sky-700 hover:underline"
              title={tx}
            >
              {shortId(tx, 8, 6)}
            </a>
          ) : (
            <span title={tx}>{shortId(tx, 8, 6)}</span>
          )
        ) : (
          "—"
        )}
      </td>
    </>
  );
}
