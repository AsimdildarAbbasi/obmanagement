'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import 'leaflet/dist/leaflet.css';
import { API } from '../../lib/api';
import UserAvatar from '../../components/UserAvatar';

const MapContainer = dynamic(() => import('react-leaflet').then((m) => m.MapContainer), { ssr: false });
const TileLayer = dynamic(() => import('react-leaflet').then((m) => m.TileLayer), { ssr: false });
const Marker = dynamic(() => import('react-leaflet').then((m) => m.Marker), { ssr: false });
const Popup = dynamic(() => import('react-leaflet').then((m) => m.Popup), { ssr: false });
const Circle = dynamic(() => import('react-leaflet').then((m) => m.Circle), { ssr: false });
const AddLocationModal = dynamic(() => import('./AddLocationModal'), { ssr: false });

const GREEN = '#0C7347';

/* ---------- tiny inline icons ---------- */
const Icon = ({ d, className = 'w-5 h-5' }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"
    strokeLinecap="round" strokeLinejoin="round" className={className}>
    {d}
  </svg>
);
const icons = {
  now: <><path d="M13 2 4 14h7l-1 8 9-12h-7z" /></>,
  later: <><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>,
  geofence: <><path d="M12 21s7-6.2 7-11a7 7 0 1 0-14 0c0 4.8 7 11 7 11z" /><circle cx="12" cy="10" r="2.5" /></>,
  pin: <><path d="M12 21s7-6.2 7-11a7 7 0 1 0-14 0c0 4.8 7 11 7 11z" /><circle cx="12" cy="10" r="2.5" /></>,
  user: <><circle cx="12" cy="8" r="4" /><path d="M4 21c0-4 4-6 8-6s8 2 8 6" /></>,
  clip: <><path d="m21 11-9 9a5 5 0 0 1-7-7l9-9a3.5 3.5 0 0 1 5 5l-9 9a2 2 0 0 1-3-3l8-8" /></>,
  text: <><path d="M4 6h16M4 12h16M4 18h10" /></>,
  plus: <><path d="M12 5v14M5 12h14" /></>,
  send: <><path d="m22 2-11 11M22 2l-7 20-4-9-9-4z" /></>,
};

const MODES = [
  { id: 'now', label: 'Now', hint: 'Send immediately' },
  { id: 'later', label: 'Later', hint: 'Pick a date & time' },
  { id: 'geofence', label: 'My Location', hint: 'Trigger by arrival or exit' },
];

const inputCls =
  'w-full bg-white border border-gray-200 rounded-xl px-4 py-3 text-[15px] text-gray-800 placeholder-gray-400 outline-none transition focus:border-[#0C7347] focus:ring-4 focus:ring-[#0C7347]/10';

function Section({ icon, title, hint, children }) {
  return (
    <section className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
      <div className="flex items-center gap-3 mb-4">
        <span className="w-9 h-9 rounded-xl bg-[#E8F5E9] text-[#0C7347] flex items-center justify-center">
          <Icon d={icons[icon]} className="w-[18px] h-[18px]" />
        </span>
        <div>
          <h3 className="text-[15px] font-bold text-gray-800 leading-tight">{title}</h3>
          {hint && <p className="text-xs text-gray-400 mt-0.5">{hint}</p>}
        </div>
      </div>
      {children}
    </section>
  );
}

