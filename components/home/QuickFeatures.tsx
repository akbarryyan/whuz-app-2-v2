"use client";

export default function QuickFeatures() {
  const features = [
    { icon: "🎮", label: "Top Up Game", active: true },
    { icon: "⚡", label: "Top Up Via Login", active: false },
    { icon: "🎫", label: "Voucher", active: false },
    { icon: "💎", label: "Item & Skin", active: false },
  ];

  return (
    <div className="grid grid-cols-4 gap-4 px-4 py-6 bg-white border-b border-slate-100">
      {features.map((feature, idx) => (
        <button
          key={idx}
          className={`flex flex-col items-center gap-2 ${
            feature.active ? "text-purple-600" : "text-slate-600"
          }`}
        >
          <div
            className={`text-3xl p-3 rounded-2xl ${
              feature.active ? "bg-purple-100" : "bg-slate-100"
            }`}
          >
            {feature.icon}
          </div>
          <span className="text-xs font-medium text-center leading-tight">
            {feature.label}
          </span>
        </button>
      ))}
    </div>
  );
}
