'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { API } from '../../lib/api';
import UserAvatar from '../../components/UserAvatar';

function StarDisplay({ value }) {
  const rounded = Math.round(Number(value) || 0);

  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map(star => (
        <span key={star} className="text-lg"
          style={{ color: star <= rounded ? '#0C7347' : '#D1D5DB' }}>
          ★
        </span>
      ))}
    </div>
  );
}

function formatDate(d) {
  if (!d) return '';
  return new Date(d).toLocaleString('en-GB', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit'
  });
}

function OfficeBoyReviewCard({ entry }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
      <button
        type="button"
        onClick={() => setExpanded(prev => !prev)}
        className="w-full flex items-center gap-4 px-6 py-5 text-left hover:bg-gray-50 transition-colors"
      >
        <UserAvatar
          name={entry.officeBoyName}
          imageUrl={entry.officeBoyImageUrl}
          size={44}
        />

        <div className="flex-1 min-w-0">
          <p className="text-base font-bold text-gray-800 truncate">
            {entry.officeBoyName || 'Unknown office boy'}
          </p>
          <div className="flex flex-wrap items-center gap-2 mt-1">
            <StarDisplay value={entry.averageRating} />
            <span className="text-sm font-bold text-[#0C7347]">
              {Number(entry.averageRating).toFixed(2)}
            </span>
            <span className="text-xs text-gray-400">
              from {entry.ratedTaskCount} rated task{entry.ratedTaskCount === 1 ? '' : 's'}
            </span>
          </div>
        </div>

        <svg
          className={`w-4 h-4 text-gray-400 transition-transform duration-300 ${expanded ? 'rotate-180' : ''}`}
          fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {expanded && (
        <div className="border-t border-gray-100 divide-y divide-gray-50">
          {entry.reviews.map(review => (
            <div key={review.taskId} className="px-6 py-4">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-gray-800 break-words">
                    {review.description || 'Task'}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    Faculty: {review.faculty || 'Unknown'}
                  </p>
                  {review.remarks && (
                    <p className="text-xs text-gray-500 mt-1 italic">
                      &ldquo;{review.remarks}&rdquo;
                    </p>
                  )}
                  <p className="text-[11px] text-gray-400 mt-1">{formatDate(review.taskTime)}</p>
                </div>
                <div className="text-right shrink-0">
                  <StarDisplay value={review.rating} />
                  <p className="text-xs font-bold text-[#0C7347] mt-0.5">{review.rating}/5</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function SupervisorReviewsPage() {
  const router = useRouter();
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const stored = sessionStorage.getItem('user');
    if (!stored) { router.push('/'); return; }
    const parsed = JSON.parse(stored);
    if (Number(parsed.role) !== 3) { router.push('/'); return; }
    fetchReviews();
  }, []);

  async function fetchReviews() {
    try {
      const res = await fetch(`${API}/api/supervisor/reviews`);
      const text = await res.text();
      const json = text ? JSON.parse(text) : [];

      if (!res.ok) {
        setError(json.message || 'Could not load reviews.');
        return;
      }

      setReviews(Array.isArray(json) ? json : []);
    } catch (e) {
      console.error(e);
      setError('Could not load reviews.');
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
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Reviews</h1>
        <p className="text-sm text-gray-400 mt-1">
          Average ratings across rated tasks — highest first
        </p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-100 text-red-600 text-sm rounded-xl px-4 py-3 mb-4">
          {error}
        </div>
      )}

      <div className="flex flex-col gap-3">
        {reviews.length === 0 ? (
          <div className="bg-white rounded-2xl py-12 text-center shadow-sm border border-gray-100">
            <p className="text-gray-400 text-sm">No rated tasks yet</p>
          </div>
        ) : (
          reviews.map(entry => (
            <OfficeBoyReviewCard key={entry.officeBoyId} entry={entry} />
          ))
        )}
      </div>
    </div>
  );
}
