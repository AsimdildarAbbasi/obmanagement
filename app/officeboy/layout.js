'use client';
import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Image from 'next/image';
import { getStoredUser } from '../lib/auth';

const navItems = [
  { label: 'Dashboard', href: '/officeboy/dashboard' },
  { label: 'Available Tasks', href: '/officeboy/available-tasks' },
  { label: 'Notifications', href: '/officeboy/notifications' },
  { label: 'Completed', href: '/officeboy/completed' },
];

function NavIcon({ label, active }) {
  const color = active ? '#0C7347' : '#6B7280';
  if (label === 'Dashboard') return (
    <svg width="20" height="20" fill="none" stroke={color} strokeWidth="1.8" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round"
        d="M4 6a2 2 0 012-2h3a2 2 0 012 2v3a2 2 0 01-2 2H6a2 2 0 01-2-2V6zm9 0a2 2 0 012-2h3a2 2 0 012 2v3a2 2 0 01-2 2h-3a2 2 0 01-2-2V6zM4 15a2 2 0 012-2h3a2 2 0 012 2v3a2 2 0 01-2 2H6a2 2 0 01-2-2v-3zm9 0a2 2 0 012-2h3a2 2 0 012 2v3a2 2 0 01-2 2h-3a2 2 0 01-2-2v-3z" />
    </svg>
  );
  if (label === 'Available Tasks') return (
    <svg width="20" height="20" fill="none" stroke={color} strokeWidth="1.8" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round"
        d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
    </svg>
  );
  if (label === 'Notifications') return (
    <svg width="20" height="20" fill="none" stroke={color} strokeWidth="1.8" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round"
        d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
    </svg>
  );
  if (label === 'Completed') return (
    <svg width="20" height="20" fill="none" stroke={color} strokeWidth="1.8" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round"
        d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
  return null;
}

export default function OfficeBoyLayout({ children }) {
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const stored = getStoredUser();
    if (!stored || Number(stored.role) !== 1) {
      router.push('/');
    }
  }, [router]);

  function handleLogout() {
    localStorage.removeItem('user');
    router.push('/');
  }

  return (
    <div className="flex flex-col md:flex-row min-h-screen bg-gray-50">

      {/* ── Sidebar ── */}
      <aside className="w-full md:w-56 bg-white border-r border-gray-100 flex flex-col md:fixed md:h-full z-10">

        {/* Logo */}
        <div className="flex items-center gap-3 px-4 py-5 border-b border-gray-100">
          <div className="w-9 h-9 rounded-full overflow-hidden border-2 flex-shrink-0"
            style={{ borderColor: '#0C7347' }}>
            <Image src="/logo.jpeg" alt="BIIT" width={36} height={36} />
          </div>
          <div>
            <p className="text-lg font-bold text-gray-800 leading-tight">BIIT Management</p>
            <p className="text-sm text-gray-500">Office Boy</p>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 flex flex-col gap-1">
          {navItems.map((item) => {
            const active = pathname === item.href;
            return (
              <button key={item.href}
                onClick={() => router.push(item.href)}
                className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium w-full text-left transition-colors"
                style={active
                  ? { backgroundColor: '#E8F5E9', color: '#0C7347' }
                  : { color: '#6B7280' }}>
                <NavIcon label={item.label} active={active} />
                {item.label}
              </button>
            );
          })}
        </nav>

        {/* Logout */}
        <div className="px-3 py-4 border-t border-gray-100">
          <button onClick={handleLogout}
            className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-white bg-[#0C7347] hover:opacity-90 w-full transition-colors">
            <svg width="20" height="20" fill="none" stroke="#ffffff" strokeWidth="1.8" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round"
                d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h6a2 2 0 012 2v1" />
            </svg>
            Logout
          </button>
        </div>

      </aside>

      {/* ── Main content ── */}
      <main className="flex-1 md:ml-56 min-h-screen">
        {children}
      </main>

    </div>
  );
}