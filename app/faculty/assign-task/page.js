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

export default function AssignTaskPage() {
  const router = useRouter();

  const [user, setUser] = useState(null);
  const [locations, setLocations] = useState([]);
  const [officeboys, setOfficeBoys] = useState([]);

  const [description, setDescription] = useState('');
  const [locationId, setLocationId] = useState('');
  const [obId, setObId] = useState('');

  // NEW: Map feature state
  const [selectedLocationId, setSelectedLocationId] = useState('');
  const [selectedLocation, setSelectedLocation] = useState(null);

  // ✅ NEW STATES
  const [taskMode, setTaskMode] = useState("now");
  const [scheduledAt, setScheduledAt] = useState("");

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
        iconRetinaUrl: new URL('leaflet/dist/images/marker-icon-2x.png', import.meta.url).href,
        iconUrl: new URL('leaflet/dist/images/marker-icon.png', import.meta.url).href,
        shadowUrl: new URL('leaflet/dist/images/marker-shadow.png', import.meta.url).href,
      });
    });
  }, []);

  async function fetchDropdowns(facultyId) {
    try {
      const [locRes, obRes] = await Promise.all([
        fetch(`${API}/api/Tasks/locations`),
        fetch(`${API}/api/tasks/byfaculty/${facultyId}`),
      ]);

      const locJson = await locRes.json();
      const obJson = await obRes.json();

      setLocations(Array.isArray(locJson) ? locJson : []);
      setOfficeBoys(Array.isArray(obJson) ? obJson : []);
    } catch {
      setError('Could not load form data.');
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit() {
    setError('');
    setSuccess('');

    if (!description.trim()) return setError('Please enter description');
    if (!locationId) return setError('Select location');
    if (!obId) return setError('Select office boy');

    // NEW VALIDATION
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

          // NEW FIELDS
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

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="w-10 h-10 border-4 border-[#0C7347] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-8 ">

      <h1 className="text-3xl font-extrabold text-gray-800 mb-8">
        Assign Task
      </h1>

      <div className="max-w-xl">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">

          <h2 className="text-xl font-bold text-gray-800 mb-6">
            Assign New Task
          </h2>

          {/* Description */}
          <div className="mb-5">
            <label className="block text-base font-bold text-gray-700 mb-1.5">
              Description
            </label>
            <textarea
              rows={4}
              placeholder="Describe the task"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full border border-gray-200 rounded-xl px-4 py-3 text-base text-gray-700 outline-none resize-none focus:border-[#0C7347]"
            />
          </div>

          {/* Location */}
          <div className="mb-5">
            <label className="block text-base font-bold text-gray-700 mb-1.5">
              Location
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
                className="w-full border border-gray-200 rounded-xl px-4 py-3"
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

          {selectedLocation && selectedLocation.latitude != null && selectedLocation.longitude != null && (
            <div className="mb-5">
              {/* NEW: Auto map on selection */}
              <div className="rounded-2xl overflow-hidden border border-gray-200">
                <MapContainer
                  center={[selectedLocation.latitude, selectedLocation.longitude]}
                  zoom={14}
                  className="h-80 w-full"
                >
                  <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  />
                  <Marker position={[selectedLocation.latitude, selectedLocation.longitude]}>
                    <Popup>{selectedLocation.name}</Popup>
                  </Marker>
                </MapContainer>
              </div>
            </div>
          )}
          {selectedLocation && (selectedLocation.latitude == null || selectedLocation.longitude == null) && (
            <p className="text-sm text-gray-500 mb-5">Location not available</p>
          )}

          {/* Office Boy */}
          <div className="mb-5">
            <label className="block text-base font-bold text-gray-700 mb-1.5">
              Assign To
            </label>
            <select
              value={obId}
              onChange={(e) => setObId(e.target.value)}
              className="w-full border border-gray-200 rounded-xl px-4 py-3"
            >
              <option value="">Select office boy</option>
              {officeboys.map((ob, index) => (
                <option key={ob.id ?? index} value={ob.id}>
                  {ob.name}
                </option>
              ))}
            </select>
          </div>

          {/* ✅ TASK MODE */}
          <div className="mb-5">
            <label className="block text-base font-bold text-gray-700 mb-1.5">
              Task Type
            </label>

            <div className="flex gap-6">
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  checked={taskMode === "now"}
                  onChange={() => setTaskMode("now")}
                />
                Now
              </label>

              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  checked={taskMode === "later"}
                  onChange={() => setTaskMode("later")}
                />
                Later
              </label>
            </div>
          </div>

          {/* ✅ SCHEDULE INPUT */}
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

          {/* Button */}
          <button
            onClick={handleSubmit}
            disabled={submitting}
            className="w-full py-3 rounded-xl text-white font-bold"
            style={{ backgroundColor: '#0C7347' }}
          >
            {submitting ? 'Assigning...' : 'Assign Task'}
          </button>

        </div>
      </div>

    </div>
  );
}