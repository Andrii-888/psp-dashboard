"use client";

import { useMemo } from "react";

// ---- JSON pretty with "jq-like" coloring ----
function classifyToken(token: string) {
  if (token === "null") return "null";
  if (token === "true" || token === "false") return "bool";
  if (/^-?\d+(\.\d+)?([eE][+-]?\d+)?$/.test(token)) return "num";
  return "plain";
}

export default function JsonPretty({ value }: { value: unknown }) {
  const json = useMemo(() => {
    try {
      return JSON.stringify(value, null, 2) ?? "";
    } catch {
      return String(value ?? "");
    }
  }, [value]);

  const parts = useMemo(() => {
    const out: Array<{ t: string; k: string }> = [];
    const re =
      /("(?:\\.|[^"\\])*")(\s*:)?|(\bnull\b|\btrue\b|\bfalse\b)|(-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?)|([{}\[\],:])/g;

    let last = 0;
    let m: RegExpExecArray | null;

    while ((m = re.exec(json)) !== null) {
      if (m.index > last) {
        out.push({ t: json.slice(last, m.index), k: "plain" });
      }

      const str = m[1];
      const isKeyColon = m[2];
      const lit = m[3];
      const num = m[4];
      const punc = m[5];

      if (str) {
        if (isKeyColon) {
          out.push({ t: str, k: "key" });
          out.push({ t: ":", k: "punc" });
        } else {
          out.push({ t: str, k: "str" });
        }
      } else if (lit) {
        out.push({ t: lit, k: classifyToken(lit) });
      } else if (num) {
        out.push({ t: num, k: "num" });
      } else if (punc) {
        out.push({ t: punc, k: "punc" });
      }

      last = re.lastIndex;
    }

    if (last < json.length) out.push({ t: json.slice(last), k: "plain" });
    return out;
  }, [json]);

  return (
    <pre className="mt-3 overflow-x-auto rounded-xl border border-zinc-900/10 bg-zinc-950 p-3 text-[12px] leading-5 shadow-inner">
      {parts.map((p, i) => (
        <span
          key={i}
          className={
            p.k === "key"
              ? "text-sky-300"
              : p.k === "str"
              ? "text-emerald-300"
              : p.k === "num"
              ? "text-amber-300"
              : p.k === "null"
              ? "text-zinc-400"
              : p.k === "bool"
              ? "text-purple-300"
              : p.k === "punc"
              ? "text-zinc-200"
              : "text-zinc-200"
          }
        >
          {p.t}
        </span>
      ))}
    </pre>
  );
}
