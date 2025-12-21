PSP Dashboard — Internal Admin Panel for CryptoPay PSP Core

Internal operations dashboard for a Swiss-grade crypto payment processor (PSP).
The dashboard connects to the psp-core backend and provides full visibility into invoices, payments, AML & sanctions checks, blockchain data, and webhook delivery.

Designed for operators, compliance officers, and licensed partners.

🎯 Purpose of the Dashboard

PSP Dashboard is not a merchant UI.
It is an internal control panel that demonstrates:

how crypto payments are received and processed

how AML & sanctions screening is applied

how risk decisions depend on amounts and policies

how operators intervene only when required

how compliance actions are logged and auditable

This is the core tool shown during partner / regulator / investor presentations.

🏗 System Architecture (3 Projects)
1️⃣ psp-core — Backend (NestJS)

Single source of truth for all payments.

Handles:

invoice creation & expiration

fiat / crypto amounts

blockchain transaction storage

AML & sanctions checks

risk decision logic

webhook generation & delivery

operator actions (confirm / reject / hold)

Exposes API for:

PSP Dashboard (internal)

CryptoPay Payment Page (public)

Merchant APIs (future)

2️⃣ CryptoPay Frontend — Payment Page (Public)

What the end customer sees.

Responsibilities:

load invoice from psp-core

show amount, wallet, network

countdown until expiration

auto-refresh payment status

redirect after payment

Security:

no admin access

no compliance logic

read-only from PSP Core

3️⃣ PSP Dashboard — Internal Admin Panel (Next.js)

What operators & compliance use.

Shows:

invoice list & statuses

AML & sanctions results

blockchain data

webhook logs

operator actions

compliance decisions

🔗 End-to-End Flow

Merchant shop
→ creates invoice via PSP
→ redirects buyer to CryptoPay Payment Page

CryptoPay Payment Page
→ buyer sends crypto
→ PSP Core detects transaction
→ AML & sanctions checks
→ risk decision
→ webhooks sent to merchant

PSP Dashboard
→ monitors invoice lifecycle
→ flags risky cases
→ allows manual compliance actions
→ provides audit trail

✅ Current Status (MVP)
✔ /invoices — Invoice List

Shows:

Invoice ID (click → details)

Created / expires timestamps

Fiat & crypto amounts

Status: waiting / confirmed / expired / rejected

AML status + risk score

Network / txHash / wallet (if detected)

Summary counters (filtered):

Total

Confirmed

Waiting

High-risk

Live updates every 3 seconds (without UI flicker)

Sound notification on new invoice

✔ Filtering (Frontend-only)

Filters applied locally, no extra API calls:

Status

AML status

Invoice ID search

Min / max fiat amount

Date preset

Wallet / txHash / merchant search

✔ Invoice Details /invoices/[id] — “Case File”

Each invoice is treated as a compliance case.

Blocks:

Overview
Amounts, merchant, timestamps, payment URL

Blockchain
Network, wallet, txHash, confirmations
(manual attach only in dev/demo mode)

AML & Sanctions
AML status, risk score, asset risk

Operator Actions
Confirm / Reject / Expire

Webhooks
Event history, retries, manual re-dispatch

🛡 AML & Sanctions Logic (Concept)
Dual-layer screening

1️⃣ Merchant-level rules
Each merchant may define its own restrictions:

accepted assets

allowed countries

transaction limits

blacklist rules

2️⃣ PSP-level compliance (mandatory)
PSP applies its own independent checks, regardless of merchant rules:

wallet screening

transaction screening

asset risk

sanctions exposure

internal blacklists

➡️ Even if merchant allows the payment,
➡️ PSP may block, hold or escalate the invoice.

⚖ Risk & Amount-Based Decisions (Policy-driven)

Dashboard demonstrates policy tiers, not legal thresholds:

Tier Example Logic Result
Tier 0 Small amount, clean wallet Auto approve
Tier 1 Medium amount Enhanced screening
Tier 2 Large amount HOLD → KYC / manual review
Tier 3 Sanctions / high-risk Reject & escalate

Each invoice shows:

Risk decision

Reason / rule hit

Required next action

All decisions are logged for audit.

🧠 Why This Dashboard Is Strong

✔ Shows real PSP operations, not just UI
✔ Demonstrates compliance-first architecture
✔ Separates merchant logic from PSP responsibility
✔ Scales to real AML providers
✔ Easy to map to Swiss / EU regulatory requirements
✔ Clear operator workflow
✔ Easy to explain to partners & auditors

🧩 Tech Stack

Frontend: Next.js 15 (App Router), React 19, TypeScript

Styling: Tailwind CSS

Backend: External psp-core (NestJS)

Data access: Fetch API + custom pspApi client

🛣 Roadmap (Next Steps)
Phase 1 — Compliance UX (next)

Risk decision block on invoice

Sanctions flags (mocked but structured)

HOLD / REVIEW states

Operator audit log

Phase 2 — Automation

Auto blockchain tx detection

Auto confirmations

Remove manual tx attach (prod)

Phase 3 — Real AML Providers

Chainalysis / Elliptic / Scorechain

Provider reason codes

Provider-specific dashboards

Phase 4 — Merchant Console

Restricted access

Own invoices only

Settlement & reports