export default function AssignTaskPage() {
  const router = useRouter();

  const [user, setUser] = useState(null);
  const [locations, setLocations] = useState([]);
  const [officeboys, setOfficeBoys] = useState([]);
  const [geofences, setGeofences] = useState([]);
  const [categories, setCategories] = useState([]);

  const [description, setDescription] = useState('');
  const [locationId, setLocationId] = useState('');
  const [obId, setObId] = useState('');

  const [selectedLocationId, setSelectedLocationId] = useState('');
  const [selectedLocation, setSelectedLocation] = useState(null);
  const [showAddLocation, setShowAddLocation] = useState(false);

  const [taskMode, setTaskMode] = useState('now');
  const [scheduledAt, setScheduledAt] = useState('');

  const [geofenceId, setGeofenceId] = useState('');
  const [triggerType, setTriggerType] = useState('Enter');
  const [taskCategoryId, setTaskCategoryId] = useState(null);

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

  const [files, setFiles] = useState([]);
  const [fileInputKey, setFileInputKey] = useState(0);

  useEffect(() => {
    const stored = sessionStorage.getItem('user');
    if (!stored) { router.push('/'); return; }
    const parsed = JSON.parse(stored);
    if (parsed.role !== 2) { router.push('/'); return; }
    setUser(parsed);
    fetchDropdowns(parsed.id);
  }, []);

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

  async function fetchDropdowns(facultyId) {
    try {
      const [locRes, obRes, geoRes, catRes] = await Promise.all([
        fetch(`${API}/api/tasks/Locations`),
        fetch(`${API}/api/tasks/byfaculty/${facultyId}`),
        fetch(`${API}/api/geofencetasks/geofences`),
        fetch(`${API}/api/geofencetasks/categories`),
      ]);
      const locJson = await locRes.json();
      const obJson = await obRes.json();
      const geoJson = await geoRes.json();
      const catJson = await catRes.json();

      setLocations(Array.isArray(locJson) ? locJson : []);
      setOfficeBoys(Array.isArray(obJson) ? obJson : []);

      const geoList = Array.isArray(geoJson) ? geoJson : (geoJson ? [geoJson] : []);
      setGeofences(geoList);
      if (geoList.length > 0) setGeofenceId(String(geoList[0].id));

      setCategories(Array.isArray(catJson) ? catJson : []);
    } catch {
      setError('Could not load form data.');
    } finally {
      setLoading(false);
    }
  }

  function handleLocationCreated(newLoc) {
    setLocations((prev) => [...prev, newLoc]);
    setLocationId(String(newLoc.id));
    setSelectedLocationId(String(newLoc.id));
    setSelectedLocation(newLoc);
  }

  function resetFiles() {
    setFiles([]);
    setFileInputKey((k) => k + 1);
  }

  async function uploadAttachments(taskId) {
    if (!files.length || !taskId) return { uploaded: 0, error: '' };
    try {
      const formData = new FormData();
      files.forEach((file) => formData.append('files', file));
      const res = await fetch(`${API}/api/tasks/${taskId}/attachments`, { method: 'POST', body: formData });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) return { uploaded: 0, error: data.message || 'Could not upload attachments.' };
      return { uploaded: files.length, error: '' };
    } catch {
      return { uploaded: 0, error: 'Could not upload attachments.' };
    }
  }

  async function handleSubmit() {
    setError('');
    setSuccess('');

    if (taskMode === 'geofence') {
      if (!geofenceId) return setError('Please select a geofence location');
      if (!obId) return setError('Select office boy');

      setSubmitting(true);
      try {
        const payload = {
          facultyAccountId: user.id,
          officeBoyAccountId: parseInt(obId),
          geofenceId: parseInt(geofenceId),
          triggerType,
          taskCategoryId: taskCategoryId ? parseInt(taskCategoryId) : null,
          description:
            description.trim() ||
            (taskCategoryId ? categories.find((c) => c.id === taskCategoryId)?.name : '') ||
            `Geofence task (${triggerType})`,
        };
        if (locationId) payload.locationId = parseInt(locationId);

        const res = await fetch(`${API}/api/geofencetasks/createGeofenceTask`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        const data = await res.json();
        if (!res.ok) { setError(data.message || 'Failed to create geofence task'); return; }

        const att = await uploadAttachments(data.taskId);
        setSuccess(
          `Geofence task created! It will automatically appear for the office boy once you ${triggerType === 'Enter' ? 'enter' : 'exit'} the selected geofence area.` +
          (att.uploaded ? ` ${att.uploaded} attachment(s) uploaded.` : '') +
          (att.error ? ` ${att.error}` : '')
        );
        setDescription('');
        setTaskCategoryId(null);
        setLocationId('');
        setObId('');
        resetFiles();
        if (typeof window !== 'undefined') window.dispatchEvent(new Event('geofence-task-created'));
      } catch {
        setError('Server error');
      } finally {
        setSubmitting(false);
      }
      return;
    }

    if (!description.trim()) return setError('Please enter description');
    if (!locationId) return setError('Select location');
    if (!obId) return setError('Select office boy');
    if (taskMode === 'later' && !scheduledAt) return setError('Please select date and time for scheduled task');

    setSubmitting(true);
    try {
      const res = await fetch(`${API}/api/tasks/createTask`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          facultyAccountId: user.id,
          officeBoyAccountId: parseInt(obId),
          locationId: parseInt(locationId),
          description: description.trim(),
          taskMode,
          scheduledAt: taskMode === 'later' ? scheduledAt : null,
        }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.message || 'Failed to assign task'); return; }

      const att = await uploadAttachments(data.taskId);
      setSuccess(
        'Task assigned successfully!' +
        (att.uploaded ? ` ${att.uploaded} attachment(s) uploaded.` : '') +
        (att.error ? ` ${att.error}` : '')
      );
      setDescription('');
      setLocationId('');
      setObId('');
      setTaskMode('now');
      setScheduledAt('');
      resetFiles();
    } catch {
      setError('Server error');
    } finally {
      setSubmitting(false);
    }
  }

  const selectedOfficeBoy = officeboys.find((ob) => String(ob.id) === String(obId));
  const selectedGeofence = geofences.find((g) => String(g.id) === String(geofenceId));
  const currentLocation = locations.find((l) => String(l.id) === String(locationId));
  const isGeo = taskMode === 'geofence';

  const summaryRows = [
    { k: 'Type', v: MODES.find((m) => m.id === taskMode)?.label },
    isGeo && { k: 'Trigger', v: triggerType === 'Enter' ? 'When I enter' : 'When I exit' },
    isGeo && { k: 'Geofence', v: selectedGeofence?.name },
    taskMode === 'later' && { k: 'When', v: scheduledAt ? new Date(scheduledAt).toLocaleString() : null },
    { k: 'Location', v: currentLocation?.name },
    { k: 'Assignee', v: selectedOfficeBoy?.name },
    { k: 'Files', v: files.length ? `${files.length} attached` : null },
  ].filter(Boolean);

  return (
    <div className="min-h-full bg-gradient-to-b from-[#F3FAF5] to-[#F8FAFB] p-6 lg:p-10">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-extrabold text-gray-800">Assign Task</h1>
        <p className="text-gray-500 mt-1">Tell the office boy what needs doing, where, and when.</p>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_360px] gap-6 items-start max-w-6xl">
        {/* ---------------- LEFT: form ---------------- */}
        <div className="space-y-5">
          {/* Mode picker */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {MODES.map((m) => {
              const active = taskMode === m.id;
              return (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => setTaskMode(m.id)}
                  className={`text-left rounded-2xl border p-4 transition-all ${
                    active
                      ? 'bg-[#0C7347] border-[#0C7347] text-white shadow-lg shadow-[#0C7347]/20'
                      : 'bg-white border-gray-100 text-gray-700 hover:border-[#0C7347]/40 hover:shadow-sm'
                  }`}
                >
                  <span className={`w-10 h-10 rounded-xl flex items-center justify-center mb-3 ${
                    active ? 'bg-white/15' : 'bg-[#E8F5E9] text-[#0C7347]'
                  }`}>
                    <Icon d={icons[m.id]} />
                  </span>
                  <div className="font-bold">{m.label}</div>
                  <div className={`text-xs mt-0.5 ${active ? 'text-white/75' : 'text-gray-400'}`}>{m.hint}</div>
                </button>
              );
            })}
          </div>

          {/* Geofence-only block */}
          {isGeo && (
            <Section icon="geofence" title="Geofence area" hint="The task goes live when you cross this boundary">
              <select value={geofenceId} onChange={(e) => setGeofenceId(e.target.value)} className={inputCls}>
                <option value="">Select geofence</option>
                {geofences.map((g) => (
                  <option key={g.id} value={g.id}>{g.name}</option>
                ))}
              </select>

              {selectedGeofence?.centerLatitude && selectedGeofence?.centerLongitude && (
                <div className="mt-4 rounded-2xl overflow-hidden border border-gray-200">
                  <div className="h-56 w-full relative z-0">
                    <MapContainer
                      key={`${selectedGeofence.id}-${selectedGeofence.centerLatitude}-${selectedGeofence.centerLongitude}`}
                      center={[selectedGeofence.centerLatitude, selectedGeofence.centerLongitude]}
                      zoom={16}
                      scrollWheelZoom={false}
                      className="h-full w-full z-0"
                    >
                      <TileLayer
                        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                      />
                      <Marker position={[selectedGeofence.centerLatitude, selectedGeofence.centerLongitude]}>
                        <Popup>
                          <div className="text-xs">
                            <strong>{selectedGeofence.name}</strong><br />
                            Geofence Radius: {selectedGeofence.radiusMeters}m
                          </div>
                        </Popup>
                      </Marker>
                      <Circle
                        center={[selectedGeofence.centerLatitude, selectedGeofence.centerLongitude]}
                        radius={selectedGeofence.radiusMeters || 100}
                        pathOptions={{ color: GREEN, fillColor: GREEN, fillOpacity: 0.22, weight: 2 }}
                      />
                    </MapContainer>
                  </div>
                  <div className="px-4 py-2 bg-gray-50 text-xs text-gray-500 flex justify-between border-t border-gray-100">
                    <span>{selectedGeofence.name} · {selectedGeofence.radiusMeters}m radius</span>
                    <span>{Number(selectedGeofence.centerLatitude).toFixed(5)}, {Number(selectedGeofence.centerLongitude).toFixed(5)}</span>
                  </div>
                </div>
              )}

              {/* Trigger */}
              <div className="mt-5 inline-flex w-full p-1 rounded-xl bg-gray-100">
                {['Enter', 'Exit'].map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setTriggerType(t)}
                    className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-all ${
                      triggerType === t ? 'bg-white text-[#0C7347] shadow-sm' : 'text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    When I {t}
                  </button>
                ))}
              </div>

              {categories.length > 0 && (
                <div className="mt-5">
                  <p className="text-sm font-semibold text-gray-700 mb-2">Quick actions</p>
                  <div className="flex flex-wrap gap-2">
                    {categories.map((cat) => {
                      const sel = taskCategoryId === cat.id;
                      return (
                        <button
                          key={cat.id}
                          type="button"
                          onClick={() => {
                            if (sel) setTaskCategoryId(null);
                            else { setTaskCategoryId(cat.id); setDescription(cat.name); }
                          }}
                          className={`px-4 py-2 rounded-full text-sm font-medium border transition-all ${
                            sel
                              ? 'bg-[#E8F5E9] text-[#0C7347] border-[#0C7347] font-semibold'
                              : 'bg-white text-gray-600 border-gray-200 hover:border-[#0C7347]/50'
                          }`}
                        >
                          {cat.name}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </Section>
          )}

          {/* Description */}
          <Section
            icon="text"
            title="What needs to be done?"
            hint={isGeo ? 'Optional if a quick action is selected' : 'Be specific so it is done right the first time'}
          >
            <textarea
              rows={4}
              placeholder={isGeo ? 'Describe task (optional if quick action selected)' : 'e.g. Bring 10 chairs to Seminar Hall 2'}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className={`${inputCls} resize-none`}
            />
          </Section>

          {/* Location + Assignee side by side */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            <Section icon="pin" title="Target location" hint={isGeo ? 'Optional, defaults to Campus' : undefined}>
              <div className="flex gap-2">
                <select
                  value={locationId}
                  onChange={(e) => {
                    const id = e.target.value;
                    setLocationId(id);
                    setSelectedLocationId(id);
                    setSelectedLocation(locations.find((l) => String(l.id) === id) ?? null);
                  }}
                  className={`${inputCls} flex-1 min-w-0`}
                >
                  <option value="">Select location</option>
                  {locations.map((l, i) => (
                    <option key={l.id ?? i} value={l.id}>{l.name}</option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={() => setShowAddLocation(true)}
                  title="Add new location"
                  className="w-12 shrink-0 rounded-xl text-white flex items-center justify-center hover:brightness-110 transition"
                  style={{ backgroundColor: GREEN }}
                >
                  <Icon d={icons.plus} />
                </button>
              </div>
            </Section>

            <Section icon="user" title="Assign to">
              <div className="flex items-center gap-3">
                {selectedOfficeBoy && (
                  <UserAvatar name={selectedOfficeBoy.name} imageUrl={selectedOfficeBoy.profileImageUrl} size={44} />
                )}
                <select value={obId} onChange={(e) => setObId(e.target.value)} className={`${inputCls} flex-1 min-w-0`}>
                  <option value="">Select office boy</option>
                  {officeboys.map((ob, i) => (
                    <option key={ob.id ?? i} value={ob.id}>{ob.name}</option>
                  ))}
                </select>
              </div>
            </Section>
          </div>

          {/* Schedule */}
          {taskMode === 'later' && (
            <Section icon="later" title="Schedule" hint="The task is sent at this date and time">
              <input
                type="datetime-local"
                value={scheduledAt}
                onChange={(e) => setScheduledAt(e.target.value)}
                className={inputCls}
              />
            </Section>
          )}

          {/* Attachments */}
          <Section icon="clip" title="Attachments" hint="Optional · uploaded after the task is created">
            <label className="flex flex-col items-center justify-center gap-1 border-2 border-dashed border-gray-200 hover:border-[#0C7347]/60 hover:bg-[#F3FAF5] rounded-2xl py-7 cursor-pointer transition">
              <span className="w-10 h-10 rounded-full bg-[#E8F5E9] text-[#0C7347] flex items-center justify-center">
                <Icon d={icons.clip} />
              </span>
              <span className="text-sm font-semibold text-gray-700">
                {files.length ? `${files.length} file${files.length === 1 ? '' : 's'} selected` : 'Click to choose files'}
              </span>
              <span className="text-xs text-gray-400">You can select more than one</span>
              <input
                key={fileInputKey}
                type="file"
                multiple
                className="hidden"
                onChange={(e) => setFiles(Array.from(e.target.files || []))}
              />
            </label>
            {files.length > 0 && (
              <ul className="mt-3 flex flex-wrap gap-2">
                {files.map((f, i) => (
                  <li key={i} className="text-xs bg-gray-100 text-gray-600 rounded-full px-3 py-1 max-w-[220px] truncate">
                    {f.name}
                  </li>
                ))}
              </ul>
            )}
          </Section>
        </div>

        {/* ---------------- RIGHT: summary ---------------- */}
        <aside className="xl:sticky xl:top-6 space-y-4">
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="px-6 py-5 text-white" style={{ background: `linear-gradient(135deg, ${GREEN}, #12915d)` }}>
              <p className="text-sm text-white/80">Task summary</p>
              <p className="text-lg font-bold mt-1 line-clamp-2">
                {description.trim() || 'Your task will appear here'}
              </p>
            </div>

            <dl className="px-6 py-4 divide-y divide-gray-100">
              {summaryRows.map((r) => (
                <div key={r.k} className="flex justify-between gap-4 py-2.5 text-sm">
                  <dt className="text-gray-500">{r.k}</dt>
                  <dd className={`text-right font-semibold ${r.v ? 'text-gray-800' : 'text-gray-300'}`}>
                    {r.v || 'Not set'}
                  </dd>
                </div>
              ))}
            </dl>

            <div className="px-6 pb-6">
              {error && (
                <p className="mb-3 text-sm text-red-700 bg-red-50 border border-red-100 rounded-xl px-4 py-3">{error}</p>
              )}
              {success && (
                <p className="mb-3 text-sm text-[#0C7347] bg-[#E8F5E9] border border-[#0C7347]/20 rounded-xl px-4 py-3">{success}</p>
              )}
              <button
                onClick={handleSubmit}
                disabled={submitting}
                className="w-full py-3.5 rounded-xl text-white font-bold flex items-center justify-center gap-2 hover:brightness-110 active:scale-[0.99] transition disabled:opacity-60"
                style={{ backgroundColor: GREEN }}
              >
                <Icon d={icons.send} className="w-4 h-4" />
                {submitting ? 'Assigning...' : isGeo ? 'Set Geofence Task' : 'Assign Task'}
              </button>
            </div>
          </div>

          {isGeo && (
            <p className="text-xs text-gray-500 bg-white/70 border border-gray-100 rounded-2xl px-4 py-3 leading-relaxed">
              The office boy sees this task automatically when you {triggerType === 'Enter' ? 'enter' : 'exit'} the selected area.
            </p>
          )}
        </aside>
      </div>

      {showAddLocation && (
        <AddLocationModal
          apiUrl={API}
          onClose={() => setShowAddLocation(false)}
          onCreated={handleLocationCreated}
        />
      )}
    </div>
  );
}