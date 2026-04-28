/**
 * Seed default page content for "Syarat dan Ketentuan" and "Kebijakan Privasi".
 * Run:  npx ts-node --project tsconfig.json prisma/seed-page-content.ts
 * Or:   npx tsx prisma/seed-page-content.ts
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const PAGES: { key: string; label: string; content: string }[] = [
  {
    key: "page_content_syarat-dan-ketentuan",
    label: "Syarat dan Ketentuan",
    content: `
<h2>Syarat dan Ketentuan Penggunaan Whuzpay</h2>
<p>Terakhir diperbarui: Februari 2026</p>

<p>Selamat datang di Whuzpay. Dengan mengakses dan menggunakan layanan kami, Anda menyetujui untuk terikat dengan syarat dan ketentuan berikut. Mohon baca dengan seksama sebelum menggunakan platform kami.</p>

<h3>1. Definisi</h3>
<p><strong>"Platform"</strong> merujuk pada situs web dan aplikasi Whuzpay yang dioperasikan oleh PT. Whuzpay Digital Indonesia.</p>
<p><strong>"Pengguna"</strong> merujuk pada setiap individu yang mengakses dan/atau menggunakan layanan Platform.</p>
<p><strong>"Layanan"</strong> merujuk pada seluruh fitur yang tersedia di Platform, termasuk namun tidak terbatas pada top-up game, pembelian voucher digital, dan pembayaran PPOB.</p>

<h3>2. Ketentuan Umum</h3>
<ul>
  <li>Pengguna wajib berusia minimal 17 tahun atau memiliki persetujuan orang tua/wali.</li>
  <li>Pengguna bertanggung jawab penuh atas keamanan akun dan kredensial login.</li>
  <li>Setiap transaksi yang dilakukan melalui Platform bersifat final dan tidak dapat dibatalkan kecuali ditentukan lain.</li>
  <li>Pengguna dilarang menggunakan Platform untuk aktivitas yang melanggar hukum.</li>
</ul>

<h3>3. Akun Pengguna</h3>
<p>Untuk menggunakan layanan tertentu, Pengguna perlu membuat akun dengan memberikan informasi yang akurat dan lengkap. Pengguna wajib:</p>
<ul>
  <li>Menjaga kerahasiaan kata sandi akun.</li>
  <li>Memberitahu kami segera jika terjadi akses tidak sah pada akun.</li>
  <li>Tidak membagikan akun kepada pihak lain.</li>
</ul>

<h3>4. Transaksi dan Pembayaran</h3>
<ul>
  <li>Harga produk yang ditampilkan sudah termasuk biaya layanan kecuali dinyatakan lain.</li>
  <li>Pembayaran dapat dilakukan melalui metode yang tersedia di Platform (e-wallet, QRIS, transfer bank, dll).</li>
  <li>Whuzpay berhak mengubah harga sewaktu-waktu tanpa pemberitahuan sebelumnya.</li>
  <li>Produk digital akan dikirim secara otomatis setelah pembayaran berhasil diverifikasi.</li>
</ul>

<h3>5. Pengembalian Dana (Refund)</h3>
<p>Pengembalian dana hanya berlaku untuk kondisi berikut:</p>
<ul>
  <li>Transaksi gagal namun dana sudah terpotong.</li>
  <li>Produk tidak diterima dalam waktu yang ditentukan karena kesalahan sistem.</li>
</ul>
<p>Proses refund akan dilakukan dalam 1-7 hari kerja setelah laporan diverifikasi.</p>

<h3>6. Hak Kekayaan Intelektual</h3>
<p>Seluruh konten, logo, desain, dan materi lainnya yang terdapat di Platform adalah milik PT. Whuzpay Digital Indonesia dan dilindungi oleh hukum hak cipta.</p>

<h3>7. Pembatasan Tanggung Jawab</h3>
<p>Whuzpay tidak bertanggung jawab atas:</p>
<ul>
  <li>Kerugian yang timbul akibat kelalaian Pengguna dalam menjaga keamanan akun.</li>
  <li>Gangguan layanan yang disebabkan oleh force majeure atau pihak ketiga.</li>
  <li>Kesalahan input data oleh Pengguna saat melakukan transaksi.</li>
</ul>

<h3>8. Perubahan Ketentuan</h3>
<p>Whuzpay berhak mengubah Syarat dan Ketentuan ini sewaktu-waktu. Perubahan akan diinformasikan melalui Platform. Penggunaan berkelanjutan setelah perubahan dianggap sebagai persetujuan atas ketentuan baru.</p>

<h3>9. Hukum yang Berlaku</h3>
<p>Syarat dan Ketentuan ini tunduk pada hukum Republik Indonesia. Segala sengketa akan diselesaikan melalui musyawarah atau melalui pengadilan yang berwenang di Indonesia.</p>

<h3>10. Kontak</h3>
<p>Jika Anda memiliki pertanyaan mengenai Syarat dan Ketentuan ini, silakan hubungi kami melalui:</p>
<ul>
  <li>Email: <strong>support@whuzpay.com</strong></li>
  <li>WhatsApp: <strong>08123-456-7890</strong></li>
</ul>
`.trim(),
  },
  {
    key: "page_content_kebijakan-privasi",
    label: "Kebijakan Privasi",
    content: `
<h2>Kebijakan Privasi Whuzpay</h2>
<p>Terakhir diperbarui: Februari 2026</p>

<p>PT. Whuzpay Digital Indonesia ("kami") berkomitmen untuk melindungi privasi Anda. Kebijakan Privasi ini menjelaskan bagaimana kami mengumpulkan, menggunakan, menyimpan, dan melindungi informasi pribadi Anda.</p>

<h3>1. Informasi yang Kami Kumpulkan</h3>
<p>Kami mengumpulkan informasi berikut saat Anda menggunakan layanan kami:</p>
<ul>
  <li><strong>Data Identitas:</strong> Nama, alamat email, nomor telepon.</li>
  <li><strong>Data Transaksi:</strong> Riwayat pembelian, metode pembayaran yang digunakan.</li>
  <li><strong>Data Teknis:</strong> Alamat IP, jenis perangkat, versi browser, dan data log lainnya.</li>
  <li><strong>Data Penggunaan:</strong> Halaman yang dikunjungi, waktu akses, dan interaksi dengan fitur Platform.</li>
</ul>

<h3>2. Penggunaan Informasi</h3>
<p>Informasi yang kami kumpulkan digunakan untuk:</p>
<ul>
  <li>Menyediakan dan meningkatkan layanan Platform.</li>
  <li>Memproses transaksi dan mengirimkan produk digital.</li>
  <li>Mengirimkan notifikasi terkait transaksi dan pembaruan layanan.</li>
  <li>Mencegah penipuan dan aktivitas ilegal.</li>
  <li>Menganalisis penggunaan Platform untuk peningkatan layanan.</li>
  <li>Mematuhi kewajiban hukum yang berlaku.</li>
</ul>

<h3>3. Penyimpanan Data</h3>
<p>Data pribadi Anda disimpan secara aman menggunakan enkripsi dan protokol keamanan standar industri. Kami menyimpan data selama diperlukan untuk menyediakan layanan atau sesuai kewajiban hukum.</p>

<h3>4. Pembagian Informasi</h3>
<p>Kami <strong>tidak menjual</strong> data pribadi Anda kepada pihak ketiga. Informasi hanya dibagikan kepada:</p>
<ul>
  <li><strong>Penyedia layanan pembayaran:</strong> Untuk memproses transaksi Anda.</li>
  <li><strong>Penyedia produk digital:</strong> Untuk mengirimkan produk yang dibeli.</li>
  <li><strong>Otoritas hukum:</strong> Jika diwajibkan oleh peraturan perundang-undangan.</li>
</ul>

<h3>5. Keamanan Data</h3>
<p>Kami menerapkan langkah-langkah keamanan yang wajar untuk melindungi data Anda, termasuk:</p>
<ul>
  <li>Enkripsi data saat transmisi (SSL/TLS).</li>
  <li>Pembatasan akses data hanya kepada personel yang berwenang.</li>
  <li>Audit keamanan berkala.</li>
  <li>Penyimpanan kata sandi dengan hashing yang aman.</li>
</ul>

<h3>6. Hak Pengguna</h3>
<p>Anda memiliki hak untuk:</p>
<ul>
  <li><strong>Mengakses</strong> data pribadi yang kami simpan tentang Anda.</li>
  <li><strong>Memperbarui</strong> data yang tidak akurat atau tidak lengkap.</li>
  <li><strong>Menghapus</strong> akun dan data pribadi Anda (dengan ketentuan tertentu).</li>
  <li><strong>Menolak</strong> pengiriman komunikasi pemasaran.</li>
</ul>
<p>Untuk menggunakan hak-hak tersebut, silakan hubungi kami melalui kontak di bawah.</p>

<h3>7. Cookie</h3>
<p>Platform kami menggunakan cookie untuk meningkatkan pengalaman pengguna. Cookie digunakan untuk:</p>
<ul>
  <li>Mengingat preferensi dan sesi login Anda.</li>
  <li>Menganalisis lalu lintas dan penggunaan Platform.</li>
</ul>
<p>Anda dapat mengatur penggunaan cookie melalui pengaturan browser Anda.</p>

<h3>8. Perubahan Kebijakan</h3>
<p>Kami dapat memperbarui Kebijakan Privasi ini sewaktu-waktu. Perubahan signifikan akan diinformasikan melalui Platform atau email. Penggunaan berkelanjutan setelah pembaruan dianggap sebagai persetujuan atas kebijakan baru.</p>

<h3>9. Kontak</h3>
<p>Jika Anda memiliki pertanyaan atau keluhan terkait privasi data, silakan hubungi kami:</p>
<ul>
  <li>Email: <strong>support@whuzpay.com</strong></li>
  <li>WhatsApp: <strong>08123-456-7890</strong></li>
</ul>

<p><em>Kebijakan Privasi ini berlaku efektif sejak tanggal yang tertera di atas.</em></p>
`.trim(),
  },
];

async function main() {
  console.log("🌱 Seeding page content...\n");

  for (const page of PAGES) {
    await prisma.siteConfig.upsert({
      where: { key: page.key },
      update: { value: page.content },
      create: { key: page.key, value: page.content },
    });
    console.log(`  ✅ ${page.label} → ${page.key}`);
  }

  console.log("\n✨ Page content seeding complete!");
}

main()
  .catch((e) => {
    console.error("❌ Seeding failed:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
