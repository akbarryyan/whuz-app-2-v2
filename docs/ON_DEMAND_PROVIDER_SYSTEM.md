# On-Demand Provider System dengan Margin Pricing

## Ringkasan Perubahan

Sistem provider telah diupdate dari auto-fetch menjadi **on-demand** dengan tambahan **margin pricing system**. Sekarang API tidak akan dipanggil otomatis saat halaman dibuka, tapi hanya saat button diklik.

## Fitur Baru

### 1. On-Demand Balance Check
- **Sebelumnya**: Saldo dicek otomatis setiap kali halaman dibuka
- **Sekarang**: Ada button "Cek Saldo" untuk cek saldo provider secara manual
- **Benefit**: Menghemat API call dan biaya

### 2. On-Demand Product Sync
- **Sebelumnya**: Produk di-sync otomatis saat halaman dibuka
- **Sekarang**: Ada button "Sync Layanan" untuk sync produk secara manual
- **Benefit**: Kontrol penuh kapan mau ambil data terbaru

### 3. Margin Pricing System
- **Fitur**: Tambahkan margin keuntungan ke setiap produk
- **2 Tipe Margin**:
  - **FIXED**: Margin nominal tetap (contoh: +Rp 2.000)
  - **PERCENTAGE**: Margin persentase (contoh: +10%)
- **Contoh**:
  - Harga Provider: Rp 5.000
  - Margin FIXED Rp 2.000 → Harga Jual: Rp 7.000
  - Margin 10% → Harga Jual: Rp 5.500 (5000 + 500)

## Database Schema Changes

### Product Model (Updated)
```prisma
model Product {
  providerPrice   Decimal  // Harga dari provider
  margin          Decimal  // Margin keuntungan
  sellingPrice    Decimal  // Harga jual = providerPrice + margin
  ...
}
```

### ProviderSetting Model (New)
```prisma
model ProviderSetting {
  provider        String   @unique
  defaultMargin   Decimal  // Nilai margin default
  marginType      String   // FIXED atau PERCENTAGE
  lastBalance     Decimal? // Cache saldo terakhir
  lastBalanceAt   DateTime?
  isActive        Boolean
}
```

## API Endpoints Baru

### 1. Check Balance (On-Demand)
```
POST /api/admin/providers/[type]/check-balance
```
- Cek saldo provider secara manual
- Update cache balance di database
- Return: { balance, currency, lastUpdated }

### 2. Sync Products (On-Demand)
```
POST /api/admin/providers/[type]/sync-products
```
- Sync produk dari provider
- Otomatis hitung margin dan harga jual
- Return: { syncedCount, products }

### 3. Provider Settings (Margin Config)
```
GET  /api/admin/providers/settings       # List semua settings
PUT  /api/admin/providers/settings       # Update margin config
```

**Body untuk PUT:**
```json
{
  "provider": "DIGIFLAZZ",
  "defaultMargin": 2000,
  "marginType": "FIXED",
  "isActive": true
}
```

## UI Changes

### Provider Card
- ✅ Button "Cek Saldo" (hijau) → Hit API check balance
- ✅ Button "Sync Layanan" (biru) → Hit API sync products
- ✅ Tampilan margin keuntungan per provider
- ✅ Button "Atur Margin" → Buka modal konfigurasi margin

### Product Table
- Kolom **Harga Provider**: Harga dari provider
- Kolom **Margin**: Keuntungan (ditampilkan dengan +Rp)
- Kolom **Harga Jual**: Total harga jual ke customer

### Margin Configuration Modal
- Select tipe margin (Fixed/Percentage)
- Input nilai margin
- Preview perhitungan dengan contoh Rp 5.000
- Button "Simpan & Sync" → Update settings dan re-sync products

## Workflow Baru

1. **Pertama Kali Buka Halaman**
   - Tidak ada API call otomatis
   - Tampil provider cards dengan status "UNKNOWN"
   - Produk dari database (jika sudah pernah sync)

2. **Cek Saldo Provider**
   - Klik button "Cek Saldo" pada provider card
   - API call ke provider untuk cek balance
   - Update tampilan saldo di card
   - Saldo disimpan di cache database

3. **Atur Margin Keuntungan**
   - Klik "Atur Margin" pada provider card
   - Pilih tipe margin (Fixed/Percentage)
   - Masukkan nilai margin
   - Klik "Simpan & Sync"
   - Otomatis re-sync semua produk dengan margin baru

4. **Sync Produk dari Provider**
   - Klik button "Sync Layanan"
   - API call ke provider untuk ambil produk
   - Hitung harga jual: providerPrice + margin
   - Simpan ke database
   - Tampil di table produk

## Margin Calculation Logic

