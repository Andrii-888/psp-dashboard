PSP Dashboard
Internal Admin Panel for CryptoPay PSP Core
Internal operations dashboard for a Swiss-grade crypto payment processor (PSP).
The dashboard connects to the psp-core backend and provides full operational and compliance visibility across the entire crypto payment lifecycle.
Designed for PSP operators, compliance officers, licensed partners, and auditors.
🎯 Purpose of the Dashboard
PSP Dashboard is not a merchant UI.
It is an internal control and compliance panel that demonstrates how a real crypto PSP operates.
The dashboard shows, end-to-end:
how crypto payments are received and tracked
how AML & sanctions screening is applied
how risk decisions depend on amount tiers and policies
how and when human operators intervene
how all actions are logged and auditable
This is the primary interface used in partner, regulator, and investor presentations.
🏗 System Architecture (3 Core Projects)
1️⃣ psp-core — Backend (NestJS)
Single source of truth for all payment and compliance data.
Handles:
invoice creation, lifecycle & expiration
fiat / crypto amount calculation
blockchain transaction detection & storage
AML & sanctions screening
risk & compliance decision logic
operator actions (approve / hold / reject)
webhook generation, retries & delivery
Exposes APIs for:
PSP Dashboard (internal)
CryptoPay Payment Page (public)
Merchant APIs (future)
2️⃣ CryptoPay Frontend — Payment Page (Public)
What the end customer sees.
Responsibilities:
load invoice from psp-core
display amount, wallet address, network
show countdown until expiration
auto-refresh payment status
redirect after success / failure
Security model:
no admin access
no compliance logic
read-only access to PSP Core
3️⃣ PSP Dashboard — Internal Admin Panel (Next.js)
What operators and compliance teams use.
Provides visibility into:
invoice list & lifecycle
AML & sanctions results
blockchain transactions
webhook delivery logs
operator actions
compliance decisions & audit trail
🔗 End-to-End Flow
Merchant shop
→ creates invoice via PSP
→ redirects buyer to CryptoPay Payment Page
CryptoPay Payment Page
→ buyer sends crypto
→ PSP Core detects transaction
→ AML & sanctions checks
→ risk decision applied
→ webhooks sent to merchant
PSP Dashboard
→ monitors invoice lifecycle
→ flags risky cases
→ allows manual compliance actions
→ provides full audit trail
✅ Current Status (MVP)
✔ /invoices — Invoice List
Displays:
Invoice ID (click → details)
Created / expires timestamps
Fiat & crypto amounts
Status: waiting / confirmed / expired / rejected
AML status & risk score
Network / wallet / txHash (if detected)
Summary counters (based on filtered list):
Total
Confirmed
Waiting
High-risk
Live updates:
polling every 3 seconds
no UI flicker
sound notification on new invoices
✔ Filtering (Frontend-only)
Filters apply locally, without extra API calls:
Status
AML status
Invoice ID search
Min / max fiat amount
Date presets
Wallet / txHash / merchant search
✔ Invoice Details /invoices/[id] — Compliance Case File
Each invoice is treated as a compliance case.
Blocks:
Overview
Amounts, merchant, timestamps, payment URL
Blockchain
Network, wallet, txHash, confirmations
(manual attach in dev/demo mode only)
AML & Sanctions
AML status, risk score, asset risk
Operator Actions
Approve / Reject / Expire
Webhooks
Event history, retries, manual re-dispatch
🛡 AML & Sanctions Logic (Conceptual Model)
Dual-Layer Screening
1️⃣ Merchant-level rules
Defined by the merchant:
accepted assets
allowed countries
transaction limits
blacklist rules
2️⃣ PSP-level compliance (mandatory)
Applied independently by the PSP:
wallet screening
transaction typology analysis
asset & network risk
sanctions exposure
internal blacklists
➡️ Even if a merchant allows a payment,
➡️ the PSP may approve, hold, or reject it.
⚖ Risk & Amount-Based Decisions (Policy-Driven)
The dashboard demonstrates policy tiers, not legal thresholds.
Tier Example Logic Result
Tier 0 Small amount, clean wallet Auto approve
Tier 1 Medium amount Enhanced screening
Tier 2 Large amount HOLD → manual review / KYC
Tier 3 Sanctions / high risk Reject & escalate
For each invoice the dashboard shows:
compliance decision
reason / rule triggered
required next action
All decisions are timestamped and auditable.
🧠 Why This Dashboard Is Strong
✔ Shows real PSP operations, not just UI
✔ Compliance-first architecture
✔ Clear separation of merchant vs PSP responsibility
✔ Scales naturally to real AML providers
✔ Easy to map to Swiss / EU regulatory requirements
✔ Clear operator workflow
✔ Easy to explain to partners, banks, and auditors
🧩 Tech Stack
Frontend: Next.js 15 (App Router), React 19, TypeScript
Styling: Tailwind CSS
Backend: External psp-core (NestJS)
Data access: Fetch API + custom pspApi client
🛣 Roadmap (Next Steps)
Phase 1 — Compliance UX
Risk decision block on invoice
Sanctions flags (structured mock)
HOLD / REVIEW states
Operator audit log
Phase 2 — Automation
Automatic blockchain transaction detection
Automatic confirmations
Remove manual tx attach (production)
Phase 3 — Real AML Providers
Chainalysis / Elliptic / Scorechain
Provider reason codes
Provider-specific dashboards
Phase 4 — Merchant Console
Restricted merchant access
Own invoices only
Settlements & reports
