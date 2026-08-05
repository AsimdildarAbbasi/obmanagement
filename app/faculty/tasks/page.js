'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import 'leaflet/dist/leaflet.css';

const API = 'http://localhost:5077';

const MapContainer = dynamic(() => import('react-leaflet').then(mod => mod.MapContainer), { ssr: false });
const TileLayer = dynamic(() => import('react-leaflet').then(mod => mod.TileLayer), { ssr: false });
const Marker = dynamic(() => import('react-leaflet').then(mod => mod.Marker), { ssr: false });
const Popup = dynamic(() => import('react-leaflet').then(mod => mod.Popup), { ssr: false });

function formatDate(d) {
  if (!d) return '';
  return new Date(d).toLocaleString('en-GB', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit'
  });
}

// ── Star Rating Component ───────────────────────────────────────────
function StarRating({ value, onChange, readonly = false }) {
  const [hovered, setHovered] = useState(0);
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map(star => (
        <button
          key={star}
          type="button"
          disabled={readonly}
          onClick={() => !readonly && onChange && onChange(star)}
          onMouseEnter={() => !readonly && setHovered(star)}
          onMouseLeave={() => !readonly && setHovered(0)}
          className="text-2xl transition-transform hover:scale-110 disabled:cursor-default">
          <span style={{ color: star <= (hovered || value) ? '#F59E0B' : '#D1D5DB' }}>★</span>
        </button>
      ))}
    </div>
  );
}

