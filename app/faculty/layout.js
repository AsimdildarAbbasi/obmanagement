'use client';
import { useRouter, usePathname } from 'next/navigation';
import Image from 'next/image';

const navItems = [
  { label: 'Dashboard',   href: '/faculty/dashboard'   },
  { label: 'Assign Task', href: '/faculty/assign-task' },
  { label: 'Tasks',       href: '/faculty/tasks'       },
];

function NavIcon({ label, active }) {
  const color = active ? '#0C7347' : '#6B7280';
  if (label === 'Dashboard') return (
    <svg width="24" height="24" fill="none" stroke={color} strokeWidth="2" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round"
        d="M4 6a2 2 0 012-2h3a2 2 0 012 2v3a2 2 0 01-2 2H6a2 2 0 01-2-2V6zm9 0a2 2 0 012-2h3a2 2 0 012 2v3a2 2 0 01-2 2h-3a2 2 0 01-2-2V6zM4 15a2 2 0 012-2h3a2 2 0 012 2v3a2 2 0 01-2 2H6a2 2 0 01-2-2v-3zm9 0a2 2 0 012-2h3a2 2 0 012 2v3a2 2 0 01-2 2h-3a2 2 0 01-2-2v-3z" />
    </svg>
  );
  if (label === 'Assign Task') return (
    <svg width="24" height="24" fill="none" stroke={color} strokeWidth="2" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
    </svg>
  );
  if (label === 'Tasks') return (
    <svg width="24" height="24" fill="none" stroke={color} strokeWidth="2" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round"
        d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
    </svg>
  );
  return null;
}

export default function FacultyLayout({ children }) {
  const router   = useRouter();
  const pathname = usePathname();

  function handleLogout() {
    localStorage.removeItem('user');
    router.push('/');
  }

  return (
    <div className="flex min-h-screen bg-gray-50">

      <aside className="w-64 bg-white border-r border-gray-100 flex flex-col fixed h-full z-10">

        <div className="flex items-center gap-3 px-4 py-5 border-b border-gray-100">
          <div className="w-10 h-10 rounded-full overflow-hidden border-2 shrink-0"
            style={{ borderColor: '#0C7347' }}>
            <Image src="/logo.jpeg" alt="BIIT" width={40} height={40} />
          </div>
          <div>
            <p className="text-base font-bold text-gray-800 leading-tight">BIIT Management</p>
            <p className="text-sm font-semibold text-gray-500">Faculty</p>
          </div>
        </div>

        <nav className="flex-1 px-3 py-4 flex flex-col gap-1">
          {navItems.map((item) => {
            const active = pathname === item.href;
            return (
              <button key={item.href}
                onClick={() => router.push(item.href)}
                className="flex items-center gap-3 px-3 py-3 rounded-xl text-base font-semibold w-full text-left transition-colors"
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
            className="flex items-center gap-3 px-3 py-3 rounded-xl text-base font-semibold text-red-500 hover:bg-red-50 w-full transition-colors">
            <svg width="24" height="24" fill="none" stroke="#EF4444" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round"
                d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h6a2 2 0 012 2v1" />
            </svg>
            Logout
          </button>
        </div>

      </aside>

      <main className="flex-1 ml-64 min-h-screen">
        {children}
      </main>

    </div>
  );
}