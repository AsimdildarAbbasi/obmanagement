'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { API } from '../../lib/api';
import UserAvatar from '../../components/UserAvatar';

export default function OfficeBoyPage() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [officeboys, setOfficeBoys] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  // Floor rotation
  const [rotateA, setRotateA] = useState('');
  const [rotateB, setRotateB] = useState('');
  const [rotating, setRotating] = useState(false);
  const [rotateError, setRotateError] = useState('');
  const [rotateSuccess, setRotateSuccess] = useState('');

  useEffect(() => {
    const stored = sessionStorage.getItem('user');
    if (!stored) { router.push('/'); return; }
    const parsed = JSON.parse(stored);
    if (Number(parsed.role) !== 3) { router.push('/'); return; }
    setUser(parsed);
    fetchOfficeBoys();
  }, []);

  async function fetchOfficeBoys() {
    try {
      const res = await fetch(`${API}/api/supervisor/officeboys`);
      const json = await res.json();
      setOfficeBoys(Array.isArray(json) ? json : []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  async function handleRotate() {
    setRotateError('');
    setRotateSuccess('');

    if (!rotateA || !rotateB) {
      setRotateError('Choose two office boys to rotate.');
      return;
    }
    if (rotateA === rotateB) {
      setRotateError('Choose two different office boys.');
      return;
    }

    setRotating(true);
    try {
      const res = await fetch(`${API}/api/supervisor/rotate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          supervisorAccountId: user.id,
          officeBoyAId: Number(rotateA),
          officeBoyBId: Number(rotateB),
        }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setRotateError(data.message || 'Could not rotate office boys.');
        return;
      }

      const firstName = officeboys.find(o => String(o.id) === String(rotateA))?.name || 'First office boy';
      const secondName = officeboys.find(o => String(o.id) === String(rotateB))?.name || 'Second office boy';

      setRotateSuccess(
        `${firstName} and ${secondName} swapped floors. ` +
        `${data.tasksMovedToA ?? 0} task(s) moved to ${firstName}, ${data.tasksMovedToB ?? 0} task(s) moved to ${secondName}.`
      );
      setRotateA('');
      setRotateB('');
      fetchOfficeBoys();
    } catch (e) {
      console.error(e);
      setRotateError('Could not rotate office boys.');
    } finally {
      setRotating(false);
    }
  }

  // Filter by search
  const filtered = officeboys.filter(o =>
    o.name.toLowerCase().includes(search.toLowerCase())
  );

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

      {/* ── Floor rotation ── */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 px-6 py-5 mb-6">
        <div className="flex items-start justify-between gap-4 mb-4">
          <div>
            <h2 className="text-base font-bold text-gray-800">Rotate Floors</h2>
            <p className="text-xs text-gray-500 mt-0.5">
              Swap the active floor assignments and open tasks between two office boys.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-end gap-4">
          <div className="flex-1 min-w-[200px]">
            <label className="block text-xs font-semibold text-gray-500 mb-1">First office boy</label>
            <select
              value={rotateA}
              onChange={e => setRotateA(e.target.value)}
              className="w-full border border-gray-200 text-gray-500 rounded-xl px-4 py-2.5"
            >
              <option value="">Select office boy</option>
              {officeboys.map(ob => (
                <option key={ob.id} value={ob.id}>
                  {ob.name} {ob.assignedFloors?.length ? `(Floor ${ob.assignedFloors.join(', ')})` : '(Unassigned)'}
                </option>
              ))}
            </select>
          </div>

          <div className="flex-1 min-w-[200px]">
            <label className="block text-xs font-semibold text-gray-500 mb-1">Second office boy</label>
            <select
              value={rotateB}
              onChange={e => setRotateB(e.target.value)}
              className="w-full border border-gray-200 text-gray-500 rounded-xl px-4 py-2.5"
            >
              <option value="">Select office boy</option>
              {officeboys.map(ob => (
                <option key={ob.id} value={ob.id}>
                  {ob.name} {ob.assignedFloors?.length ? `(Floor ${ob.assignedFloors.join(', ')})` : '(Unassigned)'}
                </option>
              ))}
            </select>
          </div>

          <button
            onClick={handleRotate}
            disabled={rotating || officeboys.length < 2}
            className="px-5 py-2.5 rounded-xl text-white text-sm font-semibold disabled:opacity-60"
            style={{ backgroundColor: '#0C7347' }}
          >
            {rotating ? 'Rotating...' : 'Rotate'}
          </button>
        </div>

        {rotateError && <p className="text-xs text-red-500 mt-3">{rotateError}</p>}
        {rotateSuccess && <p className="text-xs text-[#0C7347] mt-3">{rotateSuccess}</p>}
      </div>

      {/* ── List ── */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        {filtered.map((ob) => {
          const floors = ob.assignedFloors?.length > 0 ? ob.assignedFloors : (ob.floor ? [ob.floor] : []);
          const activeTaskCount = ob.activeTaskCount ?? 0;
          const avgRating = ob.averageRating;

          return (
            <div key={ob.id}
              className="flex items-center gap-4 px-6 py-4 border-b border-gray-50 last:border-0 hover:bg-gray-50 transition-colors">

              {/* Avatar */}
              <UserAvatar name={ob.name} imageUrl={ob.profileImageUrl} size={48} />

              {/* Info */}
              <div className="flex-1 min-w-0">
                <p className="text-base font-bold text-gray-800">{ob.name}</p>
                <div className="flex flex-wrap items-center gap-3 mt-1 text-sm text-gray-500">
                  {floors.length > 0 ? floors.map(f => (
                    <span key={f} className="flex items-center gap-1 text-sm text-gray-500">
                      <svg width="14" height="14" fill="none" stroke="#9CA3AF" strokeWidth="2" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round"
                          d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      </svg>
                      Floor {f}
                    </span>
                  )) : (
                    <span className="text-sm text-gray-400">Unassigned</span>
                  )}

                  <span className="text-xs text-gray-400">
                    {activeTaskCount} active task{activeTaskCount === 1 ? '' : 's'}
                  </span>

                  <span className="text-xs font-semibold text-amber-600">
                    {avgRating != null ? `${Number(avgRating).toFixed(2)} ★ (${ob.ratedTaskCount ?? 0})` : 'No ratings'}
                  </span>
                </div>
              </div>

              {/* Assigned count */}
              <div className="text-right shrink-0">
                <span className="text-sm font-semibold px-3 py-1.5 rounded-full bg-[#0C7347]/10 text-[#0C7347]">
                  {floors.length} floor{floors.length === 1 ? '' : 's'}
                </span>
              </div>

            </div>
          );
        })}

        {filtered.length === 0 && (
          <div className="py-12 text-center text-gray-400 text-base">
            No office boys found
          </div>
        )}
      </div>

    </div>
  );
}
