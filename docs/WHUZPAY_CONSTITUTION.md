# Whuzpay Coding Constitution (Engineering Rules)

> Dokumen ini adalah "aturan main" agar implementasi Whuzpay konsisten, scalable, dan mudah dirawat.

---

## 1) Core Principles

### 1.1 Clean Separation of Concerns
- UI tidak boleh contain business logic transaksi.
- Route handler tidak boleh contain logic selain:
  - parse input
  - validate
  - call service
  - return response

### 1.2 Service Layer First
Semua logic transaksi ada di service/usecase.

Contoh:
- `CreateCheckoutService`
- `HandlePakasirWebhookService`
- `ExecuteProviderPurchaseJobService`

### 1.3 Ports & Adapters
Semua external system harus lewat port:
- Payment Gateway
- Provider PPOB
- Queue
- Repositories (DB)

Tidak boleh:
- service langsung import SDK provider atau SDK payment.

### 1.4 Deterministic & Testable
- Semua service harus bisa dites tanpa DB nyata:
  - gunakan repository mock
  - provider mock
  - payment mock

---

## 2) Rules for Transactions (Non-Negotiable)

### 2.1 Idempotency
- Semua webhook harus idempotent.
- Semua purchase provider harus idempotent.
- Semua job queue harus idempotent.

### 2.2 Never Execute Provider in HTTP Request
- Provider purchase **selalu** di worker queue.
- Request checkout hanya create order & payment invoice.

### 2.3 State Machine Discipline
Order status hanya boleh berubah sesuai flow:

```text
CREATED → WAITING_PAYMENT → PAID → PROCESSING_PROVIDER → SUCCESS
CREATED → WAITING_PAYMENT → EXPIRED
PAID → PROCESSING_PROVIDER → FAILED
FAILED → REFUNDED (wallet)
```

Tidak boleh:
- lompat status tanpa alasan.

### 2.4 Provider Logs
Semua request/response provider wajib dicatat di `ProviderLog`.

---

## 3) Wallet Rules

### 3.1 Ledger is Source of Truth
- Saldo wallet di tabel `Wallet.balance` hanya untuk quick read.
- Audit/trace selalu pakai `LedgerEntry`.

### 3.2 HOLD First, Finalize Later
Saat transaksi wallet:
1) HOLD saldo
2) execute provider
3) SUCCESS → DEBIT finalize
4) FAILED → RELEASE

Tidak boleh:
- langsung debit sebelum provider sukses.

---

## 4) Guest Checkout Rules

### 4.1 Guest cannot use Wallet
Guest hanya bisa payment gateway.

### 4.2 Guest order access is tokenized
- `order_code` public
- `view_token` secret
- DB simpan `view_token_hash`

Tidak boleh:
- expose order detail hanya dengan order_code.

---

## 5) Environment Switching Rules

### 5.1 Provider switching must be explicit
- Digiflazz dan VIP punya mode masing-masing:
  - `mock`
  - `real`

### 5.2 Mock must simulate reality
Mock provider wajib bisa:
- pending
- delay
- failure
- success
- retry scenario

---

## 6) Webhook Rules

### 6.1 Payment Gateway Webhook
- Always verify:
  - `order_id`
  - `amount`
  - `status`
- Always cross-check:
  - call `detailPayment(order_id, amount)` untuk final confirm (Pakasir recommended)

### 6.2 Provider Webhook
- validate signature jika ada
- idempotent
- update order state

---

## 7) Validation Rules

### 7.1 Zod Everywhere
- Semua input request harus Zod validated.
- Semua service input harus typed.

### 7.2 Normalize Inputs
- noHP: normalisasi `08xxx` → `628xxx`
- gameID/server: validate numeric / format
- PLN: validate length

---

## 8) Error Handling Rules

### 8.1 No leaking internal errors
- response ke client: error friendly
- detail error disimpan di logs

### 8.2 Domain Errors
Gunakan error class:
- `ValidationError`
- `InsufficientBalanceError`
- `ProviderDownError`
- `PaymentNotCompletedError`

---

## 9) Logging Rules

### 9.1 Structured Logs
- log JSON
- include:
  - orderId
  - provider
  - paymentMethod
  - userId (if any)

### 9.2 Never log secrets
Tidak boleh log:
- API keys
- view_token
- password hash

---

## 10) Naming Conventions

### 10.1 Files
- `kebab-case.ts`
- folder: `lowercase`

### 10.2 Services
- `create-checkout.service.ts`
- `execute-provider-purchase.job.ts`

### 10.3 DB
- table: PascalCase model Prisma
- fields: camelCase

---

## 11) Git Rules (Recommended)
- Conventional commits:
  - `feat:`
  - `fix:`
  - `refactor:`
  - `chore:`
- Branch:
  - `feature/...`
  - `hotfix/...`

---

## 12) Definition of Done
Sebuah fitur dianggap selesai kalau:
- flow sukses jalan
- flow gagal tertangani
- idempotency aman
- status machine benar
- logs tersedia
- mock mode bisa simulate

---

**This constitution is the guardrail. No exceptions.**