### Repository Level (`provider.repository.ts`)
```typescript
async syncProducts(provider: string, products: ProductSyncData[]) {
  // 1. Get provider settings
  const setting = await this.getProviderSetting(provider);
  const defaultMargin = setting?.defaultMargin || 0;
  const marginType = setting?.marginType || "FIXED";
  
  // 2. For each product
  for (const product of products) {
    let margin = 0;
    let sellingPrice = 0;
    
    // 3. Calculate margin
    if (marginType === "PERCENTAGE") {
      margin = (providerPrice * defaultMargin) / 100;
      sellingPrice = providerPrice + margin;
    } else { // FIXED
      margin = defaultMargin;
      sellingPrice = providerPrice + defaultMargin;
    }
    
    // 4. Save to database
    await prisma.product.upsert({
      create: { providerPrice, margin, sellingPrice, ... },
      update: { providerPrice, margin, sellingPrice, ... }
    });
  }
}
```

## Testing

### Test Flow Manual
1. Buka halaman `/admin/providers`
2. Klik "Cek Saldo" pada salah satu provider → Verifikasi saldo update
3. Klik "Atur Margin" → Set margin 2000 (FIXED) → Simpan
4. Tunggu sync selesai → Verifikasi produk muncul di table
5. Check kolom: Harga Provider, Margin (+Rp 2.000), Harga Jual
6. Coba ubah margin ke PERCENTAGE 10% → Simpan → Verifikasi perhitungan

### Test API dengan cURL

**Check Balance:**
```bash
curl -X POST http://localhost:3000/api/admin/providers/digiflazz/check-balance
```

**Sync Products:**
```bash
curl -X POST http://localhost:3000/api/admin/providers/digiflazz/sync-products
```

**Get Settings:**
```bash
curl http://localhost:3000/api/admin/providers/settings
```

**Update Margin:**
```bash
curl -X PUT http://localhost:3000/api/admin/providers/settings \
  -H "Content-Type: application/json" \
  -d '{
    "provider": "DIGIFLAZZ",
    "defaultMargin": 2000,
    "marginType": "FIXED",
    "isActive": true
  }'
```

## Files Changed

### Database
- ✅ `prisma/schema.prisma` - Updated Product & added ProviderSetting model
- ✅ Database pushed with `npx prisma db push`
- ✅ Prisma Client regenerated with `npx prisma generate`

### Repository Layer
- ✅ `src/infra/db/repositories/provider.repository.ts`
  - Updated `syncProducts()` with margin calculation
  - Added `getProviderSetting()`
  - Added `upsertProviderSetting()`
  - Added `updateProviderBalance()`
  - Added `getAllProviderSettings()`
  - Added `updateProductMargin()`

### Service Layer
- ✅ `src/core/services/provider/provider-management.service.ts`
  - Added `checkProviderBalance()` for on-demand balance check
  - Added `syncProviderProducts()` for on-demand product sync
  - Updated all sync calls to use `providerPrice` instead of `price`

### API Routes (New)
- ✅ `app/api/admin/providers/[type]/check-balance/route.ts` - POST check balance
- ✅ `app/api/admin/providers/[type]/sync-products/route.ts` - POST sync products
- ✅ `app/api/admin/providers/settings/route.ts` - GET/PUT settings

### UI
- ✅ `app/admin/providers/page.tsx`
  - Removed auto-fetch from useEffect
  - Added `checkBalanceLoading` state per provider
  - Added `syncProductsLoading` state per provider
  - Added margin configuration modal
  - Updated product table to show 3 price columns
  - Added "Cek Saldo" and "Sync Layanan" buttons
  - Added "Atur Margin" button and modal

## Next Steps (Optional Enhancements)

1. **Category-specific Margins**: Set different margins per category
2. **Product-specific Margins**: Override margin for individual products
3. **Bulk Margin Update**: Update margin for multiple products at once
4. **Margin History**: Track margin changes over time
5. **Profit Reports**: Show total profit per provider/category
6. **Auto-sync Schedule**: Optional scheduled sync (cron job)
7. **Notification System**: Alert when sync completes or fails

## Benefits

✅ **Hemat Biaya**: Tidak ada API call yang tidak perlu  
✅ **Kontrol Penuh**: User memutuskan kapan mau hit API  
✅ **Margin Pricing**: Otomatis hitung harga jual dengan keuntungan  
✅ **Fleksibel**: Support margin fixed dan percentage  
✅ **Transparent**: Tampilkan breakdown harga (provider → margin → jual)  
✅ **Cache Balance**: Simpan saldo terakhir di database  
✅ **Auto Logging**: Semua operasi tercatat di provider_logs  

## Kesimpulan

Sistem sekarang lebih efisien dan user-friendly:
- **Tidak ada auto-fetch** → Hemat API call
- **Button-triggered actions** → User control
- **Margin pricing** → Automatic profit calculation
- **2 margin types** → Fixed & Percentage support
- **Transparent pricing** → Show providerPrice, margin, sellingPrice

Semua perubahan sudah tested dan ready to use! 🚀
