'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

const API = 'http://localhost:5077';

function formatDate(d) {
  if (!d) return '';
  return new Date(d).toLocaleString('en-GB', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit'
  });
}

export default function CompletedTasksPage() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [tasks, setTasks] = useState([]);
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
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Completed</h1>
        <p className="text-sm text-gray-400 mt-1">
          {tasks.length} task{tasks.length !== 1 ? 's' : ''} completed
        </p>
      </div>

      {/* ── Completed task list ── */}
      <div className="flex flex-col gap-4">
        {tasks.length === 0 ? (
          <div className="bg-white rounded-2xl py-12 text-center shadow-sm border border-gray-100">
            <p className="text-gray-400 text-sm">No completed tasks yet</p>
          </div>
        ) : (
          tasks.map(task => (
            <div key={task.taskId}
              className="bg-white rounded-2xl px-6 py-5 shadow-sm border border-gray-100">

              {/* Title + status */}
              <div className="flex items-start justify-between gap-4 mb-2">
                <p className="text-sm font-bold text-gray-800">{task.description}</p>
                <span className="text-xs font-semibold px-2.5 py-1 rounded-full flex-shrink-0 bg-[#0C7347]/10 text-[#0C7347]">
                  Completed
                </span>
              </div>

              {/* Meta */}
              <div className="flex flex-wrap items-center gap-4">
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
                {/* Rating if available */}
                {task.rating && (
                  <span className="text-xs font-medium text-[#0C7347]">
                    ⭐ {task.rating}/5
                  </span>
                )}
              </div>

              {/* Remarks if available */}
              {task.remarks && (
                <p className="text-xs text-gray-400 mt-2 italic">"{task.remarks}"</p>
              )}

            </div>
          ))
        )}
      </div>

    </div>
  );
}