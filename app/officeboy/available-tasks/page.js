'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import 'leaflet/dist/leaflet.css';
import { API } from '../../lib/api';
import UserAvatar from '../../components/UserAvatar';

// Leaflet components must be client-side only in Next.js
const MapContainer = dynamic(() => import('react-leaflet').then((m) => m.MapContainer), { ssr: false });
const TileLayer = dynamic(() => import('react-leaflet').then((m) => m.TileLayer), { ssr: false });
const Marker = dynamic(() => import('react-leaflet').then((m) => m.Marker), { ssr: false });
const Popup = dynamic(() => import('react-leaflet').then((m) => m.Popup), { ssr: false });

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

function hasCoords(t) {
  return (
    t.latitude !== null && t.latitude !== undefined &&
    t.longitude !== null && t.longitude !== undefined &&
    !isNaN(Number(t.latitude)) && !isNaN(Number(t.longitude))
  );
}

export default function AvailableTasksPage() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const stored = sessionStorage.getItem('user');
    if (!stored) { router.push('/'); return; }
    const parsed = JSON.parse(stored);
    if (parsed.role !== 1) { router.push('/'); return; }
    setUser(parsed);
    fetchTasks(parsed.id);

    // Keep the task list fresh while the page is open.
    const timer = setInterval(() => fetchTasks(parsed.id), 30000);
    return () => clearInterval(timer);
  }, []);

  // Marker icon fix (same as your assign-task page)
  useEffect(() => {
    if (typeof window === 'undefined') return;
    import('leaflet').then((L) => {
      delete L.Icon.Default.prototype._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: '/images/leaflet/marker-icon-2x.png',
        iconUrl: '/images/leaflet/marker-icon.png',
        shadowUrl: '/images/leaflet/marker-shadow.png',
      });
    });
  }, []);

  async function fetchTasks(id) {
    try {
      const res = await fetch(`${API}/api/officeboy/${id}/tasks`);
      const text = await res.text();
      const json = text ? JSON.parse(text) : [];
      const normalized = (Array.isArray(json) ? json : []).map(t => ({
        ...t,
        taskId: t.taskId ?? t.TaskId ?? t.id ?? t.Id,
        description: t.description ?? t.Description ?? '',
        status: t.status ?? t.Status ?? '',
        location: t.location ?? t.Location ?? '',
        latitude: t.latitude ?? t.Latitude,
        longitude: t.longitude ?? t.Longitude,
        assignedBy: t.assignedBy ?? t.AssignedBy ?? '',
        assignedByImageUrl: t.assignedByImageUrl ?? t.AssignedByImageUrl ?? null,
        taskTime: t.taskTime ?? t.TaskTime,
        rating: t.rating ?? t.Rating,
        remarks: t.remarks ?? t.Remarks ?? '',
        isOutsideCampus: t.isOutsideCampus ?? t.IsOutsideCampus ?? false,
        attachments: Array.isArray(t.attachments) ? t.attachments : [],
        currentLocationId: t.currentLocationId ?? t.CurrentLocationId,
        currentLocationName: t.currentLocationName ?? t.CurrentLocationName,
      }));
      setTasks(normalized.filter(t => t.status === 'Pending' || t.status === 'In Progress'));
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  async function handleComplete(taskId) {
    try {
      await fetch(`${API}/api/tasks/${taskId}/complete`, { method: 'PUT' });
      fetchTasks(user.id);
    } catch (e) {
      console.error(e);
    }
  }

  async function handleStart(taskId) {
    try {
      await fetch(`${API}/api/tasks/${taskId}/start`, { method: 'PUT' });
      fetchTasks(user.id);
    } catch (e) {
      console.error(e);
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

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Available Tasks</h1>
        <div className="w-9 h-9 rounded-full bg-white border border-gray-200 flex items-center justify-center shadow-sm">
          <svg width="18" height="18" fill="none" stroke="#6B7280" strokeWidth="2" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round"
              d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
          </svg>
        </div>
      </div>

      {/* Task list */}
      <div className="flex flex-col gap-4 max-w-2xl">
        {tasks.length === 0 ? (
          <div className="bg-white rounded-2xl py-12 text-center shadow-sm border border-gray-100">
            <p className="text-gray-400 text-sm">No available tasks</p>
          </div>
        ) : (
          tasks.map(task => (
            <div key={task.taskId}
              className="bg-white rounded-2xl px-6 py-5 shadow-sm border border-gray-100">

              {/* Title + status */}
              <div className="flex items-start justify-between gap-4 mb-2">
                <p className="text-sm font-bold text-gray-800 break-words">{task.description}</p>
                <div className="flex flex-col items-end gap-1 flex-shrink-0">
                  <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-[#0C7347]/10 text-[#0C7347]">
                    {task.status === 'Pending' ? 'Pending' : 'In-Progress'}
                  </span>
                  {task.isOutsideCampus && (
                    <span className="text-[11px] font-semibold px-2.5 py-1 rounded-full bg-amber-100 text-amber-700">
                      Outside campus
                    </span>
                  )}
                </div>
              </div>

              {/* Meta */}
              <div className="flex flex-wrap items-center gap-4 mb-4">
                <span className="flex items-center gap-1.5 text-xs text-gray-500">
                  <UserAvatar name={task.assignedBy} imageUrl={task.assignedByImageUrl} size={20} />
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

              {/* Attachments */}
              {task.attachments.length > 0 && (
                <div className="mb-4 pt-3 border-t border-gray-100">
                  <p className="text-xs font-bold text-gray-600 mb-1.5">Attachments</p>
                  <div className="flex flex-col gap-1.5">
                    {task.attachments.map(attachment => (
                      <a
                        key={attachment.id}
                        href={`${API}${attachment.path}`}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center gap-2 text-xs text-[#0C7347] font-semibold hover:underline">
                        <svg width="12" height="12" fill="none" stroke="#0C7347" strokeWidth="2" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round"
                            d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                        </svg>
                        <span className="truncate">{attachment.fileName}</span>
                        <span className="text-gray-400 font-normal shrink-0">{formatBytes(attachment.sizeBytes)}</span>
                      </a>
                    ))}
                  </div>
                </div>
              )}

              {/* NEW: Map showing the exact location chosen by the faculty */}
              {hasCoords(task) ? (
                <div className="mb-4 rounded-xl overflow-hidden border border-gray-200 bg-gray-50">
                  <div className="h-48 w-full relative z-0">
                    <MapContainer
                      key={`${task.taskId}-${task.latitude}-${task.longitude}`}
                      center={[Number(task.latitude), Number(task.longitude)]}
                      zoom={17}
                      scrollWheelZoom={false}
                      className="h-full w-full z-0"
                    >
                      <TileLayer
                        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                      />
                      <Marker position={[Number(task.latitude), Number(task.longitude)]}>
                        <Popup>
                          <strong>{task.location}</strong>
                        </Popup>
                      </Marker>
                    </MapContainer>
                  </div>
                  <div className="px-3 py-1.5 bg-white text-[11px] text-gray-500 border-t border-gray-100 flex items-center justify-between">
                    <span>
                      {Number(task.latitude).toFixed(5)}, {Number(task.longitude).toFixed(5)}
                    </span>
                    <a
                      href={`https://www.google.com/maps/dir/?api=1&destination=${task.latitude},${task.longitude}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-semibold text-[#0C7347] hover:underline"
                    >
                      Get directions
                    </a>
                  </div>
                </div>
              ) : (
                <div className="mb-4 rounded-xl border border-dashed border-gray-200 bg-gray-50 py-4 text-center text-xs text-gray-400">
                  No map coordinates saved for this location
                </div>
              )}

              {/* Action button */}
              {task.status === 'Pending' ? (
                <button
                  onClick={() => handleStart(task.taskId)}
                  className="px-5 py-2 rounded-xl text-white text-sm font-semibold"
                  style={{ backgroundColor: '#0C7347' }}>
                  Start Task
                </button>
              ) : (
                <button
                  onClick={() => handleComplete(task.taskId)}
                  className="px-5 py-2 rounded-xl text-white text-sm font-semibold"
                  style={{ backgroundColor: '#0C7347' }}>
                  Mark Complete
                </button>
              )}

            </div>
          ))
        )}
      </div>

    </div>
  );
}