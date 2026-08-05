'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

const API = 'http://localhost:5077';

function StarDisplay({ value }) {
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map(star => (
        <span key={star} className="text-lg"
          style={{ color: star <= value ? '#0C7347' : '#D1D5DB' }}>
          ★
        </span>
      ))}
    </div>
  );
}

export default function SupervisorReviewsPage() {
  const router  = useRouter();
  const [tasks,   setTasks]   = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const stored = localStorage.getItem('user');
    if (!stored) { router.push('/'); return; }
    const parsed = JSON.parse(stored);
    if (parsed.role !== 3) { router.push('/'); return; }
    fetchReviews();
  }, []);

  async function fetchReviews() {
    try {
      // Get all completed tasks
      const res  = await fetch(`${API}/api/tasks/completed`);
      const text = await res.text();
      const all  = text ? JSON.parse(text) : [];
      // Filter only tasks with rating less than 3
      const lowRated = all.filter(
        t => t.rating !== null && t.rating < 3
      );
      setTasks(lowRated);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="w-8 h-8 border-4 border-[#0C7347] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-8">
      {/* ── Header ── */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Reviews</h1>
        <p className="text-sm text-gray-400 mt-1">
          Tasks rated below 3 stars — requires attention
        </p>
      </div>

      {/* ── Review list ── */}
      <div className="flex flex-col gap-3">
        {tasks.length === 0 ? (
          <div className="bg-white rounded-2xl py-12 text-center shadow-sm border border-gray-100">
            <p className="text-gray-400 text-sm">No low rated reviews</p>
          </div>
        
        ) : (
          tasks.map(task => (
            <div key={task.taskId}>
              <div className="bg-white rounded-2xl px-6 py-5 shadow-sm border-l-4 border-[#0C7347] border border-gray-100">
                <div className="flex items-start gap-4">
                  {/* Warning icon */}
                  <div className="w-9 h-9 rounded-full bg-[#0C7347]/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <svg width="16" height="16" fill="none" stroke="#0C7347" strokeWidth="2" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round"
                        d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                  </div>

                  {/* Content */}
                  <div className="flex-1">
                    <p className="text-sm font-bold text-gray-800 mb-1">{task.description}</p>

                    {/* Office Boy + Faculty */}
                    <div className="flex flex-wrap items-center gap-3 mb-2">
                      <span className="text-xs text-gray-500">
                        <span className="font-medium">Office Boy:</span> {task.officeBoy}
                      </span>
                      <span className="text-xs text-gray-400">·</span>
                      <span className="text-xs text-gray-500">
                        <span className="font-medium">Faculty:</span> {task.faculty}
                      </span>
                    </div>

                    {/* Stars */}
                    <StarDisplay value={task.rating} />

                    {/* Remarks */}
                    {task.remarks && (
                      <p className="text-xs text-gray-500 mt-2 italic">
                        "{task.remarks}"
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}