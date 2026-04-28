# Provider Testing Guide

## Setup Complete! ✅

Sistem Provider Management sudah siap untuk testing dengan credentials real:

### Credentials Configuration

**Digiflazz:**
- Username: `wimuhoopZblW`
- API Key: `dev-294c34e0-6e0d-11ec-a55e-03e98f75675f`
- Mode: `real`

**VIP Reseller:**
- API ID: `Pi2G2Ixc`
- API Key: `baad6ab2dc32fd25b1a2f86505260433`
- Sign: `0181bb3f5ded66a1cb45fe50d930e897`
- Mode: `real`

**Database:**
- User: `akbardev`
- Password: `akbardev`
- Database: `whuzpay`

---

## Testing Instructions

### 1. Start Development Server

```bash
npm run dev
```

Server akan berjalan di `http://localhost:3000`

### 2. Initialize Database (Only Once)

Jika database belum ada atau perlu reset:

```bash
# Login MySQL dan create database
mysql -u akbardev -p
# Enter password: akbardev

CREATE DATABASE IF NOT EXISTS whuzpay CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
exit;

# Push schema to database
npx prisma db push
```

### 3. Run Automated Tests

Gunakan test script yang sudah dibuat:

```bash
./test-provider.sh
```

Script ini akan:
- Test Digiflazz (check balance, get products, health check)
- Test VIP Reseller (check balance, get products, health check)
- Get all providers info
- Get all products
- View provider logs

### 4. Manual API Testing

#### A. Test Specific Provider

```bash
# Test Digiflazz
curl -X POST http://localhost:3000/api/admin/providers/test \
  -H "Content-Type: application/json" \
  -d '{
    "provider": "DIGIFLAZZ",
    "operations": ["checkBalance", "getProducts", "healthCheck"]
  }' | jq '.'

# Test VIP Reseller
curl -X POST http://localhost:3000/api/admin/providers/test \
  -H "Content-Type: application/json" \
  -d '{
    "provider": "VIP_RESELLER",
    "operations": ["checkBalance", "getProducts", "healthCheck"]
  }' | jq '.'
```

#### B. Get All Providers Info

```bash
curl http://localhost:3000/api/admin/providers | jq '.'
```

Response example:
```json
{
  "success": true,
  "data": [
    {
      "type": "DIGIFLAZZ",
      "mode": "real",
      "balance": {
        "amount": 1500000,
        "currency": "IDR",
        "lastUpdated": "2026-02-17T..."
      },
      "health": {
        "status": "ONLINE",
        "latency": 420,
        "lastCheck": "2026-02-17T...",
        "message": "Provider is healthy"
      }
    },
    ...
  ]
}
```

#### C. Get Provider Products

```bash
# All providers
curl http://localhost:3000/api/admin/providers/products | jq '.summary'

# Specific provider
curl http://localhost:3000/api/admin/providers/digiflazz/products | jq '.data.products[:5]'

curl http://localhost:3000/api/admin/providers/vip_reseller/products | jq '.data.products[:5]'
```

#### D. View Provider Logs

```bash
# Latest 10 logs
curl "http://localhost:3000/api/admin/providers/logs?limit=10" | jq '.data'

# Filter by provider
curl "http://localhost:3000/api/admin/providers/logs?provider=DIGIFLAZZ&limit=5" | jq '.data'

# Filter by action
curl "http://localhost:3000/api/admin/providers/logs?action=checkBalance&limit=5" | jq '.data'
```

### 5. View in Admin UI

Open browser:
```
http://localhost:3000/admin/providers
```

Features:
- ✅ Real-time balance monitoring
- ✅ Health status & latency
- ✅ Mode indicator (Mock/Real)
- ✅ Product listing with filter
- ✅ Refresh button
- ✅ Responsive design

---

## What Gets Logged to Database

Every provider operation is automatically logged:

### ProviderLog Table
- Provider name (DIGIFLAZZ, VIP_RESELLER)
- Action (checkBalance, getProducts, healthCheck)
- Request payload
- Response payload
- Success status
- Error message (if failed)
- Latency (ms)
- Timestamp

### Product Table
When `getProducts` is called, all products are synced to database:
- Provider + Provider Code (unique)
- Name, Category, Brand, Type
- Price, Stock status
- Last sync timestamp
- Active status

---

## Expected Results

### ✅ Digiflazz (Development Mode)

**Check Balance:**
- Should return development balance
- Usually starts with some amount for testing

**Get Products:**
- Should return 100+ products
- Categories: Pulsa, Data, PLN, Games, E-Wallet, etc.
- All products with prices and stock status

**Health Check:**
- Status: ONLINE
- Latency: ~200-500ms (depends on network)

### ✅ VIP Reseller

**Check Balance:**
- Should return actual account balance

**Get Products:**
- Should return available products
- Similar categories as Digiflazz

**Health Check:**
- Status: ONLINE
- Latency: ~200-500ms

---

## Troubleshooting

### Error: "Environment variable not found: DATABASE_URL"

Create `.env` file:
```bash
echo 'DATABASE_URL="mysql://akbardev:akbardev@localhost:3306/whuzpay"' > .env
```

### Error: "Access denied for user"

Check MySQL credentials:
```bash
mysql -u akbardev -p
# Enter password: akbardev
```

### Error: Database "whuzpay" doesn't exist

Create database manually:
```sql
CREATE DATABASE whuzpay CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

### Error: "Prisma Client not generated"

Regenerate Prisma Client:
```bash
npx prisma generate
```

### Provider returns empty products

Check:
1. Provider credentials are correct in `.env.local`
2. Provider mode is set to `real` (not `mock`)
3. Provider API is accessible (check network)

---

## Next Steps

After successful testing:

1. **Review Logs**
   - Check `provider_logs` table in database
   - Verify all operations logged correctly
   - Check latency and success rates

2. **Review Products**
   - Check `products` table in database
   - Verify products synced from both providers
   - Check price accuracy

3. **Performance**
   - Monitor API response times
   - Check database queries efficiency
   - Optimize if needed

4. **Integration**
   - Ready to integrate with checkout flow
   - Ready to integrate with order processing
   - Ready to integrate with webhook handlers

---

## Database Schema

Check current database structure:
```bash
npx prisma studio
```

This opens Prisma Studio at `http://localhost:5555` where you can:
- View all tables
- Browse provider_logs
- Browse products
- Edit data manually (if needed)

---

## Safety Notes

⚠️ **Important:**
- Development mode credentials have limited balance
- Test with small amounts first
- Never commit credentials to git
- Use `.env.local` for local development
- `.env.example` is for documentation only

---

**Happy Testing! 🚀**

All provider operations are now logged to database and ready for monitoring.
