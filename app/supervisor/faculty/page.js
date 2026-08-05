'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function FacultyPage() {
  const router  = useRouter();
  const [faculty,  setFaculty]  = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [search,   setSearch]   = useState('');

  useEffect(() => {
    const stored = localStorage.getItem('user');
    if (!stored) { router.push('/'); return; }
    fetchFaculty();
  }, []);

  async function fetchFaculty() {
    try {
      const res  = await fetch('http://localhost:5077/api/supervisor/faculty');
      const json = await res.json();
      setFaculty(json);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  const filtered = faculty.filter(f =>
    f.name.toLowerCase().includes(search.toLowerCase()) ||
    f.office?.toLowerCase().includes(search.toLowerCase())
  );

  function initials(name) {
    return name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
  }

  function floorLabel(floor) {
    if (!floor) return 'N/A';
    if (typeof floor === 'string') {
      const normalized = floor.trim();
      if (normalized === '') return 'N/A';
      // if API already gives "Ground Floor" / "First Floor", use it directly
      if (/floor$/i.test(normalized)) return normalized;
      return `${normalized} Floor`;
    }
    if (typeof floor === 'number') {
      if (floor === 1) return '1st Floor';
      if (floor === 2) return '2nd Floor';
      if (floor === 3) return '3rd Floor';
      return `${floor}th Floor`;
    }
    return String(floor);
  }

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
          <h1 className="text-3xl font-extrabold text-gray-800">Faculty</h1>
          <p className="text-base text-gray-500 mt-1">{faculty.length} faculty members</p>
        </div>
        {/* Search */}
        <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-xl px-4 py-3 w-72 shadow-sm">
          <svg width="20" height="20" fill="none" stroke="#9CA3AF" strokeWidth="2" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input type="text" placeholder="Search faculty..."
            value={search} onChange={e => setSearch(e.target.value)}
            className="outline-none text-base text-gray-700 w-full bg-transparent" />
        </div>
      </div>

      {/* ── Faculty list ── */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        {filtered.map((f, i) => (
          <div key={f.id}
            className="flex items-center gap-4 px-6 py-4 border-b border-gray-50 last:border-0 hover:bg-gray-50 transition-colors">

            {/* Avatar */}
            <div className="w-12 h-12 rounded-full flex items-center justify-center text-white text-base font-bold shrink-0 bg-[#0C7347]">
              {initials(f.name)}
            </div>

            {/* Info */}
            <div className="flex-1">
              <p className="text-base font-bold text-gray-800">{f.name}</p>
              <p className="text-sm text-gray-500 mt-1">
                {f.office ?? 'No office assigned'}
              </p>
            </div>

            {/* Floor badge */}
            <span className="text-sm font-semibold px-3 py-1.5 rounded-full bg-[#0C7347]/10 text-[#0C7347]">
              {floorLabel(f.floor)}
            </span>

          </div>
        ))}

        {filtered.length === 0 && (
          <div className="py-12 text-center text-gray-400 text-base">No faculty found</div>
        )}
      </div>

    </div>
  );
}