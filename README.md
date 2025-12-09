📊 PSP Dashboard — Admin Panel for CryptoPay PSP Core

Frontend dashboard for the internal operations of a Swiss-grade crypto payment processor (PSP).
The panel connects to the psp-core backend and displays invoices, payment statuses, AML results and basic network/transaction data.

It is intended as an internal tool for operator / compliance / partner who processes crypto payments via CryptoPay.

✅ Current Status (MVP)

Currently implemented:

/invoices page — main invoices table:

Invoice ID (with link to hosted payment page)

Created & expires timestamps

Fiat and stablecoin amount (EUR / USDT)

Status: waiting, confirmed, expired, rejected

AML status: clean, warning, risky (if available)

Network / tx hash (if transaction is attached)

Header banner with PSP Core API connectivity info

Backend-driven filtering & pagination via query params:

status filter (waiting, confirmed, …)

limit, offset for pagination

Responsive dark fintech UI (Next.js + Tailwind)

The project is ready for demo to investors / partners when used together with the psp-core backend.

🧩 Tech Stack

Next.js 15 (App Router, src/app)

React 19

TypeScript

Tailwind CSS (global styles + utility classes)

Async requests to backend via fetch and a small pspApi helper

📁 Project Structure

Key files:

psp-dashboard/
├─ src/
│ ├─ app/
│ │ ├─ layout.tsx # Global layout (theme, fonts, background)
│ │ └─ invoices/
│ │ └─ page.tsx # Main invoices page
│ ├─ components/
│ │ └─ FiltersBar.tsx # Filters / controls bar
│ └─ lib/
│ └─ pspApi.ts # Client for psp-core API
├─ package.json
├─ tsconfig.json
└─ README.md # This file

🔧 Requirements

Node.js 20+

npm / pnpm / yarn (examples use npm)

Running psp-core backend (NestJS), accessible locally or over the network

⚙️ Environment Setup

Create .env.local in the project root and set the base URL of PSP Core API:

NEXT_PUBLIC_PSP_CORE_API_BASE_URL=http://localhost:3000

If the backend is hosted elsewhere (Render / Railway / custom domain):

NEXT_PUBLIC_PSP_CORE_API_BASE_URL=https://psp-core.your-domain.com

🚀 Run Locally

# 1. Install dependencies

npm install

# 2. Start dev server

npm run dev

By default, Next.js exposes the app at:

http://localhost:3000

Main dashboard page:

http://localhost:3000/invoices

🔌 Backend Integration (psp-core)

The frontend expects the psp-core backend to expose:

GET /invoices
Query parameters:

status (optional) — filter (waiting, confirmed, expired, rejected)

limit (optional) — page size (default 100)

offset (optional) — pagination offset

Response: array of Invoice objects:

{
"id": "inv*...",
"createdAt": "2025-12-07T09:33:31.822Z",
"expiresAt": "2025-12-07T09:48:31.822Z",
"fiatAmount": 150,
"fiatCurrency": "EUR",
"cryptoAmount": 150,
"cryptoCurrency": "USDT",
"status": "confirmed",
"paymentUrl": "https://demo.your-cryptopay.com/open/pay/inv*...",
"network": "ETH",
"txHash": "0x....",
"walletAddress": "0x....",
"riskScore": 10,
"amlStatus": "clean",
"merchantId": null
}

All API calls are encapsulated in src/lib/pspApi.ts.

🖥 How to Use the Dashboard

Ensure the psp-core backend is running and reachable at the URL defined in .env.local.

Start the frontend (npm run dev) and open /invoices.

The table will display:

list of invoices,

creation & expiration times,

amounts & currencies,

status,

AML results (if any),

network / transaction data (if any).

Filtering by status and pagination are controlled via FiltersBar (will be extended in next steps).

🛣 Roadmap for Frontend

Planned improvements on the path to a production-ready PSP dashboard:

Advanced Filters:

date range (from / to);

AML status filter (clean, warning, risky);

search by invoice ID / merchantId.

Invoice Details Page:

dedicated /invoices/[id] page with full data;

webhook event history per invoice;

“force dispatch webhooks” button.

Merchant Mode:

show only invoices for a specific merchant;

basic auth (token / API key).

UI/UX Enhancements:

skeletons, loading and error states;

dark/light mode toggle;

better mobile / tablet layout.

This dashboard is a showcase for partners and investors, demonstrating how an operator’s workspace of a Swiss crypto PSP may look and function.
