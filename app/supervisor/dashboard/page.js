'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';


// ── Stat Card ──────────────────────────────────────────────────────
function StatCard({ icon, label, count, color }) {
  return (
    <div className="bg-white rounded-2xl p-5 flex items-center gap-4 shadow-sm border border-gray-100">
      <div className="w-14 h-14 rounded-2xl flex items-center justify-center shrink-0"
        style={{ backgroundColor: color + '20' }}>
        <span className="text-2xl" style={{ color }}>{icon}</span>
      </div>
      <div>
        <p className="text-3xl font-bold text-gray-800">{count ?? '—'}</p>
        <p className="text-base font-semibold text-gray-600 mt-0.5">{label}</p>
      </div>
    </div>
  );
}

// ── Icons (as emoji-style SVG) ─────────────────────────────────────
const icons = {
  faculty: (
    <svg width="26" height="26" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round"
        d="M16 11c1.66 0 3-1.34 3-3s-1.34-3-3-3-3 1.34-3 3 1.34 3 3 3zm-8 0c1.66 0 3-1.34 3-3S9.66 5 8 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05C16.19 13.89 17 14.6 17 15.5V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z" />
    </svg>
  ),
  officeboy: (
    <svg width="26" height="26" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round"
        d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
    </svg>
  ),
  floors: (
    <svg width="26" height="26" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round"
        d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
    </svg>
  ),
  offices: (
    <svg width="26" height="26" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round"
        d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
    </svg>
  ),
  tasks: (
    <svg width="26" height="26" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round"
        d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
    </svg>
  ),
};

