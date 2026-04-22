'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

const API = 'https://localhost:7094';

export default function AssignTaskPage() {
  const router = useRouter();

  const [user, setUser] = useState(null);
  const [locations, setLocations] = useState([]);
  const [officeboys, setOfficeBoys] = useState([]);

  const [description, setDescription] = useState('');
  const [locationId, setLocationId] = useState('');
  const [obId, setObId] = useState('');

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
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.message || 'Failed to assign task');
        return;
      }

      // Reset form
      setSuccess('Task assigned successfully!');
      setDescription('');
      setLocationId('');
      setObId('');

    } catch {
      setError('Server error');
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="w-10 h-10 border-4 border-green-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
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
              className="w-full border border-gray-200 rounded-xl px-4 py-3 text-base text-gray-700 outline-none resize-none focus:border-green-600"
            />
          </div>

          {/* Location */}
          <div className="mb-5">
            <label className="block text-base font-bold text-gray-700 mb-1.5">
              Location
            </label>
            <select
              value={locationId}
              onChange={(e) => setLocationId(e.target.value)}
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

          {/* Error */}
          {error && (
            <p className="text-red-600 mb-4">{error}</p>
          )}

          {/* Success */}
          {success && (
            <p className="text-green-600 mb-4">{success}</p>
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