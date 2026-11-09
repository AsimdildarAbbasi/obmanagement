'use client';
import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { API } from '../../lib/api';

function formatDate(d) {
  if (!d) return '';
  return new Date(d).toLocaleString('en-GB', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit'
  });
}

export default function FacultyNotificationsPage() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const fetchNotifications = useCallback(async (accountId) => {
    try {
      const res = await fetch(`${API}/api/notifications/${accountId}`);
      const text = await res.text();
      const json = text ? JSON.parse(text) : [];
      setNotifications(Array.isArray(json) ? json : []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const stored = sessionStorage.getItem('user');
    if (!stored) { router.push('/'); return; }
    const parsed = JSON.parse(stored);
    if (Number(parsed.role) !== 2) { router.push('/'); return; }
    setUser(parsed);
    fetchNotifications(parsed.id);

    const timer = setInterval(() => fetchNotifications(parsed.id), 30000);
    return () => clearInterval(timer);
  }, [fetchNotifications, router]);

  async function markRead(notification) {
    if (notification.isRead) return;
    setBusy(true);
    try {
      await fetch(`${API}/api/notifications/${notification.id}/read`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accountId: user.id }),
      });
      setNotifications(prev => prev.map(item =>
        item.id === notification.id ? { ...item, isRead: true } : item
      ));
    } catch (e) {
      console.error(e);
    } finally {
      setBusy(false);
    }
  }

  async function markAllRead() {
    setBusy(true);
    try {
      await fetch(`${API}/api/notifications/read-all/${user.id}`, { method: 'PUT' });
      setNotifications(prev => prev.map(item => ({ ...item, isRead: true })));
    } catch (e) {
      console.error(e);
    } finally {
      setBusy(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="w-8 h-8 border-4 border-[#0C7347] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const unreadCount = notifications.filter(n => !n.isRead).length;

  return (
    <div className="p-8 max-w-3xl">
      <div className="flex items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Notifications</h1>
          <p className="text-sm text-gray-400 mt-1">
            {unreadCount} unread of {notifications.length}
          </p>
        </div>
        {unreadCount > 0 && (
          <button
            onClick={markAllRead}
            disabled={busy}
            className="px-4 py-2 rounded-xl text-sm font-semibold border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-60"
          >
            Mark all as read
          </button>
        )}
      </div>

      <div className="flex flex-col gap-3">
        {notifications.length === 0 ? (
          <div className="bg-white rounded-2xl py-12 text-center shadow-sm border border-gray-100">
            <p className="text-gray-400 text-sm">No notifications yet</p>
          </div>
        ) : (
          notifications.map(notification => (
            <button
              key={notification.id}
              onClick={() => markRead(notification)}
              className={`text-left rounded-2xl px-6 py-4 shadow-sm border transition-colors ${
                notification.isRead
                  ? 'bg-white border-gray-100'
                  : 'bg-[#0C7347]/[0.04] border-[#0C7347]/20'
              }`}
            >
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 bg-[#0C7347]/10">
                  <svg width="18" height="18" fill="none" stroke="#0C7347" strokeWidth="2" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round"
                      d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                  </svg>
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-bold text-gray-800">{notification.title}</p>
                    {!notification.isRead && (
                      <span className="w-2 h-2 rounded-full bg-red-500 shrink-0" />
                    )}
                  </div>
                  <p className="text-sm text-gray-600 mt-0.5">{notification.message}</p>

                  <div className="flex flex-wrap items-center gap-2 mt-2 text-xs text-gray-400">
                    {notification.floorNumber && (
                      <span className="px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">
                        Floor {notification.floorNumber}
                      </span>
                    )}
                    {notification.locationName && (
                      <span className="flex items-center gap-1">
                        <svg width="11" height="11" fill="none" stroke="#9CA3AF" strokeWidth="2" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round"
                            d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                        </svg>
                        {notification.locationName}
                      </span>
                    )}
                    <span>·</span>
                    <span>{formatDate(notification.createdAt)}</span>
                  </div>
                </div>
              </div>
            </button>
          ))
        )}
      </div>
    </div>
  );
}
