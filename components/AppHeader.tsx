"use client";

import { useState, useEffect, useRef } from "react";
import NotificationDropdown from "@/components/ui/NotificationDropdown";

interface AppHeaderProps {
  /** If provided, renders a back chevron button */
  onBack?: () => void;
}

/**
 * Fixed top header, consistent across all app pages.
 * Pass `onBack` to show a back chevron; omit it for pages without back navigation.
 */
export default function AppHeader({ onBack }: AppHeaderProps) {
  const [logoUrl, setLogoUrl] = useState("");
  const [siteName, setSiteName] = useState("Website");
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

  return (
    <header className="fixed inset-x-0 top-0 z-40 bg-[#003D99] lg:bg-[#171D25]">
      <div className="mx-auto flex w-full max-w-[480px] items-center gap-2 px-3 py-3 lg:max-w-7xl lg:px-5">
        {/* Back button or spacer */}
        {onBack ? (
          <button
            onClick={onBack}
            className="h-9 w-9 flex-shrink-0 rounded-full transition-colors hover:bg-white/10 flex items-center justify-center"
            aria-label="Kembali"
          >
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
        ) : (
          <div className="w-9 h-9 flex-shrink-0" />
        )}

        {/* Logo */}
        {logoUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={logoUrl}
            alt={siteName}
            className="-mt-2 h-10 w-auto flex-shrink-0 object-contain lg:h-11"
          />
        )}

        <div className="flex-1" />

        {/* Right icons */}
        <div className="flex items-center flex-shrink-0">
          {/* Chat / CS */}
          <a
            href="/tickets"
            className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-white/10 transition-colors relative"
            aria-label="Customer Service"
          >
            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
                d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
            {unreadCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 flex items-center justify-center rounded-full bg-red-500 text-white text-[9px] font-bold px-1">
                {unreadCount > 9 ? "9+" : unreadCount}
              </span>
            )}
          </a>
          {/* Bell */}
          <div className="relative">
            <button
              ref={bellRef}
              onClick={() => setNotifOpen((v) => !v)}
              className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-white/10 transition-colors relative"
              aria-label="Notifikasi"
            >
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
                  d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
              </svg>
              {notifUnread > 0 && (
                <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 flex items-center justify-center rounded-full bg-red-500 text-white text-[9px] font-bold px-1">
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
    </header>
  );
}