export default function SupervisorDashboardPage() {
  const router = useRouter();
  const [data, setData] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);

  useEffect(() => {
    const stored = localStorage.getItem('user');
    if (!stored) { router.push('/'); return; }
    const parsed = JSON.parse(stored);
    if (parsed.role !== 3) { router.push('/'); return; }
    setUser(parsed);
    fetchAll();
  }, []);

  async function fetchAll() {
    try {
      const [dashRes, taskRes] = await Promise.all([
        fetch('http://localhost:5077/api/supervisor/dashboard'),
        fetch('http://localhost:5077/api/tasks'),
      ]);
      const dashJson = await dashRes.json();
      const taskJson = await taskRes.json();
      setData(dashJson);
      setTasks(taskJson);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  // Today's tasks count
  const today = new Date().toDateString();
  const tasksToday = tasks.filter(t =>
    new Date(t.taskTime).toDateString() === today
  ).length;

  const pendingCount = tasks.filter(t => t.status === 'Pending').length;
  const completedCount = tasks.filter(t => t.status === 'Completed').length;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-[#0C7347] border-t-transparent rounded-full animate-spin" />
          <p className="text-base text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8">

      {/* ── Page title ── */}
      <div className="mb-8">
        <h1 className="text-3xl font-extrabold text-gray-800">Dashboard</h1>
        <p className="text-base text-gray-600 mt-2">
          Welcome back, <span className="font-bold text-gray-800">{user?.name}</span>
        </p>
      </div>

      {/* ── System Overview ── */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 mb-6">
        <h2 className="text-xl font-bold text-gray-700 mb-1">System Overview</h2>
        <p className="text-sm text-gray-500 mb-5">Monitor all operations</p>

        <div className="grid grid-cols-2 xl:grid-cols-5 gap-4">
          <StatCard icon={icons.faculty} label="Faculty" count={data?.totalFaculty} color="#0C7347" />
          <StatCard icon={icons.officeboy} label="Office Boys" count={data?.totalOfficeBoys} color="#0C7347" />
          <StatCard icon={icons.floors} label="Floors" count={data?.totalFloors} color="#0C7347" />
          <StatCard icon={icons.offices} label="Offices" count={data?.totalOffices} color="#0C7347" />
          <StatCard icon={icons.tasks} label="Tasks Today" count={tasksToday} color="#0C7347" />
        </div>
      </div>

      {/* ── Task Summary ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">

        {/* Pending tasks */}
        {/* <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-gray-700">Pending Tasks</h3>
            <span className="text-sm font-bold px-3 py-1.5 rounded-full text-white bg-[#0C7347]">
              {pendingCount} pending
            </span>
          </div>
          {tasks.filter(t => t.status === 'Pending').slice(0, 4).map((t) => (
            <div key={t.taskId} className="flex items-start gap-3 py-3 border-b border-gray-50 last:border-0">
              <div className="w-2.5 h-2.5 rounded-full mt-1.5 shrink-0 bg-[#0C7347]" />
              <div>
                <p className="text-base font-semibold text-gray-700">{t.description}</p>
                <p className="text-sm text-gray-500 mt-1">
                  {t.officeBoy} · {t.location}
                </p>
              </div>
            </div>
          ))}
          {pendingCount === 0 && (
            <p className="text-sm text-gray-400 text-center py-4">No pending tasks</p>
          )}
        </div> */}

        {/* Completed tasks */}
        {/* <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-gray-700">Completed Tasks</h3>
            <span className="text-sm font-bold px-3 py-1.5 rounded-full text-white bg-[#0C7347]">
              {completedCount} done
            </span>
          </div>
          {tasks.filter(t => t.status === 'Completed').slice(0, 4).map((t) => (
            <div key={t.taskId} className="flex items-start gap-3 py-3 border-b border-gray-50 last:border-0">
              <div className="w-2.5 h-2.5 rounded-full mt-1.5 shrink-0 bg-[#0C7347]" />
              <div>
                <p className="text-base font-semibold text-gray-700">{t.description}</p>
                <p className="text-sm text-gray-500 mt-1">
                  {t.officeBoy} · {t.location}
                  {t.rating && <span className="ml-2">⭐ {t.rating}/5</span>}
                </p>
              </div>
            </div>
          ))}
          {completedCount === 0 && (
            <p className="text-sm text-gray-400 text-center py-4">No completed tasks yet</p>
          )}
        </div> */}

      </div>

      {/* ── Recent tasks table ── */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        {/* <div className="px-6 py-4 border-b border-gray-100">
          <h3 className="text-sm font-semibold text-gray-700">Recent Tasks</h3>
        </div> */}
        {/* <div className="overflow-x-auto">
          <table className="w-full text-base">
            <thead>
              <tr className="bg-gray-50 text-sm text-gray-600 uppercase tracking-wide">
                <th className="px-6 py-3 text-left font-semibold">Description</th>
                <th className="px-6 py-3 text-left font-semibold">Faculty</th>
                <th className="px-6 py-3 text-left font-semibold">Office Boy</th>
                <th className="px-6 py-3 text-left font-semibold">Location</th>
                <th className="px-6 py-3 text-left font-semibold">Status</th>
              </tr>
            </thead>
            <tbody>
              {tasks.slice(0, 6).map((t, i) => (
                <tr key={t.taskId}
                  className={`border-t border-gray-50 ${i % 2 === 0 ? 'bg-white' : 'bg-gray-50/40'}`}>
                  <td className="px-6 py-3 text-gray-700 font-medium">{t.description}</td>
                  <td className="px-6 py-3 text-gray-500">{t.faculty}</td>
                  <td className="px-6 py-3 text-gray-500">{t.officeBoy}</td>
                  <td className="px-6 py-3 text-gray-500">{t.location}</td>
                  <td className="px-6 py-3">
                    <span className={`text-sm font-semibold px-2.5 py-1.5 rounded-full ${t.status === 'Pending' ? 'bg-[#0C7347]/10 text-[#0C7347]' : 'bg-[#0C7347]/10 text-[#0C7347]'}`}>
                      {t.status}
                    </span>
                  </td>
                </tr>
              ))}
              {tasks.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-gray-400 text-sm">
                    No tasks created yet
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div> */}
      </div>

    </div>
  );
}