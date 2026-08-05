'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function OfficeBoyPage() {
  const router = useRouter();
  const [officeboys, setOfficeBoys] = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [search,     setSearch]     = useState('');

  useEffect(() => {
    const stored = localStorage.getItem('user');
    if (!stored) { router.push('/'); return; }
    fetchOfficeBoys();
  }, []);

  async function fetchOfficeBoys() {
    try {
      const res  = await fetch('http://localhost:5077/api/supervisor/officeboys');
      const json = await res.json();
      setOfficeBoys(json);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  // Filter by search
  const filtered = officeboys.filter(o =>
    o.name.toLowerCase().includes(search.toLowerCase())
  );

  // Avatar initials
  function initials(name) {
    return name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
  }

  // Avatar bg colors cycling
  const colors = ['#0C7347'];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="w-8 h-8 border-4 border-[#0C7347] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-8">

      {/* ── Header ── */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-extrabold text-gray-800">Office Boys</h1>
          <p className="text-base text-gray-500 mt-1">{officeboys.length} total office boys</p>
        </div>
        {/* Search */}
        <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-xl px-4 py-3 w-72 shadow-sm">
          <svg width="20" height="20" fill="none" stroke="#9CA3AF" strokeWidth="2" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input type="text" placeholder="Search office boys..."
            value={search} onChange={e => setSearch(e.target.value)}
            className="outline-none text-base text-gray-700 w-full bg-transparent" />
        </div>
      </div>

      {/* ── List ── */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        {filtered.map((ob, i) => (
          <div key={ob.id}
            className={`flex items-center gap-4 px-6 py-4 border-b border-gray-50 last:border-0
              hover:bg-gray-50 transition-colors`}>

            {/* Avatar */}
            <div className="w-12 h-12 rounded-full flex items-center justify-center text-white text-base font-bold shrink-0 bg-[#0C7347]">
              {initials(ob.name)}
            </div>

            {/* Info */}
            <div className="flex-1">
              <p className="text-base font-bold text-gray-800">{ob.name}</p>
              <div className="flex items-center gap-3 mt-1 text-sm text-gray-500">
                {(ob.assignedFloors?.length > 0 ? ob.assignedFloors : ob.floor ? [ob.floor] : []).map(f => (
                  <span key={f} className="flex items-center gap-1 text-sm text-gray-500">
                    <svg width="14" height="14" fill="none" stroke="#9CA3AF" strokeWidth="2" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round"
                        d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    </svg>
                    {f}
                  </span>
                ))}
              </div>
            </div>

            {/* Assigned offices count */}
            <div className="text-right">
              <span className="text-sm font-semibold px-3 py-1.5 rounded-full bg-[#0C7347]/10 text-[#0C7347]">
                {(ob.assignedOffices?.length ?? ob.assignedFloors?.length ?? (ob.office ? 1 : 0))} offices
              </span>
            </div>

          </div>
        ))}

        {filtered.length === 0 && (
          <div className="py-12 text-center text-gray-400 text-base">
            No office boys found
          </div>
        )}
      </div>

    </div>
  );
}