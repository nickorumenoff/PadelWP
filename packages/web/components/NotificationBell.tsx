"use client";

import { useEffect, useRef, useState } from "react";
import type { AppNotification } from "@padel-ve/shared";
import { api } from "@/lib/api";
import { useAuth } from "@/app/providers";

const POLL_MS = 30_000;

export default function NotificationBell() {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  function load() {
    api.listNotifications().then(setNotifications).catch(() => {});
  }

  useEffect(() => {
    if (!user) {
      setNotifications([]);
      return;
    }
    load();
    const interval = setInterval(load, POLL_MS);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  if (!user) return null;

  const unreadCount = notifications.filter((n) => !n.read).length;

  async function markRead(n: AppNotification) {
    if (!n.read) {
      setNotifications((prev) => prev.map((x) => (x.id === n.id ? { ...x, read: true } : x)));
      api.markNotificationRead(n.id).catch(() => {});
    }
  }

  async function markAllRead() {
    setNotifications((prev) => prev.map((x) => ({ ...x, read: true })));
    api.markAllNotificationsRead().catch(() => {});
  }

  return (
    <div ref={containerRef} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="relative flex h-9 w-9 items-center justify-center rounded-full text-muted transition-colors hover:bg-mist hover:text-brand-blue"
        aria-label="Notificaciones"
      >
        <span className="text-lg">🔔</span>
        {unreadCount > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-semibold text-white">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 z-30 mt-2 w-80 max-w-[90vw] rounded-xl border border-line bg-white shadow-soft">
          <div className="flex items-center justify-between border-b border-line px-4 py-2">
            <p className="text-sm font-semibold text-ink">Notificaciones</p>
            {unreadCount > 0 && (
              <button onClick={markAllRead} className="text-xs font-medium text-brand-blue hover:underline">
                Marcar todas leídas
              </button>
            )}
          </div>
          <div className="max-h-80 overflow-y-auto">
            {notifications.length === 0 && (
              <p className="p-4 text-center text-sm text-muted">No tienes notificaciones.</p>
            )}
            {notifications.map((n) => (
              <button
                key={n.id}
                onClick={() => markRead(n)}
                className={`block w-full border-b border-line px-4 py-3 text-left text-sm last:border-b-0 ${
                  n.read ? "text-muted" : "bg-brand-blue-50 text-ink"
                }`}
              >
                <p>{n.message}</p>
                <p className="mt-1 text-xs text-muted">{new Date(n.createdAt).toLocaleString("es-VE")}</p>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
