📊 PSP Dashboard — Admin Panel for CryptoPay PSP Core

A frontend dashboard for internal operations of a Swiss-grade crypto payment processor (PSP).
The dashboard connects to psp-core backend and displays invoices, payment statuses, AML results, blockchain data, and webhook events.

Designed as an internal tool for operators, compliance officers and partners working with CryptoPay.

✅ Current Status (MVP)
✔ /invoices — main invoices table

Displays:

Invoice ID + link to payment page

Created / expires timestamps

Fiat & crypto amount (EUR / CHF / USDT)

Status (waiting / confirmed / expired / rejected)

AML results

Network / tx hash / wallet

Summary counters

“Open payment page” button

✔ Filtering & search

status filter

AML filter

ID search

min/max fiat amount

reactive updates

✔ Invoice Details Page

Includes:

Overview

AML block

Operator actions (Confirm / Reject / Expire)

Blockchain transaction section

Webhook history + manual dispatch

✔ API Client (pspApi.ts)

Includes:

fetchInvoices

fetchInvoice

runInvoiceAmlCheck

confirmInvoice / rejectInvoice / expireInvoice

attachInvoiceTransaction

fetchInvoiceWebhooks

dispatchInvoiceWebhooks

✔ Fintech-grade UI

Next.js 15

React 19

Tailwind CSS

Apple-like cards

Fully responsive

🧩 Tech Stack

Next.js 15 (App Router)

React 19

TypeScript

Tailwind CSS

Fetch API + custom API client

📁 Project Structure
psp-dashboard/
├─ src/
│ ├─ app/
│ ├─ components/
│ └─ lib/
├─ public/
├─ package.json
├─ tsconfig.json
└─ README.md

🔧 Requirements

Node.js 20+

Running psp-core backend (NestJS)

⚙ Environment Setup

Create:

.env.local

Set backend URL:

NEXT_PUBLIC_PSP_API_URL=http://localhost:3000

For remote server:

NEXT_PUBLIC_PSP_API_URL=https://psp-core.your-domain.com

🚀 Run Locally
npm install
npm run dev

Open:

http://localhost:3000/invoices

🔌 Backend Integration

Expected endpoints:

GET /invoices

GET /invoices/:id

POST /invoices/:id/aml/check

POST /invoices/:id/confirm

POST /invoices/:id/reject

POST /invoices/:id/expire

POST /invoices/:id/tx

GET /invoices/:id/webhooks

POST /invoices/:id/webhooks/dispatch

All handled inside pspApi.ts.

🛣 Roadmap — what’s needed for full production readiness
🔜 1. Real FX / Exchange Rate API

Consistent pricing for USDT → EUR / CHF / USD across CryptoPay and PSP Dashboard.

🔜 2. Blockchain RPC integration

Transaction verification & confirmations.

🔜 3. Real AML provider integration

Chainalysis / Elliptic / Scorechain.

🔜 4. Merchant Console

Separate restricted dashboard for merchants.

🔜 5. Email / Notification system

Notify merchants/operators when invoice status changes.

🔜 6. Advanced filtering

Date range, merchant filter, txHash search, etc.

🔜 7. Production deployment

Vercel (frontend) + Render/Railway (backend).
