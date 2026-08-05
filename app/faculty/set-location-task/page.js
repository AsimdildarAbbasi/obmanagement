'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import 'leaflet/dist/leaflet.css';

// Dynamically import map components to avoid SSR issues
const MapContainer = dynamic(() => import('react-leaflet').then(m => m.MapContainer), { ssr: false });
const TileLayer = dynamic(() => import('react-leaflet').then(m => m.TileLayer), { ssr: false });
const Marker = dynamic(() => import('react-leaflet').then(m => m.Marker), { ssr: false });
const useMapEvents = dynamic(() => import('react-leaflet').then(m => m.useMapEvents), { ssr: false });

const API = 'http://localhost:5077';

function LocationPicker({ position, setPosition }) {
  useMapEvents({
    click(e) {
      setPosition(e.latlng);
    },
  });

  return position === null ? null : (
    <Marker position={position}></Marker>
  );
}

export default function SetLocationTaskPage() {
  const router = useRouter();
  const [user, setUser] = useState(null);

  const [taskType, setTaskType] = useState('Arrival');
  const [description, setDescription] = useState('');
  const [position, setPosition] = useState(null);
  const [loading, setLoading] = useState(false);

  // Rawalpindi coords as fallback default
  const defaultCenter = [33.6425, 73.0766];

  useEffect(() => {
    const stored = localStorage.getItem('user');
    if (!stored) { router.push('/'); return; }
    const parsed = JSON.parse(stored);
    if (parsed.role !== 2) { router.push('/'); return; }
    setUser(parsed);
  }, []);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!position) {
      alert('Please select a location on the map.');
      return;
    }

    if (!description.trim()) {
      alert('Please enter a description.');
      return;
    }

    setLoading(true);

    try {
      const res = await fetch(`${API}/api/TeacherTracking/set-task`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          facultyAccountId: user.id,
          taskType,
          description,
          latitude: position.lat,
          longitude: position.lng
        })
      });

      if (!res.ok) throw new Error('Failed to save task configuration');

      alert('Auto task configuration saved successfully!');
      router.push('/faculty/dashboard');
    } catch (e) {
      console.error(e);
      alert('An error occurred while saving.');
    } finally {
      setLoading(false);
    }
  }

  if (!user) return null;

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Set Arrival / Departure Task</h1>
      </div>

      <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 max-w-3xl">
        <form onSubmit={handleSubmit} className="flex flex-col gap-6">

          {/* Task Type */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-3">Task Type</label>
            <div className="flex gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="taskType"
                  value="Arrival"
                  checked={taskType === 'Arrival'}
                  onChange={(e) => setTaskType(e.target.value)}
                  className="w-4 h-4 text-[#0C7347]"
                />
                <span className="text-sm font-medium text-gray-700">Arrival</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="taskType"
                  value="Departure"
                  checked={taskType === 'Departure'}
                  onChange={(e) => setTaskType(e.target.value)}
                  className="w-4 h-4 text-[#0C7347]"
                />
                <span className="text-sm font-medium text-gray-700">Departure</span>
              </label>
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Instructions</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="E.g., Turn on AC and prepare projector..."
              className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[#0C7347] focus:ring-1 focus:ring-[#0C7347]"
              rows="3"
            />
          </div>

          {/* Map */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Location Geofence (Click to set)</label>
            <div className="h-80 w-full rounded-xl overflow-hidden border border-gray-300">
              {typeof window !== 'undefined' && (
                <MapContainer center={defaultCenter} zoom={14} className="h-full w-full">
                  <TileLayer
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                  />
                  <LocationPicker position={position} setPosition={setPosition} />
                </MapContainer>
              )}
            </div>
            {position && (
              <p className="text-xs text-gray-500 mt-2">
                Selected Coordinates: {position.lat.toFixed(5)}, {position.lng.toFixed(5)}
              </p>
            )}
          </div>

          <div className="flex justify-end mt-4">
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2.5 rounded-xl text-white text-sm font-bold shadow hover:opacity-90 transition-opacity disabled:opacity-50"
              style={{ backgroundColor: '#0C7347' }}>
              {loading ? 'Saving...' : 'Save Configuration'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
