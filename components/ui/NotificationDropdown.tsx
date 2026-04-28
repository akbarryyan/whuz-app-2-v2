"use client";

import { useState, useEffect, useRef, useCallback } from "react";

interface Notification {
  id: string;
  userId: string | null;
  type: string; // ORDER_STATUS, PROMO, ANNOUNCEMENT, SYSTEM
  title: string;
  message: string;
  icon: string | null;
  link: string | null;
  isRead: boolean;
  createdAt: string;
}

const ICON_MAP: Record<string, { bg: string; color: string; path: string }> = {
  order: {
    bg: "bg-blue-100",
    color: "text-blue-600",
    path: "M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4",
  },
  promo: {
    bg: "bg-amber-100",
    color: "text-amber-600",
    path: "M12 8v13m0-13V6a2 2 0 112 2h-2zm0 0V5.5A2.5 2.5 0 109.5 8H12zm-7 4h14M5 12a2 2 0 110-4h14a2 2 0 110 4M5 12v7a2 2 0 002 2h10a2 2 0 002-2v-7",
  },
  info: {
    bg: "bg-purple-100",
    color: "text-purple-600",
    path: "M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z",
  },
  warning: {
    bg: "bg-rose-100",
    color: "text-rose-600",
    path: "M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4.5c-.77-.833-2.694-.833-3.464 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z",
  },
};

function getIconForType(type: string, icon: string | null) {
  if (icon && ICON_MAP[icon]) return ICON_MAP[icon];
  switch (type) {
    case "ORDER_STATUS":
      return ICON_MAP.order;
    case "PROMO":
      return ICON_MAP.promo;
    case "SYSTEM":
      return ICON_MAP.warning;
    default:
      return ICON_MAP.info;
  }
}

function timeAgo(dateStr: string): string {
  const now = Date.now();
  const diff = now - new Date(dateStr).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return "Baru saja";
  if (minutes < 60) return `${minutes} menit lalu`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} jam lalu`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days} hari lalu`;
  return new Date(dateStr).toLocaleDateString("id-ID", { day: "numeric", month: "short" });
}

interface NotificationDropdownProps {
  /** Ref to the bell button for positioning */
  anchorRef: React.RefObject<HTMLButtonElement | null>;
  open: boolean;
  onClose: () => void;
  /** Unread count setter for parent badge */
  onUnreadCountChange?: (count: number) => void;
}

export default function NotificationDropdown({
  anchorRef,
  open,
  onClose,
  onUnreadCountChange,
}: NotificationDropdownProps) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Fetch notifications when opened
  const fetchNotifications = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/notifications?limit=20");
      const data = await res.json();
      if (data.success) {
        setNotifications(data.data);
        setUnreadCount(data.unreadCount);
        onUnreadCountChange?.(data.unreadCount);
      }
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, [onUnreadCountChange]);

  useEffect(() => {
    if (open) fetchNotifications();
  }, [open, fetchNotifications]);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      const target = e.target as Node;
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(target) &&
        anchorRef.current &&
        !anchorRef.current.contains(target)
      ) {
        onClose();
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open, onClose, anchorRef]);

  const markAllRead = async () => {
    try {
      await fetch("/api/notifications/read", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ all: true }),
      });
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      setUnreadCount(0);
      onUnreadCountChange?.(0);
    } catch {
      // silent
    }
  };

  const handleClickNotif = async (notif: Notification) => {
    // Mark as read
    if (!notif.isRead) {
      try {
        await fetch("/api/notifications/read", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ids: [notif.id] }),
        });
        setNotifications((prev) =>
          prev.map((n) => (n.id === notif.id ? { ...n, isRead: true } : n))
        );
        setUnreadCount((c) => Math.max(0, c - 1));
        onUnreadCountChange?.(Math.max(0, unreadCount - 1));
      } catch {
        // silent
      }
    }
    // Navigate if link
    if (notif.link) {
      onClose();
      window.location.href = notif.link;
    }
  };

  if (!open) return null;

  return (
    <>
      {/* Invisible overlay for mobile tap-to-close */}
      <div className="fixed inset-0 z-[49]" onClick={onClose} />

      <div
        ref={dropdownRef}
        className="absolute right-1 z-[50] w-[calc(100vw-32px)] max-w-[360px] bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200"
        style={{ top: "100%", marginTop: "8px" }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-bold text-slate-800">Notifikasi</h3>
            {unreadCount > 0 && (
              <span className="min-w-[20px] h-5 flex items-center justify-center rounded-full bg-red-500 text-white text-[10px] font-bold px-1.5">
                {unreadCount}
              </span>
            )}
          </div>
          {unreadCount > 0 && (
            <button
              onClick={markAllRead}
              className="text-[11px] font-semibold text-blue-600 hover:text-blue-800 transition-colors"
            >
              Tandai semua dibaca
            </button>
          )}
        </div>

        {/* Body / List */}
        <div
          className="max-h-[360px] overflow-y-auto"
          style={{ scrollbarWidth: "thin", scrollbarColor: "#e2e8f0 transparent" }}
        >
          {loading ? (
            <div className="flex flex-col gap-3 p-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex gap-3 animate-pulse">
                  <div className="w-9 h-9 rounded-full bg-slate-200 flex-shrink-0" />
                  <div className="flex-1">
                    <div className="h-3 w-2/3 bg-slate-200 rounded mb-2" />
                    <div className="h-2.5 w-full bg-slate-100 rounded" />
                  </div>
                </div>
              ))}
            </div>
          ) : notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 px-4">
              <svg className="w-12 h-12 text-slate-200 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                  d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
              </svg>
              <p className="text-sm text-slate-400 font-medium">Belum ada notifikasi</p>
              <p className="text-[11px] text-slate-300 mt-1">Notifikasi pesanan & promo akan muncul di sini</p>
            </div>
          ) : (
            notifications.map((notif) => {
              const iconInfo = getIconForType(notif.type, notif.icon);
              return (
                <button
                  key={notif.id}
                  onClick={() => handleClickNotif(notif)}
                  className={`w-full flex items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-slate-50 border-b border-slate-50 last:border-b-0 ${
                    !notif.isRead ? "bg-blue-50/50" : ""
                  }`}
                >
                  {/* Icon */}
                  <div className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 ${iconInfo.bg}`}>
                    <svg className={`w-4.5 h-4.5 ${iconInfo.color}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={iconInfo.path} />
                    </svg>
                  </div>
                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <p className={`text-[12px] leading-tight ${!notif.isRead ? "font-bold text-slate-800" : "font-semibold text-slate-700"}`}>
                        {notif.title}
                      </p>
                      {!notif.isRead && (
                        <div className="w-2 h-2 rounded-full bg-blue-500 flex-shrink-0 mt-1" />
                      )}
                    </div>
                    <p className="text-[11px] text-slate-500 leading-relaxed mt-0.5 line-clamp-2">
                      {notif.message}
                    </p>
                    <p className="text-[10px] text-slate-400 mt-1">{timeAgo(notif.createdAt)}</p>
                  </div>
                </button>
              );
            })
          )}
        </div>

        {/* Footer */}
        {notifications.length > 0 && (
          <div className="border-t border-slate-100 px-4 py-2.5">
            <a
              href="/notifikasi"
              className="block text-center text-[12px] font-semibold text-blue-600 hover:text-blue-800 transition-colors"
            >
              Lihat Semua Notifikasi
            </a>
          </div>
        )}
      </div>
    </>
  );
}
