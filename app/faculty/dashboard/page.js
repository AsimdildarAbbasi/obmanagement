'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
// ── API BASE URL ────────────────────────────────────────────────────
const API = 'https://localhost:7094';

// ── Stat Card ───────────────────────────────────────────────────────
function StatCard({ icon, label, count, sub, color }) {
  return (
    <div className="bg-white rounded-2xl p-5 flex items-center gap-4 shadow-sm border border-gray-100 flex-1">
      <div className="w-14 h-14 rounded-xl flex items-center justify-center shrink-0"
        style={{ backgroundColor: color + '18', color }}>
        {icon}
      </div>
      <div>
        <p className="text-3xl font-bold text-gray-800">{count ?? '—'}</p>
        <p className="text-base font-semibold text-gray-600">{label}</p>
        {sub && <p className="text-sm mt-0.5" style={{ color }}>{sub}</p>}
      </div>
    </div>
  );
}

// ── Task Row ────────────────────────────────────────────────────────
function TaskRow({ task }) {
  function formatDate(d) {
    if (!d) return '';
    return new Date(d).toLocaleString('en-GB', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit'
    });
  }

  return (
    <div className="px-6 py-4 border-b border-gray-50 last:border-0 hover:bg-gray-50 transition-colors">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          {/* Task title = description (first line) */}
          <p className="text-base font-semibold text-gray-800 truncate">{task.description}</p>
          {/* Meta row */}
          <div className="flex flex-wrap items-center gap-3 mt-1.5">
            {/* OfficeBoy name */}
            <span className="flex items-center gap-1 text-sm text-gray-500">
              <svg width="14" height="14" fill="none" stroke="#9CA3AF" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round"
                  d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
              {task.officeBoy}
            </span>
            {/* Location */}
            <span className="flex items-center gap-1 text-sm text-gray-500">
              <svg width="14" height="14" fill="none" stroke="#9CA3AF" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round"
                  d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
              </svg>
              {task.location}
            </span>
            {/* Time */}
            <span className="flex items-center gap-1 text-sm text-gray-500">
              <svg width="14" height="14" fill="none" stroke="#9CA3AF" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round"
                  d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              {formatDate(task.taskTime)}
            </span>
          </div>
        </div>
        {/* Status badge */}
        <span className={`text-sm font-semibold px-2.5 py-1.5 rounded-full shrink-0
          ${task.status === 'Pending'
            ? 'bg-orange-100 text-orange-600'
            : 'bg-green-100 text-green-700'}`}>
          {task.status}
        </span>
      </div>
    </div>
  );
}

// ── Main Page ───────────────────────────────────────────────────────
export default function FacultyDashboard() {
  const router = useRouter();

  const [user,    setUser]    = useState(null);
  const [tasks,   setTasks]   = useState([]);
  const [obCount, setObCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState('');

  useEffect(() => {
    // Get logged in user from localStorage
    const stored = localStorage.getItem('user');
    if (!stored) { router.push('/'); return; }
    const parsed = JSON.parse(stored);
    // Make sure this is Faculty (role 2)
    if (parsed.role !== 2) { router.push('/'); return; }
    setUser(parsed);
    fetchData(parsed);
  }, []);

  async function fetchData(parsed) {
    try {
      // 1. Get ALL tasks then filter by faculty name
      //    (no faculty-specific task endpoint active in current controller)
      const taskRes = await fetch(`${API}/api/tasks`);
      if (!taskRes.ok) throw new Error('Tasks API failed');
      const allTasks = await taskRes.json();

      // Filter tasks where faculty name matches logged in user
      const myTasks = allTasks.filter(
        t => t.faculty?.toLowerCase() === parsed.name?.toLowerCase()
      );
      setTasks(myTasks);

      // 2. Get OfficeBoys on this faculty's floor
      const obRes = await fetch(`${API}/api/tasks/byfaculty/${parsed.id}`);
      if (obRes.ok) {
        const obJson = await obRes.json();
        setObCount(Array.isArray(obJson) ? obJson.length : 0);
      }

    } catch (e) {
      setError('Could not load dashboard. Make sure the API is running.');
    } finally {
      setLoading(false);
    }
  }

  // Compute stats from filtered tasks
  const totalTasks     = tasks.length;
  const pendingTasks   = tasks.filter(t => t.status === 'Pending').length;
  const completedTasks = tasks.filter(t => t.status === 'Completed').length;

  // Last name only for welcome message (e.g. "Khan" from "Prof. Imran Khan")
  const firstName = user?.name?.split(' ').slice(-1)[0] ?? '';

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="w-10 h-10 border-4 border-green-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-screen">
        <p className="text-red-500 text-sm">{error}</p>
      </div>
    );
  }

  return (
    <div className="p-8">

      {/* ── Page title ── */}
      <h1 className="text-3xl font-extrabold text-gray-800 mb-6">Dashboard</h1>

      {/* ── Welcome + stat cards ── */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 mb-6">
        <h2 className="text-2xl font-bold text-gray-800">Welcome, {firstName}</h2>
        <p className="text-base text-gray-500 mt-1 mb-5">Here's your task overview for today</p>

        <div className="flex gap-4 flex-wrap">
          <StatCard
            color="#0C7347"
            label="Total Tasks"
            count={totalTasks}
            icon={
              <svg width="26" height="26" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round"
                  d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            }
          />
          <StatCard
            color="#E65100"
            label="Pending"
            count={pendingTasks}
            icon={
              <svg width="26" height="26" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round"
                  d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            }
          />
          <StatCard
            color="#1565C0"
            label="Completed"
            count={completedTasks}
            icon={
              <svg width="26" height="26" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round"
                  d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            }
          />
          <StatCard
            color="#6A1B9A"
            label="Office Boys"
            count={obCount}
            sub="On your floor"
            icon={
              <svg width="26" height="26" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round"
                  d="M17 20H7a2 2 0 01-2-2v-1a5 5 0 015-5h4a5 5 0 015 5v1a2 2 0 01-2 2zM12 11a4 4 0 100-8 4 4 0 000 8z" />
              </svg>
            }
          />
        </div>
      </div>

      {/* ── Recent Tasks ── */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h3 className="text-lg font-bold text-gray-700">Recent Tasks</h3>
          <button
            onClick={() => router.push('/faculty/tasks')}
            className="text-sm font-semibold hover:underline"
            style={{ color: '#0C7347' }}>
            View all
          </button>
        </div>

        {tasks.length === 0 ? (
          <div className="py-12 text-center">
            <p className="text-gray-400 text-base mb-3">No tasks assigned yet</p>
            <button
              onClick={() => router.push('/faculty/assign-task')}
              className="text-base font-semibold px-5 py-2 rounded-xl text-white"
              style={{ backgroundColor: '#0C7347' }}>
              Assign First Task
            </button>
          </div>
        ) : (
          // Show latest 5 tasks
          tasks.slice(0, 5).map((t) => (
            <TaskRow key={t.taskId} task={t} />
          ))
        )}
      </div>

    </div>
  );
}