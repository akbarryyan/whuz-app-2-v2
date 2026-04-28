"use client";

export default function PromoSection() {
  return (
    <div className="mt-8">
      <h3 className="text-lg font-bold text-slate-800 mb-4">Promo Spesial</h3>
      <div className="bg-gradient-to-r from-orange-400 to-pink-500 rounded-2xl p-6 text-white">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium mb-1">Diskon Hingga</p>
            <p className="text-4xl font-bold">50%</p>
            <p className="text-sm mt-2">Untuk semua produk game</p>
          </div>
          <div className="text-6xl">🎁</div>
        </div>
      </div>
    </div>
  );
}
