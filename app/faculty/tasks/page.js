'use client';
import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import 'leaflet/dist/leaflet.css';
import { API } from '../../lib/api';
import UserAvatar from '../../components/UserAvatar';

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

function formatBytes(bytes) {
  const n = Number(bytes) || 0;
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
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
function TaskCard({ task, facultyId, onReviewed }) {
  const [showReview, setShowReview] = useState(false);
  const [rating, setRating] = useState(0);
  const [remarks, setRemarks] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const [editing, setEditing] = useState(false);
  const [descDraft, setDescDraft] = useState(task.description || '');
  const [savingDesc, setSavingDesc] = useState(false);
  const [editError, setEditError] = useState('');

  const [uploading, setUploading] = useState(false);
  const [attachmentError, setAttachmentError] = useState('');
  const fileInputRef = useRef(null);

  const canEdit = task.status === 'Pending';
  const attachments = Array.isArray(task.attachments) ? task.attachments : [];

  async function submitReview() {
    if (rating === 0) { setError('Please select a star rating.'); return; }
    setSubmitting(true);
    setError('');
    try {
      const res = await fetch(`${API}/api/tasks/${task.taskId}/rate`, {
        method: 'PUT',
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

  async function saveDescription() {
    if (!descDraft.trim()) { setEditError('Description is required.'); return; }
    setSavingDesc(true);
    setEditError('');
    try {
      const res = await fetch(`${API}/api/tasks/${task.taskId}/description`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          facultyAccountId: facultyId,
          description: descDraft.trim(),
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) { setEditError(data.message || 'Could not update description.'); return; }
      setEditing(false);
      onReviewed();
    } catch {
      setEditError('Server error. Try again.');
    } finally {
      setSavingDesc(false);
    }
  }

  async function handleUpload(e) {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    setUploading(true);
    setAttachmentError('');

    try {
      const formData = new FormData();
      files.forEach(file => formData.append('files', file));

      const res = await fetch(`${API}/api/tasks/${task.taskId}/attachments`, {
        method: 'POST',
        body: formData,
      });
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setAttachmentError(data.message || 'Could not upload attachments.');
        return;
      }

      if (fileInputRef.current) fileInputRef.current.value = '';
      onReviewed();
    } catch {
      setAttachmentError('Could not upload attachments.');
    } finally {
      setUploading(false);
    }
  }

  async function removeAttachment(attachmentId) {
    setAttachmentError('');
    try {
      const res = await fetch(`${API}/api/tasks/attachments/${attachmentId}`, {
        method: 'DELETE',
      });
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setAttachmentError(data.message || 'Could not remove attachment.');
        return;
      }

      onReviewed();
    } catch {
      setAttachmentError('Could not remove attachment.');
    }
  }

  return (
    <div className="bg-white rounded-2xl px-6 py-5 shadow-sm border border-gray-100 mb-3">

      {/* Title + status */}
      <div className="flex items-start justify-between gap-4 mb-1">
        {editing ? (
          <div className="flex-1">
            <textarea
              rows={3}
              value={descDraft}
              onChange={e => setDescDraft(e.target.value)}
              className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-700 outline-none resize-none focus:border-[#0C7347]"
            />
            {editError && <p className="text-xs text-red-500 mt-1">{editError}</p>}
            <div className="flex gap-2 mt-2">
              <button
                onClick={saveDescription}
                disabled={savingDesc}
                className="px-4 py-1.5 rounded-lg text-white text-xs font-semibold disabled:opacity-70"
                style={{ backgroundColor: '#0C7347' }}>
                {savingDesc ? 'Saving...' : 'Save'}
              </button>
              <button
                onClick={() => { setEditing(false); setDescDraft(task.description || ''); setEditError(''); }}
                className="px-4 py-1.5 rounded-lg text-xs font-medium border border-gray-200 text-gray-600 hover:bg-gray-50">
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-gray-800 break-words">{task.description}</p>
            {canEdit && (
              <button
                onClick={() => { setEditing(true); setDescDraft(task.description || ''); }}
                className="mt-1 text-xs font-semibold text-[#0C7347] hover:underline">
                Edit description
              </button>
            )}
          </div>
        )}

        <div className="flex flex-col items-end gap-1 shrink-0">
          <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-[#0C7347]/10 text-[#0C7347]">
            {task.status}
          </span>
          {task.isOutsideCampus && (
            <span className="text-[11px] font-semibold px-2.5 py-1 rounded-full bg-amber-100 text-amber-700">
              Outside campus
            </span>
          )}
        </div>
      </div>

      {/* Meta */}
      <div className="flex flex-wrap items-center gap-3 mb-3">
        <span className="flex items-center gap-1.5 text-xs text-gray-500">
          <UserAvatar
            name={task.assignedTo || task.officeBoy}
            imageUrl={task.officeBoyImageUrl}
            size={20}
          />
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

      {/* Attachments */}
      {(attachments.length > 0 || canEdit) && (
        <div className="mt-3 pt-3 border-t border-gray-100">
          <div className="flex items-center justify-between gap-3 mb-2">
            <p className="text-xs font-bold text-gray-600">
              Attachments {attachments.length > 0 && <span className="text-gray-400">({attachments.length})</span>}
            </p>
            {canEdit && (
              <label className={`text-xs font-semibold px-3 py-1.5 rounded-lg cursor-pointer border border-[#0C7347]/30 text-[#0C7347] hover:bg-[#0C7347]/5 ${uploading ? 'opacity-60 cursor-wait' : ''}`}>
                {uploading ? 'Uploading...' : '+ Add files'}
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  className="hidden"
                  onChange={handleUpload}
                  disabled={uploading}
                />
              </label>
            )}
          </div>

          {attachments.length === 0 ? (
            <p className="text-xs text-gray-400">No attachments yet</p>
          ) : (
            <div className="flex flex-col gap-1.5">
              {attachments.map(attachment => (
                <div key={attachment.id} className="flex items-center gap-2 text-xs">
                  <svg width="12" height="12" fill="none" stroke="#9CA3AF" strokeWidth="2" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round"
                      d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                  </svg>
                  <a
                    href={`${API}${attachment.path}`}
                    target="_blank"
                    rel="noreferrer"
                    className="text-[#0C7347] font-semibold hover:underline truncate">
                    {attachment.fileName}
                  </a>
                  <span className="text-gray-400 shrink-0">{formatBytes(attachment.sizeBytes)}</span>
                  {canEdit && (
                    <button
                      onClick={() => removeAttachment(attachment.id)}
                      className="text-red-500 font-semibold hover:underline shrink-0">
                      Remove
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}

          {attachmentError && <p className="text-xs text-red-500 mt-1">{attachmentError}</p>}
        </div>
      )}

      {/* Already reviewed — show stars + Reviewed label */}
      {task.rating && (
        <div className="flex items-center gap-3 mt-1">
          <StarRating value={task.rating} readonly />
          <span className="text-xs font-medium text-gray-500">Reviewed</span>
          {task.remarks && (
            <span className="text-xs text-gray-400 italic">&ldquo;{task.remarks}&rdquo;</span>
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
  const [user, setUser] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('Active'); // Was 'Pending'

  useEffect(() => {
    if (typeof window !== 'undefined') {
      import('leaflet').then((L) => {
        delete L.Icon.Default.prototype._getIconUrl;
        L.Icon.Default.mergeOptions({
          iconRetinaUrl: '/images/leaflet/marker-icon-2x.png',
          iconUrl: '/images/leaflet/marker-icon.png',
          shadowUrl: '/images/leaflet/marker-shadow.png',
        });
      });
    }

    const stored = sessionStorage.getItem('user');
    if (!stored) { router.push('/'); return; }
    const parsed = JSON.parse(stored);
    if (parsed.role !== 2) { router.push('/'); return; }
    setUser(parsed);
    fetchTasks(parsed);
  }, []);

  async function fetchTasks(parsed) {
    try {
      const res = await fetch(`${API}/api/tasks/byfaculty-tasks/${parsed.id}`);
      const text = await res.text();
      const raw = text ? JSON.parse(text) : [];
      const all = (Array.isArray(raw) ? raw : []).map(t => ({
        ...t,
        taskId: t.taskId ?? t.TaskId ?? t.id ?? t.Id,
        description: t.description ?? t.Description ?? '',
        status: t.status ?? t.Status ?? '',
        location: t.location ?? t.Location ?? '',
        latitude: t.latitude ?? t.Latitude,
        longitude: t.longitude ?? t.Longitude,
        faculty: t.faculty ?? t.Faculty ?? '',
        officeBoy: t.officeBoy ?? t.OfficeBoy ?? '',
        assignedTo: t.assignedTo ?? t.officeBoy ?? t.OfficeBoy ?? '',
        officeBoyImageUrl: t.officeBoyImageUrl ?? t.OfficeBoyImageUrl ?? null,
        taskTime: t.taskTime ?? t.TaskTime,
        rating: t.rating ?? t.Rating,
        remarks: t.remarks ?? t.Remarks ?? '',
        isOutsideCampus: t.isOutsideCampus ?? t.IsOutsideCampus ?? false,
        attachments: Array.isArray(t.attachments) ? t.attachments : [],
        currentLocationId: t.currentLocationId ?? t.CurrentLocationId,
        currentLocationName: t.currentLocationName ?? t.CurrentLocationName,
        currentLatitude: t.currentLatitude ?? t.CurrentLatitude,
        currentLongitude: t.currentLongitude ?? t.CurrentLongitude,
      }));
      setTasks(all);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  const pendingTasks = tasks.filter(t => t.status === 'Pending' || t.status === 'In Progress');
  const completedTasks = tasks.filter(t => t.status === 'Completed');
  const displayed = activeTab === 'Active' ? pendingTasks : completedTasks;

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
          <TaskCard key={t.taskId} task={t} facultyId={user?.id} onReviewed={() => fetchTasks(user)} />
        ))
      )}

    </div>
  );
}