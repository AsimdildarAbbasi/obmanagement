'use client';
import { useEffect, useState, useRef } from 'react';
import { getStoredUser } from '../lib/auth';

const API = 'http://localhost:5077';

export default function FacultyLocationTracker() {
  const [hasPending, setHasPending] = useState(false);
  const [permissionDenied, setPermissionDenied] = useState(false);
  const isPinging = useRef(false);

  useEffect(() => {
    const user = getStoredUser();
    if (!user || Number(user.role) !== 2) return;

    let timer = null;

    async function checkPendingTasks() {
      try {
        const res = await fetch(`${API}/api/facultytracking/has-pending/${user.id}`);
        if (!res.ok) return false;
        const data = await res.json();
        const pending = Boolean(data.hasPending);
        setHasPending(pending);
        return pending;
      } catch {
        return false;
      }
    }

    function pingLocation() {
      if (isPinging.current) return;
      if (typeof window === 'undefined' || !navigator.geolocation) return;

      isPinging.current = true;
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          setPermissionDenied(false);
          try {
            await fetch(`${API}/api/facultytracking/ping`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                facultyAccountId: user.id,
                latitude: position.coords.latitude,
                longitude: position.coords.longitude,
              }),
            });
            // Re-check after ping in case the task was triggered and is now visible
            await checkPendingTasks();
          } catch (e) {
            console.error('Failed to send location ping', e);
          } finally {
            isPinging.current = false;
          }
        },
        (error) => {
          isPinging.current = false;
          if (error.code === error.PERMISSION_DENIED) {
            setPermissionDenied(true);
          }
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 10000 }
      );
    }

    async function runCycle() {
      const isPending = await checkPendingTasks();
      if (isPending) {
        pingLocation();
      }
    }

    // Initial check
    runCycle();

    // Poll every 25 seconds
    timer = setInterval(runCycle, 25000);

    // Immediate cycle when a new task is created
    function handleTaskCreated() {
      runCycle();
    }
    window.addEventListener('geofence-task-created', handleTaskCreated);

    return () => {
      if (timer) clearInterval(timer);
      window.removeEventListener('geofence-task-created', handleTaskCreated);
    };
  }, []);

  if (permissionDenied && hasPending) {
    return (
      <div className="bg-amber-50 border-b border-amber-200 px-6 py-2.5 text-xs text-amber-800 flex items-center justify-between">
        <span>
          <strong>Location Permission Needed:</strong> You have a pending geofence task, but location access is blocked. Please enable location permissions in your browser for automatic task triggering.
        </span>
        <button
          onClick={() => setPermissionDenied(false)}
          className="text-amber-700 hover:text-amber-900 font-bold ml-4"
        >
          ✕
        </button>
      </div>
    );
  }

  return null;
}
