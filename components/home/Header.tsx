"use client";

import { useState, useEffect, useRef } from "react";
import NotificationDropdown from "@/components/ui/NotificationDropdown";

const PLACEHOLDER_TEXTS = [
  "Cari top up Mobile Legends...",
  "Cari top up Free Fire...",
  "Cari top up PUBG Mobile...",
  "Cari top up Genshin Impact...",
  "Cari voucher Valorant...",
  "Cari top up Honkai Star Rail...",
  "Cari pulsa & data...",
  "Cari token listrik...",
  "Cari e-wallet...",
];

/** Split "Cari XYZ..." into { prefix: "Cari ", highlight: "XYZ..." } */
function splitPlaceholder(text: string) {
  const prefix = "Cari ";
  if (text.startsWith(prefix)) {
    return { prefix: text.slice(0, prefix.length), highlight: text.slice(prefix.length) };
  }
  return { prefix: text, highlight: "" };
}

export default function Header() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [placeholderIdx, setPlaceholderIdx] = useState(0);
  const [displayText, setDisplayText] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);
  const [charIdx, setCharIdx] = useState(0);
  const [logoUrl, setLogoUrl] = useState("");
  const [siteName, setSiteName] = useState("Website");
  const [searchValue, setSearchValue] = useState("");
  const [isFocused, setIsFocused] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifOpen, setNotifOpen] = useState(false);
  const [notifUnread, setNotifUnread] = useState(0);
  const bellRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    fetch("/api/site-branding")
      .then((r) => r.json())
      .then((d) => {
        if (d.data?.site_logo) setLogoUrl(d.data.site_logo);
        if (d.data?.site_name) setSiteName(d.data.site_name);
      })
      .catch(() => {});
    fetch("/api/tickets/unread-count")
      .then((r) => r.json())
      .then((d) => { if (d.count) setUnreadCount(d.count); })
      .catch(() => {});
    fetch("/api/notifications?limit=1")
      .then((r) => r.json())
      .then((d) => { if (d.unreadCount != null) setNotifUnread(d.unreadCount); })
      .catch(() => {});
  }, []);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Typewriter effect
  useEffect(() => {
    const fullText = PLACEHOLDER_TEXTS[placeholderIdx];
    let timeout: ReturnType<typeof setTimeout>;

    if (!isDeleting && charIdx < fullText.length) {
      // Typing
      timeout = setTimeout(() => {
        setDisplayText(fullText.slice(0, charIdx + 1));
        setCharIdx((c) => c + 1);
      }, 55);
    } else if (!isDeleting && charIdx === fullText.length) {
      // Pause at end, then start deleting
      timeout = setTimeout(() => setIsDeleting(true), 1800);
    } else if (isDeleting && charIdx > 0) {
      // Deleting
      timeout = setTimeout(() => {
        setDisplayText(fullText.slice(0, charIdx - 1));
        setCharIdx((c) => c - 1);
      }, 30);
    } else if (isDeleting && charIdx === 0) {
      // Move to next text
      setIsDeleting(false);
      setPlaceholderIdx((i) => (i + 1) % PLACEHOLDER_TEXTS.length);
    }

    return () => clearTimeout(timeout);
  }, [charIdx, isDeleting, placeholderIdx]);

  return (
    <header
      className={`bg-[#003D99] px-4 ${
        isScrolled
          ? "fixed inset-x-0 top-0 z-40 py-2.5 shadow-lg"
          : "relative pt-4 pb-3 lg:pt-5 lg:pb-4"
      }`}
    >
      <div className="mx-auto w-full max-w-[480px] lg:max-w-6xl">
      {/* Logo Row + Icons */}
      <div className="flex items-center justify-between">
        {/* Logo - just hidden when scrolled, no animation */}
        <div className={`flex items-center ${isScrolled ? "invisible" : ""}`}>
          {logoUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={logoUrl}
              alt={siteName}
              className="h-10 w-auto object-contain -mt-2"
            />
          )}
        </div>

        {/* Icons */}
        <div className="flex items-center gap-3">
          <a href="/tickets" className="text-white relative">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
            </svg>
            {unreadCount > 0 && (
              <span className="absolute -top-1.5 -right-1.5 min-w-[16px] h-4 flex items-center justify-center rounded-full bg-red-500 text-white text-[9px] font-bold px-1">
                {unreadCount > 9 ? "9+" : unreadCount}
              </span>
            )}
          </a>
          <div className="relative mt-1.5">
            <button
              ref={bellRef}
              onClick={() => setNotifOpen((v) => !v)}
              className="text-white relative"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
              </svg>
              {notifUnread > 0 && (
                <span className="absolute -top-1.5 -right-1.5 min-w-[16px] h-4 flex items-center justify-center rounded-full bg-red-500 text-white text-[9px] font-bold px-1">
                  {notifUnread > 9 ? "9+" : notifUnread}
                </span>
              )}
            </button>
            <NotificationDropdown
              anchorRef={bellRef}
              open={notifOpen}
              onClose={() => setNotifOpen(false)}
              onUnreadCountChange={setNotifUnread}
            />
          </div>
        </div>
      </div>

      {/* Search Bar */}
      <div
        className={`relative transition-all duration-300 ease-in-out ${
          isScrolled
            ? "-mt-[34px] mr-[108px] lg:mr-0 lg:mt-3"
            : "mt-2.5 mr-0 lg:mt-4"
        }`}
      >
        <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 z-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        <input
          type="text"
          value={searchValue}
          onChange={(e) => setSearchValue(e.target.value)}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          className="w-full py-2 px-4 pl-10 rounded-md bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-purple-300 text-[13px] relative z-[1]"
        />
        {/* Custom colored placeholder overlay */}
        {!searchValue && !isFocused && (() => {
          const { prefix, highlight } = splitPlaceholder(displayText);
          return (
            <div className="absolute inset-0 flex items-center pl-10 pointer-events-none z-[2]">
              <span className="text-[13px] text-slate-400 whitespace-pre">{prefix}</span>
              <span className="text-[13px] font-semibold text-[#003D99]">{highlight}</span>
            </div>
          );
        })()}
      </div>
      </div>
    </header>
  );
}
