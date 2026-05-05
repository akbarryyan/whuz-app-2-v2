"use client";

import { useState, useRef, useEffect } from "react";

interface CategoriesProps {
  activeCategory: string | null;
  onCategoryChange: (category: string | null) => void;
}

interface CategoryTab {
  label: string;
  value: string | null;
}

const DEFAULT_CATEGORIES: CategoryTab[] = [
  { label: "Semua", value: null },
  { label: "Top Up Game", value: "top-up-game" },
  { label: "Pulsa & Data", value: "pulsa-data" },
  { label: "E-Wallet", value: "e-wallet" },
  { label: "Token Listrik", value: "token-listrik" },
];

export default function Categories({ activeCategory, onCategoryChange }: CategoriesProps) {
  const [underlineStyle, setUnderlineStyle] = useState({ left: 0, width: 0 });
  const [isSticky, setIsSticky] = useState(false);
  const [categories, setCategories] = useState<CategoryTab[]>(DEFAULT_CATEGORIES);
  const tabsRef = useRef<(HTMLButtonElement | null)[]>([]);

  const activeIdx = categories.findIndex((c) => c.value === activeCategory);
  const resolvedIdx = activeIdx === -1 ? 0 : activeIdx;

  useEffect(() => {
    fetch("/api/catalog/categories")
      .then((response) => response.json())
      .then((result) => {
        if (!result?.success || !Array.isArray(result.data) || result.data.length === 0) return;
        setCategories([
          { label: "Semua", value: null },
          ...result.data.map((item: { label: string; value: string }) => ({
            label: item.label,
            value: item.value,
          })),
        ]);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (activeCategory && !categories.some((category) => category.value === activeCategory)) {
      onCategoryChange(null);
    }
  }, [activeCategory, categories, onCategoryChange]);

  useEffect(() => {
    const activeButton = tabsRef.current[resolvedIdx];
    if (activeButton) {
      setUnderlineStyle({
        left: activeButton.offsetLeft,
        width: activeButton.offsetWidth,
      });
    }
  }, [resolvedIdx]);

  useEffect(() => {
    const handleScroll = () => {
      setIsSticky(window.scrollY > 20);
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <div
      className={`border-b border-slate-200 bg-white transition-all duration-300 lg:border-0 lg:bg-transparent ${
        isSticky ? "sticky top-[52px] z-30 shadow-md lg:top-auto lg:shadow-none" : ""
      }`}
    >
      <div className="overflow-x-auto hide-scrollbar lg:overflow-visible">
        <div className="relative flex gap-6 px-4 lg:flex-wrap lg:items-center lg:justify-start lg:gap-4 lg:px-0 lg:py-0">
          {categories.map((category, idx) => (
            <button
              key={category.value ?? "all"}
              ref={(el) => {
                tabsRef.current[idx] = el;
              }}
              onClick={() => onCategoryChange(category.value)}
              className={`relative flex-shrink-0 whitespace-nowrap py-3 text-sm font-medium transition-all duration-300 lg:rounded-full lg:px-8 lg:py-3 lg:text-[15px] lg:font-semibold ${
                resolvedIdx === idx
                  ? "scale-105 text-purple-600 lg:scale-100 lg:bg-[#2E5F95] lg:text-white"
                  : "text-slate-500 hover:text-slate-700 lg:bg-[#232B36] lg:text-white lg:hover:bg-[#2a3441]"
              }`}
            >
              {category.label}
            </button>
          ))}
          {/* Animated underline */}
          <div
            className="absolute bottom-0 h-0.5 bg-purple-600 transition-all duration-300 ease-out lg:hidden"
            style={{
              left: `${underlineStyle.left}px`,
              width: `${underlineStyle.width}px`,
            }}
          />
        </div>
      </div>
    </div>
  );
}
