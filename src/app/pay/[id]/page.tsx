// src/app/pay/[id]/page.tsx

type PageProps = {
  params: {
    id: string;
  };
};

export default function PayPage({ params }: PageProps) {
  return (
    <main style={{ padding: 24 }}>
      <h1>Invoice payment</h1>

      <p>
        Invoice ID: <b>{params.id}</b>
      </p>

      <p>Redirecting to payment provider…</p>
    </main>
  );
}
