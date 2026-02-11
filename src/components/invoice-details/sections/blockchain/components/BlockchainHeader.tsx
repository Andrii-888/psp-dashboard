"use client";

type BlockchainBusinessStatus = "paid" | "aml_failed" | "under_review";

type Props = {
  status: BlockchainBusinessStatus;
};

function getStatusUi(status: BlockchainBusinessStatus): {
  label: string;
  className: string;
  dotClassName: string;
} {
  if (status === "paid") {
    return {
      label: "Paid",
      className:
        "bg-emerald-500/10 text-emerald-200 ring-1 ring-emerald-400/30",
      dotClassName: "bg-emerald-400",
    };
  }

  if (status === "aml_failed") {
    return {
      label: "AML failed",
      className: "bg-rose-500/10 text-rose-200 ring-1 ring-rose-400/30",
      dotClassName: "bg-rose-400",
    };
  }

  // under_review
  return {
    label: "Under review",
    className: "bg-slate-500/10 text-slate-200 ring-1 ring-slate-400/30",
    dotClassName: "bg-slate-300",
  };
}

export function BlockchainHeader({ status }: Props) {
  const ui = getStatusUi(status);

  return (
    <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
      <div>
        <h2 className="section-title">Blockchain transaction</h2>
      </div>

      <div className="flex items-center">
        <span
          className={[
            "inline-flex items-center gap-2 rounded-full px-3 py-1",
            "text-[11px] font-medium tracking-wide",
            ui.className,
          ].join(" ")}
        >
          <span
            className={["h-1.5 w-1.5 rounded-full", ui.dotClassName].join(" ")}
          />
          {ui.label}
        </span>
      </div>
    </div>
  );
}
