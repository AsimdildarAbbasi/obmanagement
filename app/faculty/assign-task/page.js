'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import 'leaflet/dist/leaflet.css';
const API = 'http://localhost:5077';

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

  // NEW: Map feature state
  const [selectedLocationId, setSelectedLocationId] = useState('');
  const [selectedLocation, setSelectedLocation] = useState(null);

  // Task Mode: "now" | "later" | "geofence"
  const [taskMode, setTaskMode] = useState("now");
  const [scheduledAt, setScheduledAt] = useState("");

  // Geofence Mode States
  const [geofenceId, setGeofenceId] = useState('');
  const [triggerType, setTriggerType] = useState('Enter'); // "Enter" | "Exit"
  const [taskCategoryId, setTaskCategoryId] = useState(null);

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    const stored = localStorage.getItem('user');
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
        fetch(`${API}/api/Tasks/locations`),
        fetch(`${API}/api/tasks/byfaculty/${facultyId}`),
        fetch(`${API}/api/tasks/geofences`),
        fetch(`${API}/api/tasks/taskcategories`),
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

        const res = await fetch(`${API}/api/tasks/createGeofenceTask`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });

        const data = await res.json();

        if (!res.ok) {
          setError(data.message || 'Failed to create geofence task');
          return;
        }

        setSuccess(
          `Geofence task created! It will automatically appear for the office boy once you ${triggerType === 'Enter' ? 'enter' : 'exit'} the selected geofence area.`
        );
        setDescription('');
        setTaskCategoryId(null);
        setLocationId('');
        setObId('');

        // Notify background tracker immediately
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

      setSuccess('Task assigned successfully!');
      setDescription('');
      setLocationId('');
      setObId('');
      setTaskMode("now");
      setScheduledAt('');

    } catch {
      setError('Server error');
    } finally {
      setSubmitting(false);
    }
  }

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
                        {/* <span className="bg-emerald-50 text-[#0C7347] font-semibold px-2 py-0.5 rounded-md border border-emerald-200">
                          Radius: {selectedGeofence.radiusMeters}m
                        </span> */}
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

          {/* Location */}
          <div className="mb-5">
            <label className="block text-base font-bold text-gray-700 mb-1.5">
              Target Location {taskMode === "geofence" && <span className="text-sm font-normal text-gray-400">(optional, defaults to Campus)</span>}
            </label>
            <div className="flex flex-col gap-3">
              <select
                value={locationId}
                onChange={(e) => {
                  const selectedId = e.target.value;
                  setLocationId(selectedId);
                  setSelectedLocationId(selectedId);

                  const loc = locations.find((location) => String(location.id) === selectedId);
                  setSelectedLocation(loc ?? null);
                }}
                className="w-full border text-gray-500 rounded-xl px-4 py-3"
              >
                <option value="">Select location</option>
                {locations.map((l, index) => (
                  <option key={l.id ?? index} value={l.id}>
                    {l.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Office Boy */}
          <div className="mb-5">
            <label className="block text-base font-bold text-gray-700 mb-1.5">
              Assign To
            </label>
            <select
              value={obId}
              onChange={(e) => setObId(e.target.value)}
              className="w-full border text-gray-500 rounded-xl px-4 py-3"
            >
              <option value="">Select office boy</option>
              {officeboys.map((ob, index) => (
                <option key={ob.id ?? index} value={ob.id}>
                  {ob.name}
                </option>
              ))}
            </select>
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

          {/* Error */}
          {error && (
            <p className="text-red-600 mb-4">{error}</p>
          )}

          {/* Success */}
          {success && (
            <p className="text-[#0C7347] mb-4">{success}</p>
          )}

          {/* Submit Button */}
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

    </div>
  );
}