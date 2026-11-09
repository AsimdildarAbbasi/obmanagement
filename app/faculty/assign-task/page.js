'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import 'leaflet/dist/leaflet.css';
import { API } from '../../lib/api';
import UserAvatar from '../../components/UserAvatar';

const MapContainer = dynamic(
  () => import('react-leaflet').then((mod) => mod.MapContainer),
  { ssr: false }
);
const TileLayer = dynamic(
  () => import('react-leaflet').then((mod) => mod.TileLayer),
  { ssr: false }
);
const Marker = dynamic(
  () => import('react-leaflet').then((mod) => mod.Marker),
  { ssr: false }
);
const Popup = dynamic(
  () => import('react-leaflet').then((mod) => mod.Popup),
  { ssr: false }
);
const Circle = dynamic(
  () => import('react-leaflet').then((mod) => mod.Circle),
  { ssr: false }
);

// NEW: modal loaded client-side only
const AddLocationModal = dynamic(() => import('./AddLocationModal'), { ssr: false });

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

  // NEW: controls the "Add location" modal
  const [showAddLocation, setShowAddLocation] = useState(false);

  // Task Mode: "now" | "later" | "geofence"
  const [taskMode, setTaskMode] = useState("now");
  const [scheduledAt, setScheduledAt] = useState("");

  // Geofence Mode States
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
      if (geoList.length > 0) {
        setGeofenceId(String(geoList[0].id));
      }

      setCategories(Array.isArray(catJson) ? catJson : []);
    } catch {
      setError('Could not load form data.');
    } finally {
      setLoading(false);
    }
  }

  // NEW: called after a location is saved from the modal
  function handleLocationCreated(newLoc) {
    setLocations((prev) => [...prev, newLoc]);   // shows in dropdown instantly
    setLocationId(String(newLoc.id));            // auto-select it
    setSelectedLocationId(String(newLoc.id));
    setSelectedLocation(newLoc);
  }

  function resetFiles() {
    setFiles([]);
    setFileInputKey((key) => key + 1);
  }

  async function uploadAttachments(taskId) {
    if (!files.length || !taskId) return { uploaded: 0, error: '' };

    try {
      const formData = new FormData();
      files.forEach((file) => formData.append('files', file));

      const res = await fetch(`${API}/api/tasks/${taskId}/attachments`, {
        method: 'POST',
        body: formData,
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        return { uploaded: 0, error: data.message || 'Could not upload attachments.' };
      }

      return { uploaded: files.length, error: '' };
    } catch {
      return { uploaded: 0, error: 'Could not upload attachments.' };
    }
  }

  async function handleSubmit() {
    setError('');
    setSuccess('');

    // --- GEOFENCE MODE SUBMISSION ---
    if (taskMode === 'geofence') {
      if (!geofenceId) return setError('Please select a geofence location');
      if (!obId) return setError('Select office boy');

      setSubmitting(true);

      try {
        const payload = {
          facultyAccountId: user.id,
          officeBoyAccountId: parseInt(obId),
          geofenceId: parseInt(geofenceId),
          triggerType: triggerType,
          taskCategoryId: taskCategoryId ? parseInt(taskCategoryId) : null,
          description: description.trim() || (taskCategoryId ? categories.find(c => c.id === taskCategoryId)?.name : '') || `Geofence task (${triggerType})`,
        };

        if (locationId) {
          payload.locationId = parseInt(locationId);
        }

        const res = await fetch(`${API}/api/geofencetasks/createGeofenceTask`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });

        const data = await res.json();

        if (!res.ok) {
          setError(data.message || 'Failed to create geofence task');
          return;
        }

        const attachmentResult = await uploadAttachments(data.taskId);

        setSuccess(
          `Geofence task created! It will automatically appear for the office boy once you ${triggerType === 'Enter' ? 'enter' : 'exit'} the selected geofence area.` +
          (attachmentResult.uploaded ? ` ${attachmentResult.uploaded} attachment(s) uploaded.` : '') +
          (attachmentResult.error ? ` ${attachmentResult.error}` : '')
        );
        setDescription('');
        setTaskCategoryId(null);
        setLocationId('');
        setObId('');
        resetFiles();

        if (typeof window !== 'undefined') {
          window.dispatchEvent(new Event('geofence-task-created'));
        }
      } catch {
        setError('Server error');
      } finally {
        setSubmitting(false);
      }
      return;
    }

    // --- NOW / LATER SUBMISSION ---
    if (!description.trim()) return setError('Please enter description');
    if (!locationId) return setError('Select location');
    if (!obId) return setError('Select office boy');

    if (taskMode === "later" && !scheduledAt) {
      return setError("Please select date and time for scheduled task");
    }

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
          taskMode: taskMode,
          scheduledAt: taskMode === "later" ? scheduledAt : null,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.message || 'Failed to assign task');
        return;
      }

      const attachmentResult = await uploadAttachments(data.taskId);

      setSuccess(
        'Task assigned successfully!' +
        (attachmentResult.uploaded ? ` ${attachmentResult.uploaded} attachment(s) uploaded.` : '') +
        (attachmentResult.error ? ` ${attachmentResult.error}` : '')
      );
      setDescription('');
      setLocationId('');
      setObId('');
      setTaskMode("now");
      setScheduledAt('');
      resetFiles();

    } catch {
      setError('Server error');
    } finally {
      setSubmitting(false);
    }
  }

  const selectedOfficeBoy = officeboys.find(
    (ob) => String(ob.id) === String(obId)
  );

  return (
    <div className="p-8">

      <h1 className="text-3xl font-extrabold text-gray-800 mb-8">
        Assign Task
      </h1>

      <div className="max-w-xl">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">

          <h2 className="text-xl font-bold text-gray-800 mb-6">
            Assign New Task
          </h2>

          {/* TASK MODE SELECTION */}
          <div className="mb-6">
            <label className="block text-base font-bold text-gray-700 mb-2">
              Task Type
            </label>

            <div className="flex flex-wrap gap-6 text-gray-700">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="taskMode"
                  checked={taskMode === "now"}
                  onChange={() => setTaskMode("now")}
                />
                Now
              </label>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="taskMode"
                  checked={taskMode === "later"}
                  onChange={() => setTaskMode("later")}
                />
                Later
              </label>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="taskMode"
                  checked={taskMode === "geofence"}
                  onChange={() => setTaskMode("geofence")}
                />
                My Location
              </label>
            </div>
          </div>

          {/* --- GEOFENCE-SPECIFIC FIELDS --- */}
          {taskMode === "geofence" && (
            <>
              {/* Geofence Selection */}
              <div className="mb-5">
                <label className="block text-base font-bold text-gray-700 mb-1.5">
                  Geofence Area
                </label>
                <select
                  value={geofenceId}
                  onChange={(e) => setGeofenceId(e.target.value)}
                  className="w-full border text-gray-500 rounded-xl px-4 py-3"
                >
                  <option value="">Select geofence</option>
                  {geofences.map((g) => (
                    <option key={g.id} value={g.id}>
                      {g.name}
                    </option>
                  ))}
                </select>

                {/* Selected Geofence Map Preview */}
                {(() => {
                  const selectedGeofence = geofences.find((g) => String(g.id) === String(geofenceId));
                  if (!selectedGeofence || !selectedGeofence.centerLatitude || !selectedGeofence.centerLongitude) {
                    return null;
                  }
                  return (
                    <div className="mt-3 rounded-xl overflow-hidden border border-gray-200 shadow-xs bg-gray-50">
                      <div className="px-3.5 py-2 bg-gray-50 border-b border-gray-200 flex items-center justify-between text-xs text-gray-600">
                        <span className="font-semibold text-gray-800 flex items-center gap-1.5">
                          <span className="inline-block w-2 h-2 rounded-full bg-[#0C7347]"></span>
                          {selectedGeofence.name}
                        </span>
                      </div>
                      <div className="h-44 w-full relative z-0">
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
                                <strong className="text-gray-800">{selectedGeofence.name}</strong>
                                <br />
                                Geofence Radius: {selectedGeofence.radiusMeters}m
                              </div>
                            </Popup>
                          </Marker>
                          <Circle
                            center={[selectedGeofence.centerLatitude, selectedGeofence.centerLongitude]}
                            radius={selectedGeofence.radiusMeters || 100}
                            pathOptions={{
                              color: '#0C7347',
                              fillColor: '#0C7347',
                              fillOpacity: 0.22,
                              weight: 2,
                            }}
                          />
                        </MapContainer>
                      </div>
                      <div className="px-3 py-1.5 bg-white text-[11px] text-gray-500 border-t border-gray-100 flex justify-between">
                        <span>Lat: {Number(selectedGeofence.centerLatitude).toFixed(5)}</span>
                        <span>Lng: {Number(selectedGeofence.centerLongitude).toFixed(5)}</span>
                      </div>
                    </div>
                  );
                })()}
              </div>

              {/* Trigger Toggle */}
              <div className="mb-5">
                <label className="block text-base font-bold text-gray-700 mb-1.5">
                  Trigger When
                </label>
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => setTriggerType("Enter")}
                    className={`flex-1 py-2.5 px-4 rounded-xl text-sm font-semibold border transition-all ${triggerType === "Enter"
                      ? "bg-[#0C7347] text-white border-[#0C7347]"
                      : "bg-white text-gray-700 border-gray-200 hover:bg-gray-50"
                      }`}
                  >
                    When I Enter
                  </button>
                  <button
                    type="button"
                    onClick={() => setTriggerType("Exit")}
                    className={`flex-1 py-2.5 px-4 rounded-xl text-sm font-semibold border transition-all ${triggerType === "Exit"
                      ? "bg-[#0C7347] text-white border-[#0C7347]"
                      : "bg-white text-gray-700 border-gray-200 hover:bg-gray-50"
                      }`}
                  >
                    When I Exit
                  </button>
                </div>
              </div>

              {/* Quick-action category buttons */}
              {categories.length > 0 && (
                <div className="mb-5">
                  <label className="block text-base font-bold text-gray-700 mb-1.5">
                    Quick Actions
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {categories.map((cat) => {
                      const isSelected = taskCategoryId === cat.id;
                      return (
                        <button
                          key={cat.id}
                          type="button"
                          onClick={() => {
                            if (isSelected) {
                              setTaskCategoryId(null);
                            } else {
                              setTaskCategoryId(cat.id);
                              setDescription(cat.name);
                            }
                          }}
                          className={`px-3.5 py-2 rounded-xl text-sm font-medium border transition-all ${isSelected
                            ? "bg-[#E8F5E9] text-[#0C7347] border-[#0C7347] font-semibold"
                            : "bg-white text-gray-600 border-gray-200 hover:bg-gray-50"
                            }`}
                        >
                          {cat.name}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </>
          )}

          {/* Description */}
          <div className="mb-5">
            <label className="block text-base font-bold text-gray-700 mb-1.5">
              Description {taskMode === "geofence" && <span className="text-sm font-normal text-gray-400">(optional)</span>}
            </label>
            <textarea
              rows={4}
              placeholder={taskMode === "geofence" ? "Describe task (optional if quick action selected)" : "Describe the task"}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full border border-gray-200 rounded-xl px-4 py-3 text-base text-gray-700 outline-none resize-none focus:border-[#0C7347]"
            />
          </div>

          {/* Location  (NEW: + Add new button) */}
          <div className="mb-5">
            <label className="block text-base font-bold text-gray-700 mb-1.5">
              Target Location {taskMode === "geofence" && <span className="text-sm font-normal text-gray-400">(optional, defaults to Campus)</span>}
            </label>
            <div className="flex gap-3">
              <select
                value={locationId}
                onChange={(e) => {
                  const selectedId = e.target.value;
                  setLocationId(selectedId);
                  setSelectedLocationId(selectedId);

                  const loc = locations.find((location) => String(location.id) === selectedId);
                  setSelectedLocation(loc ?? null);
                }}
                className="flex-1 min-w-0 border text-gray-500 rounded-xl px-4 py-3"
              >
                <option value="">Select location</option>
                {locations.map((l, index) => (
                  <option key={l.id ?? index} value={l.id}>
                    {l.name}
                  </option>
                ))}
              </select>

              <button
                type="button"
                onClick={() => setShowAddLocation(true)}
                className="px-4 py-3 rounded-xl text-white font-semibold whitespace-nowrap"
                style={{ backgroundColor: '#0C7347' }}
              >
                + Add new
              </button>
            </div>
          </div>

          {/* Office Boy */}
          <div className="mb-5">
            <label className="block text-base font-bold text-gray-700 mb-1.5">
              Assign To
            </label>
            <div className="flex items-center gap-3">
              {selectedOfficeBoy && (
                <UserAvatar
                  name={selectedOfficeBoy.name}
                  imageUrl={selectedOfficeBoy.profileImageUrl}
                  size={44}
                />
              )}
              <select
                value={obId}
                onChange={(e) => setObId(e.target.value)}
                className="flex-1 min-w-0 border text-gray-500 rounded-xl px-4 py-3"
              >
                <option value="">Select office boy</option>
                {officeboys.map((ob, index) => (
                  <option key={ob.id ?? index} value={ob.id}>
                    {ob.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* SCHEDULE INPUT (only for later) */}
          {taskMode === "later" && (
            <div className="mb-5">
              <label className="block text-base font-bold text-gray-700 mb-1.5">
                Schedule Date & Time
              </label>

              <input
                type="datetime-local"
                value={scheduledAt}
                onChange={(e) => setScheduledAt(e.target.value)}
                className="w-full border border-gray-200 rounded-xl px-4 py-3"
              />
            </div>
          )}

          {/* ATTACHMENTS */}
          <div className="mb-5">
            <label className="block text-base font-bold text-gray-700 mb-1.5">
              Attachments <span className="text-sm font-normal text-gray-400">(optional)</span>
            </label>

            <input
              key={fileInputKey}
              type="file"
              multiple
              onChange={(e) => setFiles(Array.from(e.target.files || []))}
              className="w-full text-sm text-gray-600 border border-gray-200 rounded-xl px-4 py-3 file:mr-3 file:rounded-lg file:border-0 file:bg-[#0C7347] file:px-3 file:py-1.5 file:text-white file:text-sm file:font-semibold"
            />

            {files.length > 0 && (
              <p className="text-xs text-gray-500 mt-1.5">
                {files.length} file{files.length === 1 ? '' : 's'} selected — uploaded after the task is created.
              </p>
            )}
          </div>

          {error && <p className="text-red-600 mb-4">{error}</p>}
          {success && <p className="text-[#0C7347] mb-4">{success}</p>}

          <button
            onClick={handleSubmit}
            disabled={submitting}
            className="w-full py-3 rounded-xl text-white font-bold"
            style={{ backgroundColor: '#0C7347' }}
          >
            {submitting ? 'Assigning...' : (taskMode === 'geofence' ? 'Set Geofence Task' : 'Assign Task')}
          </button>

        </div>
      </div>

      {/* NEW: Add Location modal */}
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