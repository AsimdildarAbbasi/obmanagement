'use client';
import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Image from 'next/image';
import { getStoredUser } from '../lib/auth';

const navItems = [
  { label: 'Dashboard', href: '/supervisor/dashboard' },
  { label: 'Faculty', href: '/supervisor/faculty' },
  { label: 'Office Boys', href: '/supervisor/officeboys' },
  { label: 'Floors', href: '/supervisor/floors' },
  { label: 'Reviews', href: '/supervisor/reviews' },
];

function NavIcon({ label, active }) {
  const color = active ? '#0C7347' : '#6B7280';
  if (label === 'Dashboard') return (
    <svg width="20" height="20" fill="none" stroke={color} strokeWidth="1.8" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round"
        d="M4 6a2 2 0 012-2h3a2 2 0 012 2v3a2 2 0 01-2 2H6a2 2 0 01-2-2V6zm9 0a2 2 0 012-2h3a2 2 0 012 2v3a2 2 0 01-2 2h-3a2 2 0 01-2-2V6zM4 15a2 2 0 012-2h3a2 2 0 012 2v3a2 2 0 01-2 2H6a2 2 0 01-2-2v-3zm9 0a2 2 0 012-2h3a2 2 0 012 2v3a2 2 0 01-2 2h-3a2 2 0 01-2-2v-3z" />
    </svg>
  );
  if (label === 'Faculty') return (
    <svg width="20" height="20" fill="none" stroke={color} strokeWidth="1.8" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round"
        d="M16 11c1.66 0 3-1.34 3-3s-1.34-3-3-3-3 1.34-3 3 1.34 3 3 3zm-8 0c1.66 0 3-1.34 3-3S9.66 5 8 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05C16.19 13.89 17 14.6 17 15.5V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z" />
    </svg>
  );
  if (label === 'Office Boys') return (
    <svg width="20" height="20" fill="none" stroke={color} strokeWidth="1.8" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round"
        d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
    </svg>
  );
  if (label === 'Floors') return (
    <svg width="20" height="20" fill="none" stroke={color} strokeWidth="1.8" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round"
        d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
    </svg>
  );
  if (label === 'Reviews') return (
    <svg width="20" height="20" fill="none" stroke={color} strokeWidth="1.8" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round"
        d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
    </svg>
  );
  return null;
}

export default function SupervisorLayout({ children }) {
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const stored = getStoredUser();
    if (!stored || Number(stored.role) !== 3) {
      router.push('/');
    }
  }, [router]);

  function handleLogout() {
    localStorage.removeItem('user');
    router.push('/');
  }

  return (
    <div className="flex flex-col md:flex-row min-h-screen bg-gray-50">

      <aside className="w-full md:w-56 bg-white border-r border-gray-100 flex flex-col md:fixed md:h-full z-10">

        <div className="flex items-center gap-3 px-4 py-5 border-b border-gray-100">
          <div className="w-9 h-9 rounded-full overflow-hidden border-2 flex-shrink-0"
            style={{ borderColor: '#0C7347' }}>
            <Image src="/logo.jpeg" alt="BIIT" width={36} height={36} />
          </div>
          <div>
            <p className="text-sm font-bold text-gray-800 leading-tight">BIIT Management</p>
            <p className="text-xs text-gray-500">Supervisor</p>
          </div>
        </div>

        <nav className="flex-1 px-3 py-4 flex flex-col gap-1">
          {navItems.map((item) => {
            const active = pathname === item.href;
            return (
              <button key={item.href} onClick={() => router.push(item.href)}
                className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors w-full text-left"
                style={active
                  ? { backgroundColor: '#E8F5E9', color: '#0C7347' }
                  : { color: '#6B7280' }}>
                <NavIcon label={item.label} active={active} />
                {item.label}
              </button>
            );
          })}
        </nav>

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

      <main className="flex-1 md:ml-56 min-h-screen">
        {children}
      </main>

    </div>
  );
}