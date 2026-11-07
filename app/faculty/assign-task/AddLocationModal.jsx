'use client';
import { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Same icon fix you already use in the page
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl: '/images/leaflet/marker-icon-2x.png',
    iconUrl: '/images/leaflet/marker-icon.png',
    shadowUrl: '/images/leaflet/marker-shadow.png',
});

const DEFAULT_CENTER = [34.1688, 73.2215]; // change to your campus coordinates

function ClickHandler({ onPick }) {
    useMapEvents({
        click(e) {
            onPick(e.latlng.lat, e.latlng.lng);
        },
    });
    return null;
}

function FlyTo({ position }) {
    const map = useMap();
    useEffect(() => {
        if (position) map.flyTo(position, 17);
    }, [position, map]);
    return null;
}

export default function AddLocationModal({ apiUrl, onClose, onCreated }) {
    const [position, setPosition] = useState(null); // [lat, lng]
    const [name, setName] = useState('');
    const [query, setQuery] = useState('');
    const [results, setResults] = useState([]);
    const [searching, setSearching] = useState(false);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');

    // Search by place name (Nominatim - free, no API key)
    async function handleSearch() {
        if (!query.trim()) return;
        setSearching(true);
        setError('');
        try {
            const res = await fetch(
                `https://nominatim.openstreetmap.org/search?format=json&limit=5&q=${encodeURIComponent(query)}`
            );
            const data = await res.json();
            setResults(data);
            if (data.length === 0) setError('No results found. Try clicking on the map instead.');
        } catch {
            setError('Search failed. You can still click on the map.');
        } finally {
            setSearching(false);
        }
    }

    function selectResult(r) {
        setPosition([parseFloat(r.lat), parseFloat(r.lon)]);
        setName(r.display_name.split(',')[0]);
        setResults([]);
    }

    // Click on map -> drop pin + try to auto-fill name
    async function handlePick(lat, lng) {
        setPosition([lat, lng]);
        try {
            const res = await fetch(
                `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`
            );
            const data = await res.json();
            if (data?.display_name) setName(data.display_name.split(',')[0]);
        } catch {
            /* user can type the name manually */
        }
    }

    async function handleSave() {
        if (!position) return setError('Please pick a point on the map.');
        if (!name.trim()) return setError('Please enter a location name.');

        setSaving(true);
        setError('');
        try {
            const res = await fetch(`${apiUrl}/api/tasks/Locations`, { // <-- match your POST route
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: name.trim(),
                    latitude: position[0],
                    longitude: position[1],
                }),
            });
            if (!res.ok) throw new Error();
            const created = await res.json();
            onCreated(created);
            onClose();
        } catch {
            setError('Could not save the location. Try again.');
        } finally {
            setSaving(false);
        }
    }

    return (
        <div className="fixed inset-0 z-[2000] flex items-center justify-center bg-black/50 p-4">
            <div className="bg-white rounded-2xl w-full max-w-2xl p-5 max-h-[95vh] overflow-y-auto">
                <h2 className="text-lg font-bold text-gray-800 mb-3">Add New Location</h2>

                {/* Search */}
                <div className="relative mb-3">
                    <div className="flex gap-2">
                        <input
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                            placeholder="Search a place (e.g. Library, Abbottabad)"
                            className="flex-1 border border-gray-200 rounded-xl px-4 py-2 text-gray-700 outline-none focus:border-[#0C7347]"
                        />
                        <button
                            type="button"
                            onClick={handleSearch}
                            disabled={searching}
                            className="px-4 py-2 rounded-xl bg-gray-800 text-white"
                        >
                            {searching ? '...' : 'Search'}
                        </button>
                    </div>

                    {results.length > 0 && (
                        <ul className="absolute z-[1100] w-full bg-white border rounded-xl mt-1 shadow max-h-48 overflow-y-auto">
                            {results.map((r) => (
                                <li
                                    key={r.place_id}
                                    onClick={() => selectResult(r)}
                                    className="px-4 py-2 text-sm text-gray-700 cursor-pointer hover:bg-gray-100"
                                >
                                    {r.display_name}
                                </li>
                            ))}
                        </ul>
                    )}
                </div>

                {/* Map */}
                <div className="h-80 rounded-xl overflow-hidden border mb-3 relative z-0">
                    <MapContainer center={DEFAULT_CENTER} zoom={15} style={{ height: '100%', width: '100%' }}>
                        <TileLayer
                            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                        />
                        <ClickHandler onPick={handlePick} />
                        {position && (
                            <>
                                <Marker position={position} />
                                <FlyTo position={position} />
                            </>
                        )}
                    </MapContainer>
                </div>

                {/* Name + coordinates */}
                <input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Location name"
                    className="w-full border border-gray-200 rounded-xl px-4 py-2 mb-2 text-gray-700 outline-none focus:border-[#0C7347]"
                />
                <p className="text-sm text-gray-500 mb-2">
                    {position
                        ? `Lat: ${position[0].toFixed(6)}, Lng: ${position[1].toFixed(6)}`
                        : 'Search or click on the map to drop a pin.'}
                </p>

                {error && <p className="text-sm text-red-600 mb-2">{error}</p>}

                <div className="flex justify-end gap-2">
                    <button type="button" onClick={onClose} className="px-4 py-2 rounded-xl border text-gray-700">
                        Cancel
                    </button>
                    <button
                        type="button"
                        onClick={handleSave}
                        disabled={saving}
                        className="px-4 py-2 rounded-xl text-white font-semibold"
                        style={{ backgroundColor: '#0C7347' }}
                    >
                        {saving ? 'Saving...' : 'Save Location'}
                    </button>
                </div>
            </div>
        </div>
    );
}