'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getStoredUser } from '../lib/auth';
import { API } from '../lib/api';

export default function NotificationBell() {
  const router = useRouter();
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    const user = getStoredUser();
    if (!user || Number(user.role) !== 2) return;

    let cancelled = false;

    async function loadUnreadCount() {
      try {
        const res = await fetch(`${API}/api/notifications/${user.id}/unread-count`);
        if (!res.ok) return;
        const json = await res.json();
        if (!cancelled) setUnreadCount(Number(json.unreadCount) || 0);
      } catch {
        // Ignore transient polling errors.
      }
    }

    loadUnreadCount();
    const timer = setInterval(loadUnreadCount, 30000);

    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, []);

  return (
    <button
      type="button"
      onClick={() => router.push('/faculty/notifications')}
      className="relative w-10 h-10 rounded-full bg-white border border-gray-200 flex items-center justify-center shadow-sm hover:bg-gray-50 transition-colors"
      aria-label={unreadCount > 0 ? `${unreadCount} unread notifications` : 'Notifications'}
    >
      <svg width="18" height="18" fill="none" stroke="#6B7280" strokeWidth="2" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round"
          d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
      </svg>
      {unreadCount > 0 && (
        <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center">
          {unreadCount > 99 ? '99+' : unreadCount}
        </span>
      )}
    </button>
  );
}
