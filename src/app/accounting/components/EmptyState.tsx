export default function EmptyState({
  title = "No entries yet",
  description = "Accounting entries will appear here once invoices are created and confirmed.",
}: {
  title?: string;
  description?: string;
}) {
  return (
    <div className="mt-6 rounded-xl border border-zinc-200 bg-white p-6">
      <div className="text-sm font-semibold text-zinc-900">{title}</div>

      <div className="mt-1 text-sm text-zinc-600">{description}</div>
    </div>
  );
}
