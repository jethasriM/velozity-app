import { useEffect, useState } from "react";
import { api } from "../api/client";
import { useSocket } from "../context/SocketContext";
import { AppNotification } from "../types";

export default function NotificationBell() {
  const socket = useSocket();
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    api.get<{ notifications: AppNotification[] }>("/api/notifications").then((d) => setNotifications(d.notifications));
  }, []);

  // Unread count updates live via WebSocket push, not polling — the badge
  // reacts instantly the moment the server emits a new notification.
  useEffect(() => {
    if (!socket) return;
    const handler = (n: AppNotification) => setNotifications((prev) => [n, ...prev]);
    socket.on("notification:new", handler);
    return () => {
      socket.off("notification:new", handler);
    };
  }, [socket]);

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  async function markRead(id: string) {
    await api.patch(`/api/notifications/${id}/read`);
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, isRead: true } : n)));
  }

  async function markAllRead() {
    await api.post("/api/notifications/read-all");
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
  }

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="relative p-2 rounded-full hover:bg-slate-100 transition"
        aria-label="Notifications"
      >
        <BellIcon />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 bg-red-500 text-white text-[10px] leading-none rounded-full h-4 min-w-4 px-1 flex items-center justify-center">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-80 bg-white rounded-lg shadow-lg border border-slate-200 z-20 max-h-96 overflow-y-auto">
          <div className="flex items-center justify-between px-4 py-2 border-b border-slate-100">
            <span className="text-sm font-medium">Notifications</span>
            <button onClick={markAllRead} className="text-xs text-indigo-600 hover:underline">
              Mark all read
            </button>
          </div>
          {notifications.length === 0 && (
            <p className="px-4 py-6 text-sm text-slate-400 text-center">No notifications yet</p>
          )}
          {notifications.map((n) => (
            <button
              key={n.id}
              onClick={() => markRead(n.id)}
              className={`w-full text-left px-4 py-3 text-sm border-b border-slate-50 hover:bg-slate-50 ${
                n.isRead ? "text-slate-500" : "text-slate-900 font-medium bg-indigo-50/40"
              }`}
            >
              {n.message}
              <div className="text-[11px] text-slate-400 mt-0.5">{new Date(n.createdAt).toLocaleString()}</div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function BellIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M18 8a6 6 0 10-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
      <path d="M13.73 21a2 2 0 01-3.46 0" />
    </svg>
  );
}
