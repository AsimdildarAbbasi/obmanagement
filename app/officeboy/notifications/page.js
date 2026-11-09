'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { API } from '../../lib/api';

function formatDate(d) {
  if (!d) return '';
  return new Date(d).toLocaleString('en-GB', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit'
  });
}

function formatBytes(bytes) {
  const n = Number(bytes) || 0;
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

export default function NotificationsPage() {
  const router  = useRouter();
  const [user,    setUser]    = useState(null);
  const [tasks,   setTasks]   = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const stored = sessionStorage.getItem('user');
    if (!stored) { router.push('/'); return; }
    const parsed = JSON.parse(stored);
    if (parsed.role !== 1) { router.push('/'); return; }
    setUser(parsed);
    fetchTasks(parsed.id);

    const timer = setInterval(() => fetchTasks(parsed.id), 30000);
    return () => clearInterval(timer);
  }, []);

  async function fetchTasks(id) {
    try {
      const res = await fetch(`${API}/api/officeboy/${id}/tasks`);
      const text = await res.text();                          // read as text first
      const json = text ? JSON.parse(text) : [];             // parse only if not empty
      const normalized = (Array.isArray(json) ? json : []).map(t => ({
        ...t,
        taskId: t.taskId ?? t.TaskId ?? t.id ?? t.Id,
        description: t.description ?? t.Description ?? '',
        status: t.status ?? t.Status ?? '',
        location: t.location ?? t.Location ?? '',
        latitude: t.latitude ?? t.Latitude,
        longitude: t.longitude ?? t.Longitude,
        assignedBy: t.assignedBy ?? t.AssignedBy ?? '',
        taskTime: t.taskTime ?? t.TaskTime,
        isOutsideCampus: t.isOutsideCampus ?? t.IsOutsideCampus ?? false,
        attachments: Array.isArray(t.attachments) ? t.attachments : [],
      }));
      const pendingOnly = normalized.filter(t => t.status === 'Pending');
      setTasks(pendingOnly);
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
        <h1 className="text-2xl font-bold text-gray-800">Notifications</h1>
        <p className="text-sm text-gray-400 mt-1">
          {tasks.length} new task{tasks.length !== 1 ? 's' : ''} assigned to you
        </p>
      </div>

      {/* ── Notification list ── */}
      <div className="flex flex-col gap-3">
        {tasks.length === 0 ? (
          <div className="bg-white rounded-2xl py-12 text-center shadow-sm border border-gray-100">
            <p className="text-gray-400 text-sm">No new notifications</p>
          </div>
        ) : (
          tasks.map(task => (
            <div key={task.taskId}
              className="bg-white rounded-2xl px-6 py-4 shadow-sm border border-gray-100 flex items-start gap-4">

              {/* Bell icon */}
              <div className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 bg-[#0C7347]/10">
                <svg width="18" height="18" fill="none" stroke="#0C7347" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round"
                    d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                </svg>
              </div>

              {/* Notification content */}
              <div className="flex-1">
                <p className="text-sm font-semibold text-gray-800">
                  New Task Assigned
                </p>
                <p className="text-sm text-gray-600 mt-0.5">{task.description}</p>
                <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                  <span className="text-xs text-gray-400">by {task.assignedBy}</span>
                  <span className="text-xs text-gray-400">·</span>
                  <span className="flex items-center gap-1 text-xs text-gray-400">
                    <svg width="11" height="11" fill="none" stroke="#9CA3AF" strokeWidth="2" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round"
                        d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    </svg>
                    {task.location}
                  </span>
                  <span className="text-xs text-gray-400">·</span>
                  <span className="text-xs text-gray-400">{formatDate(task.taskTime)}</span>
                  {task.isOutsideCampus && (
                    <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">
                      Outside campus
                    </span>
                  )}
                </div>

                {task.attachments.length > 0 && (
                  <div className="mt-2 flex flex-col gap-1">
                    {task.attachments.map(attachment => (
                      <a
                        key={attachment.id}
                        href={`${API}${attachment.path}`}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center gap-1.5 text-xs text-[#0C7347] font-semibold hover:underline">
                        <svg width="11" height="11" fill="none" stroke="#0C7347" strokeWidth="2" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round"
                            d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                        </svg>
                        <span className="truncate">{attachment.fileName}</span>
                        <span className="text-gray-400 font-normal shrink-0">{formatBytes(attachment.sizeBytes)}</span>
                      </a>
                    ))}
                  </div>
                )}
              </div>

              {/* New badge */}
              <span className="text-xs font-bold px-2 py-0.5 rounded-full flex-shrink-0 bg-[#0C7347]/10 text-[#0C7347]">
                New
              </span>

            </div>
          ))
        )}
      </div>

    </div>
  );
}