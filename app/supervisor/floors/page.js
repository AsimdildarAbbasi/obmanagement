'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function FloorsPage() {
  const router = useRouter();
  const [floors, setFloors] = useState([]);
  const [obData, setObData] = useState([]);
  const [selectedFloorId, setSelectedFloorId] = useState(null);
  const [floorOffices, setFloorOffices] = useState({});
  const [busyFloorId, setBusyFloorId] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const stored = localStorage.getItem('user');
    if (!stored) {
      router.push('/');
      return;
    }
    fetchData();
  }, [router]);

  async function fetchData() {
    try {
      const [floorRes, obRes] = await Promise.all([
        fetch('http://localhost:5077/api/supervisor/floors'),
        fetch('http://localhost:5077/api/supervisor/officeboys'),
      ]);
      setFloors(await floorRes.json());
      setObData(await obRes.json());
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  async function loadFloorOffices(floor) {
    const id = floor.floorId;

    if (selectedFloorId === id) {
      setSelectedFloorId(null);
      return;
    }

    setSelectedFloorId(id);

    if (floorOffices[id]) return;

    try {
      setBusyFloorId(id);
      const res = await fetch(`http://localhost:5077/api/supervisor/FloorOffices?id=${id}`);
      const offices = await res.json();
      // Ensure offices is always an array
      setFloorOffices(prev => ({ ...prev, [id]: Array.isArray(offices) ? offices : [] }));
    } catch (e) {
      console.error(e);
      setFloorOffices(prev => ({ ...prev, [id]: [] }));
    } finally {
      setBusyFloorId(null);
    }
  }

  function obCountForFloor(floorNumber) {
    return obData.filter(ob =>
      ob.assignedFloors?.includes(floorNumber)
    ).length;
  }

  function floorLabel(number) {
    if (!number) return '';

    // If it's already a string (floor name from API), return it as-is
    if (typeof number === 'string') {
      return number;
    }

    const labels = {
      1: 'Ground Floor',
      2: 'First Floor',
      3: 'Second Floor',
      4: 'Third Floor',
      5: 'Fourth Floor',
    };

    return labels[number] || `Floor ${number}`;
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="w-8 h-8 border-4 border-[#0C7347] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-8 max-w-3xl mx-auto">

      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-extrabold text-gray-800">Floors</h1>
        <p className="text-base text-gray-500 mt-1">
          {floors.length} floors in the building
        </p>
      </div>

      {/* Floors */}
      <div className="bg-white rounded-2xl shadow border border-gray-100 divide-y">

        {floors.map((floor) => {
          const obCount = obCountForFloor(floor.floorNumber);
          const isOpen = selectedFloorId === floor.floorId;
          const offices = floorOffices[floor.floorId] ?? [];
          const officeCount = offices.length;

          return (
            <div key={floor.floorId}>

              {/* Floor Button */}
              <button
                onClick={() => loadFloorOffices(floor)}
                className="w-full flex items-center gap-4 px-6 py-5 hover:bg-gray-50 transition"
              >
                {/* Icon */}
                <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-[#0C7347]/10">
                  <svg width="26" height="26" fill="none" stroke="#0C7347" strokeWidth="2" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round"
                      d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                  </svg>
                </div>

                {/* Info */}
                <div className="flex-1 text-left">
                  <p className="text-base font-bold text-gray-800">
                    {floorLabel(floor.floorNumber)}
                  </p>
                  <div className="flex gap-4 mt-1 text-sm text-gray-500">
                    <span>{officeCount} offices</span>
                    <span>{obCount} office boys</span>
                  </div>
                </div>

                {/* Arrow */}
                <svg
                  className={`w-4 h-4 text-gray-500 transition-transform duration-300 ${
                    isOpen ? 'rotate-180' : ''
                  }`}
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {/* Dropdown */}
              <div
                className={`overflow-hidden transition-all duration-300 ${
                  isOpen ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'
                }`}
              >
                <div className="bg-gray-50 px-12 py-4">

                  {busyFloorId === floor.floorId ? (
                    <p className="text-base text-gray-600">Loading offices...</p>

                  ) : officeCount === 0 ? (
                    <p className="text-base text-gray-600">No offices found</p>

                  ) : (
                    <ul className="space-y-2">
                      {offices.map((office, index) => (
                        <li
                          key={index}
                          className="bg-white px-4 py-3 rounded-lg text-base text-gray-700 shadow-sm hover:bg-gray-100 transition cursor-pointer"
                        >
                          {office.officeName}
                        </li>
                      ))}
                    </ul>
                  )}

                </div>
              </div>

            </div>
          );
        })}

        {floors.length === 0 && (
          <div className="py-12 text-center text-gray-400 text-base">
            No floors found
          </div>
        )}

      </div>
    </div>
  );
}