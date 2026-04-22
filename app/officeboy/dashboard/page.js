'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

const API = 'https://localhost:7094';

function StatCard({ icon, label, count, color }) {
  return (
    <div className="bg-white rounded-2xl p-5 flex items-center gap-4 shadow-sm border border-gray-100 flex-1">
      <div className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0"
        style={{ backgroundColor: color + '18', color }}>
        {icon}
      </div>
      <div>
        <p className="text-sm text-gray-500">{label}</p>
        <p className="text-2xl font-bold text-gray-800">{count ?? 0}</p>
      </div>
    </div>
  );
}

function formatDate(d) {
  if (!d) return '';
  return new Date(d).toLocaleString('en-GB', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit'
  });
}

export default function OfficeBoyDashboard() {
  const router  = useRouter();
  const [user,    setUser]    = useState(null);
  const [tasks,   setTasks]   = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const stored = localStorage.getItem('user');
    if (!stored) { router.push('/'); return; }
    const parsed = JSON.parse(stored);
    if (parsed.role !== 1) { router.push('/'); return; }
    setUser(parsed);
    fetchTasks(parsed.id);
  }, []);

 async function fetchTasks(id) {
  try {
    const res = await fetch(`${API}/api/officeboy/${id}/tasks`);
    const text = await res.text();                          // read as text first
    const json = text ? JSON.parse(text) : [];             // parse only if not empty
    setTasks(Array.isArray(json) ? json : []);
  } catch (e) {
    console.error(e);
  } finally {
    setLoading(false);
  }
}
  const pendingCount    = tasks.filter(t => t.status === 'Pending').length;
  const inProgressCount = tasks.filter(t => t.status === 'InProgress').length;
  const completedCount  = tasks.filter(t => t.status === 'Completed').length;
  const activeTasks     = tasks.filter(t => t.status !== 'Completed');

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="w-8 h-8 border-4 border-green-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-8">

      {/* ── Header ── */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Dashboard</h1>
        {/* Notification bell with badge */}
        <div className="relative">
          <div className="w-9 h-9 rounded-full bg-white border border-gray-200 flex items-center justify-center shadow-sm">
            <svg width="18" height="18" fill="none" stroke="#6B7280" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round"
                d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
            </svg>
          </div>
          {pendingCount > 0 && (
            <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full flex items-center justify-center">
              <span className="text-white text-xs font-bold">{pendingCount}</span>
            </span>
          )}
        </div>
      </div>

      {/* ── Welcome + stats ── */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 mb-6">
        <h2 className="text-xl font-bold text-gray-800">
          Welcome, {user?.name?.split(' ')[0]}
        </h2>
        <p className="text-sm text-gray-400 mt-1 mb-5">Your tasks for today</p>

        <div className="flex gap-4 flex-wrap">
          <StatCard
            color="#E65100" label="Pending" count={pendingCount}
            icon={<svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>}
          />
          <StatCard
            color="#1565C0" label="In Progress" count={inProgressCount}
            icon={<svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round"
                d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>}
          />
          <StatCard
            color="#0C7347" label="Completed" count={completedCount}
            icon={<svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>}
          />
          <StatCard
            color="#6A1B9A" label="Notifications" count={pendingCount}
            icon={<svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round"
                d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
            </svg>}
          />
        </div>
      </div>

      {/* ── Active Tasks ── */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100">
          <h3 className="text-sm font-semibold text-gray-700">Active Tasks</h3>
        </div>

        {activeTasks.length === 0 ? (
          <div className="py-12 text-center">
            <p className="text-gray-400 text-sm">No active tasks</p>
          </div>
        ) : (
          activeTasks.map((task, i) => (
            <div key={task.taskId}
              className={`px-6 py-4 border-b border-gray-50 last:border-0
                ${i % 2 === 0 ? 'bg-white' : 'bg-gray-50/30'}`}>
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <p className="text-sm font-semibold text-gray-800">{task.description}</p>
                  <div className="flex flex-wrap items-center gap-3 mt-1.5">
                    <span className="flex items-center gap-1 text-xs text-gray-500">
                      <svg width="12" height="12" fill="none" stroke="#9CA3AF" strokeWidth="2" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round"
                          d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                      {task.assignedBy}
                    </span>
                    <span className="flex items-center gap-1 text-xs text-gray-500">
                      <svg width="12" height="12" fill="none" stroke="#9CA3AF" strokeWidth="2" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round"
                          d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      </svg>
                      {task.location}
                    </span>
                    <span className="flex items-center gap-1 text-xs text-gray-500">
                      <svg width="12" height="12" fill="none" stroke="#9CA3AF" strokeWidth="2" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round"
                          d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      {formatDate(task.taskTime)}
                    </span>
                  </div>
                </div>
                <span className={`text-xs font-semibold px-2.5 py-1 rounded-full flex-shrink-0
                  ${task.status === 'Pending'
                    ? 'bg-orange-100 text-orange-500'
                    : 'bg-blue-100 text-blue-600'}`}>
                  {task.status}
                </span>
              </div>
            </div>
          ))
        )}
      </div>

    </div>
  );
}