// ── Task Card ───────────────────────────────────────────────────────
function TaskCard({ task, onReviewed }) {
  const [showReview, setShowReview] = useState(false);
  const [rating,     setRating]     = useState(0);
  const [remarks,    setRemarks]    = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error,      setError]      = useState('');

  async function submitReview() {
    if (rating === 0) { setError('Please select a star rating.'); return; }
    setSubmitting(true);
    setError('');
    try {
      const res = await fetch(`${API}/api/tasks/${task.taskId}/rate`, {
        method:  'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rating, remarks }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.message || 'Failed to submit review.'); return; }
      setShowReview(false);
      onReviewed();
    } catch (e) {
      setError('Server error. Try again.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="bg-white rounded-2xl px-6 py-5 shadow-sm border border-gray-100 mb-3">

      {/* Title + status */}
      <div className="flex items-start justify-between gap-4 mb-1">
        <p className="text-sm font-bold text-gray-800">{task.description}</p>
        <span className="text-xs font-semibold px-2.5 py-1 rounded-full shrink-0 bg-[#0C7347]/10 text-[#0C7347]">
          {task.status}
        </span>
      </div>

      {/* Meta */}
      <div className="flex flex-wrap items-center gap-3 mb-3">
        <span className="flex items-center gap-1 text-xs text-gray-500">
          <svg width="12" height="12" fill="none" stroke="#9CA3AF" strokeWidth="2" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round"
              d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
          </svg>
          {task.assignedTo || task.officeBoy}
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

      {/* Already reviewed — show stars + Reviewed label */}
      {task.rating && (
        <div className="flex items-center gap-3 mt-1">
          <StarRating value={task.rating} readonly />
          <span className="text-xs font-medium text-gray-500">Reviewed</span>
          {task.remarks && (
            <span className="text-xs text-gray-400 italic">"{task.remarks}"</span>
          )}
        </div>
      )}

      {/* Completed + not reviewed — Submit Review button */}
      {task.status === 'Completed' && !task.rating && !showReview && (
        <button
          onClick={() => setShowReview(true)}
          className="mt-3 px-5 py-2 rounded-xl text-white text-sm font-semibold"
          style={{ backgroundColor: '#0C7347' }}>
          Submit Review
        </button>
      )}

      {/* Review form */}
      {showReview && (
        <div className="mt-4 pt-4 border-t border-gray-100">
          <p className="text-sm font-semibold text-gray-700 mb-3">Rate Performance</p>

          <StarRating value={rating} onChange={setRating} />

          <textarea
            rows={3}
            placeholder="Add a comment..."
            value={remarks}
            onChange={e => setRemarks(e.target.value)}
            className="w-full mt-3 border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-700 outline-none resize-none focus:border-[#0C7347]"
          />

          {error && <p className="text-xs text-red-500 mt-1">{error}</p>}

          <div className="flex gap-3 mt-3">
            <button
              onClick={submitReview}
              disabled={submitting}
              className="px-6 py-2 rounded-xl text-white text-sm font-semibold disabled:opacity-70"
              style={{ backgroundColor: '#0C7347' }}>
              {submitting ? 'Submitting...' : 'Submit'}
            </button>
            <button
              onClick={() => { setShowReview(false); setRating(0); setRemarks(''); setError(''); }}
              className="px-6 py-2 rounded-xl text-sm font-medium border border-gray-200 text-gray-600 hover:bg-gray-50">
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Map for In Progress Tasks */}
      {task.status === 'In Progress' && task.latitude && task.longitude && (
        <div className="mt-4 rounded-xl overflow-hidden border border-gray-200 z-0">
          <MapContainer 
            center={[task.latitude, task.longitude]} 
            zoom={15} 
            className="h-64 w-full z-0"
          >
            <TileLayer
              attribution='&copy; OpenStreetMap'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            {/* Destination Marker */}
            <Marker position={[task.latitude, task.longitude]}>
              <Popup><b>Destination:</b> {task.location}</Popup>
            </Marker>
            
            {/* Office Boy Current Marker */}
            {task.currentLatitude && task.currentLongitude && (
              <Marker position={[task.currentLatitude, task.currentLongitude]}>
                <Popup><b>Office Boy is here:</b> {task.currentLocationName}</Popup>
              </Marker>
            )}
          </MapContainer>
        </div>
      )}

    </div>
  );
}

// ── Main Page ───────────────────────────────────────────────────────
export default function FacultyTasksPage() {
  const router = useRouter();
  const [user,      setUser]      = useState(null);
  const [tasks,     setTasks]     = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [activeTab, setActiveTab] = useState('Active'); // Was 'Pending'

  useEffect(() => {
    if (typeof window !== 'undefined') {
      import('leaflet').then((L) => {
        delete L.Icon.Default.prototype._getIconUrl;
        L.Icon.Default.mergeOptions({
          iconRetinaUrl: new URL('leaflet/dist/images/marker-icon-2x.png', import.meta.url).href,
          iconUrl: new URL('leaflet/dist/images/marker-icon.png', import.meta.url).href,
          shadowUrl: new URL('leaflet/dist/images/marker-shadow.png', import.meta.url).href,
        });
      });
    }

    const stored = localStorage.getItem('user');
    if (!stored) { router.push('/'); return; }
    const parsed = JSON.parse(stored);
    if (parsed.role !== 2) { router.push('/'); return; }
    setUser(parsed);
    fetchTasks(parsed);
  }, []);

  async function fetchTasks(parsed) {
    try {
      const res  = await fetch(`${API}/api/tasks`);
      const text = await res.text();
      const all  = text ? JSON.parse(text) : [];
      const mine = all.filter(
        t => t.faculty?.toLowerCase() === parsed.name?.toLowerCase()
      );
      setTasks(mine);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  const pendingTasks   = tasks.filter(t => t.status === 'Pending' || t.status === 'In Progress');
  const completedTasks = tasks.filter(t => t.status === 'Completed');
  const displayed      = activeTab === 'Active' ? pendingTasks : completedTasks;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="w-8 h-8 border-4 border-[#0C7347] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-8">

      <h1 className="text-2xl font-bold text-gray-800 mb-6">Tasks</h1>

      {/* Tabs */}
      <div className="flex gap-3 mb-6">
        <button onClick={() => setActiveTab('Active')}
          className={`px-5 py-2 rounded-xl text-sm font-semibold transition-colors ${activeTab === 'Active' ? 'bg-[#0C7347] text-white' : 'bg-white text-gray-700 border border-gray-200 hover:bg-gray-50'}`}>
          Active ({pendingTasks.length})
        </button>
        <button onClick={() => setActiveTab('Completed')}
          className={`px-5 py-2 rounded-xl text-sm font-semibold transition-colors ${activeTab === 'Completed' ? 'bg-[#0C7347] text-white' : 'bg-white text-gray-700 border border-gray-200 hover:bg-gray-50'}`}>
          Completed ({completedTasks.length})
        </button>
      </div>

      {/* Task list */}
      {displayed.length === 0 ? (
        <div className="bg-white rounded-2xl py-12 text-center shadow-sm border border-gray-100">
          <p className="text-gray-400 text-sm">No {activeTab.toLowerCase()} tasks</p>
          {activeTab === 'Active' && (
            <button onClick={() => router.push('/faculty/assign-task')}
              className="mt-3 text-sm font-semibold px-5 py-2 rounded-xl text-white"
              style={{ backgroundColor: '#0C7347' }}>
              Assign a Task
            </button>
          )}
        </div>
      ) : (
        displayed.map(t => (
          <TaskCard key={t.taskId} task={t} onReviewed={() => fetchTasks(user)} />
        ))
      )}

    </div>
  );
}