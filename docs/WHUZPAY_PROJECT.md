# Whuzpay — PPOB + Topup Game (Next.js Fullstack)

> **Goal:** Website PPOB + Topup Game dengan mode **Guest Checkout** dan **Member Wallet**, integrasi provider **Digiflazz** + **VIP Reseller**, payment gateway **Pakasir**, dan pola arsitektur yang rapi:  
> **Service Layer Pattern**, **Environment-based Service Switching**, **Mock Simulation for Development**, **Webhook Simulation**, **Clean Separation of Concerns**.

---

## 1) Tech Stack

### Core
- **Next.js (App Router)**
- **TypeScript**
- **MySQL**
- **Prisma ORM**

### Infrastructure
- **Redis** (BullMQ queue)
- **BullMQ** (jobs untuk eksekusi transaksi provider)

### External Integrations
- **Payment Gateway:** Pakasir  
  - SDK: `pakasir-sdk`  
  - Webhook: payment status callback  
- **Provider PPOB:** Digiflazz + VIP Reseller  
  - `inquiry → purchase → checkStatus → webhook(optional)`

---

## 2) Product Requirements

### A. Guest Checkout (Tanpa Login)
- Bisa:
  - Lihat katalog produk
  - Checkout produk
  - Bayar via **Payment Gateway (Pakasir)**
  - Lihat status transaksi via **order_code + view_token**
- Tidak bisa:
  - Pakai wallet
  - Lihat histori transaksi (kecuali via link order)

### B. Member (Login)
- Bisa:
  - Semua fitur guest
  - Bayar via **Wallet**
  - Lihat histori transaksi
  - Lihat saldo + ledger
  - Deposit saldo (MVP: manual admin, Next: PG topup wallet)

---

## 3) Transaction Flow (High Level)

### A. Guest → Payment Gateway
```text
Pilih produk → input target → checkout
→ create invoice Pakasir → user bayar
→ Pakasir webhook (completed) → order PAID
→ enqueue job: execute provider purchase
→ provider result → SUCCESS / FAILED / PENDING
→ guest cek status pakai order_code + view_token
```

### B. Member → Wallet
```text
Pilih produk → input target → checkout
→ wallet HOLD (reserve)
→ enqueue job: execute provider purchase
→ SUCCESS: finalize debit
→ FAILED: release hold
```

---

## 4) Key Architecture Patterns

### A. Service Layer Pattern
- Route handler hanya:
  - parse input
  - validate (Zod)
  - call service/usecase
  - return response
- Semua business logic ada di `core/services`

### B. Clean Separation of Concerns
- `core/` = domain + usecase
- `infra/` = implementasi nyata (DB, provider, payment, queue)

### C. Environment-based Service Switching
Provider bisa switch per env:

| Env | Digiflazz | VIP | Notes |
|---|---|---|---|
| local | mock | mock | no provider balance cut |
| staging | mock/real | mock/real | configurable |
| production | real | real | real transactions |

Env var:
- `PROVIDER_DIGIFLAZZ_MODE=mock|real`
- `PROVIDER_VIP_MODE=mock|real`

### D. Mock Simulation for Development
Mock harus bisa:
- success / failed / pending
- delay random
- pending_then_success
- deterministic mode (optional)

Env var:
- `MOCK_PROVIDER_SCENARIO=random|success|failed|pending_then_success`
- `MOCK_PROVIDER_DELAY_MS=1500`

### E. Webhook Simulation
- Dev mode bisa simulate:
  - webhook payment Pakasir
  - webhook provider

---

## 5) Folder Structure (Recommended)

```
src/
  app/
    api/
      checkout/
      orders/
      webhooks/
        payment/
        provider/
    (ui routes)
  core/
    domain/
      entities/
      enums/
      errors/
    ports/
      payment-gateway.port.ts
      provider.port.ts
      queue.port.ts
    services/
      checkout/
      payment/
      provider/
      wallet/
  infra/
    db/
      prisma.ts
      repositories/
    payment/
      pakasir/
        pakasir.adapter.ts
    providers/
      digiflazz/
        digiflazz.adapter.ts
      vip/
        vip.adapter.ts
      mock/
        mock-provider.adapter.ts
      provider.factory.ts
    queue/
      bullmq/
        queue.ts
        worker.ts
        jobs.ts
  lib/
    auth/
    security/
    zod/
```

---

## 6) Core Modules (MVP)

### 6.1 Catalog
- `GET /api/products`

### 6.2 Checkout
- `POST /api/checkout`
  - guest: PG only
  - member: PG or wallet

### 6.3 Order Status
- `GET /api/orders/:code?token=...`

### 6.4 Webhooks
- `POST /api/webhooks/payment` (Pakasir)
- `POST /api/webhooks/provider/digiflazz`
- `POST /api/webhooks/provider/vip`

### 6.5 Wallet
- `GET /api/wallet`
- `GET /api/wallet/ledger`

---

## 7) Database (MVP Entities)

### Must Have
- User
- Wallet
- LedgerEntry
- Product
- Order (Transaction)
- PaymentInvoice
- WebhookEvent
- ProviderLog

---

## 8) Status Lifecycle

### Order Status (recommended)
- `CREATED`
- `WAITING_PAYMENT`
- `PAID`
- `PROCESSING_PROVIDER`
- `SUCCESS`
- `FAILED`
- `EXPIRED`
- `REFUNDED`

### Wallet Ledger Types
- `HOLD`
- `DEBIT`
- `CREDIT`
- `RELEASE`
- `REFUND`

---

## 9) Security Baseline
- HTTPS in production
- Rate limit:
  - `/api/checkout`
  - `/api/orders/:code`
  - `/api/auth/*`
- Webhook idempotency:
  - store `eventId` in `WebhookEvent`
- Store `viewToken` **hashed**
- Validate:
  - `order_id` and `amount` match
  - status confirmed via Pakasir `detailPayment` (recommended by Pakasir docs)

---

## 10) Environment Variables (Example)

```env
APP_ENV=local

DATABASE_URL="mysql://user:pass@localhost:3306/whuzpay"

# Pakasir
PAKASIR_SLUG="your_project_slug"
PAKASIR_API_KEY="your_api_key"

# Providers mode
PROVIDER_DIGIFLAZZ_MODE=mock
PROVIDER_VIP_MODE=mock

# Mock behavior
MOCK_PROVIDER_SCENARIO=pending_then_success
MOCK_PROVIDER_DELAY_MS=1500

# Redis
REDIS_URL="redis://localhost:6379"
```

---

## 11) Development Milestones

### Milestone 1 — Skeleton
- Next.js App Router
- Prisma + MySQL
- Auth (member)
- Catalog API

### Milestone 2 — Checkout + PG
- Create order
- Create invoice Pakasir
- Order status page

### Milestone 3 — Webhooks + Queue
- Webhook Pakasir → mark paid
- BullMQ worker → execute provider purchase (mock)

### Milestone 4 — Providers
- Digiflazz adapter
- VIP adapter
- Provider factory + switching

### Milestone 5 — Wallet
- Wallet reserve/hold
- finalize debit / release
- ledger page

### Milestone 6 — Admin (basic)
- product CRUD
- pricing rules
- manual wallet topup

---

## 12) Notes
- **Guest orders**: harus punya `order_code + view_token` untuk akses status.
- Provider execution wajib via queue (avoid timeout).
- Semua handler webhook harus idempotent.

---

**Let’s build this clean from zero.**
